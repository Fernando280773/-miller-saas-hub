"use client";

import React, { useState, useEffect } from 'react';
import DashboardSidebar from '../../../components/DashboardSidebar';
import { db, Store } from '../../../lib/supabaseClient';
import {
  Eye, DollarSign, TrendingUp, TrendingDown,
  Play, ThumbsUp, MessageCircle, Share2,
  RefreshCw, Filter, ExternalLink
} from 'lucide-react';

type Platform = 'All' | 'Facebook' | 'Instagram' | 'Google' | 'YouTube' | 'TikTok';

interface AdEntry {
  id: string;
  competitor: string;
  platform: Platform;
  title: string;
  description: string;
  format: string;           // 'Video' | 'Image' | 'Carousel' | 'Search'
  status: 'Active' | 'Inactive';
  estimatedViews: number;
  estimatedSpendMin: number;
  estimatedSpendMax: number;
  likes: number;
  comments: number;
  shares: number;
  engagementRate: number;   // %
  runningDays: number;
  url?: string;
}

const PLATFORM_COLORS: Record<string, string> = {
  Facebook:  '#1877f2',
  Instagram: '#e1306c',
  Google:    '#4285f4',
  YouTube:   '#ff0000',
  TikTok:    '#010101',
};

const PLATFORM_EMOJI: Record<string, string> = {
  Facebook:  '📘',
  Instagram: '📸',
  Google:    '🔍',
  YouTube:   '▶️',
  TikTok:    '🎵',
};

// Mock ad data — replace with Facebook Ad Library API / SimilarWeb calls
const MOCK_ADS: AdEntry[] = [
  {
    id: 'ad-1', competitor: 'The Olive Branch', platform: 'Facebook',
    title: 'Fresh Bubble Tea — Summer Menu', description: 'Cool down with our new summer flavours. Order now and get 10% off your first delivery!',
    format: 'Video', status: 'Active',
    estimatedViews: 42000, estimatedSpendMin: 150, estimatedSpendMax: 500,
    likes: 1240, comments: 87, shares: 203, engagementRate: 3.6, runningDays: 14,
    url: 'https://www.facebook.com/ads/library'
  },
  {
    id: 'ad-2', competitor: 'The Olive Branch', platform: 'Instagram',
    title: 'Mango Tango Latte — New Drop', description: 'Creamy mango meets bold espresso. Limited time only.',
    format: 'Image', status: 'Active',
    estimatedViews: 28000, estimatedSpendMin: 80, estimatedSpendMax: 300,
    likes: 2100, comments: 145, shares: 88, engagementRate: 8.2, runningDays: 7,
  },
  {
    id: 'ad-3', competitor: 'Bubble Street UK', platform: 'TikTok',
    title: 'POV: You found the best boba in town 🧋', description: 'Viral taste test challenge ft. our signature taro flavour',
    format: 'Video', status: 'Active',
    estimatedViews: 185000, estimatedSpendMin: 200, estimatedSpendMax: 800,
    likes: 14200, comments: 980, shares: 3400, engagementRate: 9.8, runningDays: 21,
  },
  {
    id: 'ad-4', competitor: 'Bubble Street UK', platform: 'Facebook',
    title: 'Buy 2 Get 1 Free This Weekend', description: 'Limited offer — all bubble teas. Dine in or takeaway.',
    format: 'Carousel', status: 'Inactive',
    estimatedViews: 18000, estimatedSpendMin: 60, estimatedSpendMax: 200,
    likes: 430, comments: 34, shares: 61, engagementRate: 2.9, runningDays: 5,
  },
  {
    id: 'ad-5', competitor: 'ChaTime Sunderland', platform: 'Google',
    title: 'Bubble Tea Sunderland | Order Online', description: 'Best bubble tea near you. Free delivery over £15. Order now.',
    format: 'Search', status: 'Active',
    estimatedViews: 9500, estimatedSpendMin: 300, estimatedSpendMax: 900,
    likes: 0, comments: 0, shares: 0, engagementRate: 4.1, runningDays: 60,
    url: 'https://ads.google.com/aw/overview'
  },
  {
    id: 'ad-6', competitor: 'ChaTime Sunderland', platform: 'YouTube',
    title: 'How We Make Our Signature Brown Sugar Boba', description: 'Behind the scenes at ChaTime — watch our team craft fresh drinks daily.',
    format: 'Video', status: 'Active',
    estimatedViews: 67000, estimatedSpendMin: 120, estimatedSpendMax: 400,
    likes: 890, comments: 112, shares: 230, engagementRate: 1.8, runningDays: 30,
  },
  {
    id: 'ad-7', competitor: 'The Olive Branch', platform: 'Google',
    title: 'Cafe Near Park Lane Sunderland', description: 'Award-winning cafe. Book a table or order delivery.',
    format: 'Search', status: 'Active',
    estimatedViews: 7200, estimatedSpendMin: 200, estimatedSpendMax: 600,
    likes: 0, comments: 0, shares: 0, engagementRate: 5.3, runningDays: 90,
  },
  {
    id: 'ad-8', competitor: 'Bubble Street UK', platform: 'Instagram',
    title: 'New Flavour Launch 🎉 Strawberry Matcha', description: 'We\'re obsessed. Come try it before it sells out!',
    format: 'Video', status: 'Active',
    estimatedViews: 51000, estimatedSpendMin: 100, estimatedSpendMax: 350,
    likes: 3800, comments: 290, shares: 460, engagementRate: 8.9, runningDays: 10,
  },
];

