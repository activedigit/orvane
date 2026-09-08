import 'server-only';
import { sql } from '@/lib/db';
import { notify } from '@/lib/notifications/service';
import { getSupplierPublicCard, type SupplierPublicCard } from './suppliers';
import { filterContactInfo } from '@/lib/moderation/text-filter';
import type { QuotationRow } from '@/lib/db/types';

export interface QuotationInput {
  price: number;
  details: string;
  priceIncludes?: string | null;
  deliveryDays?: number | null;
  validityDays?: number;
  warranty?: string | null;
  notes?: string | null;
  attachmentFileIds?: string[];
}

/** Sanitize free-text fields of a quotation so suppliers cannot leak contact info through the offer. */
function sanitizeQuotationText(input: QuotationInput) {
  const clean = (s: string | null | undefined) => (s ? filterContactInfo(s).text : s ?? null);
  const filtered = [input.details, input.priceIncludes, input.warranty, input.notes].some((s) => s && filterContactInfo(s).wasFiltered);
  return { details: clean(input.details) || '', priceIncludes: clean(input.priceIncludes), warranty: clean(input.warranty), notes: clean(input.notes), filtered };
}

export async function submitQuotation(supplierId: string, requestId: string, input: QuotationInput): Promise<QuotationRow> {
  const [match] = await sql<{ id: string }[]>`select id from public.request_matches where request_id = ${requestId} and supplier_id = ${supplierId}`;
  if (!match) throw new Error('هذا الطلب غير متاح لك');
  const [req] = await sql<{ status: string; customer_id: string; title: string; quotations_count: number }[]>`select status, customer_id, title, quotations_count from public.requests where id = ${requestId}`;
  if (!req || !['waiting_suppliers', 'receiving_quotations'].includes(req.status)) throw new Error('انتهى استقبال العروض لهذا الطلب');
  const [profile] = await sql<{ verification_status: string }[]>`select verification_status from public.supplier_profiles where user_id = ${supplierId}`;
  if (profile?.verification_status !== 'verified') throw new Error('يجب توثيق حسابك قبل تقديم العروض');

  const s = sanitizeQuotationText(input);
  const [existing] = await sql<{ id: string; status: string }[]>`select id, status from public.quotations where request_id = ${requestId} and supplier_id = ${supplierId}`;
  let q: QuotationRow;
  if (existing) {
    if (['selected', 'rejected'].includes(existing.status)) throw new Error('لا يمكن تعديل العرض بعد اتخاذ العميل قراره');
    [q] = await sql<QuotationRow[]>`update public.quotations set price = ${input.price}, details = ${s.details}, price_includes = ${s.priceIncludes}, delivery_days = ${input.deliveryDays ?? null},
      validity_days = ${input.validityDays ?? 14}, warranty = ${s.warranty}, notes = ${s.notes}, status = 'updated' where id = ${existing.id} returning *`;
    await notify({ userId: req.customer_id, type: 'quotation_updated', title: 'تم تحديث أحد العروض على طلبك', body: req.title, link: `/dashboard/requests/${requestId}` });
  } else {
    [q] = await sql<QuotationRow[]>`insert into public.quotations (request_id, supplier_id, price, details, price_includes, delivery_days, validity_days, warranty, notes)
      values (${requestId}, ${supplierId}, ${input.price}, ${s.details}, ${s.priceIncludes}, ${input.deliveryDays ?? null}, ${input.validityDays ?? 14}, ${s.warranty}, ${s.notes}) returning *`;
    await sql`update public.request_matches set status = 'quoted' where id = ${match.id}`;
    await sql`update public.requests set quotations_count = quotations_count + 1, status = case when status = 'waiting_suppliers' then 'receiving_quotations' else status end where id = ${requestId}`;
    await sql`update public.supplier_profiles set quotations_count = quotations_count + 1 where user_id = ${supplierId}`;
    // response speed = time from invitation to first quotation (rolling average)
    await sql`update public.supplier_profiles sp set avg_response_minutes = (
        select round(avg(extract(epoch from (q.submitted_at - m.created_at)) / 60))::int
        from public.quotations q join public.request_matches m on m.request_id = q.request_id and m.supplier_id = q.supplier_id
        where q.supplier_id = ${supplierId}) where sp.user_id = ${supplierId}`;
    await notify({ userId: req.customer_id, type: 'new_quotation', title: `وصلك عرض سعر جديد (${req.quotations_count + 1})`, body: req.title, link: `/dashboard/requests/${requestId}` });
  }
  if (input.attachmentFileIds?.length) {
    await sql`delete from public.quotation_attachments where quotation_id = ${q.id}`;
    for (const fileId of input.attachmentFileIds) {
      await sql`insert into public.quotation_attachments (quotation_id, file_id) select ${q.id}, id from public.files where id = ${fileId} and owner_id = ${supplierId} and scope = 'quotation'`;
    }
  }
  if (s.filtered) {
    await sql`insert into public.moderation_logs (user_id, kind, action, detections, original_excerpt) values (${supplierId}, 'text', 'masked', ${sql.json([{ source: 'quotation', quotationId: q.id }])}, ${input.details.slice(0, 200)})`;
  }
  return q;
}

