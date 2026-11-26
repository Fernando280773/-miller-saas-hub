'use client';

import { useState } from 'react';
import Link from 'next/link';
import DashboardSidebar from '../../../components/DashboardSidebar';
import { useStore } from '../../../lib/useStore';
import { jcFontClass } from '../../../lib/jacketFonts';
import s from '../../../components/jacket/jacket.module.css';
import {
  bookingsStore,
  gbp,
  menuStore,
  ordersStore,
  useMenu,
  type JcMenuItem,
} from '../../../lib/jacketClub';

/** The 14 allergens UK food businesses must declare. */
const ALLERGENS = ['Celery', 'Gluten', 'Crustaceans', 'Eggs', 'Fish', 'Lupin', 'Milk', 'Molluscs', 'Mustard', 'Nuts', 'Peanuts', 'Sesame', 'Soya', 'Sulphites'];

function Editor({ item, onReset }: { item: JcMenuItem; onReset: () => void }) {
  const [name, setName] = useState(item.name);
  const [price, setPrice] = useState(item.price.toFixed(2));
  const [desc, setDesc] = useState(item.description);
  const [allergens, setAllergens] = useState<string[]>(item.allergens);
  const [showAll, setShowAll] = useState(false);
  const [saved, setSaved] = useState(false);

  const priceNum = Number(price);
  const valid = name.trim().length > 0 && Number.isFinite(priceNum) && priceNum >= 0;
  const shown = showAll ? ALLERGENS : ALLERGENS.filter(a => allergens.includes(a) || ['Gluten', 'Mustard'].includes(a));

  const save = () => {
    if (!valid) return;
    menuStore.write(m => ({
      ...m,
      overrides: {
        ...m.overrides,
        [item.id]: { name: name.trim(), price: Math.round(priceNum * 100) / 100, description: desc.trim(), allergens },
      },
    }));
    setSaved(true);
  };

  const reset = () => {
    menuStore.write(m => {
      const rest = { ...m.overrides };
      delete rest[item.id];
      return { ...m, overrides: rest };
    });
    onReset();
  };

  const edit = <T,>(fn: (v: T) => void) => (v: T) => { fn(v); setSaved(false); };

  return (
    <>
      <h2 style={{ margin: 0, fontSize: 18 }}>Edit: {item.name}</h2>
      <div className={s.photo} style={{ height: 120, fontSize: 13 }}>Add photo</div>
      <label htmlFor="ename" className={s.label}>Name</label>
      <input id="ename" className={s.input} style={{ height: 44 }} value={name} onChange={e => edit(setName)(e.target.value)} />
      <label htmlFor="eprice" className={s.label}>Price (£)</label>
      <input id="eprice" className={s.input} style={{ height: 44 }} inputMode="decimal" value={price} onChange={e => edit(setPrice)(e.target.value)} aria-invalid={!valid} />
      <label htmlFor="edesc" className={s.label}>Description</label>
      <textarea id="edesc" className={s.textarea} value={desc} onChange={e => edit(setDesc)(e.target.value)} />
      <div className={s.label} id="allergen-label">Allergens</div>
      <div role="group" aria-labelledby="allergen-label" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {shown.map(a => {
          const on = allergens.includes(a);
          return (
            <button
              key={a}
              type="button"
              aria-pressed={on}
              className={`${s.allergenChip} ${on ? s.allergenOn : ''}`}
              onClick={() => edit(setAllergens)(on ? allergens.filter(x => x !== a) : [...allergens, a])}
            >
              {a}
            </button>
          );
        })}
        {!showAll && (
          <button type="button" className={s.allergenChip} onClick={() => setShowAll(true)}>
            + {ALLERGENS.length - shown.length} more
          </button>
        )}
      </div>
      <div className={s.muted} style={{ fontSize: 13 }}>
        Option groups: {item.groups.length ? item.groups.map(g => g.title).join(' · ') : 'none'}
      </div>
      <button type="button" className={s.btnPrimary} style={{ height: 48, borderRadius: 10, fontSize: 15, marginTop: 6 }} disabled={!valid} onClick={save}>
        {saved ? 'Saved' : 'Save changes'}
      </button>
      <button type="button" className={s.linkBtn} onClick={reset}>Reset to original</button>
    </>
  );
}

