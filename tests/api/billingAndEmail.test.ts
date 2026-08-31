import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as billingPost } from '@/app/api/billing/checkout/route';
import { POST as emailPost } from '@/app/api/email/send/route';

function jsonPost(url: string, body: unknown) {
  return new NextRequest(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/billing/checkout (simulated mode — no STRIPE_SECRET_KEY)', () => {
  beforeEach(() => {
    delete process.env.STRIPE_SECRET_KEY;
  });

  it('defaults to the growth plan at £79 monthly when no plan is given', async () => {
    const res = await billingPost(jsonPost('http://localhost/api/billing/checkout', {}));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.simulated).toBe(true);
    expect(json.plan).toBe('Growth Tier');
    expect(json.amount).toBe('£79');
    expect(json.billingCycle).toBe('monthly');
  });

  it('returns the starter plan at £29 monthly', async () => {
    const res = await billingPost(jsonPost('http://localhost/api/billing/checkout', { planId: 'starter' }));
    const json = await res.json();
    expect(json.amount).toBe('£29');
    expect(json.plan).toBe('Starter Tier');
  });

  it('returns the agency plan at £1990 yearly for yearly billing', async () => {
    const res = await billingPost(jsonPost('http://localhost/api/billing/checkout', {
      planId: 'agency', billingCycle: 'yearly',
    }));
    const json = await res.json();
    expect(json.amount).toBe('£1990'); // API interpolates amount without thousand separators
    expect(json.billingCycle).toBe('yearly');
  });

  it('falls back to growth for an unknown plan id', async () => {
    const res = await billingPost(jsonPost('http://localhost/api/billing/checkout', { planId: 'gold' }));
    const json = await res.json();
    expect(json.plan).toBe('Growth Tier');
  });

  it('returns a local redirect url in simulated mode', async () => {
    const res = await billingPost(jsonPost('http://localhost/api/billing/checkout', { planId: 'starter' }));
    const json = await res.json();
    expect(json.url).toContain('/dashboard/billing?upgraded=true');
  });
});

describe('POST /api/email/send (simulated mode — no provider keys)', () => {
  beforeEach(() => {
    delete process.env.RESEND_API_KEY;
    delete process.env.SENDGRID_API_KEY;
  });

  it('rejects an invalid recipient email with 400', async () => {
    const res = await emailPost(jsonPost('http://localhost/api/email/send', { to: 'not-an-email' }));
    expect(res.status).toBe(400);
  });

  it('rejects a missing recipient with 400', async () => {
    const res = await emailPost(jsonPost('http://localhost/api/email/send', {}));
    expect(res.status).toBe(400);
  });

  it('simulates delivery and returns the generated HTML when no provider keys exist', async () => {
    const res = await emailPost(jsonPost('http://localhost/api/email/send', {
      to: 'lead@example.com',
      leadName: 'Alex',
      businessName: 'Test Store',
      status: 'new',
      ctaUrl: 'https://example.com/catalog',
    }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.provider).toBe('simulated_delivery');
    expect(json.previewHtml).toContain('Test Store');
    expect(json.previewHtml).toContain('Powered by Miller AI');
  });

  it('passes through custom html when supplied', async () => {
    const res = await emailPost(jsonPost('http://localhost/api/email/send', {
      to: 'lead@example.com',
      subject: 'Custom Subject',
      html: '<h1>Custom Body</h1>',
      text: 'Plain body',
    }));
    const json = await res.json();
    expect(json.previewHtml).toBe('<h1>Custom Body</h1>');
    expect(json.subject).toBe('Custom Subject');
  });
});
