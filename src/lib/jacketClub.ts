'use client';

/**
 * The Jacket Club — restaurant ordering data + shared client state.
 *
 * Customer app (/order), driver view (/driver), kitchen tablet
 * (/dashboard/kitchen) and the menu admin (/dashboard/restaurant) all read
 * and write the same localStorage-backed stores, so an order placed on the
 * phone shows up in the kitchen and its status flows back to the customer.
 * Keys come from millerEcosystem.ts (single source of truth).
 */

import { useSyncExternalStore } from 'react';
import { JC_BASKET_KEY, JC_BOOKINGS_KEY, JC_MENU_KEY, JC_ORDERS_KEY, JC_PENDING_KEY } from './millerEcosystem';
import { JC_MENU, priceItem, type JcQuote } from './jacketMenu';
import type {
  JcBasket,
  JcBasketLine,
  JcBooking,
  JcMenuItem,
  JcMenuState,
  JcOrder,
} from './types';

export {
  JC_CATEGORIES,
  JC_MENU,
  JC_MODES,
  JC_VENUE,
  defaultPicks,
  gbp,
  priceItem,
} from './jacketMenu';

export type {
  JcBasket,
  JcBasketLine,
  JcBooking,
  JcMenuItem,
  JcMenuState,
  JcMode,
  JcOptionGroup,
  JcOrder,
} from './types';

// ── Tiny localStorage store with useSyncExternalStore ───────────────────────
const CHANGE_EVENT = 'jc-store-change';

function createStore<T>(key: string, fallback: T, serverFallback: T = fallback) {
  let cachedRaw: string | null | undefined;
  let cached: T = fallback;

  const read = (): T => {
    if (typeof window === 'undefined') return fallback;
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(key);
    } catch {
      return fallback;
    }
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      try {
        cached = raw ? (JSON.parse(raw) as T) : fallback;
      } catch {
        cached = fallback;
      }
    }
    return cached;
  };

  const write = (next: T | ((prev: T) => T)) => {
    const value = typeof next === 'function' ? (next as (p: T) => T)(read()) : next;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage full or blocked — state stays in memory for this render */
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  };

  const subscribe = (cb: () => void) => {
    window.addEventListener('storage', cb);
    window.addEventListener(CHANGE_EVENT, cb);
    return () => {
      window.removeEventListener('storage', cb);
      window.removeEventListener(CHANGE_EVENT, cb);
    };
  };

  const getServer = () => serverFallback;
  const useValue = () => useSyncExternalStore(subscribe, read, getServer);

  return { read, write, use: useValue };
}

// ── Seed data (what the staff screens show before any live order) ───────────
// Seeds are timed relative to page load so the kitchen always looks "live".
const LOADED_AT = Date.now();
const ago = (mins: number) => new Date(LOADED_AT - mins * 60000).toISOString();
const NO_ORDERS: JcOrder[] = [];
const NO_BOOKINGS: JcBooking[] = [];

