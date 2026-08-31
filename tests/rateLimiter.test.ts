import { describe, it, expect, beforeEach } from 'vitest';
import { isRateLimited, resetRateLimits, sanitizeInput, RATE_LIMIT_MAX } from '@/lib/rateLimiter';

describe('Rate Limiter & Input Sanitizer', () => {
  beforeEach(() => {
    resetRateLimits();
  });

  it('allows requests within the allowed threshold', () => {
    const testIp = '192.168.1.10';
    for (let i = 0; i < RATE_LIMIT_MAX; i++) {
      expect(isRateLimited(testIp)).toBe(false);
    }
  });

  it('blocks the request when the rate limit threshold is exceeded', () => {
    const testIp = '192.168.1.20';
    for (let i = 0; i < RATE_LIMIT_MAX; i++) {
      isRateLimited(testIp);
    }
    // 11th request must be blocked
    expect(isRateLimited(testIp)).toBe(true);
  });

  it('maintains independent rate limits for different IP addresses', () => {
    const ipA = '10.0.0.1';
    const ipB = '10.0.0.2';

    // Exhaust quota for ipA
    for (let i = 0; i < RATE_LIMIT_MAX; i++) {
      isRateLimited(ipA);
    }
    expect(isRateLimited(ipA)).toBe(true);

    // ipB should still be allowed
    expect(isRateLimited(ipB)).toBe(false);
  });

  it('sanitizes input strings and strips dangerous HTML injection tags', () => {
    const maliciousInput = '<script>alert("xss")</script>Hello <b>World</b>';
    const sanitized = sanitizeInput(maliciousInput);
    expect(sanitized).not.toContain('<');
    expect(sanitized).not.toContain('>');
    expect(sanitized).toBe('scriptalert("xss")/scriptHello bWorld/b');
  });

  it('truncates inputs exceeding max length limit', () => {
    const longString = 'a'.repeat(600);
    const sanitized = sanitizeInput(longString, 100);
    expect(sanitized.length).toBe(100);
  });
});
