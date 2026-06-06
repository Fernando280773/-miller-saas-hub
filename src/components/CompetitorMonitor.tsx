import React, { useState, useEffect } from 'react';
import { db, CompetitorPricing, Product } from '../lib/supabaseClient';
import { RefreshCw, Plus, ExternalLink, TrendingDown, TrendingUp } from 'lucide-react';

interface CompetitorMonitorProps {
  product: Product;
  onClose: () => void;
}

export default function CompetitorMonitor({ product, onClose }: CompetitorMonitorProps) {
  const [prices, setPrices] = useState<CompetitorPricing[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [competitorName, setCompetitorName] = useState('');
  const [competitorUrl, setCompetitorUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPrices = async () => {
      setLoading(true);
      const data = await db.getCompetitorPrices(product.id);
      setPrices(data);
      setLoading(false);
    };
    loadPrices();
  }, [product.id]);

  const handleAddCompetitor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!competitorName.trim() || !competitorUrl.trim()) return;

    setSyncing(true);
    setError(null);
    try {
      const newPrice = await db.triggerCompetitorScraper(product.id, competitorName, competitorUrl);
      setPrices([newPrice, ...prices]);
      setCompetitorName('');
      setCompetitorUrl('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse competitor url');
    } finally {
      setSyncing(false);
    }
  };

  const handleTriggerSync = async (priceId: string, name: string, url: string) => {
    setSyncing(true);
    setError(null);
    try {
      const newPrice = await db.triggerCompetitorScraper(product.id, name, url);
      setPrices(prev => prev.map(p => p.id === priceId ? newPrice : p));
    } catch {
      setError('Scraper execution failed');
    } finally {
      setSyncing(false);
    }
  };

  const ourPrice = product.price;
  const cheapestCompetitor = prices.length > 0 ? Math.min(...prices.map(p => p.price)) : null;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '650px', background: '#0b0f19', color: '#f3f4f6' }}>
        <div className="modal-header">
          <div>
            <h3 style={{ fontSize: '1.2rem', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>🔍</span> Competitor Monitor: {product.name}
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--saas-text-secondary)', margin: '0.15rem 0 0 0' }}>
              Track marketplace pricing details and automate repricing strategy.
            </p>
          </div>
          <button 
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#9ca3af', fontSize: '1.25rem', cursor: 'pointer' }}
          >
            &times;
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Price Health Banner */}
          {prices.length > 0 && cheapestCompetitor !== null && (
            <div style={{
              background: cheapestCompetitor < ourPrice ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)',
              border: cheapestCompetitor < ourPrice ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid rgba(16, 185, 129, 0.2)',
              borderRadius: 'var(--radius-sm)',
              padding: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem'
            }}>
              <div style={{ fontSize: '1.5rem' }}>
                {cheapestCompetitor < ourPrice ? '⚠️' : '✅'}
              </div>
              <div style={{ flex: 1 }}>
                <h5 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: cheapestCompetitor < ourPrice ? '#ef4444' : '#10b981' }}>
                  {cheapestCompetitor < ourPrice ? 'Competitor Undercut Detected' : 'Price Health Optimal'}
                </h5>
                <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.75rem', color: 'var(--saas-text-secondary)', lineHeight: '1.4' }}>
                  {cheapestCompetitor < ourPrice 
                    ? `A competitor is offering this item for $${cheapestCompetitor.toFixed(2)} (your price is $${ourPrice.toFixed(2)}). Consider lowering your price to stay competitive.` 
                    : `Your pricing ($${ourPrice.toFixed(2)}) is lower than or equal to all tracked competitors (cheapest: $${cheapestCompetitor.toFixed(2)}).`
                  }
                </p>
              </div>
            </div>
          )}

          {/* Scrape Input Form */}
          <form onSubmit={handleAddCompetitor} className="glass-panel" style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', margin: 0 }}>
            <h4 style={{ fontSize: '0.85rem', marginBottom: '0.75rem', fontWeight: 600 }}>Sync New Competitor Channel</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: '0.75rem', alignItems: 'end' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.7rem' }}>Marketplace Name</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. Amazon" 
                  value={competitorName}
                  onChange={(e) => setCompetitorName(e.target.value)}
                  required 
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.7rem' }}>Listing Web URL</label>
                <input 
                  type="url" 
                  className="form-control" 
                  placeholder="https://amazon.com/dp/..." 
                  value={competitorUrl}
                  onChange={(e) => setCompetitorUrl(e.target.value)}
                  required 
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ padding: '0.55rem 1rem' }} disabled={syncing}>
                <Plus size={16} /> Add
              </button>
            </div>
          </form>

          {/* Pricing Table List */}
          <div>
            <h4 style={{ fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: 600 }}>Monitored Competitors</h4>
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--saas-text-muted)' }}>Loading pricing telemetry...</div>
            ) : prices.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--saas-text-muted)', background: 'rgba(255,255,255,0.01)', borderRadius: 'var(--radius-sm)', border: '1px dashed rgba(255,255,255,0.08)' }}>
                No competitor URLs tracked for this product yet. Add a listing URL above to start monitoring.
              </div>
            ) : (
              <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                <table className="custom-table" style={{ fontSize: '0.8rem' }}>
                  <thead>
                    <tr>
                      <th>Platform</th>
                      <th>Price</th>
                      <th>Variance</th>
                      <th>URL</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prices.map((p) => {
                      const diff = p.price - ourPrice;
                      const percentage = ((diff / ourPrice) * 100).toFixed(1);
                      return (
                        <tr key={p.id}>
                          <td style={{ fontWeight: 600 }}>{p.competitor_name}</td>
                          <td style={{ fontWeight: 700 }}>${p.price.toFixed(2)}</td>
                          <td>
                            <span style={{ 
                              color: diff < 0 ? '#ef4444' : '#10b981', 
                              fontWeight: 600,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.15rem'
                            }}>
                              {diff < 0 ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
                              {diff < 0 ? '' : '+'}{percentage}%
                            </span>
                          </td>
                          <td>
                            <a href={p.competitor_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--saas-primary)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', textDecoration: 'none' }}>
                              View Listing <ExternalLink size={12} />
                            </a>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button 
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '0.25rem 0.4rem' }}
                              onClick={() => handleTriggerSync(p.id, p.competitor_name, p.competitor_url)}
                              title="Sync Competitor Price"
                              disabled={syncing}
                              type="button"
                            >
                              <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} style={{ animation: syncing ? 'spin 1.5s linear infinite' : 'none' }} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          {error && <span style={{ color: '#ef4444', fontSize: '0.75rem', marginRight: 'auto' }}>{error}</span>}
          <button type="button" className="btn btn-secondary" onClick={onClose}>Close Monitor</button>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
