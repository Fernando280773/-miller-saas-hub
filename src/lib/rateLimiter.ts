// In-Memory IP Rate Limiter & Input Sanitizer for Public Endpoints

export const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
export const RATE_LIMIT_MAX = 10;
export const RATE_LIMIT_WINDOW_MS = 60 * 1000;

export function isRateLimited(ip: string, max = RATE_LIMIT_MAX, windowMs = RATE_LIMIT_WINDOW_MS): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
    return false;
  }

  if (entry.count >= max) {
    return true;
  }

  entry.count += 1;
  return false;
}

export function resetRateLimits() {
  rateLimitMap.clear();
}

export function sanitizeInput(str: string, maxLen = 500): string {
  if (typeof str !== 'string') return '';
  return str
    .replace(/[<>]/g, '') // strip dangerous HTML bracket injections
    .trim()
    .slice(0, maxLen);
}
