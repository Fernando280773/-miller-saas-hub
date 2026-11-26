/**
 * Minimal Stripe REST helpers (same approach as /api/billing/checkout:
 * plain fetch, no SDK). Returns null when no live key is configured so
 * callers can fall back to simulated demo payments.
 */

export function stripeKey(): string | null {
  const key = process.env.STRIPE_SECRET_KEY;
  return key && !key.includes('placeholder') ? key : null;
}

export async function stripeRequest<T = Record<string, unknown>>(
  key: string,
  path: string,
  init: { method?: 'GET' | 'POST'; form?: Record<string, string> } = {},
): Promise<T> {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: init.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${key}`,
      ...(init.form ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
    },
    body: init.form ? new URLSearchParams(init.form) : undefined,
  });
  const json = (await res.json()) as T & { error?: { message?: string } };
  if (!res.ok) throw new Error(json.error?.message || `Stripe ${res.status}`);
  return json;
}

/** Pence for Stripe's unit_amount. */
export const toPence = (pounds: number) => String(Math.round(pounds * 100));
