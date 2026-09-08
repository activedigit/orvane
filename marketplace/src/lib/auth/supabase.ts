import 'server-only';
import { sql } from '@/lib/db';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';
import type { AuthProvider, AuthResult } from './types';

function translateError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('already registered') || m.includes('already exists')) return 'البريد الإلكتروني مسجّل مسبقًا';
  if (m.includes('invalid login')) return 'بيانات الدخول غير صحيحة';
  if (m.includes('email not confirmed')) return 'يرجى تأكيد بريدك الإلكتروني أولًا';
  if (m.includes('password')) return 'كلمة المرور ضعيفة (6 أحرف على الأقل)';
  return 'تعذّر إتمام العملية، حاول مرة أخرى';
}

async function ensurePublicUser(id: string, email: string, fullName: string, role: string, phone?: string) {
  await sql`
    insert into public.users (id, email, phone, full_name, role)
    values (${id}, ${email}, ${phone ?? null}, ${fullName}, ${role})
    on conflict (id) do update set full_name = excluded.full_name, role = excluded.role, phone = coalesce(excluded.phone, public.users.phone)`;
}

export const supabaseAuthProvider: AuthProvider = {
  name: 'supabase',
  async signUp(input) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signUp({
      email: input.email.trim().toLowerCase(),
      password: input.password,
      options: { data: { full_name: input.fullName.trim(), role: input.role } },
    });
    if (error || !data.user) return { ok: false, error: translateError(error?.message || '') };
    await ensurePublicUser(data.user.id, input.email.trim().toLowerCase(), input.fullName.trim(), input.role, input.phone);
    return { ok: true, userId: data.user.id, needsEmailConfirmation: !data.session };
  },
  async signIn(email, password) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (error || !data.user) return { ok: false, error: translateError(error?.message || '') };
    const [row] = await sql<{ status: string }[]>`select status from public.users where id = ${data.user.id}`;
    if (row?.status === 'blocked') {
      await supabase.auth.signOut();
      return { ok: false, error: 'تم إيقاف هذا الحساب. تواصل مع الدعم.' };
    }
    return { ok: true, userId: data.user.id };
  },
  async signOut() {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  },
  async getSessionUserId() {
    try {
      const supabase = await createSupabaseServerClient();
      const { data } = await supabase.auth.getUser();
      return data.user?.id ?? null;
    } catch {
      return null;
    }
  },
  async requestPhoneOtp(phone) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithOtp({ phone });
    return error ? { ok: false, error: translateError(error.message) } : { ok: true };
  },
  async verifyPhoneOtp(phone, token): Promise<AuthResult> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });
    if (error || !data.user) return { ok: false, error: translateError(error?.message || '') };
    return { ok: true, userId: data.user.id };
  },
  async getOAuthUrl(provider, redirectTo) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo, skipBrowserRedirect: true } });
    if (error || !data.url) return { ok: false, error: translateError(error?.message || '') };
    return { ok: true, url: data.url };
  },
  async adminCreateUser(input) {
    const admin = createSupabaseAdminClient();
    const email = input.email.trim().toLowerCase();
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: input.password,
      email_confirm: true,
      user_metadata: { full_name: input.fullName, role: input.role },
    });
    if (error || !data.user) return { ok: false, error: error?.message || 'failed' };
    await ensurePublicUser(data.user.id, email, input.fullName, input.role, input.phone);
    return { ok: true, userId: data.user.id };
  },
};
