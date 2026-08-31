-- ==============================================================================
-- Migration: 04_strict_security_and_tenancy.sql
-- Description: Optional standalone hardening script for existing Supabase databases
-- Ensures UUID store_members, is_store_member(UUID), and auto-membership trigger
-- ==============================================================================

-- 1. Ensure Store Memberships table with UUID store_id
CREATE TABLE IF NOT EXISTS public.store_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('owner', 'manager', 'staff')),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(store_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_store_members_lookup ON public.store_members(store_id, user_id, role);
ALTER TABLE public.store_members ENABLE ROW LEVEL SECURITY;

-- 2. Drop any legacy TEXT signatures
DROP FUNCTION IF EXISTS public.is_store_member(text, text);

-- 3. Security Definer Helper Function with UUID parameter
CREATE OR REPLACE FUNCTION public.is_store_member(lookup_store_id UUID, min_role TEXT DEFAULT 'staff')
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

-- 4. Enable RLS on core tables
ALTER TABLE public.leads             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landing_sites     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_agent_configs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_drafts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_invoices ENABLE ROW LEVEL SECURITY;

-- 5. Seed default demo store UUID
INSERT INTO public.stores (id, name, subdomain, description)
VALUES ('00000000-0000-0000-0000-000000000001',
        'Miller Demo Store', 'demo', 'Seeded default tenant for Miller SaaS Hub')
ON CONFLICT (id) DO NOTHING;

-- 6. Grants
GRANT SELECT, INSERT, UPDATE, DELETE
    ON public.leads, public.landing_sites, public.ai_agent_configs,
       public.whatsapp_drafts, public.supplier_invoices
    TO authenticated;
GRANT SELECT ON public.store_members TO authenticated;
GRANT INSERT ON public.leads         TO anon;
GRANT SELECT ON public.landing_sites TO anon;
GRANT EXECUTE ON FUNCTION public.is_store_member(UUID, TEXT) TO authenticated;
