-- ==============================================================================
-- Migration: 04_strict_security_and_tenancy.sql
-- Description: Enforce Real Multi-Tenant Isolation & Role-Based Access Control
-- Replaces permissive USING(true) policies with cryptographically scoped RLS
-- ==============================================================================

-- 1. Store Memberships & RBAC Table
CREATE TABLE IF NOT EXISTS public.store_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id TEXT NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('owner', 'manager', 'staff')),
    invited_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(store_id, user_id)
);

-- Index for fast RLS lookup
CREATE INDEX IF NOT EXISTS idx_store_members_lookup 
ON public.store_members(store_id, user_id, role);

-- 2. Security Definer Helper Function: Check Store Membership & Role
CREATE OR REPLACE FUNCTION public.is_store_member(
    lookup_store_id TEXT, 
    required_role TEXT DEFAULT 'staff'
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.store_members sm
    WHERE sm.store_id = lookup_store_id
      AND sm.user_id = auth.uid()
      AND (
        CASE 
          WHEN required_role = 'owner' THEN sm.role = 'owner'
          WHEN required_role = 'manager' THEN sm.role IN ('owner', 'manager')
          ELSE sm.role IN ('owner', 'manager', 'staff')
        END
      )
  );
$$;

-- 3. Security Definer Helper Function: Check if user is the direct store owner
CREATE OR REPLACE FUNCTION public.is_store_owner(lookup_store_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_store_member(lookup_store_id, 'owner');
$$;

-- 4. Enable RLS on all sensitive tables
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landing_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_agent_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- 5. Drop old permissive USING(true) policies
DROP POLICY IF EXISTS tenant_leads_policy ON public.leads;
DROP POLICY IF EXISTS tenant_landing_sites_policy ON public.landing_sites;
DROP POLICY IF EXISTS tenant_ai_agent_configs_policy ON public.ai_agent_configs;
DROP POLICY IF EXISTS tenant_whatsapp_drafts_policy ON public.whatsapp_drafts;
DROP POLICY IF EXISTS tenant_supplier_invoices_policy ON public.supplier_invoices;
DROP POLICY IF EXISTS public_read_landing_sites ON public.landing_sites;
DROP POLICY IF EXISTS public_insert_leads ON public.leads;

-- ==============================================================================
-- 6. STRICT TENANT ISOLATION POLICIES
-- ==============================================================================

-- A. STORES TABLE
CREATE POLICY store_member_read_store ON public.stores
    FOR SELECT TO authenticated
    USING (public.is_store_member(id, 'staff'));

CREATE POLICY store_owner_update_store ON public.stores
    FOR UPDATE TO authenticated
    USING (public.is_store_member(id, 'owner'))
    WITH CHECK (public.is_store_member(id, 'owner'));

-- B. STORE MEMBERS TABLE
CREATE POLICY store_member_read_members ON public.store_members
    FOR SELECT TO authenticated
    USING (public.is_store_member(store_id, 'staff'));

CREATE POLICY store_owner_manage_members ON public.store_members
    FOR ALL TO authenticated
    USING (public.is_store_member(store_id, 'owner'))
    WITH CHECK (public.is_store_member(store_id, 'owner'));

-- C. LEADS TABLE (CRM)
CREATE POLICY tenant_leads_select ON public.leads
    FOR SELECT TO authenticated
    USING (public.is_store_member(store_id, 'staff'));

CREATE POLICY tenant_leads_insert ON public.leads
    FOR INSERT TO authenticated
    WITH CHECK (public.is_store_member(store_id, 'staff'));

CREATE POLICY tenant_leads_update ON public.leads
    FOR UPDATE TO authenticated
    USING (public.is_store_member(store_id, 'staff'))
    WITH CHECK (public.is_store_member(store_id, 'staff'));

CREATE POLICY tenant_leads_delete ON public.leads
    FOR DELETE TO authenticated
    USING (public.is_store_member(store_id, 'manager'));

-- Public lead capture (strict: store must exist and cannot read back rows)
CREATE POLICY public_lead_capture ON public.leads
    FOR INSERT TO anon
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.stores s 
            WHERE s.id = store_id
        )
    );

-- D. LANDING SITES
CREATE POLICY tenant_landing_sites_select ON public.landing_sites
    FOR SELECT TO authenticated
    USING (public.is_store_member(store_id, 'staff'));

CREATE POLICY tenant_landing_sites_modify ON public.landing_sites
    FOR ALL TO authenticated
    USING (public.is_store_member(store_id, 'manager'))
    WITH CHECK (public.is_store_member(store_id, 'manager'));

-- Public unauthenticated visitor read (published sites ONLY)
CREATE POLICY public_visitor_read_landing_sites ON public.landing_sites
    FOR SELECT TO anon
    USING (published = true);

-- E. AI AGENT CONFIGS
CREATE POLICY tenant_ai_agent_configs_select ON public.ai_agent_configs
    FOR SELECT TO authenticated
    USING (public.is_store_member(store_id, 'staff'));

CREATE POLICY tenant_ai_agent_configs_modify ON public.ai_agent_configs
    FOR ALL TO authenticated
    USING (public.is_store_member(store_id, 'manager'))
    WITH CHECK (public.is_store_member(store_id, 'manager'));

-- F. WHATSAPP DRAFTS & INBOX
CREATE POLICY tenant_whatsapp_drafts_select ON public.whatsapp_drafts
    FOR SELECT TO authenticated
    USING (public.is_store_member(store_id, 'staff'));

CREATE POLICY tenant_whatsapp_drafts_modify ON public.whatsapp_drafts
    FOR ALL TO authenticated
    USING (public.is_store_member(store_id, 'staff'))
    WITH CHECK (public.is_store_member(store_id, 'staff'));

-- G. SUPPLIER INVOICES (PURCHASE HUB)
CREATE POLICY tenant_supplier_invoices_select ON public.supplier_invoices
    FOR SELECT TO authenticated
    USING (public.is_store_member(store_id, 'staff'));

CREATE POLICY tenant_supplier_invoices_modify ON public.supplier_invoices
    FOR ALL TO authenticated
    USING (public.is_store_member(store_id, 'staff'))
    WITH CHECK (public.is_store_member(store_id, 'staff'));

-- H. PRODUCTS & ORDERS
CREATE POLICY tenant_products_policy ON public.products
    FOR ALL TO authenticated
    USING (public.is_store_member(store_id, 'staff'))
    WITH CHECK (public.is_store_member(store_id, 'manager'));

CREATE POLICY tenant_orders_policy ON public.orders
    FOR ALL TO authenticated
    USING (public.is_store_member(store_id, 'staff'))
    WITH CHECK (public.is_store_member(store_id, 'staff'));