const SEED_ORDERS: JcOrder[] = [
  {
    id: 'seed-052', num: 52, mode: 'delivery', status: 'out', driver: 'Pravin',
    lines: [
      { qty: 1, name: 'Beef Chilli & Cheese', opts: '+ Cheese', itemId: 'beef-chilli', price: 8.75 },
      { qty: 1, name: 'Latte', opts: 'Large · Oat milk', itemId: 'latte', price: 4.0 },
      { qty: 1, name: 'Can', opts: '', itemId: 'can', price: 1.5 },
    ],
    customerName: 'Sam', phone: '07700 900123', address: '18 Holmeside, Sunderland SR1 3JE', addressNote: 'Flat 2, buzzer 2B', distance: '0.4 mi',
    subtotal: 14.25, deliveryFee: 1.99, total: 16.24, createdAt: ago(19), readyAt: ago(9),
  },
  {
    id: 'seed-053', num: 53, mode: 'collect', status: 'ready', collectAt: 'ASAP',
    lines: [{ qty: 1, name: 'Beef Chilli & Cheese', opts: '+ Cheese', itemId: 'beef-chilli', price: 8.75 }],
    customerName: 'Sam', subtotal: 8.75, deliveryFee: 0, total: 8.75, createdAt: ago(18), readyAt: ago(7),
  },
  {
    id: 'seed-054', num: 54, mode: 'collect', status: 'preparing', collectAt: '12:30',
    lines: [{ qty: 1, name: 'The Full Club', opts: 'Eggs: fried · Toast: brown · + Hash brown', itemId: 'full-club', price: 8.95 }],
    customerName: 'Ahmed', subtotal: 8.95, deliveryFee: 0, total: 8.95, createdAt: ago(11), startedAt: ago(5),
  },
  {
    id: 'seed-055', num: 55, mode: 'delivery', status: 'preparing',
    lines: [{ qty: 1, name: 'BBQ Pulled Chicken Wrap', opts: 'Toasted · Garlic mayo', itemId: 'bbq-wrap', price: 6.95 }],
    customerName: 'Jo', address: '7 Mowbray Road, Sunderland SR2 8EN', distance: '1.1 mi',
    subtotal: 6.95, deliveryFee: 1.99, total: 8.94, createdAt: ago(8), startedAt: ago(3),
  },
  {
    id: 'seed-056', num: 56, mode: 'table', status: 'new', table: '7',
    lines: [
      { qty: 2, name: 'Double Smash Cheeseburger', opts: 'Meal: fries + can (Coke) · no pickles', itemId: 'double-smash', price: 12.5 },
      { qty: 1, name: 'Loaded Chilli Fries', opts: '', itemId: 'chilli-fries', price: 4.95 },
    ],
    customerName: 'Table 7', subtotal: 29.95, deliveryFee: 0, total: 29.95, createdAt: ago(1),
  },
  {
    id: 'seed-057', num: 57, mode: 'delivery', status: 'new', note: 'Extra napkins',
    lines: [
      { qty: 1, name: 'Chicken Tikka Jacket', opts: '+ Cheese · Jalapeños', itemId: 'chicken-tikka', price: 8.75 },
      { qty: 1, name: 'Latte', opts: 'Large · Oat milk', itemId: 'latte', price: 4.0 },
    ],
    customerName: 'Priya', address: '3 Tunstall Road, Sunderland SR2 7RN', distance: '0.9 mi',
    subtotal: 12.75, deliveryFee: 1.99, total: 14.74, createdAt: ago(0),
  },
];

const SEED_BOOKINGS: JcBooking[] = [
  { id: 'b1', name: 'Ahmed', people: 4, date: 'today', time: '12:30', table: 'T3', deposit: 8 },
  { id: 'b2', name: 'Lewis', people: 2, date: 'today', time: '13:00', table: 'T8', deposit: 4 },
  { id: 'b3', name: 'Patel', people: 12, date: 'today', time: '18:00', table: 'T1+2+4', deposit: 24 },
  { id: 'b4', name: 'Kerr', people: 6, date: 'today', time: '19:30', table: 'T5', deposit: 12 },
];

export const basketStore = createStore<JcBasket>(JC_BASKET_KEY, { mode: 'collect', table: '7', lines: [], note: '' });
export const ordersStore = createStore<JcOrder[]>(JC_ORDERS_KEY, SEED_ORDERS, NO_ORDERS);
export const menuStore = createStore<JcMenuState>(JC_MENU_KEY, { paused: false, soldOut: ['chilli-fries'], overrides: {} });
export const bookingsStore = createStore<JcBooking[]>(JC_BOOKINGS_KEY, SEED_BOOKINGS, NO_BOOKINGS);

/** Order or deposit sent to Stripe Checkout, waiting for the redirect back. */
type JcPending =
  | { kind: 'order'; sessionId: string; input: JcCheckoutInput; quote: JcQuote }
  | { kind: 'deposit'; sessionId: string; booking: Omit<JcBooking, 'id'> }
  | null;
