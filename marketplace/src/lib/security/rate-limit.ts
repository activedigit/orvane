/**
 * Rate limiting abstraction. The in-memory implementation is per-process
 * (fine for a single Next.js instance / dev). Swap `setRateLimiter` with a
 * Redis / Upstash implementation for multi-instance deployments.
 */
export interface RateLimitResult { allowed: boolean; remaining: number; resetInSeconds: number }
export interface RateLimiter {
  hit(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult>;
}

class MemoryRateLimiter implements RateLimiter {
  private buckets = new Map<string, number[]>();
  async hit(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    const arr = (this.buckets.get(key) || []).filter((t) => now - t < windowMs);
    if (arr.length >= limit) {
      const resetInSeconds = Math.ceil((arr[0] + windowMs - now) / 1000);
      this.buckets.set(key, arr);
      return { allowed: false, remaining: 0, resetInSeconds };
    }
    arr.push(now);
    this.buckets.set(key, arr);
    if (this.buckets.size > 10000) this.sweep(now, windowMs);
    return { allowed: true, remaining: limit - arr.length, resetInSeconds: windowSeconds };
  }
  private sweep(now: number, windowMs: number) {
    for (const [k, v] of this.buckets) {
      if (!v.some((t) => now - t < windowMs)) this.buckets.delete(k);
    }
  }
}

declare global {
  var __orood_rate_limiter: RateLimiter | undefined;
}

export function getRateLimiter(): RateLimiter {
  if (!globalThis.__orood_rate_limiter) globalThis.__orood_rate_limiter = new MemoryRateLimiter();
  return globalThis.__orood_rate_limiter;
}
export function setRateLimiter(l: RateLimiter) {
  globalThis.__orood_rate_limiter = l;
}

/** Named policies used across the app. */
export const RATE_LIMITS = {
  login: { limit: 10, window: 600 },
  signup: { limit: 5, window: 3600 },
  createRequest: { limit: 10, window: 3600 },
  sendMessage: { limit: 40, window: 60 },
  submitQuotation: { limit: 30, window: 3600 },
  upload: { limit: 30, window: 3600 },
  api: { limit: 240, window: 60 },
} as const;

export class RateLimitError extends Error {
  constructor(public resetInSeconds: number) {
    super('تم تجاوز الحد المسموح من المحاولات، حاول لاحقًا');
  }
}
