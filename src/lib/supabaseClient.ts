// Supabase Client Initializer with Dynamic Local-Storage Fallback

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

// Check if credentials are using defaults
const isMock = supabaseUrl.includes('your-project-id') || supabaseUrl.includes('placeholder');

export const supabase = createClient(
  isMock ? 'https://placeholder.supabase.co' : supabaseUrl,
  isMock ? 'placeholder-anon-key' : supabaseAnonKey
);

// ==========================================
// High-Fidelity Mock Database Engine (Offline Mode)
// ==========================================

// Domain entity types — single source of truth in ./types (re-exported
// here so existing imports of `{ Store, Product, ... } from '@/lib/supabaseClient'`
// keep working).
import type {
  Store,
  Product,
  Order,
  Integration,
  CompetitorPricing,
  Lead,
  LandingSite,
  AiAgentConfig,
  WhatsAppDraft,
  SupplierInvoice,
} from './types';
export type {
  Store,
  Product,
  Order,
  Integration,
  CompetitorPricing,
  Lead,
  LandingSite,
  AiAgentConfig,
  WhatsAppDraft,
  SupplierInvoice,
  PlatformAccount,
  LeadScore,
  LeadStatus,
  LeadSource,
} from './types';


export const DEFAULT_STORE_ID = '00000000-0000-0000-0000-000000000001';

// Seed Mock Data
const MOCK_STORES: Store[] = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Miller Demo Store',
    subdomain: 'demo',
    logo_text: '⚡',
    description: 'Seeded default tenant for Miller SaaS Hub.',
    primary_color: '#EF178E',
    secondary_color: '#8E54E9',
    bg_color: '#ffffff',
    text_color: '#1f2937',
    btn_color: '#EF178E',
    layout: 'grid'
  },
  {
    id: 'store-1',
    name: 'Aura Artisans',
    subdomain: 'aura',
    logo_text: '🏺',
    description: 'Handmade ceramic pottery, stoneware, and textiles designed for the slow-living home.',
    primary_color: '#8b5cf6',
    secondary_color: '#ec4899',
    bg_color: '#ffffff',
    text_color: '#1f2937',
    btn_color: '#8b5cf6',
    layout: 'grid'
  },
  {
    id: 'store-2',
    name: 'Zenith Devices',
    subdomain: 'zenith',
    logo_text: '💻',
    description: 'Minimalist aluminum stands, mechanical keyboards, and studio audio gear for modern desk setups.',
    primary_color: '#1f2937',
    secondary_color: '#6b7280',
    bg_color: '#ffffff',
    text_color: '#111827',
    btn_color: '#1f2937',
    layout: 'grid'
  }
];

const MOCK_PRODUCTS: Product[] = [
  {
    id: 'p1',
    store_id: DEFAULT_STORE_ID,
    name: 'Speckled Ceramic Mug',
    price: 24.00,
    category: 'Beverages',
    description: 'Wheel-thrown speckled clay mug finished with a white matte food-safe glaze.',
    stock: 12,
    image: '☕'
  },
  {
    id: 'p2',
    store_id: DEFAULT_STORE_ID,
    name: 'Merino Wool Throw',
    price: 89.00,
    category: 'Apparel',
    description: 'Woven from organic merino wool in a minimalist neutral plaid print. Incredibly soft and warm.',
    stock: 8,
    image: '🧥'
  },
  {
    id: 'p3',
    store_id: DEFAULT_STORE_ID,
    name: 'Custom Mechanical Keyboard',
    price: 189.00,
    category: 'Electronics',
    description: '75% form factor keyboard featuring custom-lubed linear switches, PBT keycaps, and brass dampener.',
    stock: 5,
    image: '💻'
  }
];

const MOCK_ORDERS: Order[] = [
  {
    id: 'ord-1',
    store_id: DEFAULT_STORE_ID,
    customer_name: 'Alex Rivers',
    customer_email: 'alex.rivers@gmail.com',
    total: 48.00,
    status: 'Delivered',
    shipping_address: '456 Pine St, Seattle, WA',
    created_at: new Date(Date.now() - 172800000).toISOString()
  },
  {
    id: 'ord-2',
    store_id: DEFAULT_STORE_ID,
    customer_name: 'Samantha Green',
    customer_email: 'sam.green@outlook.com',
    total: 69.00,
    status: 'Pending',
    shipping_address: '789 Elm Ave, Portland, OR',
    created_at: new Date(Date.now() - 14400000).toISOString()
  }
];

