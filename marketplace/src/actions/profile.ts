'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requireRole, requireUser } from '@/lib/auth';
import { sql } from '@/lib/db';
import { upsertSupplierProfile } from '@/lib/services/suppliers';
import { markNotificationsRead } from '@/lib/services/notifications';
import { notify } from '@/lib/notifications/service';
import { normalizePhone } from '@/lib/utils';
import { fail, run, type ActionResult } from './result';

const customerSchema = z.object({
  fullName: z.string().trim().min(3, 'أدخل الاسم الكامل'),
  phone: z.string().trim().regex(/^(\+?966|0)?5\d{8}$/, 'رقم الجوال غير صحيح'),
  whatsapp: z.string().trim().optional(),
  cityId: z.string().uuid().optional().or(z.literal('')),
  companyName: z.string().trim().optional(),
});

export async function updateCustomerProfileAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = customerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail('تحقق من البيانات', Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
  return run(async () => {
    const user = await requireRole('customer');
    const d = parsed.data;
    const phone = normalizePhone(d.phone);
    await sql`update public.users set full_name = ${d.fullName}, phone = ${phone} where id = ${user.id}`;
    await sql`insert into public.customer_profiles (user_id, display_name, whatsapp, city_id, company_name) values (${user.id}, ${d.fullName}, ${d.whatsapp ? normalizePhone(d.whatsapp) : phone}, ${d.cityId || null}, ${d.companyName || null})
      on conflict (user_id) do update set display_name = excluded.display_name, whatsapp = excluded.whatsapp, city_id = excluded.city_id, company_name = excluded.company_name`;
    revalidatePath('/dashboard/account');
  });
}

const supplierSchema = z.object({
  fullName: z.string().trim().min(3, 'أدخل اسم المسؤول'),
  companyName: z.string().trim().min(3, 'أدخل اسم الشركة'),
  description: z.string().trim().min(20, 'اكتب نبذة لا تقل عن 20 حرفًا'),
  cityId: z.string().uuid('اختر المدينة'),
  yearsExperience: z.coerce.number().int().min(0).max(60),
  commercialRegister: z.string().trim().optional(),
  website: z.string().trim().optional(),
  whatsapp: z.string().trim().optional(),
  contactPhone: z.string().trim().optional(),
  minBudget: z.coerce.number().min(0).optional().or(z.literal('')),
  maxBudget: z.coerce.number().min(0).optional().or(z.literal('')),
  isAvailable: z.string().optional(),
  privacyMode: z.enum(['inherit', 'hidden', 'visible']).default('inherit'),
  categoryIds: z.array(z.string().uuid()).min(1, 'اختر فئة واحدة على الأقل'),
  subcategoryIds: z.array(z.string().uuid()).default([]),
  cityIds: z.array(z.string().uuid()).min(1, 'اختر مدينة واحدة على الأقل'),
});

export async function updateSupplierProfileAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const raw = { ...Object.fromEntries(formData), categoryIds: formData.getAll('categoryIds').map(String), subcategoryIds: formData.getAll('subcategoryIds').map(String), cityIds: formData.getAll('cityIds').map(String) };
  const parsed = supplierSchema.safeParse(raw);
  if (!parsed.success) return fail('تحقق من البيانات', Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
  return run(async () => {
    const user = await requireRole('supplier');
    const d = parsed.data;
    await sql`update public.users set full_name = ${d.fullName} where id = ${user.id}`;
    await upsertSupplierProfile(user.id, {
      companyName: d.companyName, descriptionAr: d.description, cityId: d.cityId, yearsExperience: d.yearsExperience, commercialRegister: d.commercialRegister || null,
      website: d.website || null, whatsapp: d.whatsapp ? normalizePhone(d.whatsapp) : null, contactPhone: d.contactPhone ? normalizePhone(d.contactPhone) : null,
      minBudget: d.minBudget === '' || d.minBudget == null ? null : Number(d.minBudget), maxBudget: d.maxBudget === '' || d.maxBudget == null ? null : Number(d.maxBudget),
      isAvailable: d.isAvailable === 'on', categoryIds: d.categoryIds, subcategoryIds: d.subcategoryIds, cityIds: d.cityIds, privacyMode: d.privacyMode,
    });
    revalidatePath('/supplier/profile');
  });
}

