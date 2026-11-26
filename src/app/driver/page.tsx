'use client';

import s from '@/components/jacket/jacket.module.css';
import { JC_VENUE, orderNumber, ordersStore, updateOrder } from '@/lib/jacketClub';

const DRIVER = JC_VENUE.drivers[0];

export default function DriverPage() {
  const orders = ordersStore.use();
  const mine = orders.filter(o => o.mode === 'delivery' && (o.status === 'out' ? o.driver === DRIVER : o.status === 'ready' || o.status === 'preparing'));
  const active = mine.filter(o => o.status === 'out');
  const waiting = mine.filter(o => o.status !== 'out');

  return (
    <>
      <header className={s.brandHeader} style={{ justifyContent: 'space-between', padding: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <h1 className={s.display} style={{ margin: 0, fontSize: 18 }}>My deliveries</h1>
          <div style={{ fontSize: 13 }}>Driver: {DRIVER} · {mine.length} assigned</div>
        </div>
        <span className={s.pillYellow} style={{ padding: '4px 10px', fontSize: 13 }}>On shift</span>
      </header>
      <main className={s.main} style={{ gap: 14 }}>
        {mine.length === 0 && <p className={s.muted}>Nothing to deliver right now.</p>}
        {active.map(o => (
          <article key={o.id} style={{ border: '2px solid var(--jc-green)', borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--jc-paper)' }}>
            <div className={s.sumRow} style={{ alignItems: 'center' }}>
              <span className={s.display} style={{ fontSize: 22, color: 'var(--jc-green)' }}>{orderNumber(o)}</span>
              <span className={s.pillYellow} style={{ fontSize: 12, padding: '3px 8px' }}>Out for delivery</span>
            </div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{o.address}</div>
            <div className={s.muted} style={{ fontSize: 14 }}>{[o.addressNote, o.distance?.replace('mi', 'miles')].filter(Boolean).join(' · ')}</div>
            <div style={{ fontSize: 14 }}>{o.customerName}{o.phone ? ' · ' + o.phone : ''}</div>
            <div style={{ fontSize: 14 }}>{o.lines.reduce((n, l) => n + l.qty, 0)} items · paid in app · nothing to collect</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
              <a href={`https://maps.google.com/?q=${encodeURIComponent(o.address ?? '')}`} target="_blank" rel="noopener noreferrer" className={s.btnOutline} style={{ height: 48, borderRadius: 10, fontSize: 15 }}>Open map</a>
              <a href={o.phone ? `tel:${o.phone.replace(/\s/g, '')}` : '#'} className={s.btnOutline} style={{ height: 48, borderRadius: 10, fontSize: 15 }}>Call customer</a>
            </div>
            <button type="button" className={s.btnPrimary} style={{ height: 56 }} onClick={() => updateOrder(o.id, { status: 'done' })}>Mark delivered</button>
          </article>
        ))}
        {waiting.map(o => (
          <article key={o.id} style={{ border: '1px solid var(--jc-border)', borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column', gap: 8, background: 'var(--jc-paper)' }}>
            <div className={s.sumRow} style={{ alignItems: 'center' }}>
              <span className={s.display} style={{ fontSize: 22, color: 'var(--jc-green)' }}>{orderNumber(o)}</span>
              <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 8px', borderRadius: 999, background: 'var(--jc-line)' }}>
                {o.status === 'ready' ? 'Ready at counter' : 'Being prepared'}
              </span>
            </div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{o.address}</div>
            {o.distance && <div className={s.muted} style={{ fontSize: 14 }}>{o.distance.replace('mi', 'miles')}</div>}
            <button
              type="button"
              className={s.btnOutline}
              disabled={o.status !== 'ready'}
              style={{ opacity: o.status === 'ready' ? 1 : 0.5 }}
              onClick={() => updateOrder(o.id, { status: 'out', driver: DRIVER })}
            >
              Picked up, start delivery
            </button>
          </article>
        ))}
      </main>
    </>
  );
}
