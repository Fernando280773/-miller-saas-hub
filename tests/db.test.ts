import { describe, it, expect, beforeEach } from 'vitest';
import { db, DEFAULT_STORE_ID } from '@/lib/supabaseClient';

// All db tests run in mock/offline mode: the placeholder URL makes
// isMock=true so every operation persists to the localStorage shim.

describe('db — stores & products (mock mode)', () => {
  beforeEach(() => localStorage.clear());

  it('returns the seeded stores including the default demo tenant', async () => {
    const stores = await db.getStores();
    expect(stores.length).toBeGreaterThan(0);
    const demo = stores.find(s => s.id === DEFAULT_STORE_ID);
    expect(demo?.name).toBe('Miller Demo Store');
  });

  it('creates a new store with a generated id', async () => {
    const created = await db.createStore({
      name: 'New Shop', subdomain: 'new', logo_text: '🛍️',
      primary_color: '#000', secondary_color: '#fff', bg_color: '#fff',
      text_color: '#111', btn_color: '#000', layout: 'grid', description: 'x',
    });
    expect(created.id).toContain('store-');
    const all = await db.getStores();
    expect(all.some(s => s.id === created.id)).toBe(true);
  });

  it('lists products for a store and adds new ones', async () => {
    const initial = await db.getProducts(DEFAULT_STORE_ID);
    const added = await db.addProduct({
      store_id: DEFAULT_STORE_ID, name: 'Test Widget', price: 9.99,
      category: 'Gadgets', description: 'd', stock: 3, image: '🔧',
    });
    expect(added.id).toContain('prod-');
    const updated = await db.getProducts(DEFAULT_STORE_ID);
    expect(updated.some(p => p.id === added.id)).toBe(true);
    expect(updated.length).toBe(initial.length + 1);
  });

  it('updates and deletes a product', async () => {
    const added = await db.addProduct({
      store_id: DEFAULT_STORE_ID, name: 'Temp', price: 1, category: 'x',
      description: '', stock: 1, image: 'x',
    });
    await db.updateProduct(added.id, { price: 42 });
    const all = await db.getProducts(DEFAULT_STORE_ID);
    expect(all.find(p => p.id === added.id)?.price).toBe(42);
    await db.deleteProduct(added.id);
    const after = await db.getProducts(DEFAULT_STORE_ID);
    expect(after.some(p => p.id === added.id)).toBe(false);
  });

  it('returns orders for the default store (auto-seeded)', async () => {
    const orders = await db.getOrders(DEFAULT_STORE_ID);
    expect(orders.length).toBeGreaterThan(0);
    expect(orders.every(o => o.store_id === DEFAULT_STORE_ID)).toBe(true);
  });

  it('updates an order status', async () => {
    const orders = await db.getOrders(DEFAULT_STORE_ID);
    const target = orders[0];
    await db.updateOrderStatus(target.id, 'Shipped');
    const after = await db.getOrders(DEFAULT_STORE_ID);
    expect(after.find(o => o.id === target.id)?.status).toBe('Shipped');
  });
});

describe('db — integrations & competitor pricing', () => {
  beforeEach(() => localStorage.clear());

  it('seeds default integrations for the store', async () => {
    const ints = await db.getIntegrations(DEFAULT_STORE_ID);
    expect(ints.length).toBeGreaterThan(0);
    expect(ints.some(i => i.name === 'Stripe Gateway')).toBe(true);
  });

  it('toggles an integration status', async () => {
    const ints = await db.getIntegrations(DEFAULT_STORE_ID);
    const target = ints[0];
    await db.toggleIntegration(target.id, 'Active');
    const after = await db.getIntegrations(DEFAULT_STORE_ID);
    expect(after.find(i => i.id === target.id)?.status).toBe('Active');
  });

  it('adds and reads competitor pricing', async () => {
    const added = await db.addCompetitorPrice({
      product_id: 'p1', competitor_name: 'Walmart', competitor_url: 'https://walmart.com/x', price: 20.5, is_active: true,
    });
    expect(added.id).toContain('cp-');
    const prices = await db.getCompetitorPrices('p1');
    expect(prices.some(p => p.competitor_name === 'Walmart')).toBe(true);
  });
});

