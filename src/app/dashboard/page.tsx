"use client";

import React, { useState, useEffect } from 'react';
import DashboardSidebar from '../../components/DashboardSidebar';
import { db, Store, Order, Product, Integration } from '../../lib/supabaseClient';
import { 
  DollarSign, 
  ShoppingBag, 
  Package, 
  Layers, 
  Clock,
  CheckCircle,
  Truck
} from 'lucide-react';

export default function DashboardHome() {
  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      
      const allStores = await db.getStores();
      let currentStore = allStores[0];
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('active_store_id');
        if (saved) currentStore = allStores.find(s => s.id === saved) || allStores[0];
      }
      
      if (currentStore) {
        setStore(currentStore);
        const [prods, ords, ints] = await Promise.all([
          db.getProducts(currentStore.id),
          db.getOrders(currentStore.id),
          db.getIntegrations(currentStore.id)
        ]);
        setProducts(prods);
        setOrders(ords);
        setIntegrations(ints);
      }
      
      setLoading(false);
    };

    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: '#090d16', color: '#9ca3af' }}>
        <h3>Loading dashboard details...</h3>
      </div>
    );
  }

  if (!store) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: '#090d16', color: '#ef4444' }}>
        <h3>Merchant store not found.</h3>
      </div>
    );
  }

  // Calculations
  const grossRevenue = orders.reduce((sum, o) => sum + o.total, 0);
  const totalStock = products.reduce((sum, p) => sum + p.stock, 0);
  const activeIntegrationsCount = integrations.filter(i => i.status === 'Active').length;

  return (
    <div className="dashboard-layout">
      <DashboardSidebar storeName={store.name} storeLogo={store.logo_text} />

      <main className="dashboard-content">
        {/* Banner */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontFamily: 'var(--font-display)', marginBottom: '0.25rem' }}>
              Welcome back, {store.name} Admin
            </h1>
            <p style={{ color: 'var(--saas-text-secondary)', fontSize: '0.85rem' }}>
              Here is your multi-tenant analytics dashboard.
            </p>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="metrics-grid">
          <div className="glass-panel metric-card" style={{ '--accent-color': 'var(--saas-primary)' } as React.CSSProperties}>
            <div className="metric-label">
              <span>Gross Sales Volume</span>
              <DollarSign size={16} />
            </div>
            <div className="metric-value">${grossRevenue.toFixed(2)}</div>
            <div className="metric-footer">Synced to Supabase database</div>
          </div>

          <div className="glass-panel metric-card" style={{ '--accent-color': 'var(--saas-success)' } as React.CSSProperties}>
            <div className="metric-label">
              <span>Customer Orders</span>
              <ShoppingBag size={16} />
            </div>
            <div className="metric-value">{orders.length}</div>
            <div className="metric-footer">{orders.filter(o => o.status === 'Pending').length} awaiting fulfillment</div>
          </div>

          <div className="glass-panel metric-card" style={{ '--accent-color': 'var(--saas-warning)' } as React.CSSProperties}>
            <div className="metric-label">
              <span>Catalog Products</span>
              <Package size={16} />
            </div>
            <div className="metric-value">{products.length}</div>
            <div className="metric-footer">{totalStock} total units in stock</div>
          </div>

          <div className="glass-panel metric-card" style={{ '--accent-color': 'var(--saas-secondary)' } as React.CSSProperties}>
            <div className="metric-label">
              <span>Active Connectors</span>
              <Layers size={16} />
            </div>
            <div className="metric-value">{activeIntegrationsCount}</div>
            <div className="metric-footer">Out of {integrations.length} configured modules</div>
          </div>
        </div>

        {/* Chart representation */}
        <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', fontFamily: 'var(--font-display)' }}>Weekly Visitors Trend</h3>
          <p style={{ color: 'var(--saas-text-muted)', fontSize: '0.75rem', marginBottom: '1.5rem' }}>Daily platform pageviews per tenant</p>
          <div style={{ height: '140px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '1rem', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.5rem' }}>
            {[180, 240, 190, 310, 420, 290, 350].map((val, idx) => {
              const heightPct = (val / 500) * 100;
              return (
                <div key={idx} style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                  <div style={{ 
                    width: '80%', 
                    maxWidth: '40px', 
                    height: `${heightPct}%`, 
                    background: 'linear-gradient(to top, var(--saas-primary), var(--saas-secondary))',
                    borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0'
                  }} />
                  <span style={{ fontSize: '0.7rem', color: 'var(--saas-text-muted)', marginTop: '0.25rem' }}>
                    {['M', 'T', 'W', 'T', 'F', 'S', 'S'][idx]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Transactions List */}
        <div className="glass-panel table-panel">
          <h3 style={{ fontSize: '1.1rem', fontFamily: 'var(--font-display)' }}>Recent Invoices</h3>
          <table className="custom-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Email</th>
                <th>Amount</th>
                <th>Fulfillment Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--saas-text-muted)' }}>
                    No transactions recorded.
                  </td>
                </tr>
              ) : (
                orders.slice(0, 5).map((order) => (
                  <tr key={order.id}>
                    <td style={{ fontWeight: 600 }}>{order.customer_name}</td>
                    <td style={{ color: 'var(--saas-text-secondary)' }}>{order.customer_email}</td>
                    <td style={{ fontWeight: 700, color: 'var(--saas-primary)' }}>${order.total.toFixed(2)}</td>
                    <td>
                      {order.status === 'Pending' && <span className="badge badge-pending"><Clock size={10} style={{ marginRight: '0.25rem' }} /> Pending</span>}
                      {order.status === 'Shipped' && <span className="badge" style={{ background: 'rgba(59,130,246,0.12)', color: '#93c5fd' }}><Truck size={10} style={{ marginRight: '0.25rem' }} /> Shipped</span>}
                      {order.status === 'Delivered' && <span className="badge badge-success"><CheckCircle size={10} style={{ marginRight: '0.25rem' }} /> Delivered</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