export async function setSupplierLogoAction(fileId: string) {
  return run(async () => {
    const user = await requireRole('supplier');
    await sql`update public.supplier_profiles set logo_file_id = (select id from public.files where id = ${fileId} and owner_id = ${user.id} and scope = 'logo') where user_id = ${user.id}`;
    revalidatePath('/supplier/profile');
  });
}

export async function addPortfolioItemAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return run(async () => {
    const user = await requireRole('supplier');
    const title = String(formData.get('title') || '').trim();
    const description = String(formData.get('description') || '').trim();
    const fileId = String(formData.get('fileId') || '') || null;
    if (title.length < 3) throw new Error('أدخل عنوان المشروع');
    await sql`insert into public.portfolio_items (supplier_id, title, description_ar, file_id) values (${user.id}, ${title}, ${description || null}, ${fileId ? sql`(select id from public.files where id = ${fileId} and owner_id = ${user.id})` : null})`;
    revalidatePath('/supplier/profile');
  });
}
export async function deletePortfolioItemAction(id: string) {
  return run(async () => {
    const user = await requireRole('supplier');
    await sql`delete from public.portfolio_items where id = ${id} and supplier_id = ${user.id}`;
    revalidatePath('/supplier/profile');
  });
}

export async function submitVerificationDocAction(fileId: string, docType: string) {
  return run(async () => {
    const user = await requireRole('supplier');
    const type = ['commercial_register', 'vat', 'license', 'id', 'other'].includes(docType) ? docType : 'other';
    await sql`insert into public.verification_documents (supplier_id, doc_type, file_id) values (${user.id}, ${type}, (select id from public.files where id = ${fileId} and owner_id = ${user.id} and scope = 'verification'))`;
    await sql`update public.supplier_profiles set verification_status = 'under_review' where user_id = ${user.id} and verification_status in ('pending','rejected')`;
    const admins = await sql<{ id: string }[]>`select id from public.users where role = 'admin'`;
    for (const a of admins) await notify({ userId: a.id, type: 'verification_request', title: 'مستند توثيق جديد بانتظار المراجعة', link: '/admin/verification' });
    revalidatePath('/supplier/profile');
  });
}

export async function markNotificationsReadAction(ids?: string[]) {
  return run(async () => {
    const user = await requireUser();
    await markNotificationsRead(user.id, ids);
    revalidatePath('/dashboard/notifications');
    revalidatePath('/supplier/notifications');
  });
}

export async function reportAction(input: { reason: string; details?: string; reportedUserId?: string | null; requestId?: string | null; conversationId?: string | null }) {
  return run(async () => {
    const user = await requireUser();
    if (input.reason.trim().length < 3) throw new Error('اذكر سبب البلاغ');
    await sql`insert into public.reports (reporter_id, reported_user_id, request_id, conversation_id, reason, details)
      values (${user.id}, ${input.reportedUserId ?? null}, ${input.requestId ?? null}, ${input.conversationId ?? null}, ${input.reason.trim()}, ${input.details?.trim() || null})`;
    const admins = await sql<{ id: string }[]>`select id from public.users where role = 'admin'`;
    for (const a of admins) await notify({ userId: a.id, type: 'report', title: 'بلاغ جديد بحاجة للمراجعة', body: input.reason, link: '/admin/reports' });
  });
}

const contactSchema = z.object({ name: z.string().trim().min(2, 'أدخل اسمك'), email: z.string().trim().email('البريد غير صحيح'), subject: z.string().trim().min(3, 'أدخل الموضوع'), message: z.string().trim().min(10, 'اكتب رسالتك') });
export async function contactAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = contactSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail('تحقق من البيانات', Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
  return run(async () => {
    const d = parsed.data;
    await sql`insert into public.reports (reason, details) values (${'رسالة تواصل: ' + d.subject}, ${`من: ${d.name} <${d.email}>\n\n${d.message}`})`;
    const admins = await sql<{ id: string }[]>`select id from public.users where role = 'admin'`;
    for (const a of admins) await notify({ userId: a.id, type: 'contact', title: `رسالة تواصل جديدة: ${d.subject}`, link: '/admin/reports' });
  });
}
