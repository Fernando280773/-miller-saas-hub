"use client";

import React, { useState, useEffect } from 'react';
import DashboardSidebar from '../../../components/DashboardSidebar';
import { db, Store, Order, DEFAULT_STORE_ID } from '../../../lib/supabaseClient';
import { Clock, CheckCircle, Truck, Check } from 'lucide-react';

export default function OrdersPage() {
  const [store, setStore] = useState<Store | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStoreAndOrders = async () => {
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
        const data = await db.getOrders(currentStore.id);
        setOrders(data);
      }
      setLoading(false);
    };

    loadStoreAndOrders();
  }, []);

  const handleUpdateStatus = async (orderId: string, currentStatus: Order['status']) => {
    const nextStatus = currentStatus === 'Pending' ? 'Shipped' : 'Delivered';
    const success = await db.updateOrderStatus(orderId, nextStatus);
    if (success && store) {
      const data = await db.getOrders(store.id);
      setOrders(data);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: '#090d16', color: '#9ca3af' }}>
        <h3>Loading order logs...</h3>
      </div>
    );
  }

  if (!store) return null;

  return (
    <div className="dashboard-layout">
      <DashboardSidebar storeName={store.name} storeLogo={store.logo_text} />

      <main className="dashboard-content">
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontFamily: 'var(--font-display)', marginBottom: '0.25rem' }}>Customer Sales Orders</h1>
          <p style={{ color: 'var(--saas-text-secondary)', fontSize: '0.85rem' }}>Fulfill client invoices and track shipments.</p>
        </div>

        <div className="glass-panel table-panel" style={{ marginTop: 0 }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Customer Info</th>
                <th>Shipping Address</th>
                <th>Total Invoiced</th>
                <th>Tracking Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--saas-text-muted)' }}>
                    No buyer invoices recorded.
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id}>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: '0.8rem', fontWeight: 600 }}>
                      #{order.id.split('-').pop()?.toUpperCase()}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{order.customer_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--saas-text-muted)' }}>{order.customer_email}</div>
                    </td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--saas-text-secondary)' }}>{order.shipping_address}</td>
                    <td style={{ fontWeight: 700, color: 'var(--saas-primary)' }}>
                      ${order.total.toFixed(2)}
                    </td>
                    <td>
                      {order.status === 'Pending' && <span className="badge badge-pending"><Clock size={10} style={{ marginRight: '0.25rem' }} /> Pending</span>}
                      {order.status === 'Shipped' && <span className="badge" style={{ background: 'rgba(59,130,246,0.12)', color: '#93c5fd' }}><Truck size={10} style={{ marginRight: '0.25rem' }} /> Shipped</span>}
                      {order.status === 'Delivered' && <span className="badge badge-success"><CheckCircle size={10} style={{ marginRight: '0.25rem' }} /> Delivered</span>}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {order.status !== 'Delivered' ? (
                        <button 
                          className="btn btn-secondary btn-sm"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                          onClick={() => handleUpdateStatus(order.id, order.status)}
                        >
                          <Check size={12} /> {order.status === 'Pending' ? 'Ship Order' : 'Mark Delivered'}
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: 'var(--saas-success)', fontWeight: 600 }}>Fulfilled</span>
                      )}
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
