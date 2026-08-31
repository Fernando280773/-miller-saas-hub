-- =====================================================================
-- Miller SaaS Hub — Migration 03 (v2 schema)  ·  CORRECTED
-- Fixes: store_members.store_id type (TEXT -> UUID) so the FK to
-- stores(id) and the is_store_member() calls actually compile & run.
-- Adds: a seeded demo store with a real UUID, auto-membership on signup,
-- and explicit role grants so anon lead-capture / authenticated CRUD work.
-- Safe to run on a fresh database. If you already ran the broken version,
-- run the "0. CLEANUP" block once first.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. CLEANUP  (only needed if a previous/broken 03 partially applied)
--    Uncomment to re-run cleanly. Drops v2 objects, not v1 data.
-- ---------------------------------------------------------------------
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- DROP FUNCTION IF EXISTS public.handle_new_user();
-- DROP POLICY IF EXISTS tenant_leads_policy ON public.leads;
-- DROP POLICY IF EXISTS tenant_landing_sites_policy ON public.landing_sites;
-- DROP POLICY IF EXISTS tenant_ai_agent_configs_policy ON public.ai_agent_configs;
-- DROP POLICY IF EXISTS tenant_whatsapp_drafts_policy ON public.whatsapp_drafts;
-- DROP POLICY IF EXISTS tenant_supplier_invoices_policy ON public.supplier_invoices;
-- DROP POLICY IF EXISTS public_read_landing_sites ON public.landing_sites;
-- DROP POLICY IF EXISTS public_insert_lead_capture ON public.leads;
-- DROP FUNCTION IF EXISTS public.is_store_member(text, text);
-- DROP FUNCTION IF EXISTS public.is_store_member(uuid, text);
-- DROP TABLE IF EXISTS public.store_members;

-- =====================================================================
-- 1..5  CORE v2 TABLES  (unchanged — these were already correct)
-- =====================================================================

-- 1. LEADS TABLE
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

-- 2. LANDING SITES TABLE
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

-- 3. AI AGENT CONFIGS TABLE
CREATE TABLE IF NOT EXISTS public.ai_agent_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    agent_id TEXT NOT NULL,
    label TEXT NOT NULL,
    emoji TEXT DEFAULT '🤖',
    enabled BOOLEAN DEFAULT true NOT NULL,
    tasks_done INTEGER DEFAULT 0 NOT NULL,
    config JSONB DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT unique_store_agent UNIQUE(store_id, agent_id)
);

-- 4. WHATSAPP DRAFTS TABLE
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

-- 5. SUPPLIER INVOICES TABLE
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_leads_store_id ON public.leads(store_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_score ON public.leads(score);
CREATE INDEX IF NOT EXISTS idx_landing_sites_store_id ON public.landing_sites(store_id);
CREATE INDEX IF NOT EXISTS idx_landing_sites_slug ON public.landing_sites(slug);
CREATE INDEX IF NOT EXISTS idx_ai_agent_configs_store_id ON public.ai_agent_configs(store_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_drafts_store_id ON public.whatsapp_drafts(store_id);
CREATE INDEX IF NOT EXISTS idx_supplier_invoices_store_id ON public.supplier_invoices(store_id);

-- Enable RLS
ALTER TABLE public.leads             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landing_sites     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_agent_configs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_drafts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_invoices ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- 6. STORE MEMBERSHIPS  ·  ★ FIX #1: store_id is UUID (was TEXT)
--    A TEXT column cannot reference a UUID primary key — that mismatch
--    is what made the original migration fail to apply.
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.store_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,   -- ★ was TEXT
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('owner', 'manager', 'staff')),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(store_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_store_members_lookup ON public.store_members(store_id, user_id, role);
ALTER TABLE public.store_members ENABLE ROW LEVEL SECURITY;

-- A member may read their own membership rows (needed so the app can
-- resolve which store the logged-in user belongs to).
DROP POLICY IF EXISTS store_members_self_read ON public.store_members;
CREATE POLICY store_members_self_read ON public.store_members
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- =====================================================================
-- 7. MEMBERSHIP CHECK  ·  ★ FIX #2: parameter is UUID (was TEXT)
--    OR REPLACE cannot change an argument type, so drop the old
--    signature first (policies below are (re)created after this).
-- =====================================================================
DROP FUNCTION IF EXISTS public.is_store_member(text, text);

CREATE OR REPLACE FUNCTION public.is_store_member(lookup_store_id UUID, min_role TEXT DEFAULT 'staff')  -- ★ UUID
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
          WHEN min_role = 'owner'   THEN sm.role = 'owner'
          WHEN min_role = 'manager' THEN sm.role IN ('owner', 'manager')
          ELSE                           sm.role IN ('owner', 'manager', 'staff')
        END
      )
  );
