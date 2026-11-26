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
import { JC_BASKET_KEY, JC_BOOKINGS_KEY, JC_MENU_KEY, JC_ORDERS_KEY } from './millerEcosystem';
import type {
  JcBasket,
  JcBasketLine,
  JcBooking,
  JcMenuItem,
  JcMenuState,
  JcMode,
  JcOptionGroup,
  JcOrder,
} from './types';

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

// ── Venue facts ─────────────────────────────────────────────────────────────
export const JC_VENUE = {
  name: 'The Jacket Club',
  address: '12–14 Park Lane',
  fullAddress: '12–14 Park Lane, SR1 3NX',
  closes: '22:00',
  logo: '/jacket-club/logo.png',
  deliveryFee: 1.99,
  deliveryMinimum: 12,
  deliveryRadiusMiles: 4,
  depositPerPerson: 2,
  maxParty: 20,
  drivers: ['Pravin', 'Sounthariya'],
};

export const JC_MODES: { id: JcMode; label: string; hint: string }[] = [
  { id: 'collect', label: 'Collect', hint: 'Ready to collect in about 15 min' },
  { id: 'table', label: 'Table', hint: 'Table 7 · scanned from your table QR code' },
  { id: 'book', label: 'Book', hint: 'Book a table up to 7 days ahead · £2 per person deposit' },
  { id: 'delivery', label: 'Delivery', hint: 'Up to 4 miles · from £1.99 · £12 minimum' },
];

export const JC_CATEGORIES = ['Jackets', 'Smash Burgers', 'Wraps', 'Breakfast', 'Sides', 'Drinks'];

export const gbp = (n: number) => '£' + n.toFixed(2);

// ── Option groups ───────────────────────────────────────────────────────────
const MEAL: JcOptionGroup = {
  id: 'meal',
  title: 'Make it a meal',
  type: 'single',
  options: [
    { id: 'salad', name: 'Can + side salad', price: 2.5 },
    { id: 'fries', name: 'Can + fries', price: 3.0 },
  ],
};

const JACKET_GROUPS: JcOptionGroup[] = [
  {
    id: 'fill',
    title: 'Add a second filling',
    type: 'single',
    options: [
      { id: 'cheese', name: 'Cheese', price: 0.8 },
      { id: 'beans', name: 'Beans', price: 1.0 },
      { id: 'tuna', name: 'Tuna mayo', price: 1.5 },
      { id: 'bacon', name: 'Turkey bacon', price: 1.5 },
    ],
  },
  {
    id: 'tops',
    title: 'Toppings',
    type: 'multi',
    max: 4,
    options: [
      { id: 'sweetcorn', name: 'Sweetcorn', price: 0 },
      { id: 'spring-onion', name: 'Spring onion', price: 0 },
      { id: 'jalapenos', name: 'Jalapeños', price: 0 },
      { id: 'red-onion', name: 'Red onion', price: 0 },
    ],
  },
  MEAL,
];

const HOT_DRINK_GROUPS: JcOptionGroup[] = [
  {
    id: 'size',
    title: 'Size',
    type: 'single',
    required: true,
    options: [
      { id: 'regular', name: 'Regular', price: 0 },
      { id: 'large', name: 'Large', price: 0.9 },
    ],
  },
  {
    id: 'milk',
    title: 'Milk',
    type: 'single',
    required: true,
    options: [
      { id: 'whole', name: 'Whole milk', price: 0 },
      { id: 'oat', name: 'Oat milk', price: 0 },
    ],
  },
];

// ── Menu ────────────────────────────────────────────────────────────────────
const item = (
  id: string,
  name: string,
  category: string,
  price: number,
  description: string,
  allergens: string[],
  groups: JcOptionGroup[] = [],
  favourite = false,
): JcMenuItem => ({ id, name, category, price, description, allergens, halal: true, groups, favourite });