const pendingStore = createStore<JcPending>(JC_PENDING_KEY, null);

// ── Derived helpers ─────────────────────────────────────────────────────────
export function applyOverrides(menu: JcMenuState): JcMenuItem[] {
  return JC_MENU.map(it => ({ ...it, ...(menu.overrides[it.id] || {}) }));
}

export function useMenu() {
  const state = menuStore.use();
  return { state, items: applyOverrides(state) };
}

export function basketTotals(b: JcBasket) {
  const count = b.lines.reduce((n, l) => n + l.qty, 0);
  const subtotal = b.lines.reduce((n, l) => n + l.qty * l.unitPrice, 0);
  return { count, subtotal };
}

export function addToBasket(it: JcMenuItem, picks: Record<string, string[]>, qty: number) {
  const { unit, summary } = priceItem(it, picks);
  const key = it.id + '|' + JSON.stringify(picks);
  basketStore.write(b => {
    const existing = b.lines.find(l => l.key === key);
    const lines = existing
      ? b.lines.map(l => (l.key === key ? { ...l, qty: l.qty + qty } : l))
      : [...b.lines, { key, itemId: it.id, name: it.name, qty, unitPrice: unit, picks, summary } satisfies JcBasketLine];
    return { ...b, lines };
  });
}

export function setLineQty(key: string, qty: number) {
  basketStore.write(b => ({
    ...b,
    lines: qty <= 0 ? b.lines.filter(l => l.key !== key) : b.lines.map(l => (l.key === key ? { ...l, qty } : l)),
  }));
}

export interface JcCheckoutInput {
  mode: JcOrder['mode'];
  customerName: string;
  phone: string;
  email: string;
  address?: string;
  addressNote?: string;
  collectAt?: string;
}

/** Record a paid order. Prices come from the server quote, not the browser. */
export function placeOrder(input: JcCheckoutInput, quote: JcQuote, paymentRef: string): JcOrder {
  const basket = basketStore.read();
  const orders = ordersStore.read();
  const existing = orders.find(o => o.paymentRef === paymentRef);
  if (existing) {
    basketStore.write({ ...basket, lastOrderId: existing.id });
    return existing;
  }
  const num = orders.reduce((n, o) => Math.max(n, o.num), 0) + 1;
  const order: JcOrder = {
    id: 'jc-' + Date.now().toString(36),
    num,
    mode: input.mode,
    status: 'new',
    lines: quote.lines.map(l => ({ qty: l.qty, name: l.name, opts: l.summary, itemId: l.itemId, price: l.unit * l.qty })),
    note: basket.note || undefined,
    customerName: input.customerName || 'Guest',
    phone: input.phone,
    email: input.email,
    address: input.address,
    addressNote: input.addressNote,
    distance: input.mode === 'delivery' ? '0.4 mi' : undefined,
    table: input.mode === 'table' ? basket.table : undefined,
    collectAt: input.collectAt,
    subtotal: quote.subtotal,
    deliveryFee: quote.deliveryFee,
    total: quote.total,
    createdAt: new Date().toISOString(),
    paymentRef,
  };
  ordersStore.write([...orders, order]);
  basketStore.write({ ...basket, lines: [], note: '', lastOrderId: order.id });
  return order;
}

export function updateOrder(id: string, patch: Partial<JcOrder>) {
  ordersStore.write(list => list.map(o => (o.id === id ? { ...o, ...patch } : o)));
}

export const orderNumber = (o: Pick<JcOrder, 'num'>) => '#' + String(o.num).padStart(3, '0');

export const clock = (iso?: string) =>
  iso ? new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '';

