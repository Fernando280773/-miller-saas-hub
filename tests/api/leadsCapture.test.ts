import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { resetRateLimits } from '@/lib/rateLimiter';

// Mock the supabase client so the route exercises its fallback path and
// we can assert whether the database insert was attempted.
const { insertMock } = vi.hoisted(() => ({ insertMock: vi.fn() }));

vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    from: () => ({
      insert: () => ({
        select: () => ({ single: insertMock }),
      }),
    }),
  },
}));

import { POST } from '@/app/api/leads/capture/route';

function makePost(body: unknown, ip = '198.51.100.10') {
  return new NextRequest('http://localhost/api/leads/capture', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify(body),
  });
}

describe('POST /api/leads/capture', () => {
  beforeEach(() => {
    resetRateLimits();
    insertMock.mockReset();
    insertMock.mockResolvedValue({ data: null, error: { message: 'mock db down' } });
  });

  it('rejects a missing name with 400', async () => {
    const res = await POST(makePost({ email: 'a@b.com', store_id: 's1' }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/name/i);
  });

  it('rejects a missing store_id with 400', async () => {
    const res = await POST(makePost({ name: 'John', email: 'a@b.com' }));
    expect(res.status).toBe(400);
  });

  it('rejects when no contact method is provided', async () => {
    const res = await POST(makePost({ name: 'John', store_id: 's1' }));
    expect(res.status).toBe(400);
  });

  it('silently accepts honeypot submissions without touching the db', async () => {
    const res = await POST(makePost({
      name: 'Bot', email: 'bot@spam.com', store_id: 's1', website: 'http://spam.example',
    }));
    expect(res.status).toBe(200);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('falls back to a simulated lead when the live insert fails', async () => {
    const res = await POST(makePost({ name: 'Jane', email: 'jane@x.com', store_id: 's1' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.lead).toBeDefined();
    expect(json.lead.name).toBe('Jane');
    expect(insertMock).toHaveBeenCalledTimes(1);
  });

  it('returns 201 with the persisted lead when the live insert succeeds', async () => {
    const liveLead = { id: 'lead-live-1', name: 'Jane', store_id: 's1' };
    insertMock.mockResolvedValueOnce({ data: liveLead, error: null });
    const res = await POST(makePost({ name: 'Jane', email: 'jane@x.com', store_id: 's1' }));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.lead.id).toBe('lead-live-1');
  });

  it('sanitizes XSS payloads out of the captured lead', async () => {
    const res = await POST(makePost({
      name: '<script>alert(1)</script>Bob', email: 'bob@x.com', store_id: 's1',
    }));
    const json = await res.json();
    expect(json.lead.name).not.toContain('<');
    expect(json.lead.name).toBe('scriptalert(1)/scriptBob');
  });

  it('blocks the 11th request from the same IP with 429', async () => {
    const body = { name: 'Rate', email: 'rate@x.com', store_id: 's1' };
    for (let i = 0; i < 10; i++) {
      const res = await POST(makePost(body, '203.0.113.77'));
      expect(res.status).toBe(200);
    }
    const blocked = await POST(makePost(body, '203.0.113.77'));
    expect(blocked.status).toBe(429);
  });

  it('allows a different IP even after another is rate limited', async () => {
    const body = { name: 'Rate', email: 'rate@x.com', store_id: 's1' };
    for (let i = 0; i < 11; i++) {
      await POST(makePost(body, '203.0.113.78'));
    }
    const other = await POST(makePost(body, '203.0.113.79'));
    expect(other.status).toBe(200);
  });
});