const MOCK_INTEGRATIONS: Integration[] = [
  {
    id: 'int-1',
    store_id: DEFAULT_STORE_ID,
    name: 'Stripe Gateway',
    type: 'payment',
    status: 'Active',
    config: { publicKey: 'pk_test_...', mode: 'Live' }
  },
  {
    id: 'int-2',
    store_id: DEFAULT_STORE_ID,
    name: 'Website Web Scraper',
    type: 'scraper',
    status: 'Inactive',
    config: { feedUrl: 'https://mock-shop.com/catalog.json' }
  },
  {
    id: 'int-3',
    store_id: DEFAULT_STORE_ID,
    name: 'eBay Platform',
    type: 'ebay',
    status: 'Inactive',
    config: { sellerId: 'ebay_seller_123', region: 'UK' }
  },
  {
    id: 'int-4',
    store_id: DEFAULT_STORE_ID,
    name: 'Uber Eats',
    type: 'food_delivery',
    status: 'Inactive',
    config: { restaurantId: 'uber_rest_99', webhookUrl: 'https://api.millersaashub.io/uber' }
  },
  {
    id: 'int-5',
    store_id: DEFAULT_STORE_ID,
    name: 'Just Eat',
    type: 'food_delivery',
    status: 'Inactive',
    config: { restaurantId: 'justeat_rest_77', webhookUrl: 'https://api.millersaashub.io/justeat' }
  },
  {
    id: 'int-6',
    store_id: DEFAULT_STORE_ID,
    name: 'Amazon Connector',
    type: 'amazon',
    status: 'Inactive',
    config: { sellerAccessId: 'aws_seller_amzn', mode: 'FBA' }
  },
  {
    id: 'int-7',
    store_id: DEFAULT_STORE_ID,
    name: 'Alibaba Importer',
    type: 'alibaba',
    status: 'Inactive',
    config: { supplierId: 'ali_supp_888', apiKey: 'ali_key_••••••••' }
  },
  {
    id: 'int-8',
    store_id: DEFAULT_STORE_ID,
    name: 'Logistics Connector',
    type: 'logistics',
    status: 'Inactive',
    config: { apiSecret: 'log_sec_••••••••', originPostcode: 'EC1A 1BB' }
  },
  {
    id: 'int-9',
    store_id: DEFAULT_STORE_ID,
    name: 'WhatsApp Business',
    type: 'whatsapp',
    status: 'Inactive',
    config: { phoneNumberId: '', accessToken: '', businessName: '' }
  },
  {
    id: 'int-10',
    store_id: DEFAULT_STORE_ID,
    name: 'Google My Business',
    type: 'google_business',
    status: 'Inactive',
    config: { locationId: '', accountId: '', category: '' }
  },
  {
    id: 'int-11',
    store_id: DEFAULT_STORE_ID,
    name: 'Mailchimp Marketing',
    type: 'email_marketing',
    status: 'Inactive',
    config: { apiKey: '', listId: '', fromEmail: '' }
  },
  {
    id: 'int-12',
    store_id: DEFAULT_STORE_ID,
    name: 'Xero Accounting',
    type: 'accounting',
    status: 'Inactive',
    config: { tenantId: '', clientId: '', syncMode: 'daily' }
  },
  {
    id: 'int-13',
    store_id: DEFAULT_STORE_ID,
    name: 'Square POS',
    type: 'pos',
    status: 'Inactive',
    config: { accessToken: '', locationId: '', syncInventory: 'true' }
  },
  {
    id: 'int-14',
    store_id: DEFAULT_STORE_ID,
    name: 'Telegram Notifications',
    type: 'telegram',
    status: 'Inactive',
    config: { botToken: '', chatId: '', notifyOrders: 'true', notifyLowStock: 'true' }
  },
  {
    id: 'int-15',
    store_id: DEFAULT_STORE_ID,
    name: 'GoCardless',
    type: 'gocardless',
    status: 'Inactive',
    config: { accessToken: '', environment: 'sandbox', webhookSecret: '' }
  },
  {
    id: 'int-16',
    store_id: DEFAULT_STORE_ID,
    name: 'TrueLayer',
    type: 'truelayer',
    status: 'Inactive',
    config: { clientId: '', clientSecret: '', redirectUri: '' }
  },
  {
    id: 'int-17',
    store_id: DEFAULT_STORE_ID,
    name: 'Volt',
    type: 'volt',
    status: 'Inactive',
    config: { apiKey: '', merchantId: '', webhookUrl: '' }
  },
  {
    id: 'int-18',
    store_id: DEFAULT_STORE_ID,
    name: 'Banked',
    type: 'banked',
    status: 'Inactive',
    config: { apiKey: '', merchantId: '', environment: 'sandbox' }
  },
  {
    id: 'int-19',
    store_id: DEFAULT_STORE_ID,
    name: 'Tink (Visa)',
    type: 'tink',
    status: 'Inactive',
    config: { clientId: '', clientSecret: '', market: 'GB' }
  },
  {
    id: 'int-20',
    store_id: DEFAULT_STORE_ID,
    name: 'Lead Capture Form',
    type: 'lead_capture',
    status: 'Inactive',
    config: { formTitle: 'Get in Touch', notifyEmail: '', webhookUrl: '', requirePhone: 'true', requireCountry: 'true' }
  }
];