export default function RestaurantAdminPage() {
  const store = useStore();
  const { state, items } = useMenu();
  const orders = ordersStore.use();
  const bookings = bookingsStore.use();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState('beef-chilli');
  const [resets, setResets] = useState(0);

  const sold = new Map<string, number>();
  for (const o of orders) for (const l of o.lines) if (l.itemId) sold.set(l.itemId, (sold.get(l.itemId) ?? 0) + l.qty);
  const revenue = orders.reduce((n, o) => n + o.total, 0);
  const q = query.trim().toLowerCase();
  const rows = items.filter(i => !q || i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q));
  const current = items.find(i => i.id === selected) ?? items[0];

  const toggleSoldOut = (id: string) =>
    menuStore.write(m => ({ ...m, soldOut: m.soldOut.includes(id) ? m.soldOut.filter(x => x !== id) : [...m.soldOut, id] }));

  return (
    <div className="dashboard-layout">
      <DashboardSidebar storeName={store?.name} storeLogo={store?.logo_text} />
      <main className="dashboard-content">
        <div className={`${s.theme} ${s.staffFrame} ${jcFontClass}`} style={{ background: 'var(--jc-cream)' }}>
          <header style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 24px', borderBottom: '1px solid var(--jc-line)', flexWrap: 'wrap' }}>
            <h1 className={s.display} style={{ margin: 0, fontSize: 24, color: 'var(--jc-green)', flex: 1 }}>Menu</h1>
            <div style={{ display: 'flex', gap: 20, fontSize: 14, flexWrap: 'wrap' }}>
              <span>Today <b>{gbp(revenue)}</b></span>
              <span><b>{orders.length}</b> orders</span>
              <span><b>{bookings.length}</b> bookings</span>
            </div>
            <Link href="/order" target="_blank" style={{ fontSize: 14, fontWeight: 700 }}>Open customer app</Link>
            <button
              type="button"
              aria-pressed={!state.paused}
              className={s.btnPrimary}
              style={{ height: 44, borderRadius: 10, fontSize: 15, background: state.paused ? 'var(--jc-rust)' : undefined }}
              onClick={() => menuStore.write(m => ({ ...m, paused: !m.paused }))}
            >
              {state.paused ? 'Orders paused' : 'Taking orders'}
            </button>
          </header>

          <div style={{ flex: 1, display: 'flex', minHeight: 0, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 520px', overflowX: 'auto', padding: '16px 24px', minWidth: 0 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <label htmlFor="search" className={s.srOnly}>Search items</label>
                <input id="search" className={s.input} style={{ height: 44, flex: 1 }} placeholder="Search items" value={query} onChange={e => setQuery(e.target.value)} />
              </div>
              <table className={s.table}>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Category</th>
                    <th className={s.num}>Price</th>
                    <th className={s.num}>Sold today</th>
                    <th style={{ textAlign: 'center' }}>Available</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(it => {
                    const off = state.soldOut.includes(it.id);
                    return (
                      <tr key={it.id} className={it.id === current.id ? s.selected : undefined}>
                        <td>
                          <button type="button" className={s.linkBtn} style={{ textDecoration: 'none', color: 'var(--jc-ink)', fontSize: 15 }} onClick={() => setSelected(it.id)}>
                            {it.name}
                          </button>
                        </td>
                        <td className={s.muted}>{it.category}</td>
                        <td className={s.num}>{gbp(it.price)}</td>
                        <td className={s.num}>{sold.get(it.id) ?? 0}</td>
                        <td style={{ textAlign: 'center', padding: 6 }}>
                          <button
                            type="button"
                            aria-label={(off ? 'Mark available: ' : 'Mark sold out: ') + it.name}
                            className={`${s.avail} ${off ? s.availOff : ''}`}
                            onClick={() => toggleSoldOut(it.id)}
                          >
                            {off ? 'Sold out' : 'Available'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {rows.length === 0 && (
                    <tr><td colSpan={5} className={s.muted} style={{ textAlign: 'center', padding: 24 }}>No items match “{query}”.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <aside style={{ flex: '0 1 330px', minWidth: 280, borderLeft: '1px solid var(--jc-line)', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Editor key={`${current.id}:${resets}`} item={current} onReset={() => setResets(n => n + 1)} />
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}
