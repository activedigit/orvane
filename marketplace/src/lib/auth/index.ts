import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { sql } from '@/lib/db';
import { config } from '@/lib/config';
import type { AuthProvider, SessionUser } from './types';
import type { Role } from '@/lib/db/types';

export type { SessionUser, AuthProvider } from './types';

export async function getAuthProvider(): Promise<AuthProvider> {
  if (config.auth.provider === 'supabase') {
    const { supabaseAuthProvider } = await import('./supabase');
    return supabaseAuthProvider;
  }
  const { localAuthProvider } = await import('./local');
  return localAuthProvider;
}

/** Request-scoped cached lookup of the signed-in user (null when anonymous or blocked). */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const provider = await getAuthProvider();
  const id = await provider.getSessionUserId();
  if (!id) return null;
  const [row] = await sql<{ id: string; email: string | null; phone: string | null; full_name: string; role: Role; status: SessionUser['status'] }[]>`
    select id, email, phone, full_name, role, status from public.users where id = ${id}`;
  if (!row) return null;
  // touch last_seen (best effort, throttled to once per 5 min)
  sql`update public.users set last_seen_at = now() where id = ${id} and (last_seen_at is null or last_seen_at < now() - interval '5 minutes')`.catch(() => {});
  return { id: row.id, email: row.email, phone: row.phone, fullName: row.full_name, role: row.role, status: row.status };
});

export class AuthError extends Error {
  constructor(public code: 'unauthenticated' | 'forbidden' | 'blocked', message?: string) {
    super(message || code);
  }
}

/** Server-action guard: throws when not signed in or blocked. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError('unauthenticated', 'يجب تسجيل الدخول');
  if (user.status === 'blocked') throw new AuthError('blocked', 'هذا الحساب موقوف');
  return user;
}

export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) throw new AuthError('forbidden', 'ليس لديك صلاحية لهذا الإجراء');
  return user;
}

/** Page guard: redirects to login (with return path) or to the user's own home when the role mismatches. */
export async function requirePageRole(roles: Role[], returnTo?: string): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login${returnTo ? `?next=${encodeURIComponent(returnTo)}` : ''}`);
  if (user.status === 'blocked') redirect('/blocked');
  if (!roles.includes(user.role)) redirect(homeForRole(user.role));
  return user;
}

export function homeForRole(role: Role) {
  return role === 'admin' ? '/admin' : role === 'supplier' ? '/supplier' : '/dashboard';
}
