'use server';
import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth';
import { setSetting } from '@/lib/settings';
import * as admin from '@/lib/services/admin';
import { fulfilPayment } from '@/lib/services/unlock';
import { sql } from '@/lib/db';

async function guard() {
  return requireRole('admin');
}
const str = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();
const num = (fd: FormData, k: string) => { const v = str(fd, k); return v === '' ? null : Number(v); };
const list = (v: string) => v.split(/[،,\n]/).map((s) => s.trim()).filter(Boolean);

export async function adminUserStatusAction(fd: FormData) {
  const me = await guard();
  await admin.adminSetUserStatus(me.id, str(fd, 'userId'), str(fd, 'status') as 'active' | 'blocked', str(fd, 'reason') || undefined);
  revalidatePath('/admin/users'); revalidatePath('/admin/blocked'); revalidatePath(`/admin/users/${str(fd, 'userId')}`);
}
export async function adminVerificationAction(fd: FormData) {
  const me = await guard();
  await admin.adminSetVerification(me.id, str(fd, 'supplierId'), str(fd, 'status') as 'verified' | 'rejected' | 'under_review' | 'pending', str(fd, 'note') || undefined);
  revalidatePath('/admin/verification'); revalidatePath(`/admin/users/${str(fd, 'supplierId')}`);
}
export async function adminGrantCreditsAction(fd: FormData) {
  const me = await guard();
  await admin.adminGrantCredits(me.id, str(fd, 'supplierId'), Number(str(fd, 'amount')), str(fd, 'note') || undefined);
  revalidatePath('/admin/credits'); revalidatePath(`/admin/users/${str(fd, 'supplierId')}`);
}
export async function adminPricingRuleAction(fd: FormData) {
  await guard();
  await admin.adminUpsertPricingRule({ id: str(fd, 'id') || undefined, nameAr: str(fd, 'nameAr'), categoryId: str(fd, 'categoryId') || null, minValue: num(fd, 'minValue'), maxValue: num(fd, 'maxValue'), price: Number(str(fd, 'price')), priority: Number(str(fd, 'priority') || 0), isActive: fd.get('isActive') === 'on' });
  revalidatePath('/admin/pricing'); revalidatePath('/pricing');
}
export async function adminDeletePricingRuleAction(fd: FormData) {
  await guard();
  await admin.adminDeletePricingRule(str(fd, 'id'));
  revalidatePath('/admin/pricing');
}
export async function adminPlanAction(fd: FormData) {
  await guard();
  await admin.adminUpsertPlan({ id: str(fd, 'id') || undefined, slug: str(fd, 'slug'), nameAr: str(fd, 'nameAr'), descriptionAr: str(fd, 'descriptionAr') || null, priceMonthly: Number(str(fd, 'priceMonthly')), includedLeads: Number(str(fd, 'includedLeads')), features: list(str(fd, 'features')), isActive: fd.get('isActive') === 'on', sortOrder: Number(str(fd, 'sortOrder') || 0) });
  revalidatePath('/admin/subscriptions'); revalidatePath('/pricing');
}
export async function adminReviewStatusAction(fd: FormData) {
  await guard();
  await admin.adminSetReviewStatus(str(fd, 'id'), str(fd, 'status') as 'published' | 'hidden');
  revalidatePath('/admin/reviews');
}
export async function adminReportAction(fd: FormData) {
  const me = await guard();
  await admin.adminResolveReport(me.id, str(fd, 'id'), str(fd, 'status') as 'reviewing' | 'resolved' | 'dismissed', str(fd, 'note') || undefined);
  revalidatePath('/admin/reports');
}
export async function adminBroadcastAction(fd: FormData) {
  const me = await guard();
  await admin.adminBroadcast(me.id, { audience: str(fd, 'audience') as 'all' | 'customers' | 'suppliers', title: str(fd, 'title'), body: str(fd, 'body'), link: str(fd, 'link') || null });
  revalidatePath('/admin/notifications');
}
export async function adminCategoryAction(fd: FormData) {
  await guard();
  await admin.adminUpsertCategory({ id: str(fd, 'id') || undefined, slug: str(fd, 'slug'), nameAr: str(fd, 'nameAr'), descriptionAr: str(fd, 'descriptionAr') || null, icon: str(fd, 'icon') || null, keywords: list(str(fd, 'keywords')), sortOrder: Number(str(fd, 'sortOrder') || 0), isActive: fd.get('isActive') === 'on' });
  revalidatePath('/admin/categories'); revalidatePath('/');
}
export async function adminSubcategoryAction(fd: FormData) {
  await guard();
  await admin.adminUpsertSubcategory({ id: str(fd, 'id') || undefined, categoryId: str(fd, 'categoryId'), slug: str(fd, 'slug'), nameAr: str(fd, 'nameAr'), keywords: list(str(fd, 'keywords')), sortOrder: Number(str(fd, 'sortOrder') || 0), isActive: fd.get('isActive') === 'on' });
  revalidatePath('/admin/categories');
}
export async function adminCityAction(fd: FormData) {
  await guard();
  await admin.adminUpsertCity({ id: str(fd, 'id') || undefined, slug: str(fd, 'slug'), nameAr: str(fd, 'nameAr'), regionAr: str(fd, 'regionAr') || null, sortOrder: Number(str(fd, 'sortOrder') || 0), isActive: fd.get('isActive') === 'on' });
  revalidatePath('/admin/cities');
}
export async function adminSettingAction(fd: FormData) {
  const me = await guard();
  const key = str(fd, 'key');
  const raw = str(fd, 'value');
  let value: unknown = raw;
  if (raw === 'true' || raw === 'false') value = raw === 'true';
  else if (raw !== '' && !Number.isNaN(Number(raw))) value = Number(raw);
  await setSetting(key, value, me.id);
  revalidatePath('/admin/settings');
}
export async function adminMarkPaymentPaidAction(fd: FormData) {
  await guard();
  await fulfilPayment(str(fd, 'id'));
  revalidatePath('/admin/payments');
}
export async function adminSetFeaturedQuotationAction(fd: FormData) {
  await guard();
  await sql`update public.quotations set is_featured = ${fd.get('featured') === 'true'} where id = ${str(fd, 'id')}`;
  revalidatePath('/admin/quotations');
}
export async function adminRequestStatusAction(fd: FormData) {
  await guard();
  const status = str(fd, 'status');
  if (!['cancelled', 'closed', 'reviewing_quotations'].includes(status)) throw new Error('حالة غير مسموحة');
  await sql`update public.requests set status = ${status}, closed_reason = coalesce(${str(fd, 'reason') || null}, closed_reason) where id = ${str(fd, 'id')}`;
  revalidatePath(`/admin/requests/${str(fd, 'id')}`); revalidatePath('/admin/requests');
}
export async function adminRedispatchAction(fd: FormData) {
  await guard();
  const { dispatchRequestToSuppliers } = await import('@/lib/services/requests');
  await dispatchRequestToSuppliers(str(fd, 'id'));
  revalidatePath(`/admin/requests/${str(fd, 'id')}`);
}