const PLATFORMS: Platform[] = ['All', 'Facebook', 'Instagram', 'Google', 'YouTube', 'TikTok'];

function fmtNum(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toString();
}

export default function AdIntelligencePage() {
  const [store, setStore] = useState<Store | null>(null);
  const [activePlatform, setActivePlatform] = useState<Platform>('All');
  const [activeCompetitor, setActiveCompetitor] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const load = async () => {
      const allStores = await db.getStores();
      let current = allStores[0];
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('active_store_id');
        if (saved) current = allStores.find(s => s.id === saved) || allStores[0];
      }
      setStore(current || null);
      setLoading(false);
    };
    load();
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    await new Promise(r => setTimeout(r, 1800));
    setSyncing(false);
  };

  if (loading) return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: '#090d16', color: '#9ca3af' }}>
      <h3>Loading ad intelligence...</h3>
    </div>
  );

  if (!store) return null;

  const competitors = ['All', ...Array.from(new Set(MOCK_ADS.map(a => a.competitor)))];

  const filtered = MOCK_ADS.filter(a => {
    if (activePlatform !== 'All' && a.platform !== activePlatform) return false;
    if (activeCompetitor !== 'All' && a.competitor !== activeCompetitor) return false;
    if (statusFilter !== 'All' && a.status !== statusFilter) return false;
    return true;
  });

  const totalViews = filtered.reduce((s, a) => s + a.estimatedViews, 0);
  const totalSpendMin = filtered.reduce((s, a) => s + a.estimatedSpendMin, 0);
  const totalSpendMax = filtered.reduce((s, a) => s + a.estimatedSpendMax, 0);
  const activeCount = filtered.filter(a => a.status === 'Active').length;
  const avgEngagement = filtered.length > 0
    ? (filtered.reduce((s, a) => s + a.engagementRate, 0) / filtered.length).toFixed(1)
    : '0';

  return (
    <div className="dashboard-layout">
      <DashboardSidebar storeName={store.name} storeLogo={store.logo_text} />

      <main className="dashboard-content">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontFamily: 'var(--font-display)', marginBottom: '0.25rem' }}>
              Ad Intelligence
            </h1>
            <p style={{ color: 'var(--saas-text-secondary)', fontSize: '0.85rem' }}>
              Competitor ad performance across Facebook, Instagram, Google, YouTube & TikTok.
            </p>
          </div>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleSync}
            disabled={syncing}
            style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}
          >
            <RefreshCw size={14} style={{ animation: syncing ? 'spin 1.5s linear infinite' : 'none' }} />
            {syncing ? 'Syncing feeds...' : 'Sync Ad Feeds'}
          </button>
        </div>

        {/* Summary metrics */}
        <div className="metrics-grid" style={{ marginBottom: '2rem' }}>
          <div className="glass-panel metric-card" style={{ '--accent-color': 'var(--saas-primary)' } as React.CSSProperties}>
            <div className="metric-label"><span>Est. Total Views</span><Eye size={16} /></div>
            <div className="metric-value">{fmtNum(totalViews)}</div>
            <div className="metric-footer">{filtered.length} ads tracked</div>
          </div>
          <div className="glass-panel metric-card" style={{ '--accent-color': 'var(--saas-warning)' } as React.CSSProperties}>
            <div className="metric-label"><span>Est. Spend Range</span><DollarSign size={16} /></div>
            <div className="metric-value" style={{ fontSize: '1.4rem' }}>£{fmtNum(totalSpendMin)}–£{fmtNum(totalSpendMax)}</div>
            <div className="metric-footer">Combined competitor budget</div>
          </div>
          <div className="glass-panel metric-card" style={{ '--accent-color': 'var(--saas-success)' } as React.CSSProperties}>
            <div className="metric-label"><span>Active Campaigns</span><TrendingUp size={16} /></div>
            <div className="metric-value">{activeCount}</div>
            <div className="metric-footer">{filtered.length - activeCount} inactive</div>
          </div>
          <div className="glass-panel metric-card" style={{ '--accent-color': 'var(--saas-secondary)' } as React.CSSProperties}>
            <div className="metric-label"><span>Avg Engagement</span><ThumbsUp size={16} /></div>
            <div className="metric-value">{avgEngagement}%</div>
            <div className="metric-footer">Across filtered ads</div>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem', alignItems: 'center' }}>
          {/* Platform tabs */}
          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
            {PLATFORMS.map(p => (
              <button
                key={p}
                onClick={() => setActivePlatform(p)}
                style={{
                  padding: '0.3rem 0.75rem',
                  borderRadius: '999px',
                  border: activePlatform === p
                    ? `1px solid ${p === 'All' ? 'var(--saas-primary)' : PLATFORM_COLORS[p] || 'var(--saas-primary)'}`
                    : '1px solid rgba(255,255,255,0.08)',
                  background: activePlatform === p ? 'rgba(99,102,241,0.12)' : 'transparent',
                  color: activePlatform === p ? '#f3f4f6' : 'var(--saas-text-muted)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem'
                }}
              >
                {p !== 'All' && <span>{PLATFORM_EMOJI[p]}</span>}
                {p}
              </button>
            ))}
          </div>

          {/* Competitor select */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
            <Filter size={14} style={{ color: 'var(--saas-text-muted)' }} />
            <select
              className="form-control"
              value={activeCompetitor}
              onChange={e => setActiveCompetitor(e.target.value)}
              style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', width: 'auto' }}
            >
              {competitors.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select
              className="form-control"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as 'All' | 'Active' | 'Inactive')}
              style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', width: 'auto' }}
            >
              <option value="All">All status</option>
              <option value="Active">Active only</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Ad cards */}
        {filtered.length === 0 ? (
          <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--saas-text-muted)' }}>
            No ads match filters.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}>
            {filtered.map(ad => {
              const pColor = PLATFORM_COLORS[ad.platform] || '#6366f1';
              const isActive = ad.status === 'Active';
              return (
                <div key={ad.id} className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.875rem', borderTop: `3px solid ${pColor}` }}>

                  {/* Platform + status row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 700, color: pColor }}>
                      {PLATFORM_EMOJI[ad.platform]} {ad.platform}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--saas-text-muted)' }}>{ad.format}</span>
                      <span style={{
                        fontSize: '0.68rem', fontWeight: 700, padding: '0.15rem 0.5rem',
                        borderRadius: '999px',
                        background: isActive ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.04)',
                        color: isActive ? 'var(--saas-success)' : 'var(--saas-text-muted)',
                        border: isActive ? '1px solid rgba(34,197,94,0.2)' : '1px solid rgba(255,255,255,0.06)'
                      }}>
                        {ad.status}
                      </span>
                    </div>
                  </div>

                  {/* Competitor name */}
                  <div style={{ fontSize: '0.72rem', color: 'var(--saas-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {ad.competitor}
                  </div>

                  {/* Ad title + description */}
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.35rem', color: '#f3f4f6' }}>{ad.title}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--saas-text-secondary)', lineHeight: '1.45' }}>{ad.description}</div>
                  </div>

                  {/* Key stats row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                    <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)', padding: '0.5rem', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.65rem', color: 'var(--saas-text-muted)', marginBottom: '0.2rem' }}>EST. VIEWS</div>
                      <div style={{ fontSize: '1rem', fontWeight: 700, color: '#f3f4f6' }}>{fmtNum(ad.estimatedViews)}</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)', padding: '0.5rem', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.65rem', color: 'var(--saas-text-muted)', marginBottom: '0.2rem' }}>EST. SPEND</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--saas-warning)' }}>£{ad.estimatedSpendMin}–£{ad.estimatedSpendMax}</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)', padding: '0.5rem', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.65rem', color: 'var(--saas-text-muted)', marginBottom: '0.2rem' }}>ENGAGEMENT</div>
                      <div style={{ fontSize: '1rem', fontWeight: 700, color: ad.engagementRate >= 5 ? 'var(--saas-success)' : 'var(--saas-text-secondary)' }}>{ad.engagementRate}%</div>
                    </div>
                  </div>

                  {/* Social stats (skip for Google Search) */}
                  {ad.platform !== 'Google' && (
                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.78rem', color: 'var(--saas-text-secondary)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><ThumbsUp size={11} /> {fmtNum(ad.likes)}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><MessageCircle size={11} /> {fmtNum(ad.comments)}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Share2 size={11} /> {fmtNum(ad.shares)}</span>
                      <span style={{ marginLeft: 'auto', color: 'var(--saas-text-muted)' }}>Running {ad.runningDays}d</span>
                    </div>
                  )}

                  {ad.platform === 'Google' && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--saas-text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                      <span>CTR: {ad.engagementRate}%</span>
                      <span>Running {ad.runningDays}d</span>
                    </div>
                  )}

                  {/* Link */}
                  {ad.url && (
                    <a href={ad.url} target="_blank" rel="noopener noreferrer"
                      className="btn btn-secondary btn-sm"
                      style={{ display: 'inline-flex', gap: '0.3rem', alignItems: 'center', fontSize: '0.75rem', padding: '0.3rem 0.6rem', width: 'fit-content' }}>
                      <ExternalLink size={10} /> View on {ad.platform}
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Disclaimer */}
        <div style={{ marginTop: '2rem', padding: '0.875rem 1.25rem', background: 'rgba(99,102,241,0.05)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(99,102,241,0.12)', fontSize: '0.75rem', color: 'var(--saas-text-muted)', lineHeight: '1.5' }}>
          <strong style={{ color: 'var(--saas-text-secondary)' }}>ℹ️ Data source note:</strong> Views and spend are estimates based on public ad library signals. Actual spend data is not publicly disclosed by platforms. For live data, connect Facebook Ad Library API or a third-party intelligence provider (SimilarWeb, SEMrush).
        </div>
      </main>
    </div>
  );
}
