-- =====================================================================
-- Miller SaaS Hub — Migration 04
-- ★ SECURITY FIX: migration 02 left platform_accounts, trade_orders and
--   competitor_pricing on `USING (true)` policies — i.e. NO tenant
--   isolation. Any authenticated user could read/write every store's
--   marketplace credentials, orders and competitor data. This rebuilds
--   those three policies on the same is_store_member() helper used by
--   the migration-03 tables. Run AFTER 03_v2_schema.sql.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. platform_accounts  (has store_id)
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS tenant_platform_accounts_policy ON public.platform_accounts;
CREATE POLICY tenant_platform_accounts_policy ON public.platform_accounts
    FOR ALL
    TO authenticated
    USING (public.is_store_member(store_id, 'staff'))
    WITH CHECK (public.is_store_member(store_id, 'manager'));  -- writing credentials = manager+

-- Unique key so the Connect page can upsert one row per (store, platform)
ALTER TABLE public.platform_accounts
    DROP CONSTRAINT IF EXISTS unique_store_platform;
ALTER TABLE public.platform_accounts
    ADD CONSTRAINT unique_store_platform UNIQUE (store_id, platform_name);

-- ---------------------------------------------------------------------
-- 2. trade_orders  (has store_id)
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS tenant_trade_orders_policy ON public.trade_orders;
CREATE POLICY tenant_trade_orders_policy ON public.trade_orders
    FOR ALL
    TO authenticated
    USING (public.is_store_member(store_id, 'staff'))
    WITH CHECK (public.is_store_member(store_id, 'staff'));

-- ---------------------------------------------------------------------
-- 3. competitor_pricing  (NO store_id — isolate via the parent product)
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS tenant_competitor_pricing_policy ON public.competitor_pricing;
CREATE POLICY tenant_competitor_pricing_policy ON public.competitor_pricing
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.products p
            WHERE p.id = competitor_pricing.product_id
              AND public.is_store_member(p.store_id, 'staff')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.products p
            WHERE p.id = competitor_pricing.product_id
              AND public.is_store_member(p.store_id, 'staff')
        )
    );

-- ---------------------------------------------------------------------
-- 4. Role grants (RLS gates the rows; the role still needs table rights)
-- ---------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE
    ON public.platform_accounts, public.trade_orders, public.competitor_pricing
    TO authenticated;

-- =====================================================================
-- After this runs, all three tables enforce the same tenant isolation
-- as the rest of the schema.
-- =====================================================================
