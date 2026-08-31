import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// The webhook builds its own service-role supabase client; mock the
// supabase-js factory so inserts/upserts resolve without a network call.
const { serviceInsert, serviceUpsert } = vi.hoisted(() => ({
  serviceInsert: vi.fn().mockResolvedValue({ data: null, error: null }),
  serviceUpsert: vi.fn().mockResolvedValue({ data: null, error: null }),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({
      insert: serviceInsert,
      upsert: serviceUpsert,
    }),
  }),
}));

import { GET, POST } from '@/app/api/webhooks/whatsapp/route';

function getReq(url: string) {
  return new NextRequest(url);
}

function postReq(body: unknown) {
  return new NextRequest('http://localhost/api/webhooks/whatsapp', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('WhatsApp webhook', () => {
  beforeEach(() => {
    serviceInsert.mockClear();
    serviceUpsert.mockClear();
  });

  describe('GET verification', () => {
    it('verifies with the default token and echoes the challenge', async () => {
      const res = await GET(getReq(
        'http://localhost/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=miller_saas_hub_webhook_secret&hub.challenge=CHALLENGE123'
      ));
      expect(res.status).toBe(200);
      expect(await res.text()).toBe('CHALLENGE123');
    });

    it('rejects an unknown verify token with 403', async () => {
      const res = await GET(getReq(
        'http://localhost/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=WRONG&hub.challenge=x'
      ));
      expect(res.status).toBe(403);
    });
  });

  describe('POST ingestion', () => {
    it('routes a Meta-format image message to invoice capture', async () => {
      const res = await POST(postReq({
        object: 'whatsapp_business_account',
        entry: [{
          changes: [{
            value: {
              contacts: [{ profile: { name: 'Supplier Co' } }],
              messages: [{
                from: '447700900123',
                type: 'image',
                image: { id: 'media-1', caption: 'Invoice INV-2045 total 120.50' },
              }],
            },
          }],
        }],
      }));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.type).toBe('invoice_captured');
      expect(json.invoice.supplier_name).toBe('Supplier Co');
      expect(serviceInsert).toHaveBeenCalled();
    });

    it('routes a plain text inquiry to lead capture with a draft reply', async () => {
      const res = await POST(postReq({
        sender_phone: '+447700900222',
        sender_name: 'Alex Buyer',
        text: 'How much for bulk order?',
      }));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.type).toBe('lead_captured');
      expect(json.lead.name).toBe('Alex Buyer');
      expect(json.lead.contact).toBe('+447700900222');
      expect(json.draft.status).toBe('Draft');
      expect(serviceUpsert).toHaveBeenCalled();
    });

    it('ignores Meta events without messages', async () => {
      const res = await POST(postReq({
        object: 'whatsapp_business_account',
        entry: [{ changes: [{ value: { contacts: [] } }] }],
      }));
      expect(res.status).toBe(200);
      expect((await res.json()).status).toBe('ignored_no_message');
    });

    it('treats a document message mentioning invoice as invoice capture', async () => {
      const res = await POST(postReq({
        sender_phone: '+447700900333',
        sender_name: 'Booker Wholesale',
        type: 'document',
        text: 'Invoice attached for this week',
        media_url: 'media-doc-1',
      }));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.type).toBe('invoice_captured');
    });
  });
});
