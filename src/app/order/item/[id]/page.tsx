'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Check, Minus, Plus, X } from 'lucide-react';
import s from '@/components/jacket/jacket.module.css';
import { JC_MENU, addToBasket, defaultPicks, gbp, priceItem, useMenu } from '@/lib/jacketClub';

export default function ItemPage() {
  const params = useParams();
  const id = String(params?.id ?? '');
  const router = useRouter();
  const { state, items } = useMenu();
  const it = items.find(i => i.id === id);
  const base = JC_MENU.find(i => i.id === id);
  const [picks, setPicks] = useState<Record<string, string[]>>(() => (base ? defaultPicks(base) : {}));
  const [qty, setQty] = useState(1);

  if (!it) {
    return (
      <main className={s.main}>
        <h1 className={s.display} style={{ color: 'var(--jc-green)', fontSize: 22 }}>Item not found</h1>
        <Link href="/order">Back to the menu</Link>
      </main>
    );
  }

  const soldOut = state.soldOut.includes(it.id);
  const { unit } = priceItem(it, picks);
  const extras = it.category === 'Jackets';

  const toggle = (groupId: string, optId: string) => {
    const g = it.groups.find(x => x.id === groupId)!;
    const cur = picks[groupId] || [];
    let next: string[];
    if (g.type === 'single') {
      if (cur.includes(optId)) next = g.required ? cur : [];
      else next = [optId];
    } else if (cur.includes(optId)) {
      next = cur.filter(x => x !== optId);
    } else {
      if (g.max && cur.length >= g.max) return;
      next = [...cur, optId];
    }
    setPicks({ ...picks, [groupId]: next });
  };

  const add = () => {
    addToBasket(it, picks, qty);
    router.push('/order/basket');
  };

  return (
    <>
      <div className={s.photo} style={{ height: 200, borderRadius: 0, fontSize: 13, position: 'relative', flex: 'none' }}>
        Photo coming soon
        <Link href="/order" aria-label="Close" className={`${s.iconLink} ${s.closeBtn}`}>
          <X size={22} aria-hidden="true" />
        </Link>
      </div>

      <main className={s.main} style={{ gap: 18 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <h1 className={s.display} style={{ margin: 0, fontSize: 24, color: 'var(--jc-green)' }}>{it.name}</h1>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{gbp(it.price)}</div>
          <div className={s.muted} style={{ fontSize: 14, lineHeight: 1.4 }}>{it.description}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {it.halal && <span className={s.tagHalal}>HALAL</span>}
            {it.allergens.length > 0 && <span className={s.tagAllergen}>Contains: {it.allergens.join(' · ')}</span>}
            {soldOut && <span className={s.tagSoldOut}>SOLD OUT</span>}
          </div>
        </div>

        {it.groups.map(g => {
          const cur = picks[g.id] || [];
          const full = g.type === 'multi' && !!g.max && cur.length >= g.max;
          const note =
            g.type === 'single'
              ? g.required ? 'Required · pick 1' : 'Optional · pick 1'
              : full ? `Maximum ${g.max} chosen` : `Optional · up to ${g.max} · ${cur.length} chosen`;
          return (
            <section key={g.id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }} aria-labelledby={`g-${g.id}`}>
              <div className={s.groupHead}>
                <h2 id={`g-${g.id}`}>{g.title}</h2>
                <span style={{ fontSize: 12, color: full ? 'var(--jc-rust)' : 'var(--jc-muted)', fontWeight: full ? 700 : 400 }}>{note}</span>
              </div>
              {g.options.map(o => {
                const on = cur.includes(o.id);
                const blocked = !on && full;
                return (
                  <button
                    key={o.id}
                    type="button"
                    role={g.type === 'single' ? 'radio' : 'checkbox'}
                    aria-checked={on}
                    disabled={blocked}
                    className={s.optRow}
                    onClick={() => toggle(g.id, o.id)}
                  >
                    {g.type === 'single' ? (
                      <span className={`${s.radio} ${on ? s.radioOn : ''}`} />
                    ) : (
                      <span className={`${s.check} ${on ? s.checkOn : ''}`}>{on && <Check size={14} aria-hidden="true" />}</span>
                    )}
                    <span style={{ flex: 1 }}>{o.name}</span>
                    <span className={s.muted}>{o.price ? '+' + gbp(o.price) : 'Free'}</span>
                  </button>
                );
              })}
            </section>
          );
        })}

        {extras && (
          <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h2 style={{ margin: 0, fontSize: 16 }}>Goes well with</h2>
            <div style={{ display: 'flex', gap: 10 }}>
              <Link href="/order/item/can" className={s.card} style={{ flex: 1, padding: 10, textDecoration: 'none', color: 'var(--jc-ink)' }}>Can · £1.50</Link>
              <Link href="/order/item/coleslaw" className={s.card} style={{ flex: 1, padding: 10, textDecoration: 'none', color: 'var(--jc-ink)' }}>Coleslaw · £1.50</Link>
            </div>
          </section>
        )}
      </main>

      <div className={s.bottomBar} style={{ flexDirection: 'row', alignItems: 'center' }}>
        <div className={s.stepper}>
          <button type="button" aria-label="One fewer" onClick={() => setQty(q => Math.max(1, q - 1))}><Minus size={20} aria-hidden="true" /></button>
          <span aria-live="polite">{qty}</span>
          <button type="button" aria-label="One more" onClick={() => setQty(q => q + 1)}><Plus size={20} aria-hidden="true" /></button>
        </div>
        <button type="button" className={s.btnPrimary} style={{ flex: 1 }} disabled={soldOut || state.paused} onClick={add}>
          {soldOut ? 'Sold out' : `Add to basket · ${gbp(unit * qty)}`}
        </button>
      </div>
    </>
  );
}
