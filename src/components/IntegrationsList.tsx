"use client";

import React, { useState, useEffect } from 'react';
import { 
  db, 
  Integration 
} from '../lib/supabaseClient';
import { 
  Settings, 
  Check, 
  RefreshCw,
  Info
} from 'lucide-react';

interface IntegrationsListProps {
  storeId: string;
  onRefreshProducts?: () => void;
}

export default function IntegrationsList({ storeId, onRefreshProducts }: IntegrationsListProps) {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  
  // Scraper Edge Function States
  const [isScraping, setIsScraping] = useState(false);
  const [scrapeResult, setScrapeResult] = useState<string | null>(null);

  // Form Config States
  const [configKeys, setConfigKeys] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchIntegrations = async () => {
      setLoading(true);
      let data = await db.getIntegrations(storeId);

      // Master list — all types every store should have
      if (typeof window !== 'undefined') {
        const MASTER: Integration[] = [
          { id: `int-1-${storeId}`,  store_id: storeId, name: 'Stripe Gateway',      type: 'payment',         status: 'Active',   config: { publicKey: 'pk_test_...', mode: 'Live' } },
          { id: `int-2-${storeId}`,  store_id: storeId, name: 'Website Web Scraper', type: 'scraper',         status: 'Inactive', config: { feedUrl: 'https://mock-shop.com/catalog.json' } },
          { id: `int-3-${storeId}`,  store_id: storeId, name: 'eBay Platform',       type: 'ebay',            status: 'Inactive', config: { sellerId: '', region: 'UK' } },
          { id: `int-4-${storeId}`,  store_id: storeId, name: 'Uber Eats',           type: 'food_delivery',   status: 'Inactive', config: { restaurantId: '', webhookUrl: '' } },
          { id: `int-5b-${storeId}`, store_id: storeId, name: 'Just Eat',            type: 'just_eat',        status: 'Inactive', config: { restaurantId: '', webhookUrl: '' } },
          { id: `int-6-${storeId}`,  store_id: storeId, name: 'Amazon Connector',    type: 'amazon',          status: 'Inactive', config: { sellerAccessId: '', mode: 'FBA' } },
          { id: `int-7-${storeId}`,  store_id: storeId, name: 'Alibaba Importer',    type: 'alibaba',         status: 'Inactive', config: { supplierId: '', apiKey: '' } },
          { id: `int-8-${storeId}`,  store_id: storeId, name: 'Logistics Connector', type: 'logistics',       status: 'Inactive', config: { apiSecret: '', originPostcode: '' } },
          { id: `int-9-${storeId}`,  store_id: storeId, name: 'WhatsApp Business',   type: 'whatsapp',        status: 'Inactive', config: { phoneNumberId: '', accessToken: '', businessName: '' } },
          { id: `int-10-${storeId}`, store_id: storeId, name: 'Google My Business',  type: 'google_business', status: 'Inactive', config: { locationId: '', accountId: '', category: '' } },
          { id: `int-11-${storeId}`, store_id: storeId, name: 'Mailchimp Marketing', type: 'email_marketing', status: 'Inactive', config: { apiKey: '', listId: '', fromEmail: '' } },
          { id: `int-12-${storeId}`, store_id: storeId, name: 'Xero Accounting',     type: 'accounting',      status: 'Inactive', config: { tenantId: '', clientId: '', syncMode: 'daily' } },
          { id: `int-13-${storeId}`, store_id: storeId, name: 'Square POS',               type: 'pos',      status: 'Inactive', config: { accessToken: '', locationId: '', syncInventory: 'true' } },
          { id: `int-14-${storeId}`, store_id: storeId, name: 'Telegram Notifications', type: 'telegram',    status: 'Inactive', config: { botToken: '', chatId: '', notifyOrders: 'true', notifyLowStock: 'true' } },
          { id: `int-15-${storeId}`, store_id: storeId, name: 'GoCardless',            type: 'gocardless',  status: 'Inactive', config: { accessToken: '', environment: 'sandbox', webhookSecret: '' } },
          { id: `int-16-${storeId}`, store_id: storeId, name: 'TrueLayer',             type: 'truelayer',   status: 'Inactive', config: { clientId: '', clientSecret: '', redirectUri: '' } },
          { id: `int-17-${storeId}`, store_id: storeId, name: 'Volt',                  type: 'volt',        status: 'Inactive', config: { apiKey: '', merchantId: '', webhookUrl: '' } },
          { id: `int-18-${storeId}`, store_id: storeId, name: 'Banked',                type: 'banked',      status: 'Inactive', config: { apiKey: '', merchantId: '', environment: 'sandbox' } },
          { id: `int-19-${storeId}`, store_id: storeId, name: 'Tink (Visa)',           type: 'tink',         status: 'Inactive', config: { clientId: '', clientSecret: '', market: 'GB' } },
          { id: `int-20-${storeId}`, store_id: storeId, name: 'Lead Capture Form',    type: 'lead_capture', status: 'Inactive', config: { formTitle: 'Get in Touch', notifyEmail: '', webhookUrl: '', requirePhone: 'true', requireCountry: 'true' } },
        ];

        const existingTypes = new Set(data.map(d => d.type));
        const missing = MASTER.filter(m => !existingTypes.has(m.type));

        if (data.length === 0 || missing.length > 0) {
          const raw = localStorage.getItem('db_integrations_v2');
          const allStored: Integration[] = raw ? JSON.parse(raw) : [];
          const toAdd = data.length === 0 ? MASTER : missing;
          localStorage.setItem('db_integrations_v2', JSON.stringify([...allStored, ...toAdd]));
          data = data.length === 0 ? MASTER : [...data, ...missing];
        }
      }

      setIntegrations(data);
      setLoading(false);
    };

    fetchIntegrations();
  }, [storeId]);

  const handleToggle = async (id: string, currentStatus: Integration['status']) => {
    const nextStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
    const success = await db.toggleIntegration(id, nextStatus);
    if (success) {
      setIntegrations(integrations.map(item => 
        item.id === id ? { ...item, status: nextStatus } : item
      ));
    }
  };

  const handleConfigureClick = (integration: Integration) => {
    setSelectedIntegration(integration);
    setConfigKeys(integration.config || {});
    setShowConfigModal(true);
    setScrapeResult(null);
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIntegration) return;

    // Save config details
    const success = await db.updateIntegrationConfig(selectedIntegration.id, configKeys);
    if (success) {
      setIntegrations(integrations.map(item => 
        item.id === selectedIntegration.id ? { ...item, config: configKeys } : item
      ));
    }

    setShowConfigModal(false);
    setSelectedIntegration(null);
  };

  // TRIGGER EDGE FUNCTION: Crawl catalogs using simulated HTTP calls
  const handleTriggerScraper = async () => {
    if (!selectedIntegration) return;
    setIsScraping(true);
    setScrapeResult(null);

    const targetUrl = configKeys.feedUrl || 'https://mock-shop.com/catalog.json';

    try {
      // Simulate Deno HTTP execution delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      const scraperResponse = {
        success: true,
        message: `Successfully crawled ${targetUrl}`,
        timestamp: new Date().toISOString(),
        itemsScraped: 2,
        data: [
          {
            store_id: storeId,
            name: `Imported Stand - #${Math.floor(Math.random() * 900 + 100)}`,
            price: 69.99,
            category: 'Accessories',
            description: `Imported via product-scraper Edge Function from ${targetUrl}.`,
            stock: 12,
            image: '🕶️'
          },
          {
            store_id: storeId,
            name: `Imported Blend Coffee - #${Math.floor(Math.random() * 900 + 100)}`,
            price: 18.50,
            category: 'Beverages',
            description: `Organic espresso roast synced via Supabase Deno Scraper.`,
            stock: 40,
            image: '☕'
          }
        ]
      };

      // Add scraped items directly to the database catalog!
      for (const item of scraperResponse.data) {
        await db.addProduct(item);
      }

      setScrapeResult(`Sync Completed! Added ${scraperResponse.itemsScraped} products to catalog.`);
      
      // Trigger callback to reload product list page if active
      if (onRefreshProducts) {
        onRefreshProducts();
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setScrapeResult(`Scraper error: ${errorMessage}`);
    } finally {
      setIsScraping(false);
    }
  };

  const getIntegrationLogo = (type: string) => {
    switch (type) {
      case 'payment': return '💳';
      case 'sync': return '🔄';
      case 'scraper': return '⚡';
      case 'ebay': return '🛒';
      case 'food_delivery': return '🍔';
      case 'amazon': return '📦';
      case 'alibaba': return '🌐';
      case 'logistics': return '🚛';
      case 'whatsapp': return '💬';
      case 'google_business': return '📍';
      case 'email_marketing': return '📧';
      case 'accounting': return '📊';
      case 'pos': return '🏪';
      case 'telegram': return '✈️';
      case 'gocardless': return '🏦';
      case 'truelayer': return '⚡';
      case 'volt': return '🔋';
      case 'banked': return '📲';
      case 'tink': return '💳';
      case 'lead_capture': return '📋';
      default: return '🔌';
    }
  };

  if (loading) {
    return <div style={{ color: 'var(--saas-text-muted)', fontSize: '0.95rem' }}>Loading integrations dashboard...</div>;
  }

  return (
    <div>
      <div className="integrations-grid">
        {integrations.map((item) => (
          <div key={item.id} className="glass-panel integration-card">
            <div className="integration-header">
              <div className="integration-icon">
                {getIntegrationLogo(item.type)}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <button 
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '0.3rem', borderRadius: '50%' }}
                  onClick={() => handleConfigureClick(item)}
                  title="Configure Keys"
                >
                  <Settings size={14} />
                </button>
                <label className="switch">
                  <input 
                    type="checkbox" 
                    checked={item.status === 'Active'}
                    onChange={() => handleToggle(item.id, item.status)}
                  />
                  <span className="slider"></span>
                </label>
              </div>
            </div>

            <div>
              <h4 style={{ fontSize: '1.1rem', marginBottom: '0.25rem', fontFamily: 'var(--font-display)' }}>
                {item.name}
              </h4>
              <p style={{ color: 'var(--saas-text-secondary)', fontSize: '0.825rem', lineHeight: '1.4' }}>
                {item.type === 'payment' && "Process orders securely via standard mock gateways."}
                {item.type === 'sync' && "Synchronize inventory states directly from Shopify endpoints."}
                {item.type === 'scraper' && "Ingest new products dynamically from HTML websites using Deno."}
                {item.type === 'ebay' && "Sync listings, stock, and orders directly with your eBay seller store."}
                {item.type === 'food_delivery' && "Receive orders and update availability for food delivery services in real-time."}
                {item.type === 'amazon' && "Manage FBA shipments and sync product catalog with Amazon Seller Central."}
                {item.type === 'alibaba' && "Import wholesale products and supplier details from Alibaba global directory."}
                {item.type === 'logistics' && "Coordinate carrier shipments, tracking numbers, and calculate delivery postage."}
                {item.type === 'whatsapp' && "Auto-send order confirmations, delivery updates, and promotions to customers via WhatsApp Business."}
                {item.type === 'google_business' && "Sync your products and menu directly to your Google Maps listing so customers see live stock and prices in search."}
                {item.type === 'email_marketing' && "Auto-trigger promotional emails, abandoned cart recovery, order receipts, and newsletters to your customer list."}
                {item.type === 'accounting' && "Sync daily sales, invoices, and refunds straight into Xero — eliminates manual bookkeeping and reconciliation."}
                {item.type === 'pos' && "Connect Square in-store till to keep online and physical inventory in sync in real-time across both channels."}
                {item.type === 'telegram' && "Instantly notify your Telegram channel or group when new orders arrive, stock runs low, or payments are confirmed."}
                {item.type === 'gocardless' && "UK's leading direct bank payment network. Send payment links and QR invoices — customers pay straight from their bank in 30+ countries."}
                {item.type === 'truelayer' && "Open Banking payments across UK and 21 European countries. Generate instant bank transfer links and QR codes for invoices."}
                {item.type === 'volt' && "Global real-time bank-to-bank payments. Send QR codes and payment links for invoices — covers UK, Europe, Brazil and Australia."}
                {item.type === 'banked' && "UK Open Banking specialist. 'Pay by Bank' QR codes and payment links — no card fees, instant settlement, works with all UK banks."}
                {item.type === 'tink' && "Visa-owned European Open Banking infrastructure. Payment initiation across 18 markets — send invoice links customers pay via their bank app."}
                {item.type === 'lead_capture' && "Add a customer enquiry form to your website — collects name, phone, email and country. Leads sent to your email or any CRM via webhook."}
              </p>
            </div>

            <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '0.75rem' }}>
              <span style={{ color: 'var(--saas-text-muted)' }}>Status:</span>
              <span className={`badge ${item.status === 'Active' ? 'badge-success' : 'badge-inactive'}`}>
                {item.status}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* CONFIGURATION DIALOG */}
      {showConfigModal && selectedIntegration && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                Configure {selectedIntegration.name}
              </h3>
              <button 
                onClick={() => setShowConfigModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#9ca3af', fontSize: '1.25rem', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>
            
            <form onSubmit={handleSaveConfig}>
              <div className="modal-body">
                {selectedIntegration.type === 'payment' && (
                  <div>
                    <div className="form-group">
                      <label className="form-label">Mock Public Stripe API Key</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={configKeys.publicKey || ''} 
                        onChange={(e) => setConfigKeys({ ...configKeys, publicKey: e.target.value })}
                        placeholder="pk_test_..."
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Gateway Mode</label>
                      <select 
                        className="form-control"
                        value={configKeys.mode || 'Sandbox'}
                        onChange={(e) => setConfigKeys({ ...configKeys, mode: e.target.value })}
                      >
                        <option value="Sandbox">Sandbox (Test Mode)</option>
                        <option value="Live">Live Payments</option>
                      </select>
                    </div>
                  </div>
                )}

                {selectedIntegration.type === 'sync' && (
                  <div>
                    <div className="form-group">
                      <label className="form-label">Shopify Store Domain URL</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={configKeys.storeUrl || ''} 
                        onChange={(e) => setConfigKeys({ ...configKeys, storeUrl: e.target.value })}
                        placeholder="your-shop-name.myshopify.com"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Access Token Secret</label>
                      <input 
                        type="password" 
                        className="form-control" 
                        placeholder="shpat_••••••••••••••••"
                      />
                    </div>
                  </div>
                )}

                {selectedIntegration.type === 'scraper' && (
                  <div>
                    <div className="form-group">
                      <label className="form-label">Product XML/JSON Feed Source URL</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={configKeys.feedUrl || ''} 
                        onChange={(e) => setConfigKeys({ ...configKeys, feedUrl: e.target.value })}
                        placeholder="https://retail-site.com/api/products"
                        required
                      />
                    </div>

                    <div style={{ background: 'rgba(99, 102, 241, 0.05)', border: '1px solid rgba(99, 102, 241, 0.15)', borderRadius: 'var(--radius-sm)', padding: '1rem', marginBottom: '1.25rem' }}>
                      <h5 style={{ fontSize: '0.85rem', color: 'var(--saas-primary)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Info size={14} /> Deno Edge Functions
                      </h5>
                      <p style={{ fontSize: '0.75rem', color: 'var(--saas-text-secondary)', lineHeight: '1.4' }}>
                        This scraper calls the deployed Supabase Edge Function to crawl the target URL in the background, extract products and inject them into your database catalog.
                      </p>
                    </div>

                    <button 
                      type="button" 
                      className="btn btn-secondary btn-sm"
                      style={{ width: '100%', display: 'flex', gap: '0.5rem', justifyContent: 'center', background: 'rgba(255,255,255,0.06)' }}
                      onClick={handleTriggerScraper}
                      disabled={isScraping}
                    >
                      <RefreshCw size={14} className={isScraping ? 'animate-spin' : ''} style={{ animation: isScraping ? 'spin 1.5s linear infinite' : 'none' }} />
                      {isScraping ? "Invoking Edge Function..." : "Trigger Scraper Sync Now"}
                    </button>

                    <style jsx>{`
                      @keyframes spin {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                      }
                    `}</style>

                    {scrapeResult && (
                      <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.15)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', color: '#34d399', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Check size={14} /> {scrapeResult}
                      </div>
                    )}
                  </div>
                )}

                {selectedIntegration.type === 'ebay' && (
                  <div>
                    <div className="form-group">
                      <label className="form-label">eBay Seller Dev ID</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={configKeys.sellerId || ''} 
                        onChange={(e) => setConfigKeys({ ...configKeys, sellerId: e.target.value })}
                        placeholder="ebay_seller_..."
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Marketplace Region</label>
                      <select 
                        className="form-control"
                        value={configKeys.region || 'US'}
                        onChange={(e) => setConfigKeys({ ...configKeys, region: e.target.value })}
                      >
                        <option value="US">United States (US)</option>
                        <option value="UK">United Kingdom (UK)</option>
                        <option value="DE">Germany (DE)</option>
                        <option value="FR">France (FR)</option>
                      </select>
                    </div>
                  </div>
                )}

                {selectedIntegration.type === 'food_delivery' && (
                  <div>
                    <div className="form-group">
                      <label className="form-label">Restaurant Store ID</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={configKeys.restaurantId || ''} 
                        onChange={(e) => setConfigKeys({ ...configKeys, restaurantId: e.target.value })}
                        placeholder="rest_store_..."
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">API Webhook URL</label>
                      <input 
                        type="url" 
                        className="form-control" 
                        value={configKeys.webhookUrl || ''} 
                        onChange={(e) => setConfigKeys({ ...configKeys, webhookUrl: e.target.value })}
                        placeholder="https://api.millersaashub.io/food-webhook"
                        required
                      />
                    </div>
                  </div>
                )}

                {selectedIntegration.type === 'amazon' && (
                  <div>
                    <div className="form-group">
                      <label className="form-label">AWS Seller Access ID</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={configKeys.sellerAccessId || ''} 
                        onChange={(e) => setConfigKeys({ ...configKeys, sellerAccessId: e.target.value })}
                        placeholder="aws_seller_..."
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Fulfillment Mode</label>
                      <select 
                        className="form-control"
                        value={configKeys.mode || 'FBA'}
                        onChange={(e) => setConfigKeys({ ...configKeys, mode: e.target.value })}
                      >
                        <option value="FBA">Fulfillment by Amazon (FBA)</option>
                        <option value="FBM">Fulfillment by Merchant (FBM)</option>
                      </select>
                    </div>
                  </div>
                )}

                {selectedIntegration.type === 'alibaba' && (
                  <div>
                    <div className="form-group">
                      <label className="form-label">Alibaba Supplier ID</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={configKeys.supplierId || ''} 
                        onChange={(e) => setConfigKeys({ ...configKeys, supplierId: e.target.value })}
                        placeholder="ali_supp_..."
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">API Key</label>
                      <input 
                        type="password" 
                        className="form-control" 
                        value={configKeys.apiKey || ''} 
                        onChange={(e) => setConfigKeys({ ...configKeys, apiKey: e.target.value })}
                        placeholder="ali_key_••••••••"
                        required
                      />
                    </div>
                  </div>
                )}

                {selectedIntegration.type === 'logistics' && (
                  <div>
                    <div className="form-group">
                      <label className="form-label">Carrier API Secret</label>
                      <input type="password" className="form-control" value={configKeys.apiSecret || ''} onChange={(e) => setConfigKeys({ ...configKeys, apiSecret: e.target.value })} placeholder="log_sec_••••••••" required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Origin Postcode</label>
                      <input type="text" className="form-control" value={configKeys.originPostcode || ''} onChange={(e) => setConfigKeys({ ...configKeys, originPostcode: e.target.value })} placeholder="e.g. EC1A 1BB" required />
                    </div>
                  </div>
                )}

                {selectedIntegration.type === 'whatsapp' && (
                  <div>
                    <div className="form-group">
                      <label className="form-label">WhatsApp Phone Number ID</label>
                      <input type="text" className="form-control" value={configKeys.phoneNumberId || ''} onChange={(e) => setConfigKeys({ ...configKeys, phoneNumberId: e.target.value })} placeholder="e.g. 123456789012345" required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Business Access Token</label>
                      <input type="password" className="form-control" value={configKeys.accessToken || ''} onChange={(e) => setConfigKeys({ ...configKeys, accessToken: e.target.value })} placeholder="EAAxxxxxx..." required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Business Display Name</label>
                      <input type="text" className="form-control" value={configKeys.businessName || ''} onChange={(e) => setConfigKeys({ ...configKeys, businessName: e.target.value })} placeholder="e.g. Kings Flavour Kitchen" />
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--saas-text-muted)', lineHeight: 1.5 }}>
                      Get your Phone Number ID and token from <strong>Meta Business Suite → WhatsApp API</strong>.
                    </p>
                  </div>
                )}

                {selectedIntegration.type === 'google_business' && (
                  <div>
                    <div className="form-group">
                      <label className="form-label">Google Account ID</label>
                      <input type="text" className="form-control" value={configKeys.accountId || ''} onChange={(e) => setConfigKeys({ ...configKeys, accountId: e.target.value })} placeholder="accounts/123456789" required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Location ID</label>
                      <input type="text" className="form-control" value={configKeys.locationId || ''} onChange={(e) => setConfigKeys({ ...configKeys, locationId: e.target.value })} placeholder="locations/987654321" required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Business Category</label>
                      <select className="form-control" value={configKeys.category || 'restaurant'} onChange={(e) => setConfigKeys({ ...configKeys, category: e.target.value })}>
                        <option value="restaurant">Restaurant / Food</option>
                        <option value="retail">Retail Shop</option>
                        <option value="salon">Salon / Beauty</option>
                        <option value="service">Service Business</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--saas-text-muted)', lineHeight: 1.5 }}>
                      Find IDs in <strong>Google Business Profile API Console</strong>. Products sync to your Maps listing automatically.
                    </p>
                  </div>
                )}

                {selectedIntegration.type === 'email_marketing' && (
                  <div>
                    <div className="form-group">
                      <label className="form-label">Mailchimp API Key</label>
                      <input type="password" className="form-control" value={configKeys.apiKey || ''} onChange={(e) => setConfigKeys({ ...configKeys, apiKey: e.target.value })} placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-us1" required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Audience List ID</label>
                      <input type="text" className="form-control" value={configKeys.listId || ''} onChange={(e) => setConfigKeys({ ...configKeys, listId: e.target.value })} placeholder="e.g. a1b2c3d4e5" required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">From Email Address</label>
                      <input type="email" className="form-control" value={configKeys.fromEmail || ''} onChange={(e) => setConfigKeys({ ...configKeys, fromEmail: e.target.value })} placeholder="hello@yourstore.com" required />
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--saas-text-muted)', lineHeight: 1.5 }}>
                      Get API key from <strong>Mailchimp → Account → Extras → API Keys</strong>. List ID from Audience settings.
                    </p>
                  </div>
                )}

                {selectedIntegration.type === 'accounting' && (
                  <div>
                    <div className="form-group">
                      <label className="form-label">Xero Tenant / Organisation ID</label>
                      <input type="text" className="form-control" value={configKeys.tenantId || ''} onChange={(e) => setConfigKeys({ ...configKeys, tenantId: e.target.value })} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">OAuth Client ID</label>
                      <input type="text" className="form-control" value={configKeys.clientId || ''} onChange={(e) => setConfigKeys({ ...configKeys, clientId: e.target.value })} placeholder="From Xero Developer App" required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Sync Frequency</label>
                      <select className="form-control" value={configKeys.syncMode || 'daily'} onChange={(e) => setConfigKeys({ ...configKeys, syncMode: e.target.value })}>
                        <option value="realtime">Real-time (every order)</option>
                        <option value="hourly">Hourly</option>
                        <option value="daily">Daily (midnight)</option>
                        <option value="weekly">Weekly</option>
                      </select>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--saas-text-muted)', lineHeight: 1.5 }}>
                      Create app at <strong>developer.xero.com</strong>. Sales, invoices, and refunds sync automatically.
                    </p>
                  </div>
                )}

                {selectedIntegration.type === 'pos' && (
                  <div>
                    <div className="form-group">
                      <label className="form-label">Square Access Token</label>
                      <input type="password" className="form-control" value={configKeys.accessToken || ''} onChange={(e) => setConfigKeys({ ...configKeys, accessToken: e.target.value })} placeholder="EAAAxxxxxxxxx..." required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Location ID</label>
                      <input type="text" className="form-control" value={configKeys.locationId || ''} onChange={(e) => setConfigKeys({ ...configKeys, locationId: e.target.value })} placeholder="e.g. L1234ABCD" required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Inventory Sync</label>
                      <select className="form-control" value={configKeys.syncInventory || 'true'} onChange={(e) => setConfigKeys({ ...configKeys, syncInventory: e.target.value })}>
                        <option value="true">Sync inventory both ways (online ↔ in-store)</option>
                        <option value="online_only">Online → In-Store only</option>
                        <option value="false">Orders only, no inventory sync</option>
                      </select>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--saas-text-muted)', lineHeight: 1.5 }}>
                      Get token from <strong>Square Developer Dashboard → Applications</strong>. Location ID from your Square account settings.
                    </p>
                  </div>
                )}

                {selectedIntegration.type === 'telegram' && (
                  <div>
                    <div className="form-group">
                      <label className="form-label">Bot Token</label>
                      <input type="password" className="form-control" value={configKeys.botToken || ''} onChange={(e) => setConfigKeys({ ...configKeys, botToken: e.target.value })} placeholder="123456789:AAxxxxxxxxxxxxxx" required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Chat ID / Channel ID</label>
                      <input type="text" className="form-control" value={configKeys.chatId || ''} onChange={(e) => setConfigKeys({ ...configKeys, chatId: e.target.value })} placeholder="e.g. -1001234567890" required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Notify on New Orders</label>
                      <select className="form-control" value={configKeys.notifyOrders || 'true'} onChange={(e) => setConfigKeys({ ...configKeys, notifyOrders: e.target.value })}>
                        <option value="true">Yes — message on every new order</option>
                        <option value="false">No</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Notify on Low Stock</label>
                      <select className="form-control" value={configKeys.notifyLowStock || 'true'} onChange={(e) => setConfigKeys({ ...configKeys, notifyLowStock: e.target.value })}>
                        <option value="true">Yes — alert when stock drops below 5 units</option>
                        <option value="false">No</option>
                      </select>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--saas-text-muted)', lineHeight: 1.5 }}>
                      Create bot via <strong>@BotFather</strong> on Telegram to get your token. Forward a message from your channel to <strong>@userinfobot</strong> to get the Chat ID.
                    </p>
                  </div>
                )}

                {selectedIntegration.type === 'gocardless' && (
                  <div>
                    <div className="form-group">
                      <label className="form-label">Access Token</label>
                      <input type="password" className="form-control" value={configKeys.accessToken || ''} onChange={(e) => setConfigKeys({ ...configKeys, accessToken: e.target.value })} placeholder="sandbox_xxxx... or live_xxxx..." required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Environment</label>
                      <select className="form-control" value={configKeys.environment || 'sandbox'} onChange={(e) => setConfigKeys({ ...configKeys, environment: e.target.value })}>
                        <option value="sandbox">Sandbox (Test)</option>
                        <option value="live">Live</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Webhook Secret</label>
                      <input type="password" className="form-control" value={configKeys.webhookSecret || ''} onChange={(e) => setConfigKeys({ ...configKeys, webhookSecret: e.target.value })} placeholder="From GoCardless dashboard" />
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--saas-text-muted)', lineHeight: 1.5 }}>
                      Get token from <strong>GoCardless Dashboard → Developers → Access Tokens</strong>. Supports UK, EU and international direct bank payments.
                    </p>
                  </div>
                )}

                {selectedIntegration.type === 'truelayer' && (
                  <div>
                    <div className="form-group">
                      <label className="form-label">Client ID</label>
                      <input type="text" className="form-control" value={configKeys.clientId || ''} onChange={(e) => setConfigKeys({ ...configKeys, clientId: e.target.value })} placeholder="From TrueLayer Console" required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Client Secret</label>
                      <input type="password" className="form-control" value={configKeys.clientSecret || ''} onChange={(e) => setConfigKeys({ ...configKeys, clientSecret: e.target.value })} placeholder="From TrueLayer Console" required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Redirect URI</label>
                      <input type="url" className="form-control" value={configKeys.redirectUri || ''} onChange={(e) => setConfigKeys({ ...configKeys, redirectUri: e.target.value })} placeholder="https://yourdomain.com/callback" required />
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--saas-text-muted)', lineHeight: 1.5 }}>
                      Register at <strong>console.truelayer.com</strong>. Covers UK + 21 European countries — generates payment links and QR codes instantly.
                    </p>
                  </div>
                )}

                {selectedIntegration.type === 'volt' && (
                  <div>
                    <div className="form-group">
                      <label className="form-label">API Key</label>
                      <input type="password" className="form-control" value={configKeys.apiKey || ''} onChange={(e) => setConfigKeys({ ...configKeys, apiKey: e.target.value })} placeholder="volt_live_xxxxxxxxxxxx" required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Merchant ID</label>
                      <input type="text" className="form-control" value={configKeys.merchantId || ''} onChange={(e) => setConfigKeys({ ...configKeys, merchantId: e.target.value })} placeholder="From Volt merchant portal" required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Webhook URL</label>
                      <input type="url" className="form-control" value={configKeys.webhookUrl || ''} onChange={(e) => setConfigKeys({ ...configKeys, webhookUrl: e.target.value })} placeholder="https://yourdomain.com/volt/webhook" />
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--saas-text-muted)', lineHeight: 1.5 }}>
                      Sign up at <strong>volt.io</strong>. Supports global real-time bank payments — UK, Europe, Brazil, Australia. QR codes and payment links built-in.
                    </p>
                  </div>
                )}

                {selectedIntegration.type === 'banked' && (
                  <div>
                    <div className="form-group">
                      <label className="form-label">API Key</label>
                      <input type="password" className="form-control" value={configKeys.apiKey || ''} onChange={(e) => setConfigKeys({ ...configKeys, apiKey: e.target.value })} placeholder="banked_xxxxxxxxxxxx" required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Merchant ID</label>
                      <input type="text" className="form-control" value={configKeys.merchantId || ''} onChange={(e) => setConfigKeys({ ...configKeys, merchantId: e.target.value })} placeholder="From Banked dashboard" required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Environment</label>
                      <select className="form-control" value={configKeys.environment || 'sandbox'} onChange={(e) => setConfigKeys({ ...configKeys, environment: e.target.value })}>
                        <option value="sandbox">Sandbox (Test)</option>
                        <option value="live">Live</option>
                      </select>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--saas-text-muted)', lineHeight: 1.5 }}>
                      Apply at <strong>banked.com</strong>. UK Open Banking specialist — QR code and &quot;Pay by Bank&quot; link for every invoice, no card fees, instant settlement.
                    </p>
                  </div>
                )}

                {selectedIntegration.type === 'tink' && (
                  <div>
                    <div className="form-group">
                      <label className="form-label">Client ID</label>
                      <input type="text" className="form-control" value={configKeys.clientId || ''} onChange={(e) => setConfigKeys({ ...configKeys, clientId: e.target.value })} placeholder="From Tink Console" required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Client Secret</label>
                      <input type="password" className="form-control" value={configKeys.clientSecret || ''} onChange={(e) => setConfigKeys({ ...configKeys, clientSecret: e.target.value })} placeholder="From Tink Console" required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Primary Market</label>
                      <select className="form-control" value={configKeys.market || 'GB'} onChange={(e) => setConfigKeys({ ...configKeys, market: e.target.value })}>
                        <option value="GB">United Kingdom (GB)</option>
                        <option value="DE">Germany (DE)</option>
                        <option value="FR">France (FR)</option>
                        <option value="ES">Spain (ES)</option>
                        <option value="IT">Italy (IT)</option>
                        <option value="NL">Netherlands (NL)</option>
                        <option value="SE">Sweden (SE)</option>
                        <option value="NO">Norway (NO)</option>
                        <option value="FI">Finland (FI)</option>
                        <option value="DK">Denmark (DK)</option>
                        <option value="BE">Belgium (BE)</option>
                        <option value="AT">Austria (AT)</option>
                        <option value="PT">Portugal (PT)</option>
                      </select>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--saas-text-muted)', lineHeight: 1.5 }}>
                      Register at <strong>console.tink.com</strong> (owned by Visa). Covers 18 European markets — customers pay invoices directly from their bank app.
                    </p>
                  </div>
                )}

                {selectedIntegration.type === 'lead_capture' && (
                  <div>
                    <div className="form-group">
                      <label className="form-label">Form Title</label>
                      <input type="text" className="form-control" value={configKeys.formTitle || 'Get in Touch'} onChange={(e) => setConfigKeys({ ...configKeys, formTitle: e.target.value })} placeholder="e.g. Get in Touch, Request a Quote..." />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Notify Email (leads sent here)</label>
                      <input type="email" className="form-control" value={configKeys.notifyEmail || ''} onChange={(e) => setConfigKeys({ ...configKeys, notifyEmail: e.target.value })} placeholder="your@email.com" required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">CRM Webhook URL <span style={{ fontWeight: 400, color: 'var(--saas-text-muted)' }}>(optional)</span></label>
                      <input type="url" className="form-control" value={configKeys.webhookUrl || ''} onChange={(e) => setConfigKeys({ ...configKeys, webhookUrl: e.target.value })} placeholder="https://your-crm.com/webhook/leads" />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Phone Number</label>
                        <select className="form-control" value={configKeys.requirePhone || 'true'} onChange={(e) => setConfigKeys({ ...configKeys, requirePhone: e.target.value })}>
                          <option value="true">Required</option>
                          <option value="optional">Optional</option>
                          <option value="false">Hide</option>
                        </select>
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Country</label>
                        <select className="form-control" value={configKeys.requireCountry || 'true'} onChange={(e) => setConfigKeys({ ...configKeys, requireCountry: e.target.value })}>
                          <option value="true">Required</option>
                          <option value="optional">Optional</option>
                          <option value="false">Hide</option>
                        </select>
                      </div>
                    </div>
                    <div style={{ marginTop: '1rem', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 8, padding: '0.75rem 1rem' }}>
                      <p style={{ fontSize: '0.75rem', color: 'var(--saas-text-secondary)', margin: 0, lineHeight: 1.6 }}>
                        <strong style={{ color: 'var(--saas-primary)' }}>📋 Form fields collected:</strong><br />
                        Full Name · Email Address · Phone Number · Country<br />
                        Each submission lands in your email and optionally your CRM.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowConfigModal(false)}>Close</button>
                <button type="submit" className="btn btn-primary">Save Settings</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
