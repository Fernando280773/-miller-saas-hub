import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { planId, billingCycle = 'monthly', storeId = '00000000-0000-0000-0000-000000000001' } = await req.json();

    const PLANS: Record<string, { name: string; monthlyPrice: number; yearlyPrice: number }> = {
      starter: { name: 'Starter Tier', monthlyPrice: 29, yearlyPrice: 290 },
      growth: { name: 'Growth Tier', monthlyPrice: 79, yearlyPrice: 790 },
      agency: { name: 'Agency / Scale Tier', monthlyPrice: 199, yearlyPrice: 1990 }
    };

    const selectedPlan = PLANS[planId] || PLANS.growth;
    const amount = billingCycle === 'yearly' ? selectedPlan.yearlyPrice : selectedPlan.monthlyPrice;

    const stripeKey = process.env.STRIPE_SECRET_KEY;

    // If live Stripe Key is provided, connect to Stripe API
    if (stripeKey && !stripeKey.includes('placeholder')) {
      try {
        // Stripe dynamic checkout session initialization
        const origin = req.headers.get('origin') || 'http://localhost:3000';
        const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${stripeKey}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            'success_url': `${origin}/dashboard/billing?session_id={CHECKOUT_SESSION_ID}&upgraded=true&plan=${planId}`,
            'cancel_url': `${origin}/dashboard/billing`,
            'payment_method_types[0]': 'card',
            'mode': 'subscription',
            'line_items[0][price_data][currency]': 'gbp',
            'line_items[0][price_data][product_data][name]': `Miller SaaS Hub — ${selectedPlan.name}`,
            'line_items[0][price_data][unit_amount]': `${amount * 100}`,
            'line_items[0][price_data][recurring][interval]': billingCycle === 'yearly' ? 'year' : 'month',
            'line_items[0][quantity]': '1',
            'client_reference_id': storeId,
          })
        });

        const stripeSession = await stripeRes.json();
        if (stripeSession.url) {
          return NextResponse.json({ success: true, url: stripeSession.url });
        }
      } catch (stripeErr) {
        console.warn('Stripe checkout live call failed, falling back to simulated checkout:', stripeErr);
      }
    }

    // Fallback Simulated Checkout Confirmation for instant testing/demo
    return NextResponse.json({
      success: true,
      simulated: true,
      plan: selectedPlan.name,
      amount: `£${amount}`,
      billingCycle,
      url: `/dashboard/billing?upgraded=true&plan=${planId}`
    });

  } catch (err: unknown) {
    console.error('Billing checkout error:', err);
    return NextResponse.json({ error: 'Failed to process checkout session' }, { status: 500 });
  }
}
