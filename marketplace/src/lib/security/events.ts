import 'server-only';
import { headers } from 'next/headers';
import { sql } from '@/lib/db';
import { getRateLimiter, RATE_LIMITS, RateLimitError } from './rate-limit';

export async function clientIp(): Promise<string | null> {
  try {
    const h = await headers();
    return h.get('x-forwarded-for')?.split(',')[0].trim() || h.get('x-real-ip') || null;
  } catch {
    return null;
  }
}

export async function logSecurityEvent(input: {
  userId?: string | null;
  eventType: string;
  severity?: 'low' | 'medium' | 'high';
  details?: Record<string, unknown>;
}) {
  const ip = await clientIp();
  await sql`insert into public.security_events (user_id, ip, event_type, severity, details)
    values (${input.userId ?? null}, ${ip}, ${input.eventType}, ${input.severity ?? 'low'}, ${sql.json((input.details ?? {}) as never)})`.catch(() => {});
}

/** Enforce a named rate-limit policy for a user/ip. Throws RateLimitError and logs when exceeded. */
export async function enforceRateLimit(policy: keyof typeof RATE_LIMITS, subject: string | null | undefined, userId?: string | null) {
  const { limit, window } = RATE_LIMITS[policy];
  const key = `${policy}:${subject || (await clientIp()) || 'anon'}`;
  const res = await getRateLimiter().hit(key, limit, window);
  if (!res.allowed) {
    await logSecurityEvent({ userId, eventType: 'rate_limited', severity: 'medium', details: { policy, key } });
    throw new RateLimitError(res.resetInSeconds);
  }
}
