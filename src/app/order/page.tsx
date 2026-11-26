'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import s from '@/components/jacket/jacket.module.css';
import {
  JC_CATEGORIES,
  JC_MODES,
  JC_VENUE,
  basketStore,
  basketTotals,
  gbp,
  useMenu,
} from '@/lib/jacketClub';

const slug = (c: string) => c.toLowerCase().replace(/[^a-z0-9]+/g, '-');

export default function MenuPage() {
  const basket = basketStore.use();
  const { state, items } = useMenu();
  const { count, subtotal } = basketTotals(basket);
  const mode = JC_MODES.find(m => m.id === basket.mode) ?? JC_MODES[0];
  const favourites = items.filter(i => i.favourite);
  const categories = JC_CATEGORIES.filter(c => items.some(i => i.category === c));

  return (
    <>
      <header className={s.brandHeader}>
        <Image src={JC_VENUE.logo} alt="The Jacket Club SR1 logo" width={56} height={56} style={{ borderRadius: '50%' }} priority />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
          <div className={`${s.display} ${s.brandName}`}>{JC_VENUE.name}</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
            <span className={s.pillYellow}>{state.paused ? 'Paused' : 'Open'}</span>
            <span>Closes {JC_VENUE.closes} · {JC_VENUE.address}</span>
          </div>
        </div>
      </header>

      {state.paused && <div className={s.banner} role="status">We&apos;re not taking new orders right now. Please check back soon.</div>}

      <nav aria-label="How do you want it?" className={s.modes} style={{ padding: '12px 16px 0', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
        {JC_MODES.map(m => (
          <button
            key={m.id}
            type="button"
            aria-pressed={m.id === basket.mode}
            className={`${s.mode} ${m.id === basket.mode ? s.modeOn : ''}`}
            onClick={() => basketStore.write(b => ({ ...b, mode: m.id }))}
          >
            {m.label}
          </button>
        ))}
      </nav>
      <div className={s.muted} style={{ padding: '8px 16px 0', fontSize: 13 }}>{mode.hint}</div>
      {basket.mode === 'book' && (
        <Link href="/order/book" className={`${s.btnPrimary} ${s.btnYellow}`} style={{ margin: '8px 16px 0', height: 44, borderRadius: 10, fontSize: 15 }}>
          Choose a day and time
        </Link>
      )}

      <div className={s.chips} style={{ marginTop: 12 }}>
        {categories.map((c, i) => (
          <a key={c} href={`#${slug(c)}`} className={`${s.chip} ${i === 0 ? s.chipOn : ''}`}>{c}</a>
        ))}
      </div>

      <main className={s.main} style={{ paddingBottom: 24 }}>
        <section className={s.section} style={{ gap: 10 }}>
          <h2 className={`${s.display} ${s.sectionTitle}`}>Club favourites</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
            {favourites.map(it => (
              <Link key={it.id} href={`/order/item/${it.id}`} className={s.favCard}>
                <div className={s.photo} style={{ height: 96 }}>Photo coming soon</div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{it.name}</div>
                <div style={{ fontSize: 14 }}>{gbp(it.price)}</div>
              </Link>
            ))}
          </div>
        </section>

        {categories.map(c => (
          <section key={c} id={slug(c)} className={s.section}>
            <h2 className={`${s.display} ${s.sectionTitle}`}>{c}</h2>
            {items.filter(i => i.category === c).map(it => {
              const soldOut = state.soldOut.includes(it.id);
              return (
                <Link
                  key={it.id}
                  href={`/order/item/${it.id}`}
                  className={`${s.row} ${soldOut ? s.rowDisabled : ''}`}
                  aria-disabled={soldOut}
                  tabIndex={soldOut ? -1 : undefined}
                >
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{it.name}</div>
                    <div className={s.muted} style={{ fontSize: 13 }}>{it.description}</div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginTop: 2 }}>
                      <span style={{ fontWeight: 700, fontSize: 15 }}>{gbp(it.price)}</span>
                      {it.halal && <span className={s.tagHalal}>HALAL</span>}
                      {it.allergens.length > 0 && <span className={s.tagAllergen}>{it.allergens.join(' · ')}</span>}
                      {soldOut && <span className={s.tagSoldOut}>SOLD OUT</span>}
                    </div>
                  </div>
                  <div className={`${s.photo} ${s.rowThumb}`}>
                    {!soldOut && <span className={s.plus}><Plus size={20} aria-hidden="true" /></span>}
                  </div>
                </Link>
              );
            })}
          </section>
        ))}
      </main>

      {count > 0 && (
        <Link href="/order/basket" className={`${s.btnPrimary} ${s.floatBasket}`}>
          <span className={s.countBadge}>{count}</span>
          <span>View basket</span>
          <span>{gbp(subtotal)}</span>
        </Link>
      )}
    </>
  );
}
