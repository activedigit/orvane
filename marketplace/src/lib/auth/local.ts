import 'server-only';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { sql } from '@/lib/db';
import { config } from '@/lib/config';
import type { AuthProvider, AuthResult, SignUpInput } from './types';
import type { Role } from '@/lib/db/types';

const secret = () => new TextEncoder().encode(config.auth.secret);

async function issueSession(userId: string) {
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${config.auth.sessionDays}d`)
    .sign(secret());
  const store = await cookies();
  store.set(config.auth.sessionCookie, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.isProd,
    path: '/',
    maxAge: config.auth.sessionDays * 24 * 3600,
  });
}

async function createUserRecord(input: SignUpInput & { role: Role; id?: string }): Promise<AuthResult> {
  const email = input.email.trim().toLowerCase();
  const existing = await sql`select id from public.users where email = ${email}`;
  if (existing.length) return { ok: false, error: 'البريد الإلكتروني مسجّل مسبقًا' };
  const hash = await bcrypt.hash(input.password, 10);
  const [user] = await sql<{ id: string }[]>`
    insert into public.users (id, email, phone, full_name, role)
    values (${input.id ?? sql`gen_random_uuid()`}, ${email}, ${input.phone ?? null}, ${input.fullName.trim()}, ${input.role})
    returning id`;
  await sql`insert into public.local_auth_credentials (user_id, password_hash) values (${user.id}, ${hash})`;
  return { ok: true, userId: user.id };
}

export const localAuthProvider: AuthProvider = {
  name: 'local',
  async signUp(input) {
    const res = await createUserRecord(input);
    if (res.ok) await issueSession(res.userId);
    return res;
  },
  async signIn(email, password) {
    const [row] = await sql<{ id: string; password_hash: string; status: string }[]>`
      select u.id, c.password_hash, u.status from public.users u
      join public.local_auth_credentials c on c.user_id = u.id
      where u.email = ${email.trim().toLowerCase()}`;
    if (!row) return { ok: false, error: 'بيانات الدخول غير صحيحة' };
    const valid = await bcrypt.compare(password, row.password_hash);
    if (!valid) return { ok: false, error: 'بيانات الدخول غير صحيحة' };
    if (row.status === 'blocked') return { ok: false, error: 'تم إيقاف هذا الحساب. تواصل مع الدعم.' };
    await issueSession(row.id);
    return { ok: true, userId: row.id };
  },
  async signOut() {
    const store = await cookies();
    store.delete(config.auth.sessionCookie);
  },
  async getSessionUserId() {
    try {
      const store = await cookies();
      const token = store.get(config.auth.sessionCookie)?.value;
      if (!token) return null;
      const { payload } = await jwtVerify(token, secret());
      return typeof payload.sub === 'string' ? payload.sub : null;
    } catch {
      return null;
    }
  },
  async requestPhoneOtp() {
    return { ok: false, error: 'تسجيل الدخول برقم الجوال يتطلب تفعيل Supabase Auth' };
  },
  async verifyPhoneOtp() {
    return { ok: false, error: 'تسجيل الدخول برقم الجوال يتطلب تفعيل Supabase Auth' };
  },
  async getOAuthUrl() {
    return { ok: false, error: 'تسجيل الدخول عبر Google/Apple يتطلب تفعيل Supabase Auth' };
  },
  adminCreateUser(input) {
    return createUserRecord(input);
  },
};
