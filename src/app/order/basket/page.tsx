'use client';

import Link from 'next/link';
import { Minus, Plus } from 'lucide-react';
import s from '@/components/jacket/jacket.module.css';
import SubHeader from '@/components/jacket/SubHeader';
import { JC_MODES, basketStore, basketTotals, gbp, setLineQty } from '@/lib/jacketClub';

export default function BasketPage() {
  const basket = basketStore.use();
  const { count, subtotal } = basketTotals(basket);
  const modeLabel = JC_MODES.find(m => m.id === basket.mode)?.label ?? 'Collect';

  return (
    <>
      <SubHeader back="/order" backLabel="Back to menu" title="Your basket">
        <span className={s.pillMint}>{modeLabel}</span>
      </SubHeader>

      <main style={{ flex: 1, padding: '8px 16px 24px', display: 'flex', flexDirection: 'column' }}>
        {basket.lines.length === 0 && (
          <p className={s.muted} style={{ padding: '24px 0', fontSize: 15 }}>Your basket is empty.</p>
        )}
        {basket.lines.map(l => (
          <div key={l.key} style={{ display: 'flex', gap: 12, padding: '14px 0', borderBottom: '1px solid var(--jc-line)' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{l.name}</div>
              {l.summary && <div className={s.muted} style={{ fontSize: 13, lineHeight: 1.4 }}>{l.summary}</div>}
              <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
                <Link href={`/order/item/${l.itemId}`} style={{ fontSize: 14, fontWeight: 700 }}>Edit</Link>
                <button type="button" className={s.linkBtn} style={{ color: 'var(--jc-rust)', textDecoration: 'none' }} onClick={() => setLineQty(l.key, 0)}>Remove</button>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
              <div style={{ fontWeight: 700 }}>{gbp(l.unitPrice * l.qty)}</div>
              <div className={s.stepperSm}>
                <button type="button" aria-label={`One fewer ${l.name}`} onClick={() => setLineQty(l.key, l.qty - 1)}><Minus size={18} aria-hidden="true" /></button>
                <span style={{ fontWeight: 700 }}>{l.qty}</span>
                <button type="button" aria-label={`One more ${l.name}`} onClick={() => setLineQty(l.key, l.qty + 1)}><Plus size={18} aria-hidden="true" /></button>
              </div>
            </div>
          </div>
        ))}
        <Link href="/order" style={{ padding: '16px 0', fontWeight: 700, fontSize: 15 }}>+ Add more items</Link>
        <label htmlFor="note" style={{ fontSize: 14, fontWeight: 700, marginTop: 8 }}>Note for the kitchen</label>
        <textarea
          id="note"
          className={s.textarea}
          style={{ marginTop: 6 }}
          placeholder="e.g. no butter please"
          value={basket.note}
          onChange={e => basketStore.write(b => ({ ...b, note: e.target.value }))}
        />
      </main>

      <div className={s.bottomBar}>
        <div className={s.sumRow} style={{ fontSize: 16 }}>
          <span>Subtotal ({count} {count === 1 ? 'item' : 'items'})</span>
          <span style={{ fontWeight: 700 }}>{gbp(subtotal)}</span>
        </div>
        {count > 0 ? (
          <Link href="/order/checkout" className={s.btnPrimary} style={{ height: 56, borderRadius: 14 }}>Go to checkout</Link>
        ) : (
          <Link href="/order" className={s.btnPrimary} style={{ height: 56, borderRadius: 14 }}>Browse the menu</Link>
        )}
      </div>
    </>
  );
}
