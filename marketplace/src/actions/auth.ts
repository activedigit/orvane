'use server';
import { z } from 'zod';
import { redirect } from 'next/navigation';
import { getAuthProvider, homeForRole, getCurrentUser } from '@/lib/auth';
import { sql } from '@/lib/db';
import { enforceRateLimit } from '@/lib/security/events';
import { getSetting } from '@/lib/settings';
import { upsertSupplierProfile } from '@/lib/services/suppliers';
import { notify } from '@/lib/notifications/service';
import { fail, ok, type ActionResult } from './result';
import { normalizePhone } from '@/lib/utils';

const phoneSchema = z.string().trim().regex(/^(\+?966|0)?5\d{8}$/, 'رقم الجوال غير صحيح (مثال: 05xxxxxxxx)');

const loginSchema = z.object({ email: z.string().trim().email('البريد الإلكتروني غير صحيح'), password: z.string().min(1, 'أدخل كلمة المرور'), next: z.string().optional() });

export async function loginAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail('تحقق من البيانات المدخلة', Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
  try {
    await enforceRateLimit('login', parsed.data.email);
  } catch (e) {
    return fail((e as Error).message);
  }
  const provider = await getAuthProvider();
  const res = await provider.signIn(parsed.data.email, parsed.data.password);
  if (!res.ok) return fail(res.error);
  const [u] = await sql<{ role: 'customer' | 'supplier' | 'admin' }[]>`select role from public.users where id = ${res.userId}`;
  const next = parsed.data.next && parsed.data.next.startsWith('/') && !parsed.data.next.startsWith('//') ? parsed.data.next : homeForRole(u?.role ?? 'customer');
  redirect(next);
}

const registerSchema = z.object({
  fullName: z.string().trim().min(3, 'أدخل الاسم الكامل'),
  email: z.string().trim().email('البريد الإلكتروني غير صحيح'),
  phone: phoneSchema,
  password: z.string().min(8, 'كلمة المرور 8 أحرف على الأقل'),
  next: z.string().optional(),
});

export async function registerCustomerAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail('تحقق من البيانات المدخلة', Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
  try {
    await enforceRateLimit('signup', parsed.data.email);
  } catch (e) {
    return fail((e as Error).message);
  }
  const phone = normalizePhone(parsed.data.phone);
  const [dup] = await sql`select 1 from public.users where phone = ${phone}`;
  if (dup) return fail('رقم الجوال مسجّل مسبقًا', { phone: 'رقم الجوال مسجّل مسبقًا' });
  const provider = await getAuthProvider();
  const res = await provider.signUp({ email: parsed.data.email, password: parsed.data.password, fullName: parsed.data.fullName, role: 'customer', phone });
  if (!res.ok) return fail(res.error);
  await sql`insert into public.customer_profiles (user_id, display_name, whatsapp) values (${res.userId}, ${parsed.data.fullName}, ${phone}) on conflict (user_id) do update set whatsapp = excluded.whatsapp`;
  if (res.needsEmailConfirmation) return ok(undefined);
  const next = parsed.data.next && parsed.data.next.startsWith('/') ? parsed.data.next : '/dashboard';
  redirect(next);
}

const supplierSchema = registerSchema.extend({
  companyName: z.string().trim().min(3, 'أدخل اسم الشركة أو المؤسسة'),
  cityId: z.string().uuid('اختر المدينة'),
  categoryIds: z.array(z.string().uuid()).min(1, 'اختر فئة واحدة على الأقل'),
  cityIds: z.array(z.string().uuid()).min(1, 'اختر مدينة واحدة على الأقل'),
  yearsExperience: z.coerce.number().int().min(0).max(60),
  description: z.string().trim().min(20, 'اكتب نبذة لا تقل عن 20 حرفًا'),
  commercialRegister: z.string().trim().optional(),
});

export async function registerSupplierAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const raw = {
    ...Object.fromEntries(formData),
    categoryIds: formData.getAll('categoryIds').map(String),
    cityIds: formData.getAll('cityIds').map(String),
  };
  const parsed = supplierSchema.safeParse(raw);
  if (!parsed.success) return fail('تحقق من البيانات المدخلة', Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
  try {
    await enforceRateLimit('signup', parsed.data.email);
  } catch (e) {
    return fail((e as Error).message);
  }
  const d = parsed.data;
  const phone = normalizePhone(d.phone);
  const provider = await getAuthProvider();
  const res = await provider.signUp({ email: d.email, password: d.password, fullName: d.fullName, role: 'supplier', phone });
  if (!res.ok) return fail(res.error);
  await upsertSupplierProfile(res.userId, {
    companyName: d.companyName, descriptionAr: d.description, cityId: d.cityId, yearsExperience: d.yearsExperience, commercialRegister: d.commercialRegister || null,
    contactPhone: phone, whatsapp: phone, isAvailable: true, categoryIds: d.categoryIds, subcategoryIds: [], cityIds: d.cityIds,
  });
  const bonus = Number(await getSetting('supplier.signup_bonus_credits'));
  if (bonus > 0) {
    await sql`update public.supplier_profiles set credits_balance = credits_balance + ${bonus} where user_id = ${res.userId}`;
    await sql`insert into public.credits (supplier_id, amount, balance_after, reason, note) values (${res.userId}, ${bonus}, ${bonus}, 'signup_bonus', 'رصيد ترحيبي')`;
  }
  await notify({ userId: res.userId, type: 'welcome', title: 'مرحبًا بك! أكمل ملفك التجاري وارفع السجل التجاري ليتم توثيق حسابك', link: '/supplier/profile' });
  const admins = await sql<{ id: string }[]>`select id from public.users where role = 'admin'`;
  for (const a of admins) await notify({ userId: a.id, type: 'new_supplier', title: `مزود جديد بانتظار التوثيق: ${d.companyName}`, link: '/admin/verification' });
  if (res.needsEmailConfirmation) return ok(undefined);
  redirect('/supplier');
}

export async function logoutAction() {
  const provider = await getAuthProvider();
  await provider.signOut();
  redirect('/');
}

export async function oauthStartAction(providerName: 'google' | 'apple'): Promise<ActionResult<{ url: string }>> {
  const provider = await getAuthProvider();
  const res = await provider.getOAuthUrl?.(providerName, `${process.env.NEXT_PUBLIC_APP_URL || ''}/auth/callback`);
  if (!res?.ok || !res.url) return fail(res?.error || 'غير متاح حاليًا');
  return ok({ url: res.url });
}

export async function currentUserAction() {
  return getCurrentUser();
}
