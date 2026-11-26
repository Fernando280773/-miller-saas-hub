'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Minus, Plus } from 'lucide-react';
import s from '@/components/jacket/jacket.module.css';
import SubHeader from '@/components/jacket/SubHeader';
import { JC_VENUE, addBooking, gbp, useNow } from '@/lib/jacketClub';

const TIMES = ['10:00', '12:00', '13:00', '14:00', '17:00', '18:00', '19:00', '20:00'];
const SUNDAY_TIMES = ['11:00', '12:00', '13:00', '14:00', '17:00', '18:00', '19:00', '20:00'];

/** Busy evenings: Friday and Saturday 19:00 are already full. */
const isFull = (d: Date, t: string) => (d.getDay() === 5 || d.getDay() === 6) && t === '19:00';

export default function BookPage() {
  const now = useNow();
  const [people, setPeople] = useState(4);
  const [day, setDay] = useState(2);
  const [slot, setSlot] = useState('18:00');
  const [done, setDone] = useState<string | null>(null);

  const days = now
    ? Array.from({ length: 7 }, (_, i) => {
        const d = new Date(now);
        d.setDate(d.getDate() + i);
        return d;
      })
    : [];
  const d = days[day];
  const times = d && d.getDay() === 0 ? SUNDAY_TIMES : TIMES;
  const deposit = people * JC_VENUE.depositPerPerson;
  const slotOk = !!d && times.includes(slot) && !isFull(d, slot);

  const confirm = () => {
    if (!d || !slotOk) return;
    const label = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
    addBooking({ name: 'You', people, date: label, time: slot, deposit });
    setDone(`${people} ${people === 1 ? 'person' : 'people'} · ${label} · ${slot}`);
  };

  if (done) {
    return (
      <>
        <SubHeader back="/order" backLabel="Back to menu" title="Book a table" />
        <main className={s.main} style={{ alignItems: 'center', textAlign: 'center', gap: 14, paddingTop: 32 }}>
          <Image src={JC_VENUE.logo} alt="" width={120} height={120} style={{ borderRadius: '50%' }} />
          <h2 className={s.display} style={{ margin: 0, fontSize: 26, color: 'var(--jc-green)' }}>You&apos;re booked</h2>
          <div style={{ fontSize: 17, fontWeight: 700 }}>{done}</div>
          <div className={s.muted} style={{ fontSize: 14 }}>{gbp(deposit)} deposit paid. Confirmation sent by email and text.</div>
          <button type="button" className={s.btnOutline} style={{ height: 48 }} onClick={() => setDone(null)}>Change or cancel</button>
          <Link href="/order" style={{ fontWeight: 700 }}>Order food now</Link>
        </main>
      </>
    );
  }

  return (
    <>
      <SubHeader back="/order" backLabel="Back to menu" title="Book a table" />
      <main className={s.main}>
        <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h2 style={{ margin: 0, fontSize: 16 }}>How many people?</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className={s.stepper}>
              <button type="button" style={{ width: 52 }} aria-label="One fewer person" onClick={() => setPeople(p => Math.max(1, p - 1))}><Minus size={20} aria-hidden="true" /></button>
              <span style={{ minWidth: 28, fontSize: 18 }} aria-live="polite">{people}</span>
              <button type="button" style={{ width: 52 }} aria-label="One more person" onClick={() => setPeople(p => Math.min(JC_VENUE.maxParty, p + 1))}><Plus size={20} aria-hidden="true" /></button>
            </div>
            <span className={s.muted} style={{ fontSize: 13 }}>Up to {JC_VENUE.maxParty} people</span>
          </div>
        </section>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h2 style={{ margin: 0, fontSize: 16 }}>Day</h2>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, minHeight: 68 }}>
            {days.map((x, i) => (
              <button
                key={i}
                type="button"
                aria-pressed={i === day}
                aria-label={x.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
                className={`${s.slot} ${i === day ? s.slotOn : ''}`}
                style={{ flex: 'none', width: 56, height: 64, borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
                onClick={() => setDay(i)}
              >
                <span style={{ fontSize: 12, fontWeight: 400 }}>{x.toLocaleDateString('en-GB', { weekday: 'short' })}</span>
                <span style={{ fontSize: 18, fontWeight: 700 }}>{x.getDate()}</span>
              </button>
            ))}
          </div>
          <div className={s.muted} style={{ fontSize: 13 }}>Bookings open up to 7 days ahead</div>
        </section>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h2 style={{ margin: 0, fontSize: 16 }}>Time (2 hours)</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
            {d && times.map(t => {
              const full = isFull(d, t);
              return (
                <button
                  key={t}
                  type="button"
                  disabled={full}
                  aria-pressed={t === slot}
                  aria-label={full ? `${t} full` : t}
                  className={`${s.slot} ${full ? s.slotFull : t === slot ? s.slotOn : ''}`}
                  onClick={() => setSlot(t)}
                >
                  {full ? 'Full' : t}
                </button>
              );
            })}
          </div>
        </section>

        <section className={s.card}>
          <div className={s.sumRow} style={{ fontWeight: 700, fontSize: 16 }}><span>Deposit</span><span>{gbp(deposit)}</span></div>
          <div>{gbp(JC_VENUE.depositPerPerson)} per person, taken off your bill on the day.</div>
          <div>Cancel at least 2 hours before for a full refund.</div>
        </section>
      </main>
      <div className={s.bottomBar}>
        <button type="button" className={s.btnPrimary} style={{ height: 56, borderRadius: 14 }} disabled={!slotOk} onClick={confirm}>
          {slotOk ? `Pay ${gbp(deposit)} deposit and book` : 'Choose a time'}
        </button>
      </div>
    </>
  );
}
