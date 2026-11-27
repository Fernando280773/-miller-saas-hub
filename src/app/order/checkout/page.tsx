'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import s from '@/components/jacket/jacket.module.css';
import SubHeader from '@/components/jacket/SubHeader';
import {
  JC_VENUE,
  basketStore,
  basketTotals,
  collectionSlots,
  gbp,
  menuStore,
  startOrderPayment,
  useNow,
  type JcOrder,
} from '@/lib/jacketClub';

const MODES: { id: JcOrder['mode']; label: string }[] = [
  { id: 'collect', label: 'Collect' },
  { id: 'table', label: 'Table' },
  { id: 'delivery', label: 'Delivery' },
];

export default function CheckoutPage() {
  const router = useRouter();
  const basket = basketStore.use();
  const menu = menuStore.use();
  const now = useNow();
  const { subtotal } = basketTotals(basket);
  const mode: JcOrder['mode'] = basket.mode === 'book' ? 'collect' : basket.mode;

  const [collectAt, setCollectAt] = useState('ASAP');
  const [address, setAddress] = useState('');
  const [flat, setFlat] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const fee = mode === 'delivery' ? JC_VENUE.deliveryFee : 0;
  const total = subtotal + fee;
  const slots = now ? collectionSlots(now) : [];
  // `now` is null during SSR/hydration, so reading the URL here never mismatches.
  const cancelled = now !== null && new URLSearchParams(window.location.search).has('cancelled');
  const notice = error || (cancelled && !busy ? 'Payment cancelled — nothing was charged.' : '');
  const belowMinimum = mode === 'delivery' && subtotal < JC_VENUE.deliveryMinimum;

  const pay = async () => {
    if (!basket.lines.length) return setError('Your basket is empty.');
    if (menu.paused) return setError('We’re not taking new orders right now.');
    if (!name.trim() || !phone.trim()) return setError('Please add your name and mobile so we can update you.');
    if (mode === 'delivery' && !address.trim()) return setError('Please add a delivery address.');
    if (belowMinimum) return setError(`Delivery needs a ${gbp(JC_VENUE.deliveryMinimum)} minimum order.`);
    setError('');
    setBusy(true);
    const r = await startOrderPayment({
      mode,
      customerName: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      address: mode === 'delivery' ? address.trim() : undefined,
      addressNote: mode === 'delivery' ? flat.trim() || undefined : undefined,
      collectAt: mode === 'collect' ? collectAt : undefined,
    });
    if ('error' in r) {
      setBusy(false);
      setError(r.error);
    } else if ('redirect' in r) {
      window.location.assign(r.redirect);
    } else {
      router.push('/order/status');
    }
  };

  return (
    <>
      <SubHeader back="/order/basket" backLabel="Back to basket" title="Checkout" />

      <main className={s.main}>
        <div className={s.modes} style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
          {MODES.map(m => (
            <button
              key={m.id}
              type="button"
              aria-pressed={m.id === mode}
              className={`${s.mode} ${m.id === mode ? s.modeOn : ''}`}
              onClick={() => basketStore.write(b => ({ ...b, mode: m.id }))}
            >
              {m.label}
            </button>
          ))}
        </div>

        {mode === 'collect' && (
          <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h2 style={{ margin: 0, fontSize: 16 }}>Collection time</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
              {['ASAP', ...slots].map(t => (
                <button
                  key={t}
                  type="button"
                  aria-pressed={collectAt === t}
                  className={`${s.slot} ${collectAt === t ? s.slotSoft : ''}`}
                  style={{ height: 48 }}
                  onClick={() => setCollectAt(t)}
                >
                  {t === 'ASAP' ? 'ASAP · 15 min' : t}
                </button>
              ))}
            </div>
            <div className={s.muted} style={{ fontSize: 13 }}>Collect from the counter at {JC_VENUE.fullAddress}</div>
          </section>
        )}

        {mode === 'table' && (
          <section className={`${s.card} ${s.cardMint}`} style={{ gap: 8 }}>
            <h2 style={{ margin: 0, fontSize: 16, color: 'var(--jc-green)' }}>Table {basket.table}</h2>
            <div>Found from the QR code on your table. We&apos;ll bring it over.</div>
            <label htmlFor="table" className={s.label}>Wrong table? Enter the number on your table</label>
            <input
              id="table"
              className={s.input}
              inputMode="numeric"
              value={basket.table}
              onChange={e => basketStore.write(b => ({ ...b, table: e.target.value.replace(/\D/g, '').slice(0, 3) }))}
            />
          </section>
        )}

        {mode === 'delivery' && (
          <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h2 style={{ margin: 0, fontSize: 16 }}>Delivery address</h2>
            <label htmlFor="addr" className={s.label}>Postcode or street</label>
            <input id="addr" className={s.input} autoComplete="street-address" value={address} onChange={e => setAddress(e.target.value)} placeholder="e.g. 18 Holmeside, SR1 3JE" />
            <div className={s.sumRow} style={{ fontSize: 14, padding: '10px 12px', borderRadius: 10, background: 'var(--jc-mint)', color: 'var(--jc-green)' }}>
              <span>Within {JC_VENUE.deliveryRadiusMiles} miles · about 30 min</span>
              <span style={{ fontWeight: 700 }}>{gbp(JC_VENUE.deliveryFee)}</span>
            </div>
            <label htmlFor="flat" className={s.label}>Flat number, door code or note for the driver</label>
            <input id="flat" className={s.input} value={flat} onChange={e => setFlat(e.target.value)} placeholder="e.g. Flat 2, buzzer 2B" />
            <div className={s.muted} style={{ fontSize: 13, color: belowMinimum ? 'var(--jc-rust)' : undefined, fontWeight: belowMinimum ? 700 : 400 }}>
              We deliver up to {JC_VENUE.deliveryRadiusMiles} miles. Minimum order {gbp(JC_VENUE.deliveryMinimum)} before delivery.
            </div>
          </section>
        )}

        <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h2 style={{ margin: 0, fontSize: 16 }}>Your details</h2>
          <label htmlFor="name" className={s.label}>Name</label>
          <input id="name" className={s.input} autoComplete="given-name" value={name} onChange={e => setName(e.target.value)} />
          <label htmlFor="phone" className={s.label}>Mobile (for order updates)</label>
          <input id="phone" className={s.input} type="tel" autoComplete="tel" value={phone} onChange={e => setPhone(e.target.value)} />
          <label htmlFor="email" className={s.label}>Email (for your receipt)</label>
          <input id="email" className={s.input} type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} />
        </section>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 15 }}>
          <div className={s.sumRow}><span>Subtotal</span><span>{gbp(subtotal)}</span></div>
          {mode === 'delivery' && <div className={s.sumRow}><span>Delivery fee</span><span>{gbp(fee)}</span></div>}
          <div className={s.sumRow} style={{ fontWeight: 700, fontSize: 17, paddingTop: 6, borderTop: '1px solid var(--jc-line)' }}>
            <span>Total</span><span>{gbp(total)}</span>
          </div>
          <div className={s.muted} style={{ fontSize: 12 }}>Prices include VAT. No service fee.</div>
        </section>
      </main>

      <div className={s.bottomBar} style={{ gap: 8 }}>
        {notice && <div role="alert" style={{ color: 'var(--jc-rust)', fontWeight: 700, fontSize: 14 }}>{notice}</div>}
        <button type="button" className={s.btnDark} onClick={pay} disabled={busy}>
          {busy ? 'Opening secure payment…' : `Pay with Apple Pay · ${gbp(total)}`}
        </button>
        <button type="button" className={s.btnPrimary} onClick={pay} disabled={busy}>Pay by card</button>
        <div className={s.muted} style={{ fontSize: 11, textAlign: 'center' }}>
          Secure payment by Stripe. By paying you agree to our <a href="#">terms</a> and <a href="#">privacy policy</a>.
        </div>
      </div>
    </>
  );
}