// ── Client-only clock (null during SSR so hydration never mismatches) ───────
let nowCache = 0;
const readNow = () => {
  const minute = Math.floor(Date.now() / 60000) * 60000;
  if (minute !== nowCache) nowCache = minute;
  return nowCache;
};
const subscribeNow = (cb: () => void) => {
  const t = window.setInterval(cb, 15000);
  return () => window.clearInterval(t);
};
export function useNow(): number | null {
  return useSyncExternalStore(subscribeNow, readNow, () => null);
}

/** Next collection slots on the quarter hour, at least 20 min out. */
export function collectionSlots(now: number, count = 2): string[] {
  const q = 15 * 60000;
  const first = Math.ceil((now + 20 * 60000) / q) * q;
  return Array.from({ length: count }, (_, i) => clock(new Date(first + i * q).toISOString()));
}

export function addBooking(b: Omit<JcBooking, 'id'>) {
  if (b.paymentRef && bookingsStore.read().some(x => x.paymentRef === b.paymentRef)) return;
  bookingsStore.write(list => [...list, { ...b, id: 'bk-' + Date.now().toString(36) }]);
}

// ── Payments (Stripe Checkout via /api/order/*) ─────────────────────────────
type StartResult = { error: string } | { placed: true } | { redirect: string };

async function postCheckout(payload: unknown) {
  const res = await fetch('/api/order/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) return { error: (json.error as string) || 'Payment could not be started.' };
  return json as { simulated: boolean; url?: string; sessionId?: string; paymentRef?: string; quote?: JcQuote };
}

/** Price the basket on the server and pay; places the order once paid. */
export async function startOrderPayment(input: JcCheckoutInput): Promise<StartResult> {
  const basket = basketStore.read();
  const r = await postCheckout({
    kind: 'order',
    mode: input.mode,
    lines: basket.lines.map(l => ({ itemId: l.itemId, qty: l.qty, picks: l.picks })),
  });
  if ('error' in r) return { error: r.error };
  if (r.simulated) {
    placeOrder(input, r.quote!, r.paymentRef!);
    return { placed: true };
  }
  pendingStore.write({ kind: 'order', sessionId: r.sessionId!, input, quote: r.quote! });
  return { redirect: r.url! };
}

export async function startDepositPayment(booking: Omit<JcBooking, 'id' | 'paymentRef'>): Promise<StartResult> {
  const r = await postCheckout({ kind: 'deposit', people: booking.people });
  if ('error' in r) return { error: r.error };
  if (r.simulated) {
    addBooking({ ...booking, paymentRef: r.paymentRef });
    return { placed: true };
  }
  pendingStore.write({ kind: 'deposit', sessionId: r.sessionId!, booking });
  return { redirect: r.url! };
}

/**
 * Called on the Stripe success redirect. Confirms the session is paid on the
 * server, then records the pending order or booking (once — reloads are safe).
 */
export async function completePayment(sessionId: string): Promise<{ ok: true; booking?: Omit<JcBooking, 'id'> } | { error: string }> {
  const pending = pendingStore.read();
  const already =
    ordersStore.read().find(o => o.paymentRef === sessionId) ||
    bookingsStore.read().find(b => b.paymentRef === sessionId);
  if (already) {
    if ('num' in already) basketStore.write(b => ({ ...b, lastOrderId: already.id }));
    return 'num' in already ? { ok: true } : { ok: true, booking: already };
  }
  if (!pending || pending.sessionId !== sessionId) return { error: 'We couldn’t find this payment on this device.' };

  const res = await fetch('/api/order/verify?session_id=' + encodeURIComponent(sessionId));
  const json = await res.json().catch(() => ({}));
  if (!res.ok) return { error: json.error || 'Could not confirm payment.' };
  if (!json.paid) return { error: 'Payment hasn’t completed yet.' };

  pendingStore.write(null);
  if (pending.kind === 'order') {
    placeOrder(pending.input, pending.quote, sessionId);
    return { ok: true };
  }
  const booking = { ...pending.booking, paymentRef: sessionId };
  addBooking(booking);
  return { ok: true, booking };
}
