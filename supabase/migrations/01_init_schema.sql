-- SQL Migration: Setup Multi-Tenant E-Commerce SaaS Schema

-- 1. STORES TABLE
CREATE TABLE IF NOT EXISTS public.stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    name TEXT NOT NULL,
    subdomain TEXT UNIQUE NOT NULL,
    logo_text TEXT DEFAULT '🛍️'::text,
    primary_color TEXT DEFAULT '#6366f1'::text,
    secondary_color TEXT DEFAULT '#ec4899'::text,
    bg_color TEXT DEFAULT '#ffffff'::text,
    text_color TEXT DEFAULT '#1f2937'::text,
    btn_color TEXT DEFAULT '#6366f1'::text,
    layout TEXT DEFAULT 'grid'::text,
    description TEXT
);

-- 2. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    category TEXT DEFAULT 'Apparel'::text,
    description TEXT,
    stock INTEGER DEFAULT 0 NOT NULL,
    image TEXT DEFAULT '👕'::text,
    image_url TEXT
);

-- 3. ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    total NUMERIC(10, 2) NOT NULL,
    status TEXT DEFAULT 'Pending'::text NOT NULL,
    shipping_address TEXT NOT NULL
);

-- 4. INTEGRATIONS TABLE
CREATE TABLE IF NOT EXISTS public.integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    status TEXT DEFAULT 'Inactive'::text NOT NULL,
    config JSONB DEFAULT '{}'::jsonb NOT NULL
);

-- Indexing for subdomains and store constraints
CREATE INDEX IF NOT EXISTS idx_stores_subdomain ON public.stores(subdomain);
CREATE INDEX IF NOT EXISTS idx_products_store_id ON public.products(store_id);
CREATE INDEX IF NOT EXISTS idx_orders_store_id ON public.orders(store_id);
CREATE INDEX IF NOT EXISTS idx_integrations_store_id ON public.integrations(store_id);