const MOCK_COMPETITOR_PRICING: CompetitorPricing[] = [
  {
    id: 'cp-1',
    product_id: 'p1', // Speckled Ceramic Mug ($24.00)
    competitor_name: 'Amazon',
    competitor_url: 'https://amazon.com/dp/B08XWWZZ',
    price: 22.50,
    is_active: true
  },
  {
    id: 'cp-2',
    product_id: 'p1',
    competitor_name: 'Etsy Seller',
    competitor_url: 'https://etsy.com/listing/988223',
    price: 26.00,
    is_active: true
  },
  {
    id: 'cp-3',
    product_id: 'p2', // Merino Wool Throw ($89.00)
    competitor_name: 'Target',
    competitor_url: 'https://target.com/p/87823',
    price: 95.00,
    is_active: true
  }
];

// Helper database manager (dynamic local storage)
const getLocalStorageData = <T>(key: string, initialData: T[]): T[] => {
  if (typeof window === 'undefined') return initialData;
  const data = localStorage.getItem(key);
  if (data) {
    try {
      return JSON.parse(data);
    } catch {
      // Fallback
    }
  }
  try {
    localStorage.setItem(key, JSON.stringify(initialData));
  } catch (e) {
    console.warn("Storage quota exceeded during initialization:", e);
  }
  return initialData;
};

const setLocalStorageData = <T>(key: string, data: T[]) => {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.warn("Storage quota exceeded. Unable to save updates to local storage:", e);
    }
  }
};

