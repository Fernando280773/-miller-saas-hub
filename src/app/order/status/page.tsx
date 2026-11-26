'use client';

import Image from 'next/image';
import Link from 'next/link';
import s from '@/components/jacket/jacket.module.css';
import { JC_VENUE, basketStore, clock, gbp, orderNumber, ordersStore, updateOrder, useNow, type JcOrder } from '@/lib/jacketClub';

const STEPS: Record<JcOrder['mode'], { label: string; heads: string[]; third: string; fourth: string }> = {
  collect: { label: 'Collect', third: 'Ready to collect', fourth: 'Collected', heads: ['We have your order', 'The kitchen is on it', 'Ready! Come and get it', 'Enjoy your meal'] },
  table: { label: 'Table', third: 'On its way to your table', fourth: 'Served', heads: ['We have your order', 'The kitchen is on it', 'Coming over now', 'Enjoy your meal'] },
  delivery: { label: 'Delivery', third: 'Out for delivery', fourth: 'Delivered', heads: ['We have your order', 'The kitchen is on it', 'Your driver is on the way', 'Enjoy your meal'] },
};

/** Map kitchen status to the 4-step customer timeline. */
function stepIndex(o: JcOrder) {
  switch (o.status) {
    case 'new': return 0;
    case 'preparing': return 1;
    case 'ready': return o.mode === 'delivery' ? 1 : 2;
    case 'out': return 2;
    default: return 3;
  }
}

const NEXT: Record<JcOrder['status'], JcOrder['status']> = { new: 'preparing', preparing: 'ready', ready: 'done', out: 'done', done: 'done' };

export default function StatusPage() {
  const basket = basketStore.use();
  const orders = ordersStore.use();
  const hydrated = useNow() !== null;
  const order = orders.find(o => o.id === basket.lastOrderId);

  if (!hydrated) return null;

  if (!order) {
    return (
      <main className={s.main} style={{ alignItems: 'center', textAlign: 'center', paddingTop: 48 }}>
        <Image src={JC_VENUE.logo} alt="" width={96} height={96} style={{ borderRadius: '50%' }} />
        <h1 className={s.display} style={{ color: 'var(--jc-green)', fontSize: 22, margin: 0 }}>No order yet</h1>
        <Link href="/order" className={s.btnPrimary} style={{ alignSelf: 'stretch' }}>Start an order</Link>
      </main>
    );
  }

  const cfg = STEPS[order.mode];
  const at = stepIndex(order);
  const ready = order.mode === 'collect' ? `Show ${orderNumber(order)} at the counter` : order.mode === 'delivery' ? (order.driver ? `With ${order.driver}` : '') : `Table ${order.table}`;
  const steps = [
    { label: 'Order received', time: clock(order.createdAt) },
    { label: 'Preparing', time: order.startedAt ? 'Started ' + clock(order.startedAt) : 'Usually 10–15 min' },
    { label: cfg.third, time: ready },
    { label: cfg.fourth, time: '' },
  ];
  const advance = () => {
    const next = order.mode === 'delivery' && order.status === 'ready' ? 'out' : NEXT[order.status];
    const stamp = new Date().toISOString();
    updateOrder(order.id, {
      status: order.status === 'done' ? 'new' : next,
      ...(next === 'preparing' ? { startedAt: stamp } : {}),
      ...(next === 'ready' ? { readyAt: stamp } : {}),
      ...(next === 'out' ? { driver: order.driver ?? JC_VENUE.drivers[1] } : {}),
    });
  };

  return (
    <>
      <header className={s.brandHeader} style={{ flexDirection: 'column', textAlign: 'center', gap: 10, padding: '24px 16px 28px' }}>
        <Image src={JC_VENUE.logo} alt="" width={88} height={88} style={{ borderRadius: '50%' }} priority />
        <div style={{ fontSize: 14 }}>Order number</div>
        <div className={s.display} style={{ fontSize: 44, color: 'var(--jc-yellow)', lineHeight: 1 }}>{orderNumber(order)}</div>
        <div style={{ fontSize: 15 }}>Thanks {order.customerName}, you&apos;re in the Club.</div>
      </header>

      <main className={s.main} style={{ paddingTop: 20 }}>
        <section aria-live="polite">
          <h1 style={{ margin: '0 0 12px', fontSize: 18 }}>{cfg.heads[at]}</h1>
          <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {steps.map((st, i) => (
              <li key={st.label} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }} aria-current={i === at ? 'step' : undefined}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={i <= at
                    ? { width: 20, height: 20, borderRadius: '50%', background: 'var(--jc-green)', flex: 'none' }
                    : { width: 20, height: 20, borderRadius: '50%', border: '2px solid var(--jc-border)', boxSizing: 'border-box', flex: 'none' }} />
                  {i < 3 && <span style={{ width: 3, height: 30, background: i < at ? 'var(--jc-green)' : 'var(--jc-line)' }} />}
                </div>
                <div style={{ paddingBottom: 18 }}>
                  <div style={i === at
                    ? { fontWeight: 700, fontSize: 16, color: 'var(--jc-green)' }
                    : { fontSize: 15, color: i < at ? 'var(--jc-ink)' : 'var(--jc-muted)' }}>{st.label}</div>
                  {st.time && <div className={s.muted} style={{ fontSize: 13 }}>{st.time}</div>}
                </div>
              </li>
            ))}
          </ol>
        </section>
        <button type="button" className={s.btnGhost} onClick={advance}>Demo: move to next stage</button>

        <section className={s.card} style={{ gap: 8 }}>
          <div className={s.sumRow} style={{ fontWeight: 700 }}>
            <span>{cfg.label}{order.collectAt ? ' · ' + order.collectAt : ''}</span>
            <span>{gbp(order.total)} paid</span>
          </div>
          {order.lines.map((l, i) => (
            <div key={i}>{l.qty} × {l.name}{l.opts ? ', ' + l.opts : ''}</div>
          ))}
          {order.email && <div className={s.muted} style={{ fontSize: 13 }}>Receipt sent to {order.email}</div>}
        </section>

        <Link href="/order" style={{ fontWeight: 700, fontSize: 15, textAlign: 'center' }}>Back to the menu</Link>
      </main>
    </>
  );
}
