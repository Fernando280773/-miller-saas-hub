import { NextRequest, NextResponse } from 'next/server';
import { stripeKey, stripeRequest } from '@/lib/stripeRest';

/** Confirm a Stripe Checkout Session was paid before the order is placed. */
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('session_id') || '';
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId)) {
    return NextResponse.json({ error: 'Invalid session id' }, { status: 400 });
  }
  const key = stripeKey();
  if (!key) return NextResponse.json({ error: 'Stripe is not configured' }, { status: 503 });

  try {
    const s = await stripeRequest<{
      id: string;
      payment_status: string;
      amount_total: number | null;
      metadata?: Record<string, string>;
    }>(key, `checkout/sessions/${sessionId}`);
    return NextResponse.json({
      paid: s.payment_status === 'paid',
      sessionId: s.id,
      total: (s.amount_total ?? 0) / 100,
      kind: s.metadata?.kind ?? null,
    });
  } catch (err) {
    console.error('Jacket Club Stripe verify failed:', err);
    return NextResponse.json({ error: 'Could not confirm payment' }, { status: 502 });
  }
}
