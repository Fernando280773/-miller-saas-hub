"use client";

import React, { useState, useEffect } from 'react';
import DashboardSidebar from '../../../components/DashboardSidebar';
import { db, Store, Product, CompetitorPricing } from '../../../lib/supabaseClient';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Sliders, 
  RefreshCw, 
  Check, 
  AlertTriangle, 
  ExternalLink,
  ShieldAlert,
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react';

interface PricingRecommendation {
  product: Product;
  cheapestPrice: number;
  competitorName: string;
  competitorUrl: string;
  variance: number;
}

export default function CompetitorPricingPage() {
  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [pricesMap, setPricesMap] = useState<Record<string, CompetitorPricing[]>>({});
  const [loading, setLoading] = useState(true);
  const [syncingAll, setSyncingAll] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ productId: '', competitorName: '', competitorUrl: '', price: '' });

  useEffect(() => {
    loadStoreAndTelemetry();
  }, []);

  const loadStoreAndTelemetry = async () => {
    setLoading(true);
    const allStores = await db.getStores();
    let currentStore = allStores[0];
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('active_store_id');
      if (saved) currentStore = allStores.find(s => s.id === saved) || allStores[0];
    }
    
    if (currentStore) {
      setStore(currentStore);
      const prods = await db.getProducts(currentStore.id);
      setProducts(prods);

      // Load competitor prices for all products
      const map: Record<string, CompetitorPricing[]> = {};
      await Promise.all(
        prods.map(async (p) => {
          const cpData = await db.getCompetitorPrices(p.id);
          map[p.id] = cpData;
        })
      );
      setPricesMap(map);
    }
    setLoading(false);
  };

  const handleReprice = async (productId: string, newPrice: number) => {
    const success = await db.updateProduct(productId, { price: newPrice });
    if (success) {
      showToast("Pricing updated successfully!");
      // Reload product data
      if (store) {
        const prods = await db.getProducts(store.id);
        setProducts(prods);
      }
    }
  };

  const triggerGlobalScrape = async () => {
    setSyncingAll(true);
    showToast("Triggering cloud scraper for all active feeds...");
    
    // Simulate scraping latency
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await loadStoreAndTelemetry();
    setSyncingAll(false);
    showToast("Market pricing telemetry synchronized!");
  };

  const handleAddCompetitor = async (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(addForm.price);
    if (!addForm.productId || !addForm.competitorName || isNaN(price)) return;
    const existing = pricesMap[addForm.productId] || [];
    if (existing.length >= 10) {
      showToast('Max 10 competitors per product reached.');
      return;
    }
    await db.addCompetitorPrice({
      product_id: addForm.productId,
      competitor_name: addForm.competitorName,
      competitor_url: addForm.competitorUrl,
      price,
      is_active: true
    });
    setAddForm({ productId: '', competitorName: '', competitorUrl: '', price: '' });
    setShowAddModal(false);
    showToast('Competitor added!');
    await loadStoreAndTelemetry();
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: '#090d16', color: '#9ca3af' }}>
        <h3>Loading pricing analysis data...</h3>
      </div>
    );
  }

  if (!store) return null;

  // Process Telemetry Calculations
  const monitoredProducts = products.filter(p => pricesMap[p.id] && pricesMap[p.id].length > 0);
  
  const recommendations: PricingRecommendation[] = [];
  let optimalCount = 0;

  monitoredProducts.forEach(prod => {
    const cpPrices = pricesMap[prod.id] || [];
    if (cpPrices.length === 0) return;

    const cheapest = Math.min(...cpPrices.map(c => c.price));
    const cheapestComp = cpPrices.find(c => c.price === cheapest);

    if (cheapest < prod.price && cheapestComp) {
      recommendations.push({
        product: prod,
        cheapestPrice: cheapest,
        competitorName: cheapestComp.competitor_name,
        competitorUrl: cheapestComp.competitor_url,
        variance: prod.price - cheapest
      });
    } else {
      optimalCount++;
    }
  });

  const priceHealthIndex = monitoredProducts.length > 0 
    ? Math.round((optimalCount / monitoredProducts.length) * 100) 
    : 100;

  const totalUndercutCount = recommendations.length;

  return (
    <div className="dashboard-layout">
      <DashboardSidebar storeName={store.name} storeLogo={store.logo_text} />

      <main className="dashboard-content">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontFamily: 'var(--font-display)', marginBottom: '0.25rem' }}>
              Competitor Pricing Console
            </h1>
            <p style={{ color: 'var(--saas-text-secondary)', fontSize: '0.85rem' }}>
              Track competitor channels, analyze variances, and automatically adjust product rates.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setShowAddModal(true)}
              style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}
            >
              + Add Competitor
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={triggerGlobalScrape}
              disabled={syncingAll}
              style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}
            >
              <RefreshCw size={14} style={{ animation: syncingAll ? 'spin 1.5s linear infinite' : 'none' }} />
              {syncingAll ? "Syncing..." : "Sync All Feeds"}
            </button>
          </div>
        </div>

        {/* Toast Alert */}
        {toastMessage && (
          <div style={{ 
            position: 'fixed', 
            bottom: '24px', 
            right: '24px', 
            background: 'var(--saas-success)', 
            color: '#fff', 
            padding: '0.75rem 1.5rem', 
            borderRadius: 'var(--radius-md)', 
            boxShadow: 'var(--shadow-lg)', 
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontWeight: 600,
            fontSize: '0.9rem'
          }}>
            <Check size={16} /> {toastMessage}
          </div>
        )}

        {/* Pricing Health Metrics */}
        <div className="metrics-grid">
          <div className="glass-panel metric-card" style={{ '--accent-color': 'var(--saas-primary)' } as React.CSSProperties}>
            <div className="metric-label">
              <span>Price Health Index</span>
              <Sliders size={16} />
            </div>
            <div className="metric-value" style={{ color: priceHealthIndex < 80 ? 'var(--saas-warning)' : 'var(--saas-success)' }}>
              {priceHealthIndex}%
            </div>
            <div className="metric-footer">{optimalCount} / {monitoredProducts.length} items optimally priced</div>
          </div>

          <div className="glass-panel metric-card" style={{ '--accent-color': 'var(--saas-danger)' } as React.CSSProperties}>
            <div className="metric-label">
              <span>Undercut Products</span>
              <AlertTriangle size={16} />
            </div>
            <div className="metric-value" style={{ color: totalUndercutCount > 0 ? 'var(--saas-danger)' : 'var(--saas-success)' }}>
              {totalUndercutCount}
            </div>
            <div className="metric-footer">{totalUndercutCount > 0 ? "Requires price adjustments" : "Competitive lead maintained"}</div>
          </div>

          <div className="glass-panel metric-card" style={{ '--accent-color': 'var(--saas-success)' } as React.CSSProperties}>
            <div className="metric-label">
              <span>Monitored Listings</span>
              <TrendingUp size={16} />
            </div>
            <div className="metric-value">
              {Object.values(pricesMap).reduce((sum, list) => sum + list.length, 0)}
            </div>
            <div className="metric-footer">Total competitor points tracked</div>
          </div>
        </div>

        {/* Repricing Advisor Suggestions */}
        <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.15rem', fontFamily: 'var(--font-display)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldAlert size={18} color="var(--saas-danger)" /> Repricing Telemetry Advisor
          </h3>
          <p style={{ color: 'var(--saas-text-secondary)', fontSize: '0.8rem', marginBottom: '1.5rem' }}>
            The following products are priced higher than active competitor channels. Use Auto-match to align pricing.
          </p>

          {recommendations.length === 0 ? (
            <div style={{ padding: '3rem 0', textAlign: 'center', color: 'var(--saas-text-muted)', border: '1px dashed rgba(255,255,255,0.06)', borderRadius: 'var(--radius-sm)' }}>
              <CheckCircleIcon size={32} style={{ color: 'var(--saas-success)', margin: '0 auto 0.75rem', display: 'block' }} />
              <p style={{ fontWeight: 600, color: 'var(--saas-text-primary)' }}>Your pricing is optimal!</p>
              <p style={{ fontSize: '0.75rem' }}>No competitor undercuts are active across your catalogs.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {recommendations.map((rec) => {
                const pctDiff = ((rec.variance / rec.product.price) * 100).toFixed(1);
                return (
                  <div key={rec.product.id} className="glass-panel" style={{ padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <span style={{ fontSize: '2.25rem' }}>{rec.product.image}</span>
                      <div>
                        <h4 style={{ fontSize: '1rem', margin: 0 }}>{rec.product.name}</h4>
                        <span className="badge" style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--saas-text-secondary)', fontSize: '0.7rem', marginTop: '0.25rem' }}>
                          {rec.product.category}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--saas-text-muted)', textTransform: 'uppercase' }}>Our Price</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>${rec.product.price.toFixed(2)}</div>
                      </div>
                      
                      <div style={{ fontSize: '1.2rem', color: 'var(--saas-text-muted)' }}>➔</div>

                      <div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--saas-text-muted)', textTransform: 'uppercase' }}>Cheapest ({rec.competitorName})</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--saas-danger)' }}>
                          ${rec.cheapestPrice.toFixed(2)}
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--saas-text-muted)', textTransform: 'uppercase' }}>Undercut</div>
                        <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--saas-danger)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <TrendingDown size={14} /> -{pctDiff}%
                        </div>
                      </div>
                    </div>

                    <div>
                      <button 
                        className="btn btn-secondary btn-sm"
                        style={{ display: 'inline-flex', gap: '0.25rem', borderColor: 'var(--saas-success)', color: 'var(--saas-success)' }}
                        onClick={() => handleReprice(rec.product.id, rec.cheapestPrice)}
                      >
                        <SlidersHorizontal size={12} /> Reprice Auto-match
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Price Matrix Table — products as rows, competitors as columns */}
        <div className="glass-panel table-panel" style={{ marginTop: 0, overflowX: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontFamily: 'var(--font-display)' }}>Competitor Price Matrix</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--saas-text-muted)' }}>Max 10 competitors per product</span>
          </div>

          {products.length === 0 || products.every(p => (pricesMap[p.id] || []).length === 0) ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--saas-text-muted)', border: '1px dashed rgba(255,255,255,0.06)', borderRadius: 'var(--radius-sm)' }}>
              No competitor data yet. Click <strong>+ Add Competitor</strong> to start tracking.
            </div>
          ) : (
            products.filter(p => (pricesMap[p.id] || []).length > 0).map((prod) => {
              const comps = pricesMap[prod.id] || [];
              const prices = comps.map(c => c.price);
              const minPrice = Math.min(...prices);
              const maxPrice = Math.max(...prices);

              return (
                <div key={prod.id} style={{ marginBottom: '2rem' }}>
                  {/* Product header row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <span style={{ fontSize: '1.5rem' }}>{prod.image}</span>
                    <div>
                      <span style={{ fontWeight: 700, fontSize: '1rem' }}>{prod.name}</span>
                      <span style={{ marginLeft: '0.75rem', fontSize: '0.75rem', color: 'var(--saas-text-muted)' }}>{prod.category}</span>
                    </div>
                    <span style={{ marginLeft: 'auto', fontWeight: 700, fontSize: '0.95rem', color: 'var(--saas-primary)' }}>
                      Our price: ${prod.price.toFixed(2)}
                    </span>
                  </div>

                  {/* Competitor cards row */}
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    {comps.map((comp) => {
                      const diff = comp.price - prod.price;
                      const pct = ((diff / prod.price) * 100).toFixed(1);
                      const isCheapest = comp.price === minPrice;
                      const isDearestt = comp.price === maxPrice && comps.length > 1;
                      const cardBorder = isCheapest
                        ? '1px solid rgba(239,68,68,0.4)'
                        : isDearestt
                        ? '1px solid rgba(34,197,94,0.3)'
                        : '1px solid rgba(255,255,255,0.06)';
                      const priceColor = diff < 0 ? 'var(--saas-danger)' : diff === 0 ? 'var(--saas-text-secondary)' : 'var(--saas-success)';

                      return (
                        <div key={comp.id} style={{
                          minWidth: '150px',
                          flex: '1 1 150px',
                          maxWidth: '200px',
                          padding: '0.875rem',
                          background: 'rgba(255,255,255,0.02)',
                          border: cardBorder,
                          borderRadius: 'var(--radius-md)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.4rem',
                          position: 'relative'
                        }}>
                          {isCheapest && (
                            <span style={{ position: 'absolute', top: '-10px', left: '10px', background: 'var(--saas-danger)', color: '#fff', fontSize: '0.6rem', fontWeight: 700, padding: '0.15rem 0.4rem', borderRadius: '999px', textTransform: 'uppercase' }}>
                              Cheapest
                            </span>
                          )}
                          {isDearestt && comps.length > 1 && (
                            <span style={{ position: 'absolute', top: '-10px', left: '10px', background: 'var(--saas-success)', color: '#fff', fontSize: '0.6rem', fontWeight: 700, padding: '0.15rem 0.4rem', borderRadius: '999px', textTransform: 'uppercase' }}>
                              Dearest
                            </span>
                          )}
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f3f4f6', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {comp.competitor_name}
                          </span>
                          <span style={{ fontSize: '1.3rem', fontWeight: 800, color: priceColor }}>
                            ${comp.price.toFixed(2)}
                          </span>
                          <span style={{ fontSize: '0.7rem', color: priceColor, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                            {diff < 0 ? <TrendingDown size={10} /> : <TrendingUp size={10} />}
                            {diff >= 0 ? '+' : ''}{pct}% vs ours
                          </span>
                          {comp.competitor_url && (
                            <a href={comp.competitor_url} target="_blank" rel="noopener noreferrer"
                              style={{ fontSize: '0.7rem', color: 'var(--saas-primary)', display: 'flex', alignItems: 'center', gap: '0.2rem', textDecoration: 'none', marginTop: '0.25rem' }}>
                              <ExternalLink size={9} /> View listing
                            </a>
                          )}
                        </div>
                      );
                    })}

                    {/* Add slot if under 10 */}
                    {comps.length < 10 && (
                      <div
                        onClick={() => { setAddForm(f => ({ ...f, productId: prod.id })); setShowAddModal(true); }}
                        style={{
                          minWidth: '120px',
                          flex: '0 0 120px',
                          padding: '0.875rem',
                          border: '1px dashed rgba(255,255,255,0.1)',
                          borderRadius: 'var(--radius-md)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.4rem',
                          cursor: 'pointer',
                          color: 'var(--saas-text-muted)',
                          fontSize: '0.8rem',
                          transition: 'border-color 0.2s'
                        }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--saas-primary)')}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
                      >
                        <span style={{ fontSize: '1.4rem' }}>+</span>
                        <span>Add competitor</span>
                        <span style={{ fontSize: '0.65rem' }}>{comps.length}/10 used</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* Add Competitor Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ background: '#0b0f19', color: '#f3f4f6' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.15rem' }}>Add Competitor</h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'transparent', border: 'none', color: '#9ca3af', fontSize: '1.25rem', cursor: 'pointer' }}>&times;</button>
            </div>
            <form onSubmit={handleAddCompetitor}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Product</label>
                  <select
                    className="form-control"
                    value={addForm.productId}
                    onChange={e => setAddForm(f => ({ ...f, productId: e.target.value }))}
                    required
                  >
                    <option value="">— Select product —</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.image} {p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Competitor Name</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Amazon, Etsy"
                    value={addForm.competitorName}
                    onChange={e => setAddForm(f => ({ ...f, competitorName: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Competitor URL (optional)</label>
                  <input
                    type="url"
                    className="form-control"
                    placeholder="https://..."
                    value={addForm.competitorUrl}
                    onChange={e => setAddForm(f => ({ ...f, competitorUrl: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Their Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-control"
                    placeholder="e.g. 19.99"
                    value={addForm.price}
                    onChange={e => setAddForm(f => ({ ...f, price: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Add Competitor</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Inline CheckCircle Helper Component
function CheckCircleIcon({ size = 24, ...props }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
