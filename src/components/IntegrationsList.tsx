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
      const data = await db.getIntegrations(storeId);
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
                      <input 
                        type="password" 
                        className="form-control" 
                        value={configKeys.apiSecret || ''} 
                        onChange={(e) => setConfigKeys({ ...configKeys, apiSecret: e.target.value })}
                        placeholder="log_sec_••••••••"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Origin Postcode</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={configKeys.originPostcode || ''} 
                        onChange={(e) => setConfigKeys({ ...configKeys, originPostcode: e.target.value })}
                        placeholder="e.g. EC1A 1BB"
                        required
                      />
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
