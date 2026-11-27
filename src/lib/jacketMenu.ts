/**
 * The Jacket Club — menu, venue facts and pricing.
 *
 * Server-safe (no React, no browser APIs): the customer app and the
 * /api/order payment routes price orders with the same code, so the
 * amount charged is always computed on the server from this menu.
 */

import type { JcMenuItem, JcMode, JcOptionGroup } from './types';

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

// ── Server-side quoting (used by /api/order/checkout) ───────────────────────
export interface JcQuoteLineInput {
  itemId: string;
  qty: number;
  picks?: Record<string, string[]>;
}

export interface JcQuote {
  lines: { itemId: string; name: string; summary: string; qty: number; unit: number }[];
  subtotal: number;
  deliveryFee: number;
  total: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Price a basket from the canonical menu. Rejects unknown items, unknown or
 * over-limit options, bad quantities and delivery orders under the minimum.
 * Returns an error message string instead of throwing.
 */
export function quoteOrder(input: unknown, mode: unknown): JcQuote | string {
  if (mode !== 'collect' && mode !== 'table' && mode !== 'delivery') return 'Unknown order type';
  if (!Array.isArray(input) || input.length === 0) return 'Basket is empty';
  if (input.length > 50) return 'Too many lines in basket';

  const lines: JcQuote['lines'] = [];
  for (const raw of input as JcQuoteLineInput[]) {
    const it = JC_MENU.find(i => i.id === raw?.itemId);
    if (!it) return 'Unknown item';
    const qty = Number(raw.qty);
    if (!Number.isInteger(qty) || qty < 1 || qty > 50) return `Bad quantity for ${it.name}`;

    const picks: Record<string, string[]> = {};
    const given = raw.picks && typeof raw.picks === 'object' ? raw.picks : {};
    for (const key of Object.keys(given)) {
      if (!it.groups.some(g => g.id === key)) return `Unknown option group for ${it.name}`;
    }
    for (const g of it.groups) {
      const chosen = Array.isArray(given[g.id]) ? given[g.id].map(String) : [];
      if (new Set(chosen).size !== chosen.length) return `Duplicate option for ${it.name}`;
      if (chosen.some(id => !g.options.some(o => o.id === id))) return `Unknown option for ${it.name}`;
      const max = g.type === 'single' ? 1 : g.max ?? g.options.length;
      if (chosen.length > max) return `Too many choices in ${g.title}`;
      if (g.required && chosen.length === 0) return `${g.title} is required for ${it.name}`;
      picks[g.id] = chosen;
    }

    const { unit, summary } = priceItem(it, picks);
    lines.push({ itemId: it.id, name: it.name, summary, qty, unit: round2(unit) });
  }

  const subtotal = round2(lines.reduce((n, l) => n + l.unit * l.qty, 0));
  if (mode === 'delivery' && subtotal < JC_VENUE.deliveryMinimum) {
    return `Delivery needs a ${gbp(JC_VENUE.deliveryMinimum)} minimum order`;
  }
  const deliveryFee = mode === 'delivery' ? JC_VENUE.deliveryFee : 0;
  return { lines, subtotal, deliveryFee, total: round2(subtotal + deliveryFee) };
}

/** Table-booking deposit for a party size, or an error message. */
export function quoteDeposit(people: unknown): number | string {
  const n = Number(people);
  if (!Number.isInteger(n) || n < 1 || n > JC_VENUE.maxParty) return `Party size must be 1–${JC_VENUE.maxParty}`;
  return n * JC_VENUE.depositPerPerson;
}
