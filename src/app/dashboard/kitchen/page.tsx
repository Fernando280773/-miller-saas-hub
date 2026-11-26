'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import DashboardSidebar from '../../../components/DashboardSidebar';
import { useStore } from '../../../lib/useStore';
import { playNotificationChime } from '../../../lib/audioChime';
import { jcFontClass } from '../../../lib/jacketFonts';
import s from '../../../components/jacket/jacket.module.css';
import {
  JC_VENUE,
  bookingsStore,
  clock,
  menuStore,
  orderNumber,
  ordersStore,
  updateOrder,
  useNow,
  type JcOrder,
} from '../../../lib/jacketClub';

function badge(o: JcOrder): { text: string; bg: string; fg: string } {
  if (o.mode === 'table') return { text: `TABLE ${o.table}`, bg: 'var(--jc-mint)', fg: 'var(--jc-green)' };
  if (o.mode === 'delivery') return { text: o.status === 'out' ? `OUT · ${(o.driver ?? '').toUpperCase()}` : 'DELIVERY', bg: 'var(--jc-ink)', fg: 'var(--jc-yellow)' };
  return { text: o.collectAt && o.collectAt !== 'ASAP' ? `COLLECT ${o.collectAt}` : 'COLLECT', bg: 'var(--jc-sand)', fg: 'var(--jc-brown)' };
}

function meta(o: JcOrder, now: number | null) {
  const dist = o.distance ? ' · ' + o.distance : '';
  if (o.status === 'new') {
    const mins = now ? Math.max(0, Math.round((now - new Date(o.createdAt).getTime()) / 60000)) : null;
    return `Paid · ${clock(o.createdAt)}${mins !== null ? ` · ${mins} min ago` : ''}${dist}`;
  }
  if (o.status === 'preparing') return `Started ${clock(o.startedAt)}${dist}`;
  if (o.status === 'out') return `Left ${clock(o.readyAt)}${dist}`;
  return `Ready ${clock(o.readyAt)} · ${o.customerName}`;
}