export const JC_MENU: JcMenuItem[] = [
  item('classic', 'The Classic', 'Jackets', 5.5, 'Butter and grated mature cheddar', ['Milk'], JACKET_GROUPS),
  item('beans-cheese', 'Beans & Cheese', 'Jackets', 6.25, 'Baked beans topped with melted cheddar', ['Milk'], JACKET_GROUPS),
  item('tuna-sweetcorn', 'Tuna Mayo & Sweetcorn', 'Jackets', 6.75, 'Tuna, mayo and sweetcorn', ['Fish', 'Eggs', 'Mustard'], JACKET_GROUPS),
  item('chicken-tikka', 'Chicken Tikka', 'Jackets', 7.95, 'Chicken tikka with mint yoghurt', ['Milk', 'Mustard'], JACKET_GROUPS),
  item('beef-chilli', 'Beef Chilli & Cheese', 'Jackets', 7.95, 'Slow-cooked halal beef chilli with cheddar, on a fluffy jacket.', ['Milk', 'Celery'], JACKET_GROUPS, true),
  item('double-smash', 'Double Smash Cheeseburger', 'Smash Burgers', 9.5, 'Two smashed beef patties, American cheese, pickles and burger sauce', ['Gluten', 'Milk', 'Eggs', 'Mustard', 'Sesame'], [MEAL], true),
  item('club-double', 'The Club Double', 'Smash Burgers', 10.5, 'Double smash with turkey bacon, onions and club sauce', ['Gluten', 'Milk', 'Eggs', 'Mustard', 'Sesame'], [MEAL]),
  item('tikka-wrap', 'Chicken Tikka Wrap', 'Wraps', 6.95, 'Chicken tikka, salad and mint yoghurt in a toasted wrap', ['Gluten', 'Milk'], [MEAL]),
  item('bbq-wrap', 'BBQ Pulled Chicken Wrap', 'Wraps', 6.95, 'Pulled chicken in BBQ sauce with garlic mayo', ['Gluten', 'Eggs', 'Mustard'], [MEAL]),
  item('full-club', 'The Full Club', 'Breakfast', 8.95, 'Eggs, turkey bacon, beans, hash brown and toast', ['Gluten', 'Eggs']),
  item('chilli-fries', 'Loaded Chilli Fries', 'Sides', 4.95, 'Fries loaded with beef chilli and cheese', ['Milk', 'Celery']),
  item('coleslaw', 'Coleslaw', 'Sides', 1.5, 'Creamy house coleslaw', ['Eggs', 'Mustard']),
  item('latte', 'Latte', 'Drinks', 3.1, 'Double shot with steamed milk', ['Milk'], HOT_DRINK_GROUPS),
  item('can', 'Can', 'Drinks', 1.5, 'Coke, Diet Coke, Fanta or Sprite', []),
];

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

/** Price of one item with the given picks, plus a readable summary line. */
export function priceItem(it: JcMenuItem, picks: Record<string, string[]>) {
  let unit = it.price;
  const parts: string[] = [];
  for (const g of it.groups) {
    const chosen = g.options.filter(o => (picks[g.id] || []).includes(o.id));
    unit += chosen.reduce((n, o) => n + o.price, 0);
    if (!chosen.length) continue;
    if (g.id === 'fill') parts.push('+ ' + chosen[0].name + ' (second filling)');
    else if (g.id === 'meal') parts.push('Meal: ' + chosen[0].name.toLowerCase());
    else parts.push(chosen.map(o => o.name).join(', '));
  }
  return { unit, summary: parts.join(' · ') };
}

export function defaultPicks(it: JcMenuItem): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const g of it.groups) {
    if (g.defaults) out[g.id] = [...g.defaults];
    else if (g.required) out[g.id] = [g.options[0].id];
    else out[g.id] = [];
  }
  return out;
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

export function placeOrder(input: {
  mode: JcOrder['mode'];
  customerName: string;
  phone: string;
  email: string;
  address?: string;
  addressNote?: string;
  collectAt?: string;
}): JcOrder {
  const basket = basketStore.read();
  const orders = ordersStore.read();
  const { subtotal } = basketTotals(basket);
  const deliveryFee = input.mode === 'delivery' ? JC_VENUE.deliveryFee : 0;
  const num = orders.reduce((n, o) => Math.max(n, o.num), 0) + 1;
  const order: JcOrder = {
    id: 'jc-' + Date.now().toString(36),
    num,
    mode: input.mode,
    status: 'new',
    lines: basket.lines.map(l => ({ qty: l.qty, name: l.name, opts: l.summary, itemId: l.itemId, price: l.unitPrice * l.qty })),
    note: basket.note || undefined,
    customerName: input.customerName || 'Guest',
    phone: input.phone,
    email: input.email,
    address: input.address,
    addressNote: input.addressNote,
    distance: input.mode === 'delivery' ? '0.4 mi' : undefined,
    table: input.mode === 'table' ? basket.table : undefined,
    collectAt: input.collectAt,
    subtotal,
    deliveryFee,
    total: subtotal + deliveryFee,
    createdAt: new Date().toISOString(),
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
  bookingsStore.write(list => [...list, { ...b, id: 'bk-' + Date.now().toString(36) }]);
}