export const db = {
  getStores: async (): Promise<Store[]> => {
    if (!isMock) {
      const { data, error } = await supabase.from('stores').select('*');
      if (!error && data) return data as Store[];
    }
    const result = getLocalStorageData('db_stores', MOCK_STORES);
    if (result.length === 0) {
      setLocalStorageData('db_stores', MOCK_STORES);
      return MOCK_STORES;
    }
    return result;
  },

  createStore: async (store: Omit<Store, 'id'>): Promise<Store> => {
    const newStore: Store = { ...store, id: `store-${Date.now()}` };
    if (!isMock) {
      const { data, error } = await supabase.from('stores').insert([store]).select().single();
      if (!error && data) return data as Store;
    }
    const current = getLocalStorageData('db_stores', MOCK_STORES);
    const updated = [...current, newStore];
    setLocalStorageData('db_stores', updated);
    return newStore;
  },

  getProducts: async (storeId: string): Promise<Product[]> => {
    if (!isMock) {
      const { data, error } = await supabase.from('products').select('*').eq('store_id', storeId);
      if (!error && data) return data as Product[];
    }
    const all = getLocalStorageData('db_products', MOCK_PRODUCTS);
    return all.filter(p => p.store_id === storeId);
  },

  addProduct: async (product: Omit<Product, 'id'>): Promise<Product> => {
    const newProduct: Product = { ...product, id: `prod-${Date.now()}` };
    if (!isMock) {
      const { data, error } = await supabase.from('products').insert([product]).select().single();
      if (!error && data) return data as Product;
    }
    const all = getLocalStorageData('db_products', MOCK_PRODUCTS);
    const updated = [...all, newProduct];
    setLocalStorageData('db_products', updated);
    return newProduct;
  },

  updateProduct: async (productId: string, updates: Partial<Omit<Product, 'id' | 'store_id'>>): Promise<boolean> => {
    if (!isMock) {
      const { error } = await supabase.from('products').update(updates).eq('id', productId);
      if (!error) return true;
    }
    const all = getLocalStorageData('db_products', MOCK_PRODUCTS);
    const updated = all.map(p => p.id === productId ? { ...p, ...updates } : p);
    setLocalStorageData('db_products', updated);
    return true;
  },

  deleteProduct: async (productId: string): Promise<boolean> => {
    if (!isMock) {
      const { error } = await supabase.from('products').delete().eq('id', productId);
      if (!error) return true;
    }
    const all = getLocalStorageData('db_products', MOCK_PRODUCTS);
    const updated = all.filter(p => p.id !== productId);
    setLocalStorageData('db_products', updated);
    return true;
  },

  getOrders: async (storeId: string): Promise<Order[]> => {
    if (!isMock) {
      const { data, error } = await supabase.from('orders').select('*').eq('store_id', storeId);
      if (!error && data) return data as Order[];
    }
    const all = getLocalStorageData('db_orders', MOCK_ORDERS);
    const forStore = all.filter(o => o.store_id === storeId);
    if (forStore.length === 0) {
      const seeded = MOCK_ORDERS.map(o => ({
        ...o,
        id: `${o.id}-${storeId}`,
        store_id: storeId,
      }));
      setLocalStorageData('db_orders', [...all, ...seeded]);
      return seeded;
    }
    return forStore;
  },

  updateOrderStatus: async (orderId: string, status: Order['status']): Promise<boolean> => {
    if (!isMock) {
      const { error } = await supabase.from('orders').update({ status }).eq('id', orderId);
      if (!error) return true;
    }
    const all = getLocalStorageData('db_orders', MOCK_ORDERS);
    const updated = all.map(o => o.id === orderId ? { ...o, status } : o);
    setLocalStorageData('db_orders', updated);
    return true;
  },

  getIntegrations: async (storeId: string): Promise<Integration[]> => {
    if (!isMock) {
      const { data, error } = await supabase.from('integrations').select('*').eq('store_id', storeId);
      if (!error && data) return data as Integration[];
    }
    const all = getLocalStorageData('db_integrations_v2', MOCK_INTEGRATIONS);
    const forStore = all.filter(i => i.store_id === storeId);
    // Seed default integrations for this store if none exist yet
    if (forStore.length === 0) {
      const seeded = MOCK_INTEGRATIONS.map(i => ({
        ...i,
        id: `${i.id}-${storeId}`,
        store_id: storeId,
      }));
      const updated = [...all, ...seeded];
      setLocalStorageData('db_integrations_v2', updated);
      return seeded;
    }
    return forStore;
  },

  toggleIntegration: async (integrationId: string, status: Integration['status']): Promise<boolean> => {
    if (!isMock) {
      const { error } = await supabase.from('integrations').update({ status }).eq('id', integrationId);
      if (!error) return true;
    }
    const all = getLocalStorageData('db_integrations_v2', MOCK_INTEGRATIONS);
    const updated = all.map(i => i.id === integrationId ? { ...i, status } : i);
    setLocalStorageData('db_integrations_v2', updated);
    return true;
  },

  updateIntegrationConfig: async (integrationId: string, config: Record<string, string>): Promise<boolean> => {
    if (!isMock) {
      const { error } = await supabase.from('integrations').update({ config }).eq('id', integrationId);
      if (!error) return true;
    }
    const all = getLocalStorageData('db_integrations_v2', MOCK_INTEGRATIONS);
    const updated = all.map(i => i.id === integrationId ? { ...i, config } : i);
    setLocalStorageData('db_integrations_v2', updated);
    return true;
  },

  getCompetitorPrices: async (productId: string): Promise<CompetitorPricing[]> => {
    if (!isMock) {
      const { data, error } = await supabase.from('competitor_pricing').select('*').eq('product_id', productId);
      if (!error && data) return data as CompetitorPricing[];
    }
    const all = getLocalStorageData('db_competitor_pricing', MOCK_COMPETITOR_PRICING);
    return all.filter(cp => cp.product_id === productId);
  },

  addCompetitorPrice: async (pricing: Omit<CompetitorPricing, 'id'>): Promise<CompetitorPricing> => {
    const newPrice: CompetitorPricing = { ...pricing, id: `cp-${Date.now()}` };
    if (!isMock) {
      const { data, error } = await supabase.from('competitor_pricing').insert([pricing]).select().single();
      if (!error && data) return data as CompetitorPricing;
    }
    const all = getLocalStorageData('db_competitor_pricing', MOCK_COMPETITOR_PRICING);
    const updated = [...all, newPrice];
    setLocalStorageData('db_competitor_pricing', updated);
    return newPrice;
  },

  triggerCompetitorScraper: async (productId: string, competitorName: string, competitorUrl: string): Promise<CompetitorPricing> => {
    if (!isMock) {
      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/competitor-scraper`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseAnonKey}`
          },
          body: JSON.stringify({ product_id: productId, competitor_name: competitorName, url: competitorUrl })
        });
        const result = await response.json();
        if (result.success && result.data) {
          return result.data as CompetitorPricing;
        }
      } catch (err) {
        console.error("Failed triggering live scraper, using mock fallback:", err);
      }
    }
    
    // Fallback: Mock crawler logic (simulates Deno Edge Function response delay)
    await new Promise(resolve => setTimeout(resolve, 1500));
    const randomPrice = Math.round((15 + Math.random() * 85) * 100) / 100;
    
    return db.addCompetitorPrice({
      product_id: productId,
      competitor_name: competitorName,
      competitor_url: competitorUrl,
      price: randomPrice,
      is_active: true
    });
  },

  // ==========================================
  // v2 Lead Management CRM Operations
  // ==========================================
  getLeads: async (storeId: string = DEFAULT_STORE_ID): Promise<Lead[]> => {
    if (!isMock) {
      const { data, error } = await supabase.from('leads').select('*').eq('store_id', storeId).order('created_at', { ascending: false });
      if (!error && data) return data as Lead[];
    }
    interface RawStorageLead {
      id: string;
      storeId?: string;
      name: string;
      contact?: string;
      contactType?: 'whatsapp' | 'email' | 'phone';
      source?: Lead['source'];
      sourceName?: string;
      score?: Lead['score'];
      status?: Lead['status'];
      businessUnit?: string;
      notes?: string;
      tags?: string[];
      estimatedValue?: number;
      nextAction?: string;
      nextActionDate?: string;
      lastContactedAt?: string;
      nurtureSent?: number;
      nurtureMessages?: unknown[];
      capturedAt?: string;
    }
    const raw = getLocalStorageData<RawStorageLead>('miller_leads_v1', []);
    // Tenant isolation: legacy items without a storeId belong to the
    // default tenant; everything else must match the requested store.
    const filtered = raw.filter(l => (l.storeId || DEFAULT_STORE_ID) === storeId);
    return filtered.map((l: RawStorageLead) => ({
      id: l.id,
      store_id: storeId,
      name: l.name,
      contact: l.contact || '',
      contact_type: l.contactType || 'whatsapp',
      source: l.source || 'manual',
      source_name: l.sourceName,
      score: l.score || 'cold',
      status: l.status || 'new',
      business_unit: l.businessUnit,
      notes: l.notes || '',
      tags: l.tags || [],
      estimated_value: l.estimatedValue || 0,
      next_action: l.nextAction,
      next_action_date: l.nextActionDate,
      last_contacted_at: l.lastContactedAt,
      nurture_sent: l.nurtureSent || 0,
      nurture_messages: l.nurtureMessages || [],
      created_at: l.capturedAt || new Date().toISOString(),
    }));
  },

  createLead: async (lead: Omit<Lead, 'id' | 'store_id' | 'score' | 'status' | 'created_at'> &
    Partial<Pick<Lead, 'store_id' | 'score' | 'status' | 'created_at'>> & { id?: string }): Promise<Lead> => {
    const id = lead.id || `lead-${Date.now().toString(36)}`;
    const fullLead: Lead = {
      ...lead,
      id,
      store_id: lead.store_id || DEFAULT_STORE_ID,
      score: lead.score || 'cold',
      status: lead.status || 'new',
      created_at: lead.created_at || new Date().toISOString()
    };

    if (!isMock) {
      const { data, error } = await supabase.from('leads').insert([fullLead]).select().single();
      if (!error && data) return data as Lead;
    }

    interface EcosystemLeadItem {
      id: string;
      storeId?: string;
      name: string;
      contact: string;
      contactType: 'whatsapp' | 'email' | 'phone';
      source: Lead['source'];
      sourceName?: string;
      score: Lead['score'];
      status: Lead['status'];
      businessUnit?: string;
      notes?: string;
      tags: string[];
      capturedAt?: string;
      estimatedValue?: number;
      nurtureSent: number;
      nurtureMessages: unknown[];
    }
    const raw = getLocalStorageData<EcosystemLeadItem>('miller_leads_v1', []);
    const ecosystemItem: EcosystemLeadItem = {
      id: fullLead.id,
      storeId: fullLead.store_id,
      name: fullLead.name,
      contact: fullLead.contact,
      contactType: fullLead.contact_type,
      source: fullLead.source,
      sourceName: fullLead.source_name,
      score: fullLead.score,
      status: fullLead.status,
      businessUnit: fullLead.business_unit,
      notes: fullLead.notes,
      tags: fullLead.tags || [],
      capturedAt: fullLead.created_at,
      estimatedValue: fullLead.estimated_value,
      nurtureSent: fullLead.nurture_sent || 0,
      nurtureMessages: fullLead.nurture_messages || [],
    };
    setLocalStorageData('miller_leads_v1', [ecosystemItem, ...raw]);
    return fullLead;
  },

  updateLeadStatus: async (leadId: string, status: Lead['status']): Promise<boolean> => {
    if (!isMock) {
      const { error } = await supabase.from('leads').update({ status, updated_at: new Date().toISOString() }).eq('id', leadId);
      if (!error) return true;
    }
    interface BaseLeadRecord {
      id: string;
      status?: Lead['status'];
      [key: string]: unknown;
    }
    const raw = getLocalStorageData<BaseLeadRecord>('miller_leads_v1', []);
    const updated = raw.map((l: BaseLeadRecord) => l.id === leadId ? { ...l, status } : l);
    setLocalStorageData('miller_leads_v1', updated);
    return true;
  },

  // ==========================================
  // v2 Landing Sites Engine Operations
  // ==========================================
  getLandingSites: async (storeId: string = DEFAULT_STORE_ID): Promise<LandingSite[]> => {
    if (!isMock) {
      const { data, error } = await supabase.from('landing_sites').select('*').eq('store_id', storeId).order('created_at', { ascending: false });
      if (!error && data) return data as LandingSite[];
    }
    interface RawStorageSite {
      id: string;
      businessName?: string;
      createdAt?: string;
      updatedAt?: string;
      published?: boolean;
      html?: string;
    }
    const raw = getLocalStorageData<RawStorageSite>('miller_landing_sites_v1', []);
    return raw.map((s: RawStorageSite) => ({
      id: s.id,
      store_id: storeId,
      business_name: s.businessName || 'Merchant',
      published: s.published ?? true,
      html: s.html || '',
      created_at: s.createdAt || new Date().toISOString(),
      updated_at: s.updatedAt || new Date().toISOString(),
    }));
  },

  getLandingSiteBySlug: async (slug: string): Promise<LandingSite | null> => {
    if (!isMock) {
      const { data, error } = await supabase
        .from('landing_sites')
        .select('*')
        .eq('slug', slug)
        .eq('published', true)
        .single();
      if (!error && data) return data as LandingSite;
    }
    interface RawStorageSite {
      id: string;
      businessName?: string;
      slug?: string;
      createdAt?: string;
      updatedAt?: string;
      published?: boolean;
      html?: string;
    }
    const raw = getLocalStorageData<RawStorageSite>('miller_landing_sites_v1', []);
    const match = raw.find((s: RawStorageSite) => 
      s.slug?.toLowerCase() === slug.toLowerCase() || 
      s.id.toLowerCase() === slug.toLowerCase() ||
      s.businessName?.toLowerCase().replace(/[^a-z0-9]/g, '-') === slug.toLowerCase()
    );
    if (match) {
      return {
        id: match.id,
        store_id: DEFAULT_STORE_ID,
        business_name: match.businessName || 'Merchant',
        slug: match.slug || slug,
        published: match.published ?? true,
        html: match.html || '',
        created_at: match.createdAt || new Date().toISOString(),
        updated_at: match.updatedAt || new Date().toISOString(),
      };
    }
    return null;
  },

  saveLandingSite: async (site: Partial<LandingSite> & { html: string; business_name: string }): Promise<LandingSite> => {
    const id = site.id || `site-${Date.now().toString(36)}`;
    const fullSite: LandingSite = {
      id,
      store_id: site.store_id || DEFAULT_STORE_ID,
      business_name: site.business_name,
      slug: site.slug || site.business_name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      published: site.published ?? true,
      html: site.html,
      created_at: site.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (!isMock) {
      const { data, error } = await supabase.from('landing_sites').upsert([fullSite]).select().single();
      if (!error && data) return data as LandingSite;
    }

    interface StoredSiteItem {
      id: string;
      businessName: string;
      createdAt?: string;
      updatedAt?: string;
      published?: boolean;
      html: string;
    }
    const raw = getLocalStorageData<StoredSiteItem>('miller_landing_sites_v1', []);
    const existingIdx = raw.findIndex((s: StoredSiteItem) => s.id === id);
    const item: StoredSiteItem = {
      id: fullSite.id,
      businessName: fullSite.business_name,
      createdAt: fullSite.created_at,
      updatedAt: fullSite.updated_at,
      published: fullSite.published,
      html: fullSite.html,
    };
    if (existingIdx >= 0) {
      raw[existingIdx] = item;
      setLocalStorageData('miller_landing_sites_v1', raw);
    } else {
      setLocalStorageData('miller_landing_sites_v1', [item, ...raw]);
    }
    return fullSite;
  },

  deleteLead: async (leadId: string): Promise<boolean> => {
    if (!isMock) {
      const { error } = await supabase.from('leads').delete().eq('id', leadId);
      if (!error) return true;
    }
    interface BaseLeadRecord {
      id: string;
      [key: string]: unknown;
    }
    const raw = getLocalStorageData<BaseLeadRecord>('miller_leads_v1', []);
    setLocalStorageData('miller_leads_v1', raw.filter(l => l.id !== leadId));
    return true;
  },

  // ==========================================
  // v2 Supplier Invoices Operations
  // ==========================================
  getSupplierInvoices: async (storeId: string = DEFAULT_STORE_ID): Promise<SupplierInvoice[]> => {
    if (!isMock) {
      const { data, error } = await supabase
        .from('supplier_invoices')
        .select('*')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false });
      if (!error && data) return data as SupplierInvoice[];
    }
    const raw = getLocalStorageData<SupplierInvoice>('miller_supplier_invoices_v1', []);
    return raw.filter(inv => !inv.store_id || inv.store_id === storeId);
  },

  createSupplierInvoice: async (invoice: Omit<SupplierInvoice, 'id' | 'store_id' | 'status' | 'created_at'> &
    Partial<Pick<SupplierInvoice, 'store_id' | 'status' | 'created_at'>> & { id?: string }): Promise<SupplierInvoice> => {
    const id = invoice.id || `inv-${Date.now().toString(36)}`;
    const fullInvoice: SupplierInvoice = {
      ...invoice,
      id,
      store_id: invoice.store_id || DEFAULT_STORE_ID,
      status: invoice.status || 'Pending',
      created_at: invoice.created_at || new Date().toISOString()
    };
    if (!isMock) {
      const { data, error } = await supabase.from('supplier_invoices').insert([fullInvoice]).select().single();
      if (!error && data) return data as SupplierInvoice;
    }
    const raw = getLocalStorageData<SupplierInvoice>('miller_supplier_invoices_v1', []);
    setLocalStorageData('miller_supplier_invoices_v1', [fullInvoice, ...raw]);
    return fullInvoice;
  },

  updateSupplierInvoiceStatus: async (invoiceId: string, status: SupplierInvoice['status']): Promise<boolean> => {
    if (!isMock) {
      const { error } = await supabase.from('supplier_invoices').update({ status }).eq('id', invoiceId);
      if (!error) return true;
    }
    const raw = getLocalStorageData<SupplierInvoice>('miller_supplier_invoices_v1', []);
    const updated = raw.map(inv => inv.id === invoiceId ? { ...inv, status } : inv);
    setLocalStorageData('miller_supplier_invoices_v1', updated);
    return true;
  },

  deleteSupplierInvoice: async (invoiceId: string): Promise<boolean> => {
    if (!isMock) {
      const { error } = await supabase.from('supplier_invoices').delete().eq('id', invoiceId);
      if (!error) return true;
    }
    const raw = getLocalStorageData<SupplierInvoice>('miller_supplier_invoices_v1', []);
    setLocalStorageData('miller_supplier_invoices_v1', raw.filter(inv => inv.id !== invoiceId));
    return true;
  },

  // ==========================================
  // v2 AI Agent Configs Operations
  // ==========================================
  getAiAgentConfigs: async (storeId: string = DEFAULT_STORE_ID): Promise<AiAgentConfig[]> => {
    if (!isMock) {
      const { data, error } = await supabase
        .from('ai_agent_configs')
        .select('*')
        .eq('store_id', storeId)
        .order('created_at', { ascending: true });
      if (!error && data) return data as AiAgentConfig[];
    }
    const raw = getLocalStorageData<AiAgentConfig>('miller_agent_cfg_v1', []);
    return raw.filter(cfg => !cfg.store_id || cfg.store_id === storeId);
  },

  saveAiAgentConfig: async (agentConfig: Partial<AiAgentConfig> & { agent_id: string; label: string }): Promise<AiAgentConfig> => {
    const id = agentConfig.id || `ag-${Date.now().toString(36)}`;
    const fullConfig: AiAgentConfig = {
      id,
      store_id: agentConfig.store_id || DEFAULT_STORE_ID,
      agent_id: agentConfig.agent_id,
      label: agentConfig.label,
      emoji: agentConfig.emoji || '🤖',
      enabled: agentConfig.enabled ?? true,
      tasks_done: agentConfig.tasks_done || 0,
      config: agentConfig.config || {},
      created_at: agentConfig.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    if (!isMock) {
      const { data, error } = await supabase.from('ai_agent_configs').upsert([fullConfig], { onConflict: 'store_id,agent_id' }).select().single();
      if (!error && data) return data as AiAgentConfig;
    }
    const raw = getLocalStorageData<AiAgentConfig>('miller_agent_cfg_v1', []);
    const idx = raw.findIndex(a => a.agent_id === fullConfig.agent_id);
    if (idx >= 0) {
      raw[idx] = fullConfig;
      setLocalStorageData('miller_agent_cfg_v1', raw);
    } else {
      setLocalStorageData('miller_agent_cfg_v1', [...raw, fullConfig]);
    }
    return fullConfig;
  },

  // ==========================================
  // v2 WhatsApp Drafts Operations
  // ==========================================
  getWhatsAppDrafts: async (storeId: string = DEFAULT_STORE_ID): Promise<WhatsAppDraft[]> => {
    if (!isMock) {
      const { data, error } = await supabase.from('whatsapp_drafts').select('*').eq('store_id', storeId).order('created_at', { ascending: false });
      if (!error && data) return data as WhatsAppDraft[];
    }
    interface RawStorageDraft {
      id: string;
      leadName?: string;
      recipient_name?: string;
      phone?: string;
      recipient_phone?: string;
      text?: string;
      message_text?: string;
      status?: WhatsAppDraft['status'];
      createdAt?: string;
    }
    const raw = getLocalStorageData<RawStorageDraft>('miller_wa_drafts_v1', []);
    return raw.map((d: RawStorageDraft) => ({
      id: d.id,
      store_id: storeId,
      recipient_name: d.leadName || d.recipient_name || 'Prospect',
      recipient_phone: d.phone || d.recipient_phone || '',
      message_text: d.text || d.message_text || '',
      status: d.status || 'Draft',
      created_at: d.createdAt || new Date().toISOString()
    }));
  },

  createWhatsAppDraft: async (draft: Omit<WhatsAppDraft, 'id'>): Promise<WhatsAppDraft> => {
    const id = `wa-${Date.now().toString(36)}`;
    const fullDraft: WhatsAppDraft = { ...draft, id, created_at: new Date().toISOString() };
    if (!isMock) {
      const { data, error } = await supabase.from('whatsapp_drafts').insert([fullDraft]).select().single();
      if (!error && data) return data as WhatsAppDraft;
    }
    interface StoredDraftItem {
      id: string;
      leadName: string;
      phone: string;
      text: string;
      status: WhatsAppDraft['status'];
      createdAt?: string;
    }
    const raw = getLocalStorageData<StoredDraftItem>('miller_wa_drafts_v1', []);
    const item: StoredDraftItem = {
      id: fullDraft.id,
      leadName: fullDraft.recipient_name,
      phone: fullDraft.recipient_phone,
      text: fullDraft.message_text,
      status: fullDraft.status,
      createdAt: fullDraft.created_at
    };
    setLocalStorageData('miller_wa_drafts_v1', [item, ...raw]);
    return fullDraft;
  },

  // ==========================================
  // v2 Platform Accounts Operations
  // ==========================================
  getPlatformAccounts: async (storeId: string = DEFAULT_STORE_ID): Promise<Record<string, { apiKey: string; apiSecret: string; storeUrl: string; status: 'disconnected' | 'connected' | 'error' | 'testing'; notes: string }>> => {
    if (!isMock) {
      const { data, error } = await supabase
        .from('platform_accounts')
        .select('*')
        .eq('store_id', storeId);
      if (!error && data && data.length > 0) {
        const accMap: Record<string, { apiKey: string; apiSecret: string; storeUrl: string; status: 'disconnected' | 'connected' | 'error' | 'testing'; notes: string }> = {};
        data.forEach((item: Record<string, unknown>) => {
          const pid = (item.platform_name || item.platform_id) as string;
          const creds = (item.credentials && typeof item.credentials === 'object' ? item.credentials : {}) as Record<string, string>;
          accMap[pid] = {
            apiKey: (creds.apiKey || item.api_key || '') as string,
            apiSecret: (creds.apiSecret || item.api_secret || '') as string,
            storeUrl: (creds.storeUrl || item.store_url || '') as string,
            status: (item.status === 'Active' ? 'connected' : item.status === 'Inactive' ? 'disconnected' : item.status) as 'disconnected' | 'connected' | 'error' | 'testing' || 'disconnected',
            notes: (creds.notes || item.notes || '') as string
          };
        });
        return accMap;
      }
    }
    const raw = getLocalStorageData<Record<string, { apiKey: string; apiSecret: string; storeUrl: string; status: 'disconnected' | 'connected' | 'error' | 'testing'; notes: string }>>('miller_platform_conns_v1', [{}]);
    return raw[0] || {};
  },

  savePlatformAccount: async (storeId: string = DEFAULT_STORE_ID, platformId: string, conn: { apiKey: string; apiSecret: string; storeUrl: string; status: string; notes: string }) => {
    const payload = {
      store_id: storeId,
      platform_name: platformId,
      account_name: platformId,
      status: conn.status === 'connected' ? 'Active' : 'Inactive',
      credentials: {
        apiKey: conn.apiKey,
        apiSecret: conn.apiSecret,
        storeUrl: conn.storeUrl,
        status: conn.status,
        notes: conn.notes
      }
    };
    if (!isMock) {
      await supabase.from('platform_accounts').upsert([payload], { onConflict: 'store_id,platform_name' });
    }
    const current = getLocalStorageData<Record<string, typeof conn>>('miller_platform_conns_v1', [{}]);
    const updated = { ...(current[0] || {}), [platformId]: conn };
    setLocalStorageData('miller_platform_conns_v1', [updated]);
    return updated;
  }
};


