-- SQL Migration: Setup Multi-Channel E-Commerce SaaS Schema (Phase 1)

-- 1. PLATFORM ACCOUNTS TABLE
CREATE TABLE IF NOT EXISTS public.platform_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    platform_name TEXT NOT NULL, -- 'ebay', 'amazon', 'uber_eats', 'just_eat', 'alibaba', 'logistics'
    account_name TEXT NOT NULL,
    status TEXT DEFAULT 'Inactive'::text NOT NULL,
    credentials JSONB DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT check_status CHECK (status IN ('Active', 'Inactive'))
);

-- 2. TRADE ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.trade_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    platform_account_id UUID REFERENCES public.platform_accounts(id) ON DELETE SET NULL,
    external_order_id TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    total_amount NUMERIC(10, 2) NOT NULL,
    order_status TEXT DEFAULT 'Pending'::text NOT NULL,
    channel TEXT NOT NULL, -- 'ebay', 'amazon', 'uber_eats', etc.
    items JSONB DEFAULT '[]'::jsonb NOT NULL
);

-- 3. COMPETITOR PRICING TABLE
CREATE TABLE IF NOT EXISTS public.competitor_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    competitor_name TEXT NOT NULL,
    competitor_url TEXT,
    price NUMERIC(10, 2) NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL
);

-- Indexing for high-performance multi-tenant querying
CREATE INDEX IF NOT EXISTS idx_platform_accounts_store_id ON public.platform_accounts(store_id);
CREATE INDEX IF NOT EXISTS idx_trade_orders_store_id ON public.trade_orders(store_id);
CREATE INDEX IF NOT EXISTS idx_trade_orders_platform_account_id ON public.trade_orders(platform_account_id);
CREATE INDEX IF NOT EXISTS idx_competitor_pricing_product_id ON public.competitor_pricing(product_id);

-- Enable Row Level Security (RLS) on new tables
ALTER TABLE public.platform_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitor_pricing ENABLE ROW LEVEL SECURITY;

-- Create baseline tenant-isolation policies
-- Allow authenticated users full operations for now; can be further locked down per tenant in auth profiles.
CREATE POLICY tenant_platform_accounts_policy ON public.platform_accounts
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY tenant_trade_orders_policy ON public.trade_orders
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY tenant_competitor_pricing_policy ON public.competitor_pricing
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
