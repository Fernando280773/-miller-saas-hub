import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as checkoutPost } from '@/app/api/order/checkout/route';
import { GET as verifyGet } from '@/app/api/order/verify/route';
import { quoteDeposit, quoteOrder, type JcQuote } from '@/lib/jacketMenu';
import { resetRateLimits } from '@/lib/rateLimiter';

const post = (body: unknown) =>
  new NextRequest('http://localhost/api/order/checkout', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'http://shop.test' },
    body: JSON.stringify(body),
  });

const chilli = { itemId: 'beef-chilli', qty: 1, picks: { fill: ['cheese'], tops: ['spring-onion', 'jalapenos'], meal: [] } };
const latte = { itemId: 'latte', qty: 1, picks: { size: ['large'], milk: ['oat'] } };

describe('quoteOrder (server-side pricing)', () => {
  it('prices the design basket: chilli + cheese £8.75, large oat latte £4.00', () => {
    const q = quoteOrder([chilli, latte], 'collect') as JcQuote;
    expect(q.lines.map(l => l.unit)).toEqual([8.75, 4]);
    expect(q.subtotal).toBe(12.75);
    expect(q.deliveryFee).toBe(0);
    expect(q.total).toBe(12.75);
  });

  it('adds the £1.99 delivery fee', () => {
    const q = quoteOrder([chilli, latte], 'delivery') as JcQuote;
    expect(q.total).toBe(14.74);
  });

  it('enforces the £12 delivery minimum', () => {
    expect(quoteOrder([latte], 'delivery')).toMatch(/minimum/);
  });

  it('rejects unknown items, options and bad quantities', () => {
    expect(quoteOrder([{ itemId: 'nope', qty: 1 }], 'collect')).toBe('Unknown item');
    expect(quoteOrder([{ itemId: 'classic', qty: 0 }], 'collect')).toMatch(/quantity/);
    expect(quoteOrder([{ itemId: 'classic', qty: 1.5 }], 'collect')).toMatch(/quantity/);
    expect(quoteOrder([{ itemId: 'classic', qty: 1, picks: { fill: ['gold'] } }], 'collect')).toMatch(/Unknown option/);
    expect(quoteOrder([{ itemId: 'classic', qty: 1, picks: { hack: [] } }], 'collect')).toMatch(/option group/);
  });

  it('enforces single-choice and max-toppings limits and required groups', () => {
    expect(quoteOrder([{ itemId: 'classic', qty: 1, picks: { fill: ['cheese', 'beans'] } }], 'collect')).toMatch(/Too many/);
    expect(
      quoteOrder([{ itemId: 'classic', qty: 1, picks: { tops: ['sweetcorn', 'spring-onion', 'jalapenos', 'red-onion', 'sweetcorn'] } }], 'collect'),
    ).toMatch(/Duplicate|Too many/);
    expect(quoteOrder([{ itemId: 'latte', qty: 1, picks: { size: ['large'] } }], 'collect')).toMatch(/required/);
  });

  it('rejects empty baskets and unknown modes', () => {
    expect(quoteOrder([], 'collect')).toBe('Basket is empty');
    expect(quoteOrder([chilli], 'book')).toBe('Unknown order type');
  });

  it('prices deposits at £2 per person, 1–20 people', () => {
    expect(quoteDeposit(4)).toBe(8);
    expect(quoteDeposit(0)).toMatch(/Party size/);
    expect(quoteDeposit(21)).toMatch(/Party size/);
  });
});

describe('POST /api/order/checkout (simulated — no STRIPE_SECRET_KEY)', () => {
  beforeEach(() => {
    delete process.env.STRIPE_SECRET_KEY;
    resetRateLimits();
  });

  it('returns a simulated payment with the server-computed total', async () => {
    const res = await checkoutPost(post({ kind: 'order', mode: 'collect', lines: [chilli, latte] }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.simulated).toBe(true);
    expect(json.total).toBe(12.75);
    expect(json.paymentRef).toMatch(/^sim_/);
  });

  it('ignores any price the browser sends', async () => {
    const res = await checkoutPost(post({ kind: 'order', mode: 'collect', lines: [{ ...chilli, unitPrice: 0.01 }], total: 0.01 }));
    expect((await res.json()).total).toBe(8.75);
  });

  it('returns 400 for an invalid basket', async () => {
    const res = await checkoutPost(post({ kind: 'order', mode: 'delivery', lines: [latte] }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/minimum/);
  });

  it('prices a deposit and rejects an unknown kind', async () => {
    const ok = await checkoutPost(post({ kind: 'deposit', people: 6 }));
    expect((await ok.json()).total).toBe(12);
    const bad = await checkoutPost(post({ kind: 'refund' }));
    expect(bad.status).toBe(400);
  });
});

describe('POST /api/order/checkout (live Stripe, fetch mocked)', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    resetRateLimits();
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ id: 'cs_test_abc', url: 'https://checkout.stripe.com/c/pay/cs_test_abc' }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.STRIPE_SECRET_KEY;
  });

  it('creates a Checkout Session with line items in pence and the delivery fee', async () => {
    const res = await checkoutPost(post({ kind: 'order', mode: 'delivery', lines: [chilli, latte] }));
    const json = await res.json();
    expect(json).toMatchObject({ simulated: false, url: 'https://checkout.stripe.com/c/pay/cs_test_abc', sessionId: 'cs_test_abc', total: 14.74 });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.stripe.com/v1/checkout/sessions');
    expect(init.headers.Authorization).toBe('Bearer sk_test_123');
    const form = new URLSearchParams(init.body as URLSearchParams);
    expect(form.get('mode')).toBe('payment');
    expect(form.get('line_items[0][price_data][unit_amount]')).toBe('875');
    expect(form.get('line_items[1][price_data][unit_amount]')).toBe('400');
    expect(form.get('line_items[2][price_data][product_data][name]')).toBe('Delivery');
    expect(form.get('line_items[2][price_data][unit_amount]')).toBe('199');
    expect(form.get('success_url')).toBe('http://shop.test/order/status?session_id={CHECKOUT_SESSION_ID}');
    expect(form.get('cancel_url')).toBe('http://shop.test/order/checkout?cancelled=1');
  });

  it('returns 502 when Stripe errors', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ error: { message: 'bad key' } }), { status: 401 }));
    const res = await checkoutPost(post({ kind: 'deposit', people: 2 }));
    expect(res.status).toBe(502);
  });
});

describe('GET /api/order/verify', () => {
  const get = (id: string) => verifyGet(new NextRequest('http://localhost/api/order/verify?session_id=' + encodeURIComponent(id)));

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.STRIPE_SECRET_KEY;
  });

  it('rejects malformed session ids', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    expect((await get('../../charges')).status).toBe(400);
  });

  it('returns 503 when Stripe is not configured', async () => {
    delete process.env.STRIPE_SECRET_KEY;
    expect((await get('cs_test_abc')).status).toBe(503);
  });

  it('reports paid sessions from Stripe', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 'cs_test_abc', payment_status: 'paid', amount_total: 1474, metadata: { kind: 'order' } }), { status: 200 })));
    const json = await (await get('cs_test_abc')).json();
    expect(json).toEqual({ paid: true, sessionId: 'cs_test_abc', total: 14.74, kind: 'order' });
  });
});