export async function withdrawQuotation(supplierId: string, quotationId: string) {
  const res = await sql<{ request_id: string }[]>`update public.quotations set status = 'withdrawn' where id = ${quotationId} and supplier_id = ${supplierId} and status in ('submitted','updated') returning request_id`;
  if (!res.length) throw new Error('لا يمكن سحب هذا العرض');
  await sql`update public.requests set quotations_count = greatest(0, quotations_count - 1) where id = ${res[0].request_id}`;
}

import type { QuotationBadge } from '@/lib/domain/labels';
export type { QuotationBadge };

export interface CustomerQuotationView extends QuotationRow {
  supplier: SupplierPublicCard;
  badges: QuotationBadge[];
  attachments: { file_id: string; original_name: string; mime_type: string }[];
  conversation_id: string | null;
}

/** Customer-side quotations for their own request (identity revealed only for the selected supplier). */
export async function listQuotationsForCustomer(requestId: string, customerId: string): Promise<CustomerQuotationView[]> {
  const [req] = await sql<{ customer_id: string; selected_supplier_id: string | null }[]>`select customer_id, selected_supplier_id from public.requests where id = ${requestId}`;
  if (!req || req.customer_id !== customerId) return [];
  const rows = await sql<QuotationRow[]>`select * from public.quotations where request_id = ${requestId} and status <> 'withdrawn' order by submitted_at asc`;
  const out: CustomerQuotationView[] = [];
  for (const q of rows) {
    const supplier = await getSupplierPublicCard(q.supplier_id, { revealed: req.selected_supplier_id === q.supplier_id });
    if (!supplier) continue;
    const attachments = await sql<{ file_id: string; original_name: string; mime_type: string }[]>`
      select f.id as file_id, f.original_name, f.mime_type from public.quotation_attachments qa join public.files f on f.id = qa.file_id where qa.quotation_id = ${q.id} and f.moderation_status <> 'rejected'`;
    const [conv] = await sql<{ id: string }[]>`select id from public.conversations where request_id = ${requestId} and supplier_id = ${q.supplier_id}`;
    out.push({ ...q, supplier, badges: [], attachments, conversation_id: conv?.id ?? null });
  }
  return assignBadges(out);
}

/** Badges are computed relative to the other quotations; the cheapest is deliberately NOT labelled "best". */
export function assignBadges<T extends { id: string; is_featured: boolean; delivery_days: number | null; price: string; supplier: { ratingAvg: number; ratingCount: number } }>(items: (T & { badges: QuotationBadge[] })[]) {
  if (items.length === 0) return items;
  const rated = items.filter((q) => q.supplier.ratingCount > 0);
  if (rated.length) {
    const top = rated.reduce((a, b) => (b.supplier.ratingAvg > a.supplier.ratingAvg ? b : a));
    if (top.supplier.ratingAvg >= 4) top.badges.push('best_rated');
  }
  const withDays = items.filter((q) => q.delivery_days != null);
  if (withDays.length > 1) {
    const fastest = withDays.reduce((a, b) => (b.delivery_days! < a.delivery_days! ? b : a));
    fastest.badges.push('fastest');
  }
  for (const q of items) if (q.is_featured) q.badges.push('featured');
  // best value: good rating and price under the median
  if (items.length >= 3) {
    const prices = items.map((q) => Number(q.price)).sort((a, b) => a - b);
    const median = prices[Math.floor(prices.length / 2)];
    const candidates = items.filter((q) => Number(q.price) <= median && q.supplier.ratingAvg >= 4.2 && !q.badges.includes('best_rated'));
    if (candidates.length) candidates[0].badges.push('best_value');
  }
  return items;
}

export interface SupplierQuotationItem extends QuotationRow {
  request_title: string; request_status: string; reference_code: string; city_name: string | null; category_name: string | null;
  selection_status: string | null; selection_id: string | null; unlocked: boolean;
}

export async function listSupplierQuotations(supplierId: string): Promise<SupplierQuotationItem[]> {
  return sql<SupplierQuotationItem[]>`
    select q.*, r.title as request_title, r.status as request_status, r.reference_code, ci.name_ar as city_name, c.name_ar as category_name,
      ss.status as selection_status, ss.id as selection_id, exists (select 1 from public.lead_unlocks lu where lu.request_id = r.id and lu.supplier_id = ${supplierId}) as unlocked
    from public.quotations q
    join public.requests r on r.id = q.request_id
    left join public.cities ci on ci.id = r.city_id
    left join public.categories c on c.id = r.category_id
    left join public.supplier_selections ss on ss.request_id = r.id and ss.supplier_id = ${supplierId}
    where q.supplier_id = ${supplierId}
    order by q.updated_at desc`;
}

export async function getOwnQuotation(supplierId: string, requestId: string) {
  const [q] = await sql<QuotationRow[]>`select * from public.quotations where supplier_id = ${supplierId} and request_id = ${requestId}`;
  if (!q) return null;
  const attachments = await sql<{ file_id: string; original_name: string; mime_type: string }[]>`
    select f.id as file_id, f.original_name, f.mime_type from public.quotation_attachments qa join public.files f on f.id = qa.file_id where qa.quotation_id = ${q.id}`;
  return { ...q, attachments };
}