$$;

-- =====================================================================
-- 8. TENANT ISOLATION POLICIES  (unchanged logic; now type-correct)
-- =====================================================================
DROP POLICY IF EXISTS tenant_leads_policy ON public.leads;
CREATE POLICY tenant_leads_policy ON public.leads
    FOR ALL TO authenticated
    USING (public.is_store_member(store_id, 'staff'))
    WITH CHECK (public.is_store_member(store_id, 'staff'));

DROP POLICY IF EXISTS tenant_landing_sites_policy ON public.landing_sites;
CREATE POLICY tenant_landing_sites_policy ON public.landing_sites
    FOR ALL TO authenticated
    USING (public.is_store_member(store_id, 'staff'))
    WITH CHECK (public.is_store_member(store_id, 'manager'));

DROP POLICY IF EXISTS tenant_ai_agent_configs_policy ON public.ai_agent_configs;
CREATE POLICY tenant_ai_agent_configs_policy ON public.ai_agent_configs
    FOR ALL TO authenticated
    USING (public.is_store_member(store_id, 'staff'))
    WITH CHECK (public.is_store_member(store_id, 'manager'));

DROP POLICY IF EXISTS tenant_whatsapp_drafts_policy ON public.whatsapp_drafts;
CREATE POLICY tenant_whatsapp_drafts_policy ON public.whatsapp_drafts
    FOR ALL TO authenticated
    USING (public.is_store_member(store_id, 'staff'))
    WITH CHECK (public.is_store_member(store_id, 'staff'));

DROP POLICY IF EXISTS tenant_supplier_invoices_policy ON public.supplier_invoices;
CREATE POLICY tenant_supplier_invoices_policy ON public.supplier_invoices
    FOR ALL TO authenticated
    USING (public.is_store_member(store_id, 'staff'))
    WITH CHECK (public.is_store_member(store_id, 'staff'));

-- Public (anon) policies
DROP POLICY IF EXISTS public_read_landing_sites ON public.landing_sites;
CREATE POLICY public_read_landing_sites ON public.landing_sites
    FOR SELECT TO anon
    USING (published = true);

DROP POLICY IF EXISTS public_insert_lead_capture ON public.leads;
CREATE POLICY public_insert_lead_capture ON public.leads
    FOR INSERT TO anon
    WITH CHECK (
        source = 'landing_page'                                 -- anon may only file landing-page leads
        AND EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id)
    );

-- =====================================================================
-- 9. ROLE GRANTS  (RLS gates the rows; the role still needs table rights)
-- =====================================================================
GRANT SELECT, INSERT, UPDATE, DELETE
    ON public.leads, public.landing_sites, public.ai_agent_configs,
       public.whatsapp_drafts, public.supplier_invoices
    TO authenticated;
GRANT SELECT ON public.store_members TO authenticated;
GRANT INSERT ON public.leads         TO anon;   -- gated by public_insert_lead_capture
GRANT SELECT ON public.landing_sites TO anon;   -- gated by public_read_landing_sites
GRANT EXECUTE ON FUNCTION public.is_store_member(UUID, TEXT) TO authenticated;

-- =====================================================================
-- 10. SEED DEMO STORE  ·  ★ FIX #3: a real UUID to replace 'store-1'
--     Point the app's live-mode default store id at this UUID.
-- =====================================================================
INSERT INTO public.stores (id, name, subdomain, description)
VALUES ('00000000-0000-0000-0000-000000000001',
        'Miller Demo Store', 'demo', 'Seeded default tenant for Miller SaaS Hub')
ON CONFLICT (id) DO NOTHING;

-- =====================================================================
-- 11. AUTO-MEMBERSHIP ON SIGNUP  ·  closes the "logged in but sees
--     nothing" gap. Without a store_members row, RLS denies everything.
--     New users are attached to the store named in their signup
--     metadata (if it exists) or to the demo store as owner.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    target_store UUID;
    target_role  TEXT;
BEGIN
    BEGIN
        target_store := (NEW.raw_user_meta_data->>'store_id')::uuid;
    EXCEPTION WHEN others THEN
        target_store := NULL;
    END;

    IF target_store IS NULL
       OR NOT EXISTS (SELECT 1 FROM public.stores WHERE id = target_store) THEN
        target_store := '00000000-0000-0000-0000-000000000001';
    END IF;

    target_role := COALESCE(NEW.raw_user_meta_data->>'role', 'owner');
    IF target_role NOT IN ('owner', 'manager', 'staff') THEN
        target_role := 'owner';
    END IF;

    INSERT INTO public.store_members (store_id, user_id, role)
    VALUES (target_store, NEW.id, target_role)
    ON CONFLICT (store_id, user_id) DO NOTHING;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================================
-- End of corrected migration 03
-- =====================================================================