describe('db — v2 CRM: leads, landing sites, invoices, agents, drafts, platforms', () => {
  beforeEach(() => localStorage.clear());

  it('creates and lists leads with defaults applied', async () => {
    const lead = await db.createLead({
      store_id: DEFAULT_STORE_ID, name: 'Prospect One', contact: '+447700900001',
      contact_type: 'whatsapp', source: 'landing_page',
    });
    expect(lead.id).toBeTruthy();
    expect(lead.score).toBe('cold');
    expect(lead.status).toBe('new');
    const leads = await db.getLeads(DEFAULT_STORE_ID);
    expect(leads.some(l => l.id === lead.id)).toBe(true);
  });

  it('updates lead status and deletes a lead', async () => {
    const lead = await db.createLead({
      store_id: DEFAULT_STORE_ID, name: 'Prospect Two', contact: 'p2@x.com',
      contact_type: 'email', source: 'social',
    });
    await db.updateLeadStatus(lead.id, 'qualified');
    const leads = await db.getLeads(DEFAULT_STORE_ID);
    expect(leads.find(l => l.id === lead.id)?.status).toBe('qualified');
    await db.deleteLead(lead.id);
    const after = await db.getLeads(DEFAULT_STORE_ID);
    expect(after.some(l => l.id === lead.id)).toBe(false);
  });

  it('saves and retrieves a landing site by slug', async () => {
    const site = await db.saveLandingSite({
      store_id: DEFAULT_STORE_ID,
      business_name: 'Acme Landing',
      html: '<h1>Hi</h1>',
    });
    expect(site.slug).toBe('acme-landing');
    const bySlug = await db.getLandingSiteBySlug('acme-landing');
    expect(bySlug?.business_name).toBe('Acme Landing');
    const all = await db.getLandingSites(DEFAULT_STORE_ID);
    expect(all.some(s => s.id === site.id)).toBe(true);
  });

  it('creates and updates supplier invoices', async () => {
    const inv = await db.createSupplierInvoice({
      store_id: DEFAULT_STORE_ID, supplier_name: 'Fresh Foods', total_amount: 150,
    });
    expect(inv.status).toBe('Pending');
    await db.updateSupplierInvoiceStatus(inv.id, 'Paid');
    const all = await db.getSupplierInvoices(DEFAULT_STORE_ID);
    expect(all.find(i => i.id === inv.id)?.status).toBe('Paid');
    await db.deleteSupplierInvoice(inv.id);
    const after = await db.getSupplierInvoices(DEFAULT_STORE_ID);
    expect(after.some(i => i.id === inv.id)).toBe(false);
  });

  it('saves and reads AI agent configs', async () => {
    const cfg = await db.saveAiAgentConfig({
      store_id: DEFAULT_STORE_ID, agent_id: 'monitor', label: 'Monitor Agent',
    });
    expect(cfg.enabled).toBe(true);
    const cfgs = await db.getAiAgentConfigs(DEFAULT_STORE_ID);
    expect(cfgs.some(c => c.agent_id === 'monitor')).toBe(true);
  });

  it('creates and lists WhatsApp drafts', async () => {
    const draft = await db.createWhatsAppDraft({
      store_id: DEFAULT_STORE_ID, recipient_name: 'Lead', recipient_phone: '+1',
      message_text: 'Hello', status: 'Draft',
    });
    expect(draft.id).toContain('wa-');
    const drafts = await db.getWhatsAppDrafts(DEFAULT_STORE_ID);
    expect(drafts.some(d => d.id === draft.id)).toBe(true);
  });

  it('saves and reads platform accounts', async () => {
    await db.savePlatformAccount(DEFAULT_STORE_ID, 'shopify', {
      apiKey: 'key', apiSecret: 'secret', storeUrl: 'https://s.example', status: 'connected', notes: '',
    });
    const conns = await db.getPlatformAccounts(DEFAULT_STORE_ID);
    expect(conns.shopify).toBeDefined();
    expect(conns.shopify.status).toBe('connected');
  });

  it('isolates lead reads per store id', async () => {
    await db.createLead({ store_id: DEFAULT_STORE_ID, name: 'Tenant A Lead', contact: 'a@x.com', contact_type: 'email', source: 'manual' });
    const other = await db.getLeads('store-2');
    expect(other.length).toBe(0);
    const own = await db.getLeads(DEFAULT_STORE_ID);
    expect(own.length).toBeGreaterThan(0);
  });
});
