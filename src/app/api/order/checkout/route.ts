import { NextRequest, NextResponse } from 'next/server';
import { isRateLimited } from '@/lib/rateLimiter';
import { quoteDeposit, quoteOrder, JC_VENUE } from '@/lib/jacketMenu';
import { stripeKey, stripeRequest, toPence } from '@/lib/stripeRest';

/**
 * Start payment for a Jacket Club order or table-booking deposit.
 *
 * The amount is always priced here from the canonical menu — the browser
 * only sends item ids, option ids and quantities. With STRIPE_SECRET_KEY
 * set this creates a Stripe Checkout Session (card, Apple Pay, Google Pay)
 * and returns its URL; without one it returns a simulated confirmation so
 * the demo keeps working.
 */
export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || req.headers.get('x-real-ip') || 'unknown';
  if (isRateLimited('order-checkout:' + ip, 20)) {
    return NextResponse.json({ error: 'Too many payment attempts. Please wait a minute.' }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const origin = req.headers.get('origin') || req.nextUrl.origin;
  const form: Record<string, string> = { mode: 'payment', 'metadata[venue]': JC_VENUE.name };
  let total: number;
  let quote: unknown = null;

  if (body.kind === 'deposit') {
    const deposit = quoteDeposit(body.people);
    if (typeof deposit === 'string') return NextResponse.json({ error: deposit }, { status: 400 });
    total = deposit;
    Object.assign(form, {
      success_url: `${origin}/order/book?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/order/book?cancelled=1`,
      'line_items[0][price_data][currency]': 'gbp',
      'line_items[0][price_data][product_data][name]': `Table deposit · ${body.people} people`,
      'line_items[0][price_data][unit_amount]': toPence(JC_VENUE.depositPerPerson),
      'line_items[0][quantity]': String(body.people),
      'metadata[kind]': 'deposit',
      'metadata[people]': String(body.people),
    });
  } else if (body.kind === 'order') {
    const q = quoteOrder(body.lines, body.mode);
    if (typeof q === 'string') return NextResponse.json({ error: q }, { status: 400 });
    total = q.total;
    quote = q;
    Object.assign(form, {
      success_url: `${origin}/order/status?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/order/checkout?cancelled=1`,
      'metadata[kind]': 'order',
      'metadata[mode]': String(body.mode),
    });
    q.lines.forEach((l, i) => {
      form[`line_items[${i}][price_data][currency]`] = 'gbp';
      form[`line_items[${i}][price_data][product_data][name]`] = l.name;
      if (l.summary) form[`line_items[${i}][price_data][product_data][description]`] = l.summary.slice(0, 250);
      form[`line_items[${i}][price_data][unit_amount]`] = toPence(l.unit);
      form[`line_items[${i}][quantity]`] = String(l.qty);
    });
    if (q.deliveryFee) {
      const i = q.lines.length;
      form[`line_items[${i}][price_data][currency]`] = 'gbp';
      form[`line_items[${i}][price_data][product_data][name]`] = 'Delivery';
      form[`line_items[${i}][price_data][unit_amount]`] = toPence(q.deliveryFee);
      form[`line_items[${i}][quantity]`] = '1';
    }
  } else {
    return NextResponse.json({ error: 'Unknown payment kind' }, { status: 400 });
  }

  const key = stripeKey();
  if (!key) {
    return NextResponse.json({ simulated: true, total, quote, paymentRef: 'sim_' + Date.now().toString(36) });
  }

  try {
    const session = await stripeRequest<{ id: string; url: string }>(key, 'checkout/sessions', { method: 'POST', form });
    return NextResponse.json({ simulated: false, total, quote, url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('Jacket Club Stripe checkout failed:', err);
    return NextResponse.json({ error: 'Payment provider is unavailable. Please try again.' }, { status: 502 });
  }
}
