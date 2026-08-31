"use client";

import React, { useState, useEffect } from 'react';
import DashboardSidebar from '../../../components/DashboardSidebar';
import { db, Store, DEFAULT_STORE_ID } from '../../../lib/supabaseClient';
import {
  CreditCard,
  CheckCircle,
  Zap,
  Download
} from 'lucide-react';

interface BillingInvoice {
  id: string;
  date: string;
  amount: string;
  plan: string;
  status: 'Paid' | 'Processing';
  pdfUrl?: string;
}

export default function BillingPage() {
  const [store, setStore] = useState<Store | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [activePlan, setActivePlan] = useState<'starter' | 'growth' | 'agency'>('growth');
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const [invoices, setInvoices] = useState<BillingInvoice[]>([
    { id: 'INV-2026-08', date: '28 Aug 2026', amount: '£79.00', plan: 'Growth Tier (Monthly)', status: 'Paid' },
    { id: 'INV-2026-07', date: '28 Jul 2026', amount: '£79.00', plan: 'Growth Tier (Monthly)', status: 'Paid' },
    { id: 'INV-2026-06', date: '28 Jun 2026', amount: '£79.00', plan: 'Growth Tier (Monthly)', status: 'Paid' },
    { id: 'INV-2026-05', date: '28 May 2026', amount: '£29.00', plan: 'Starter Tier (Monthly)', status: 'Paid' },
  ]);

  useEffect(() => {
    const load = async () => {
      let id = DEFAULT_STORE_ID;
      if (typeof window !== 'undefined') {
        const s = localStorage.getItem('active_store_id');
        if (s) id = s;
      }
      const stores = await db.getStores();
      const cur = stores.find(s => s.id === id) || stores[0];
      if (cur) setStore(cur);

      // Check URL query parameters for upgrade success (after await so
      // state updates run asynchronously — react-hooks safe)
      if (typeof window !== 'undefined') {
        const storedPlan = localStorage.getItem('miller_active_plan');
        if (storedPlan) setActivePlan(storedPlan as 'starter' | 'growth' | 'agency');

        const params = new URLSearchParams(window.location.search);
        if (params.get('upgraded') === 'true') {
          const upgradedPlan = (params.get('plan') as 'starter' | 'growth' | 'agency') || 'growth';
          setActivePlan(upgradedPlan);
          localStorage.setItem('miller_active_plan', upgradedPlan);
          setToastMsg(`🎉 Success! Your subscription has been updated to the ${upgradedPlan.toUpperCase()} plan.`);
          setTimeout(() => setToastMsg(null), 5000);
        }
      }
    };
    load();
  }, []);

  const handleUpgrade = async (planId: 'starter' | 'growth' | 'agency') => {
    setLoadingPlan(planId);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId,
          billingCycle,
          storeId: store?.id || DEFAULT_STORE_ID
        })
      });

      const data = await res.json();
      if (data.url) {
        if (data.simulated) {
          setActivePlan(planId);
          if (typeof window !== 'undefined') localStorage.setItem('miller_active_plan', planId);
          
          // Prepend new invoice
          const newInv: BillingInvoice = {
            id: `INV-2026-${String(invoices.length + 1).padStart(2, '0')}`,
            date: 'Today',
            amount: billingCycle === 'yearly' ? (planId === 'starter' ? '£290.00' : planId === 'growth' ? '£790.00' : '£1,990.00') : (planId === 'starter' ? '£29.00' : planId === 'growth' ? '£79.00' : '£199.00'),
            plan: `${planId.toUpperCase()} Tier (${billingCycle})`,
            status: 'Paid'
          };
          setInvoices(prev => [newInv, ...prev]);

          setToastMsg(`🎉 Subscription upgraded to ${planId.toUpperCase()} Tier (${billingCycle})!`);
          setTimeout(() => setToastMsg(null), 5000);
        } else {
          window.location.assign(data.url);
        }
      }
    } catch (err) {
      console.error('Upgrade error:', err);
      setToastMsg('Failed to process upgrade checkout.');
    } finally {
      setLoadingPlan(null);
    }
  };

  const PLANS = [
    {
      id: 'starter' as const,
      name: 'Starter',
      monthly: 29,
      yearly: 290,
      description: 'Essential multi-tenant commerce tools for independent merchants.',
      features: [
        '1 Tenant Storefront',
        'Up to 500 Products in Catalog',
        '2 Hosted AI Landing Pages',
        'Basic Lead CRM Pipeline',
        'Manual WhatsApp Drafts',
        'Standard Email Support',
      ],
      badge: null,
      accentColor: '#6366f1'
    },
    {
      id: 'growth' as const,
      name: 'Growth',
      monthly: 79,
      yearly: 790,
      description: 'Ideal for scaling businesses seeking automated multi-channel growth.',
      features: [
        'Up to 5 Tenant Storefronts',
        'Up to 2,500 Products & Repricer',
        '10 Hosted AI Landing Pages',
        '5 Miller AI Social Agents (80% Driven)',
        'WhatsApp Invoice OCR Capture',
        'Multi-Marketplace Connectors (Amazon, eBay, UberEats)',
        'Automated Nurture Sequence Triggers',
      ],
      badge: 'Most Popular · 80% AI Agent Driven',
      accentColor: '#EF178E'
    },
    {
      id: 'agency' as const,
      name: 'Agency / Scale',
      monthly: 199,
      yearly: 1990,
      description: 'Maximum power, white-label options, and dedicated serverless scrapers.',
      features: [
        'Unlimited Tenant Storefronts',
        'Unlimited Product Catalogs',
        'Unlimited Hosted Landing Pages',
        'Custom Domain White-Labeling',
        'Dedicated Serverless Scrapers',
        'Priority 24/7 SLA & Dedicated Support',
        'Full Multi-Tenant RBAC Team Seats',
      ],
      badge: 'Enterprise Grade',
      accentColor: '#1CD8D2'
    }
  ];

  return (
    <div className="dashboard-layout">
      <DashboardSidebar storeName={store?.name} storeLogo={store?.logo_text} />
      <main className="dashboard-content">
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '1.5rem' }}>
          
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>Billing &amp; Subscriptions</h1>
              <p style={{ color: 'var(--saas-text-muted)', fontSize: '0.88rem', margin: '0.35rem 0 0' }}>
                Powered by <span style={{ color: 'var(--saas-primary)', fontWeight: 600 }}>Miller AI</span> · Manage plan tiers, usage metering &amp; invoices
              </p>
            </div>

            {/* Monthly / Yearly Toggle */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 50,
              padding: 4
            }}>
              <button
                onClick={() => setBillingCycle('monthly')}
                style={{
                  padding: '6px 16px',
                  borderRadius: 50,
                  border: 'none',
                  background: billingCycle === 'monthly' ? 'var(--saas-primary)' : 'none',
                  color: '#fff',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle('yearly')}
                style={{
                  padding: '6px 16px',
                  borderRadius: 50,
                  border: 'none',
                  background: billingCycle === 'yearly' ? 'var(--saas-primary)' : 'none',
                  color: '#fff',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                <span>Yearly</span>
                <span style={{ fontSize: '0.65rem', background: '#10B981', color: '#fff', padding: '1px 6px', borderRadius: 10 }}>Save 15%</span>
              </button>
            </div>
          </div>

          {/* Toast Message */}
          {toastMsg && (
            <div style={{
              padding: '0.9rem 1.2rem',
              borderRadius: 12,
              background: 'rgba(16,185,129,0.15)',
              border: '1px solid rgba(16,185,129,0.3)',
              color: '#4ade80',
              fontSize: '0.88rem',
              fontWeight: 600,
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <CheckCircle size={18} />
              <span>{toastMsg}</span>
            </div>
          )}

          {/* ── Usage Metering Section ────────────────────────── */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: 16,
            padding: '1.5rem',
            marginBottom: '2rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Zap size={18} style={{ color: '#F59E0B' }} />
                <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Monthly Usage &amp; AI Metering</span>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--saas-text-muted)' }}>
                Billing Period: Aug 1 - Aug 31 · Current Plan: <strong style={{ color: '#818cf8' }}>{activePlan.toUpperCase()}</strong>
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
              {/* Metric 1 */}
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '1rem', borderRadius: 12, border: '1px solid rgba(255, 255, 255, 0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--saas-text-muted)', marginBottom: 6 }}>
                  <span>🤖 Miller AI Tasks</span>
                  <span style={{ color: '#fff', fontWeight: 700 }}>1,420 / 5,000</span>
                </div>
                <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 10, overflow: 'hidden' }}>
                  <div style={{ width: '28%', height: '100%', background: 'linear-gradient(90deg, #EF178E, #8E54E9)', borderRadius: 10 }} />
                </div>
                <span style={{ fontSize: '0.68rem', color: '#10B981', display: 'block', marginTop: 6 }}>✓ 28% used (Healthy)</span>
              </div>

              {/* Metric 2 */}
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '1rem', borderRadius: 12, border: '1px solid rgba(255, 255, 255, 0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--saas-text-muted)', marginBottom: 6 }}>
                  <span>💬 WhatsApp Invoices Captured</span>
                  <span style={{ color: '#fff', fontWeight: 700 }}>48 / 200</span>
                </div>
                <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 10, overflow: 'hidden' }}>
                  <div style={{ width: '24%', height: '100%', background: '#25D366', borderRadius: 10 }} />
                </div>
                <span style={{ fontSize: '0.68rem', color: '#10B981', display: 'block', marginTop: 6 }}>✓ 24% used</span>
              </div>

              {/* Metric 3 */}
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '1rem', borderRadius: 12, border: '1px solid rgba(255, 255, 255, 0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--saas-text-muted)', marginBottom: 6 }}>
                  <span>🌐 Hosted Landing Pages</span>
                  <span style={{ color: '#fff', fontWeight: 700 }}>3 / 10 Active</span>
                </div>
                <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 10, overflow: 'hidden' }}>
                  <div style={{ width: '30%', height: '100%', background: '#1CD8D2', borderRadius: 10 }} />
                </div>
                <span style={{ fontSize: '0.68rem', color: '#10B981', display: 'block', marginTop: 6 }}>✓ 7 slots available</span>
              </div>

              {/* Metric 4 */}
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '1rem', borderRadius: 12, border: '1px solid rgba(255, 255, 255, 0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--saas-text-muted)', marginBottom: 6 }}>
                  <span>📦 Catalog Sync &amp; Repricer</span>
                  <span style={{ color: '#fff', fontWeight: 700 }}>312 / 2,500</span>
                </div>
                <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 10, overflow: 'hidden' }}>
                  <div style={{ width: '12%', height: '100%', background: '#6366f1', borderRadius: 10 }} />
                </div>
                <span style={{ fontSize: '0.68rem', color: '#10B981', display: 'block', marginTop: 6 }}>✓ Real-time monitoring active</span>
              </div>
            </div>
          </div>

          {/* ── Pricing Tiers Grid ───────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
            {PLANS.map(plan => {
              const isCurrent = activePlan === plan.id;
              const price = billingCycle === 'yearly' ? plan.yearly : plan.monthly;

              return (
                <div
                  key={plan.id}
                  style={{
                    background: isCurrent ? 'rgba(239, 23, 142, 0.06)' : 'rgba(255, 255, 255, 0.02)',
                    border: `1.5px solid ${isCurrent ? 'var(--saas-primary)' : 'rgba(255, 255, 255, 0.08)'}`,
                    borderRadius: 20,
                    padding: '2rem',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    boxShadow: isCurrent ? '0 15px 40px rgba(239, 23, 142, 0.15)' : 'none'
                  }}
                >
                  {plan.badge && (
                    <div style={{
                      position: 'absolute',
                      top: -12,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: 'linear-gradient(135deg, #EF178E, #8E54E9)',
                      color: '#fff',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      padding: '4px 14px',
                      borderRadius: 50,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      whiteSpace: 'nowrap',
                      boxShadow: '0 4px 15px rgba(239, 23, 142, 0.4)'
                    }}>
                      {plan.badge}
                    </div>
                  )}

                  <div style={{ marginBottom: '1.25rem' }}>
                    <h3 style={{ fontSize: '1.3rem', fontWeight: 800, margin: '0 0 0.4rem' }}>{plan.name}</h3>
                    <p style={{ color: 'var(--saas-text-muted)', fontSize: '0.82rem', margin: 0, lineHeight: 1.5 }}>
                      {plan.description}
                    </p>
                  </div>

                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                      <span style={{ fontSize: '2.5rem', fontWeight: 900 }}>£{price}</span>
                      <span style={{ color: 'var(--saas-text-muted)', fontSize: '0.88rem' }}>/{billingCycle === 'yearly' ? 'year' : 'month'}</span>
                    </div>
                    {billingCycle === 'yearly' && (
                      <span style={{ fontSize: '0.72rem', color: '#10B981', fontWeight: 600 }}>Includes 15% annual discount</span>
                    )}
                  </div>

                  <div style={{ flex: 1, marginBottom: '1.75rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--saas-text-muted)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                      Included Features:
                    </div>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      {plan.features.map(f => (
                        <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: '0.83rem', color: 'var(--saas-text)' }}>
                          <CheckCircle size={15} style={{ color: '#10B981', flexShrink: 0, marginTop: 2 }} />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={isCurrent || loadingPlan === plan.id}
                    style={{
                      padding: '12px',
                      borderRadius: 50,
                      border: 'none',
                      background: isCurrent
                        ? 'rgba(255, 255, 255, 0.08)'
                        : 'linear-gradient(135deg, #EF178E, #8E54E9)',
                      color: isCurrent ? 'var(--saas-text-muted)' : '#fff',
                      fontWeight: 800,
                      fontSize: '0.88rem',
                      cursor: isCurrent ? 'default' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      boxShadow: isCurrent ? 'none' : '0 8px 25px rgba(239, 23, 142, 0.35)'
                    }}
                  >
                    {loadingPlan === plan.id ? 'Connecting to Stripe...' : isCurrent ? '✓ Current Plan' : `Upgrade to ${plan.name} →`}
                  </button>
                </div>
              );
            })}
          </div>

          {/* ── Payment Method & Invoices Grid ──────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
            
            {/* Payment Method Card */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: 16,
              padding: '1.5rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Payment Method</span>
                <span style={{ fontSize: '0.72rem', color: '#10B981', background: 'rgba(16,185,129,0.15)', padding: '2px 8px', borderRadius: 10 }}>Active</span>
              </div>

              <div style={{
                background: 'linear-gradient(135deg, rgba(239,23,142,0.15), rgba(142,84,233,0.15))',
                border: '1px solid rgba(239,23,142,0.3)',
                borderRadius: 12,
                padding: '1.25rem',
                marginBottom: '1rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <CreditCard size={22} style={{ color: '#f472b6' }} />
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#f472b6' }}>VISA</span>
                </div>
                <div style={{ fontSize: '1.1rem', letterSpacing: '0.15em', fontWeight: 700, marginBottom: '0.5rem' }}>
                  •••• •••• •••• 4242
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--saas-text-muted)' }}>
                  <span>Expires: 12/28</span>
                  <span>Cardholder: Alex Vance</span>
                </div>
              </div>

              <button style={{
                width: '100%',
                padding: '10px',
                borderRadius: 8,
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#fff',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}>
                Update Card Details
              </button>
            </div>

            {/* Invoices History */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: 16,
              padding: '1.5rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Billing Invoices</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--saas-text-muted)' }}>PDF Receipts</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {invoices.map(inv => (
                  <div
                    key={inv.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.75rem 0.9rem',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.04)',
                      borderRadius: 10,
                      fontSize: '0.82rem'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, color: '#fff' }}>{inv.plan}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--saas-text-muted)', marginTop: 2 }}>{inv.date} · {inv.id}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontWeight: 700 }}>{inv.amount}</span>
                      <span style={{ fontSize: '0.68rem', color: '#10B981', background: 'rgba(16,185,129,0.15)', padding: '2px 6px', borderRadius: 6 }}>{inv.status}</span>
                      <button
                        onClick={() => alert(`Downloading ${inv.id} receipt PDF...`)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--saas-text-muted)',
                          cursor: 'pointer',
                          padding: 2
                        }}
                        title="Download Invoice PDF"
                      >
                        <Download size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      </main>
    </div>
  );
}
