"use client";

import React, { useState, useEffect } from 'react';
import DashboardSidebar from '../../../components/DashboardSidebar';
import IntegrationsList from '../../../components/IntegrationsList';
import { db, Store, DEFAULT_STORE_ID } from '../../../lib/supabaseClient';

export default function IntegrationsPage() {
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStore = async () => {
      setLoading(true);
      let activeId = DEFAULT_STORE_ID;
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('active_store_id');
        if (saved) activeId = saved;
      }

      const allStores = await db.getStores();
      const currentStore = allStores.find(s => s.id === activeId) || allStores[0];
      if (currentStore) {
        setStore(currentStore);
      }
      setLoading(false);
    };

    loadStore();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: '#090d16', color: '#9ca3af' }}>
        <h3>Loading integrations...</h3>
      </div>
    );
  }

  if (!store) return null;

  return (
    <div className="dashboard-layout">
      <DashboardSidebar storeName={store.name} storeLogo={store.logo_text} />

      <main className="dashboard-content">
        <div style={{ marginBottom: '2.5rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontFamily: 'var(--font-display)', marginBottom: '0.25rem' }}>
            Integrations Panel
          </h1>
          <p style={{ color: 'var(--saas-text-secondary)', fontSize: '0.85rem' }}>
            Enable external endpoints, Stripe checkouts, or Deno Edge sync functions.
          </p>
        </div>

        <IntegrationsList storeId={store.id} />
      </main>
    </div>
  );
}
