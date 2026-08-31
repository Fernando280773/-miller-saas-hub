"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { db, Store } from '../lib/supabaseClient';
import { 
  Layers, 
  Plus, 
  ArrowRight, 
  TrendingUp, 
  DollarSign, 
  ShoppingBag, 
  Users, 
  CheckCircle,
  ExternalLink,
  Info
} from 'lucide-react';

export default function PlatformLanding() {
  const [stores, setStores] = useState<Store[]>([]);
  const [newStoreName, setNewStoreName] = useState('');
  const [newStoreLogo, setNewStoreLogo] = useState('🛍️');
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    const loadStores = async () => {
      const data = await db.getStores();
      setStores(data);
    };
    loadStores();
  }, []);

  const handleCreateStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStoreName.trim()) return;

    const subdomain = newStoreName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    await db.createStore({
      name: newStoreName,
      subdomain,
      logo_text: newStoreLogo,
      primary_color: '#6366f1',
      secondary_color: '#ec4899',
      bg_color: '#ffffff',
      text_color: '#1f2937',
      btn_color: '#6366f1',
      layout: 'grid',
      description: `Welcome to ${newStoreName}! Discover our high-quality inventory.`
    });

    setNewStoreName('');
    setNewStoreLogo('🛍️');
    setShowCreateModal(false);
    
    const data = await db.getStores();
    setStores(data);
  };

  const handleSelectStore = (storeId: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('active_store_id', storeId);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem', width: '100%' }}>
      {/* Platform Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem 0', borderBottom: '1px solid var(--saas-border)', marginBottom: '3rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.5rem', fontWeight: 800, fontFamily: 'var(--font-display)', background: 'linear-gradient(135deg, #ffffff 0%, var(--saas-primary) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          <Layers size={26} style={{ color: 'var(--saas-primary)' }} />
          <span>Miller Saas Hub</span>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <Link href="/login" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none' }}>
            🔐 Sign In / RBAC
          </Link>
          <button className="btn btn-primary btn-sm" onClick={() => setShowCreateModal(true)}>
            <Plus size={16} /> Deploy Storefront
          </button>
        </div>
      </header>

      {/* Hero Intro */}
      <section style={{ textAlign: 'center', padding: '3rem 1rem', maxWidth: '800px', margin: '0 auto' }}>
        <span style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--saas-primary)', padding: '0.35rem 0.75rem', borderRadius: 'var(--radius-full)', fontSize: '0.85rem', fontWeight: 600, border: '1px solid rgba(99, 102, 241, 0.2)' }}>
          🚀 Next.js App Router + Supabase Multi-Tenancy
        </span>
        <h1 style={{ fontSize: '3rem', marginTop: '1rem', marginBottom: '1.25rem', background: 'linear-gradient(to right, #ffffff, #9ca3af)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Modern Multi-Tenant E-Commerce Infrastructure.
        </h1>
        <p style={{ color: 'var(--saas-text-secondary)', fontSize: '1.1rem', marginBottom: '2.5rem', lineHeight: '1.6' }}>
          Welcome to Miller SaaS Hub. Spin up dedicated customer storefronts, sync mock integrations (Stripe checkout, SendGrid newsletters), and run background catalog scraping using Deno Edge Functions.
        </p>
      </section>

      {/* active stores grid */}
      <section style={{ marginBottom: '4rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)' }}>Deployed Merchant Sites</h2>
            <p style={{ color: 'var(--saas-text-secondary)', fontSize: '0.85rem' }}>Select a tenant store to open its custom management console dashboard.</p>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setShowCreateModal(true)}>
            <Plus size={16} /> Spin Up Tenant
          </button>
        </div>

        <div className="integrations-grid">
          {stores.map((store) => (
            <div key={store.id} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '2.25rem' }}>{store.logo_text}</span>
                <span style={{ fontSize: '0.75rem', fontFamily: 'var(--mono)', color: 'var(--saas-primary)' }}>
                  {store.subdomain}.millersaashub.io
                </span>
              </div>
              <div>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '0.25rem' }}>{store.name}</h3>
                <p style={{ color: 'var(--saas-text-secondary)', fontSize: '0.825rem', height: '60px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', lineHeight: '1.4' }}>
                  {store.description}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '1rem' }}>
                <Link 
                  href="/dashboard"
                  className="btn btn-secondary btn-sm"
                  style={{ flexGrow: 1, display: 'inline-flex', gap: '0.25rem' }}
                  onClick={() => handleSelectStore(store.id)}
                >
                  Dashboard <ArrowRight size={12} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing Tiers — hidden, not deleted */}
      {false && (
      <section style={{ borderTop: '1px solid var(--saas-border)', paddingTop: '3rem', paddingBottom: '3rem' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '3rem', fontSize: '1.75rem', fontFamily: 'var(--font-display)' }}>Gateway Packages</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>

          {/* UK Gateway */}
          <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', position: 'relative' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>UK Gateway</h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--saas-text-muted)', marginBottom: '1.25rem', display: 'block' }}>Single Trader Market</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem', marginBottom: '1.5rem' }}>
              <span style={{ fontSize: '2.25rem', fontWeight: 800 }}>£29</span>
              <span style={{ color: 'var(--saas-text-muted)', fontSize: '0.85rem' }}>/ month</span>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.5rem 0', display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem', color: 'var(--saas-text-secondary)' }}>
              <li style={{ display: 'flex', gap: '0.5rem' }}><CheckCircle size={14} color="var(--saas-success)" /> Single workspace</li>
              <li style={{ display: 'flex', gap: '0.5rem' }}><CheckCircle size={14} color="var(--saas-success)" /> Stripe transaction checkout</li>
              <li style={{ display: 'flex', gap: '0.5rem' }}><CheckCircle size={14} color="var(--saas-success)" /> Basic SQL tables structure</li>
            </ul>
          </div>

          {/* Europe Gateway */}
          <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', borderColor: 'var(--saas-primary)', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '-12px', right: '1.5rem', background: 'var(--saas-primary)', color: 'white', padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-full)', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase' }}>
              Popular
            </div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>Europe Gateway</h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--saas-text-muted)', marginBottom: '1.25rem', display: 'block' }}>Market Tier</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem', marginBottom: '1.5rem' }}>
              <span style={{ fontSize: '2.25rem', fontWeight: 800 }}>$99</span>
              <span style={{ color: 'var(--saas-text-muted)', fontSize: '0.85rem' }}>/ month</span>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.5rem 0', display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem', color: 'var(--saas-text-secondary)' }}>
              <li style={{ display: 'flex', gap: '0.5rem' }}><CheckCircle size={14} color="var(--saas-success)" /> Multi-tenant databases clustering</li>
              <li style={{ display: 'flex', gap: '0.5rem' }}><CheckCircle size={14} color="var(--saas-success)" /> Deno Edge Scraper integrations</li>
              <li style={{ display: 'flex', gap: '0.5rem' }}><CheckCircle size={14} color="var(--saas-success)" /> SLA server priority routing</li>
            </ul>
          </div>

          {/* Global Gateway */}
          <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', position: 'relative' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>Global Gateway</h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--saas-text-muted)', marginBottom: '1.25rem', display: 'block' }}>Market Tier</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem', marginBottom: '1.5rem' }}>
              <span style={{ fontSize: '2.25rem', fontWeight: 800 }}>$299</span>
              <span style={{ color: 'var(--saas-text-muted)', fontSize: '0.85rem' }}>/ month</span>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.5rem 0', display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem', color: 'var(--saas-text-secondary)' }}>
              <li style={{ display: 'flex', gap: '0.5rem' }}><CheckCircle size={14} color="var(--saas-success)" /> Multi-tenant databases clustering</li>
              <li style={{ display: 'flex', gap: '0.5rem' }}><CheckCircle size={14} color="var(--saas-success)" /> Deno Edge Scraper integrations</li>
              <li style={{ display: 'flex', gap: '0.5rem' }}><CheckCircle size={14} color="var(--saas-success)" /> SLA server priority routing</li>
            </ul>
          </div>

        </div>
      </section>
      )}

      {/* CREATE STORE MODAL */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ background: '#0b0f19', color: '#f3f4f6' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.15rem' }}>Create New Tenant</h3>
              <button 
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#9ca3af', fontSize: '1.25rem', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleCreateStore}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Store Branding Name</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="e.g. Zenith Tech"
                    value={newStoreName}
                    onChange={(e) => setNewStoreName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Branding Visual Emoji</label>
                  <select 
                    className="form-control"
                    value={newStoreLogo}
                    onChange={(e) => setNewStoreLogo(e.target.value)}
                  >
                    <option value="🛍️">🛍️ Shopping Bag</option>
                    <option value="💻">💻 Tech / Gear</option>
                    <option value="👕">👕 Fashion</option>
                    <option value="☕">☕ Cafe / Beverages</option>
                    <option value="🏺">🏺 Ceramics</option>
                    <option value="🛠️">🛠️ Shop Fitting</option>
                    <option value="✈️">✈️ Travel & Tourism</option>
                    <option value="🔨">🔨 Retail space refurbishment</option>
                    <option value="🛋️">🛋️ Store interior design</option>
                    <option value="🤝">🤝 Voluntary Service (Non-Profit)</option>
                    <option value="🎓">🎓 Education & Tuition</option>
                    <option value="🌊">🌊 Coast Providers</option>
                    <option value="🧱">🧱 Building Materials</option>
                    <option value="🏢">🏢 Commercial Building Materials</option>
                    <option value="🛋️">🛋️ Home Furniture</option>
                    <option value="💄">💄 Beauty & Cosmetics</option>
                    <option value="🌿">🌿 Herbs & Natural Products</option>
                    <option value="📱">📱 Phone Accessories</option>
                    <option value="🚛">🚛 Logistic</option>
                    <option value="🩺">🩺 Medical services</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Deploy Tenant</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