export default function KitchenPage() {
  const store = useStore();
  const orders = ordersStore.use();
  const menu = menuStore.use();
  const bookings = bookingsStore.use();
  const now = useNow();
  const [sound, setSound] = useState(true);

  // Chime when a new order lands (not on first load).
  const seen = useRef<Set<string> | null>(null);
  useEffect(() => {
    const ids = orders.filter(o => o.status === 'new').map(o => o.id);
    if (seen.current && sound && ids.some(id => !seen.current!.has(id))) playNotificationChime('success');
    seen.current = new Set(ids);
  }, [orders, sound]);

  const busyDrivers = new Map(orders.filter(o => o.status === 'out' && o.driver).map(o => [o.driver!, o]));
  const freeDriver = JC_VENUE.drivers.find(d => !busyDrivers.has(d));
  const stamp = () => new Date().toISOString();

  const action = (o: JcOrder): { label: string; primary: boolean; run?: () => void } => {
    if (o.status === 'new') return { label: 'Start preparing', primary: true, run: () => updateOrder(o.id, { status: 'preparing', startedAt: stamp() }) };
    if (o.status === 'preparing') return { label: 'Ready', primary: true, run: () => updateOrder(o.id, { status: 'ready', readyAt: stamp() }) };
    if (o.status === 'ready' && o.mode === 'delivery')
      return freeDriver
        ? { label: `Assign ${freeDriver}`, primary: false, run: () => updateOrder(o.id, { status: 'out', driver: freeDriver }) }
        : { label: 'No driver free', primary: false };
    if (o.status === 'ready') return { label: o.mode === 'table' ? 'Served' : 'Collected', primary: false, run: () => updateOrder(o.id, { status: 'done' }) };
    return { label: 'Delivered', primary: false, run: () => updateOrder(o.id, { status: 'done' }) };
  };

  const cols = [
    { title: 'New', list: orders.filter(o => o.status === 'new') },
    { title: 'Preparing', list: orders.filter(o => o.status === 'preparing') },
    { title: 'Ready / out', list: orders.filter(o => o.status === 'ready' || o.status === 'out') },
  ];
  const deposits = bookings.reduce((n, b) => n + b.deposit, 0);

  return (
    <div className="dashboard-layout">
      <DashboardSidebar storeName={store?.name} storeLogo={store?.logo_text} />
      <main className="dashboard-content">
        <div className={`${s.theme} ${s.staffFrame} ${jcFontClass}`}>
          <header className={s.staffBar}>
            <Image src={JC_VENUE.logo} alt="" width={44} height={44} style={{ borderRadius: '50%' }} />
            <h1 className={s.display} style={{ margin: 0, fontSize: 20 }}>Kitchen</h1>
            <div style={{ fontSize: 15 }}>
              {now ? clock(new Date(now).toISOString()) + ' · ' : ''}{orders.length} orders today
            </div>
            <div style={{ flex: 1 }} />
            <button
              type="button"
              aria-pressed={sound}
              onClick={() => setSound(v => !v)}
              style={{ background: 'none', border: 'none', color: 'var(--jc-sand)', fontSize: 14, cursor: 'pointer', minHeight: 44 }}
            >
              Sound {sound ? 'on' : 'off'}
            </button>
            <button
              type="button"
              aria-pressed={menu.paused}
              onClick={() => menuStore.write(m => ({ ...m, paused: !m.paused }))}
              style={{ height: 44, padding: '0 18px', borderRadius: 10, border: '2px solid var(--jc-yellow)', background: menu.paused ? 'var(--jc-yellow)' : 'none', color: menu.paused ? 'var(--jc-ink)' : 'var(--jc-yellow)', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}
            >
              {menu.paused ? 'Resume new orders' : 'Pause new orders'}
            </button>
          </header>

          <div className={s.kitchenBody}>
            {cols.map(c => (
              <section key={c.title} className={s.kCol} aria-label={c.title}>
                <h2>
                  <span>{c.title}</span>
                  <span style={c.title === 'New' && c.list.length ? { background: 'var(--jc-yellow)', padding: '0 10px', borderRadius: 999 } : undefined}>{c.list.length}</span>
                </h2>
                {c.list.map(o => {
                  const b = badge(o);
                  const a = action(o);
                  return (
                    <article key={o.id} className={`${s.ticket} ${o.status === 'new' ? s.ticketNew : ''}`}>
                      <div className={s.sumRow} style={{ alignItems: 'center' }}>
                        <span className={s.display} style={{ fontSize: 26 }}>{orderNumber(o)}</span>
                        <span className={s.badge} style={{ background: b.bg, color: b.fg }}>{b.text}</span>
                      </div>
                      <div className={s.muted} style={{ fontSize: 13 }}>{meta(o, now)}</div>
                      {o.lines.map((l, i) => (
                        <div key={i} style={{ fontSize: 17, lineHeight: 1.3 }}>
                          <b>{l.qty}×</b> {l.name}
                          {l.opts && <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--jc-rust)' }}>{l.opts}</div>}
                        </div>
                      ))}
                      {o.note && <div style={{ fontSize: 14, padding: '6px 8px', borderRadius: 6, background: 'var(--jc-yellow)' }}>Note: {o.note}</div>}
                      <button
                        type="button"
                        className={a.primary ? s.btnPrimary : s.btnOutline}
                        disabled={!a.run}
                        onClick={a.run}
                        style={{ borderRadius: 10 }}
                      >
                        {a.label}
                      </button>
                    </article>
                  );
                })}
              </section>
            ))}

            <aside className={s.aside}>
              <h2 style={{ margin: 0, fontSize: 18 }}>Bookings today</h2>
              <div className={s.panel}>
                {bookings.map(b => (
                  <div key={b.id} className={s.sumRow}>
                    <b>{b.time}</b>
                    <span>{b.name} · {b.people}{b.table ? ' · ' + b.table : ''}{b.date !== 'today' ? ' · ' + b.date : ''}</span>
                  </div>
                ))}
                <div className={s.muted} style={{ fontSize: 13 }}>Deposits paid: £{deposits.toFixed(2)}</div>
              </div>
              <h2 style={{ margin: '6px 0 0', fontSize: 18 }}>Drivers</h2>
              <div className={s.panel} style={{ gap: 8 }}>
                {JC_VENUE.drivers.map(d => {
                  const out = busyDrivers.get(d);
                  return (
                    <div key={d} className={s.sumRow}>
                      <span>{d}</span>
                      <span style={{ fontWeight: 700, color: out ? undefined : 'var(--jc-green)' }}>{out ? `Out · ${orderNumber(out)}` : 'Free'}</span>
                    </div>
                  );
                })}
              </div>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}
