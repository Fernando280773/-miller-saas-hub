-- SQL Migration: Setup Multi-Tenant Miller SaaS Hub Schema (Phase 2 - Live Core)

-- 1. LEADS TABLE (CRM Pipeline & Miller AI Scoring)
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    contact TEXT NOT NULL,
    contact_type TEXT DEFAULT 'whatsapp' NOT NULL CHECK (contact_type IN ('whatsapp', 'email', 'phone')),
    source TEXT DEFAULT 'manual' NOT NULL CHECK (source IN ('whatsapp', 'landing_page', 'social', 'platform', 'referral', 'manual')),
    source_name TEXT,
    score TEXT DEFAULT 'cold' NOT NULL CHECK (score IN ('hot', 'warm', 'cold')),
    status TEXT DEFAULT 'new' NOT NULL CHECK (status IN ('new', 'contacted', 'qualified', 'proposal', 'won', 'lost')),
    business_unit TEXT,
    notes TEXT DEFAULT '',
    tags TEXT[] DEFAULT '{}'::text[],
    estimated_value NUMERIC(10, 2) DEFAULT 0.00,
    next_action TEXT,
    next_action_date TIMESTAMP WITH TIME ZONE,
    last_contacted_at TIMESTAMP WITH TIME ZONE,
    nurture_sent INTEGER DEFAULT 0 NOT NULL,
    nurture_messages JSONB DEFAULT '[]'::jsonb NOT NULL
);

-- 2. LANDING SITES TABLE (AI Landing Page Builder Engine)
CREATE TABLE IF NOT EXISTS public.landing_sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    business_name TEXT NOT NULL,
    slug TEXT UNIQUE,
    title TEXT,
    published BOOLEAN DEFAULT false NOT NULL,
    html TEXT NOT NULL,
    page_type TEXT DEFAULT 'lead_generation',
    views_count INTEGER DEFAULT 0 NOT NULL,
    leads_count INTEGER DEFAULT 0 NOT NULL,
    custom_domain TEXT,
    metadata JSONB DEFAULT '{}'::jsonb NOT NULL
);

-- 3. AI AGENT CONFIGS TABLE (Miller AI Agents Hub)
CREATE TABLE IF NOT EXISTS public.ai_agent_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    agent_id TEXT NOT NULL, -- 'monitor', 'post', 'reply', 'growth', 'alert'
    label TEXT NOT NULL,
    emoji TEXT DEFAULT '🤖',
    enabled BOOLEAN DEFAULT true NOT NULL,
    tasks_done INTEGER DEFAULT 0 NOT NULL,
    config JSONB DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT unique_store_agent UNIQUE(store_id, agent_id)
);

-- 4. WHATSAPP DRAFTS TABLE (Inbound / Outbound Lead Nurturing & Senders)
CREATE TABLE IF NOT EXISTS public.whatsapp_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
    recipient_name TEXT NOT NULL,
    recipient_phone TEXT NOT NULL,
    message_text TEXT NOT NULL,
    status TEXT DEFAULT 'Draft' NOT NULL CHECK (status IN ('Draft', 'Approved', 'Sent', 'Failed')),
    media_url TEXT,
    trigger_reason TEXT
);

-- 5. SUPPLIER INVOICES TABLE (Purchase Hub & OCR WhatsApp Capture)
CREATE TABLE IF NOT EXISTS public.supplier_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    supplier_name TEXT NOT NULL,
    invoice_number TEXT,
    invoice_date DATE DEFAULT CURRENT_DATE,
    total_amount NUMERIC(10, 2) NOT NULL,
    currency TEXT DEFAULT 'GBP' NOT NULL,
    status TEXT DEFAULT 'Pending' NOT NULL CHECK (status IN ('Pending', 'Verified', 'Paid')),
    items JSONB DEFAULT '[]'::jsonb NOT NULL,
    image_storage_path TEXT,
    captured_via TEXT DEFAULT 'whatsapp' NOT NULL CHECK (captured_via IN ('whatsapp', 'manual', 'email', 'scan'))
);

-- Indexing for multi-tenant querying
CREATE INDEX IF NOT EXISTS idx_leads_store_id ON public.leads(store_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_score ON public.leads(score);
CREATE INDEX IF NOT EXISTS idx_landing_sites_store_id ON public.landing_sites(store_id);
CREATE INDEX IF NOT EXISTS idx_landing_sites_slug ON public.landing_sites(slug);
CREATE INDEX IF NOT EXISTS idx_ai_agent_configs_store_id ON public.ai_agent_configs(store_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_drafts_store_id ON public.whatsapp_drafts(store_id);
CREATE INDEX IF NOT EXISTS idx_supplier_invoices_store_id ON public.supplier_invoices(store_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landing_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_agent_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_invoices ENABLE ROW LEVEL SECURITY;

-- Store Memberships for Multi-Tenant Isolation
CREATE TABLE IF NOT EXISTS public.store_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id TEXT NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('owner', 'manager', 'staff')),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(store_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_store_members_lookup ON public.store_members(store_id, user_id, role);

-- Security Definer Function to inspect tenant membership
CREATE OR REPLACE FUNCTION public.is_store_member(lookup_store_id TEXT, min_role TEXT DEFAULT 'staff')
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
          WHEN min_role = 'owner' THEN sm.role = 'owner'
          WHEN min_role = 'manager' THEN sm.role IN ('owner', 'manager')
          ELSE sm.role IN ('owner', 'manager', 'staff')
        END
      )
  );
$$;

-- Strict Tenant Isolation RLS Policies
CREATE POLICY tenant_leads_policy ON public.leads
    FOR ALL
    TO authenticated
    USING (public.is_store_member(store_id, 'staff'))
    WITH CHECK (public.is_store_member(store_id, 'staff'));

CREATE POLICY tenant_landing_sites_policy ON public.landing_sites
    FOR ALL
    TO authenticated
    USING (public.is_store_member(store_id, 'staff'))
    WITH CHECK (public.is_store_member(store_id, 'manager'));

CREATE POLICY tenant_ai_agent_configs_policy ON public.ai_agent_configs
    FOR ALL
    TO authenticated
    USING (public.is_store_member(store_id, 'staff'))
    WITH CHECK (public.is_store_member(store_id, 'manager'));

CREATE POLICY tenant_whatsapp_drafts_policy ON public.whatsapp_drafts
    FOR ALL
    TO authenticated
    USING (public.is_store_member(store_id, 'staff'))
    WITH CHECK (public.is_store_member(store_id, 'staff'));

CREATE POLICY tenant_supplier_invoices_policy ON public.supplier_invoices
    FOR ALL
    TO authenticated
    USING (public.is_store_member(store_id, 'staff'))
    WITH CHECK (public.is_store_member(store_id, 'staff'));

-- Public Policy for Published Landing Sites (Anon Visitors)
CREATE POLICY public_read_landing_sites ON public.landing_sites
    FOR SELECT
    TO anon
    USING (published = true);

-- Strict Public Policy for Lead Capture (Anon Visitors can only insert if store exists)
CREATE POLICY public_insert_lead_capture ON public.leads
    FOR INSERT
    TO anon
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.stores s 
            WHERE s.id = store_id
        )
    );
