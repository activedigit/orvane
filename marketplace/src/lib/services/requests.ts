import 'server-only';
import { sql } from '@/lib/db';
import { getAiProvider } from '@/lib/ai';
import { getCategories, getCities } from './reference';
import { buildQuestions, budgetLabelFromNumbers, TIMELINE_LABELS, type Question } from '@/lib/requests/questionnaire';
import { findMatchingSuppliers } from './matching';
import { getSetting } from '@/lib/settings';
import { notify } from '@/lib/notifications/service';
import type { RequestAnalysis } from '@/lib/ai/types';
import type { RequestRow, RequestStatus } from '@/lib/db/types';
import { OPEN_REQUEST_STATUSES } from '@/lib/domain/labels';

export interface AnalyzeResult {
  analysis: RequestAnalysis;
  questions: Question[];
  categoryName: string | null;
  subcategoryName: string | null;
  cityName: string | null;
}

export async function analyzeRequestText(text: string, isAuthenticated: boolean): Promise<AnalyzeResult> {
  const [categories, cities] = await Promise.all([getCategories(), getCities()]);
  const ai = await getAiProvider();
  const analysis = await ai.analyzeRequest(text, {
    categories: categories.map((c) => ({ id: c.id, slug: c.slug, name_ar: c.name_ar, keywords: c.keywords, subcategories: c.subcategories.map((s) => ({ id: s.id, slug: s.slug, name_ar: s.name_ar, keywords: s.keywords })) })),
    cities: cities.map((c) => ({ id: c.id, slug: c.slug, name_ar: c.name_ar })),
  });
  const cat = categories.find((c) => c.id === analysis.categoryId) ?? null;
  const sub = cat?.subcategories.find((s) => s.id === analysis.subcategoryId) ?? null;
  const city = cities.find((c) => c.id === analysis.cityId) ?? null;
  return {
    analysis,
    questions: buildQuestions(analysis, { categories, cities }, { isAuthenticated }),
    categoryName: cat?.name_ar ?? null,
    subcategoryName: sub?.name_ar ?? null,
    cityName: city?.name_ar ?? null,
  };
}

export interface CreateRequestInput {
  description: string;
  title?: string | null;
  categoryId: string;
  subcategoryId?: string | null;
  cityId: string;
  budgetMin: number | null;
  budgetMax: number | null;
  budgetLabel: string | null;
  timeline: string | null;
  urgency: 'normal' | 'urgent';
  projectType?: string | null;
  details: Record<string, unknown>;
  attachmentFileIds?: string[];
  aiMeta?: Record<string, unknown>;
}

export async function createRequest(customerId: string, input: CreateRequestInput): Promise<RequestRow> {
  const [categories, cities] = await Promise.all([getCategories(), getCities()]);
  const cat = categories.find((c) => c.id === input.categoryId);
  const sub = cat?.subcategories.find((s) => s.id === input.subcategoryId) ?? null;
  const city = cities.find((c) => c.id === input.cityId);
  if (!cat || !city) throw new Error('الفئة أو المدينة غير صحيحة');

  const ai = await getAiProvider();
  const title = (input.title || input.description.split(/[\n.،]/)[0]).trim().slice(0, 90);
  const summary = await ai.summarizeForSupplier({
    title, description: input.description, category: cat.name_ar, subcategory: sub?.name_ar ?? null, city: city.name_ar,
    budgetLabel: input.budgetLabel, timeline: input.timeline ? TIMELINE_LABELS[input.timeline] : null, urgency: input.urgency, details: input.details,
  });
  const windowDays = Number(await getSetting('requests.quotation_window_days'));
  const maxSuppliers = Number(await getSetting('matching.max_suppliers'));

  const [req] = await sql<RequestRow[]>`
    insert into public.requests (customer_id, category_id, subcategory_id, city_id, title, description, supplier_summary, budget_min, budget_max, budget_label,
      urgency, timeline, project_type, details, ai_meta, status, max_suppliers, quotation_deadline, published_at)
    values (${customerId}, ${cat.id}, ${sub?.id ?? null}, ${city.id}, ${title}, ${input.description.trim()}, ${summary}, ${input.budgetMin}, ${input.budgetMax},
      ${input.budgetLabel ?? budgetLabelFromNumbers(input.budgetMin, input.budgetMax)}, ${input.urgency}, ${input.timeline ?? null}, ${input.projectType ?? null},
      ${sql.json(input.details as never)}, ${sql.json((input.aiMeta ?? {}) as never)}, 'waiting_suppliers', ${maxSuppliers}, now() + (${windowDays} || ' days')::interval, now())
    returning *`;

  if (input.attachmentFileIds?.length) {
    for (const fileId of input.attachmentFileIds) {
      await sql`insert into public.request_attachments (request_id, file_id)
        select ${req.id}, id from public.files where id = ${fileId} and owner_id = ${customerId} and scope = 'request'`;
    }
  }
  await sql`update public.customer_profiles set requests_count = requests_count + 1 where user_id = ${customerId}`;
  await dispatchRequestToSuppliers(req.id);
  return req;
}

/** Runs matching, records invitations and notifies suppliers. Idempotent per supplier. */
export async function dispatchRequestToSuppliers(requestId: string): Promise<number> {
  const [req] = await sql<RequestRow[]>`select * from public.requests where id = ${requestId}`;
  if (!req) return 0;
  const matches = await findMatchingSuppliers(requestId);
  const limit = req.max_suppliers || 8;
  const chosen = matches.slice(0, limit);
  const [city] = await sql<{ name_ar: string }[]>`select name_ar from public.cities where id = ${req.city_id}`;
  let inserted = 0;
  for (const m of chosen) {
    const rows = await sql`insert into public.request_matches (request_id, supplier_id, score, reasons, notified_at)
      values (${requestId}, ${m.supplierId}, ${m.score}, ${sql.json(m.reasons)}, now())
      on conflict (request_id, supplier_id) do nothing returning id`;
    if (rows.length) {
      inserted++;
      await notify({
        userId: m.supplierId,
        type: 'new_request',
        title: `طلب جديد مناسب لخدماتك في ${city?.name_ar ?? 'مدينتك'}`,
        body: req.title,
        link: `/supplier/requests/${requestId}`,
        data: { requestId },
      });
    }
  }
  await sql`update public.requests set matched_count = (select count(*) from public.request_matches where request_id = ${requestId}) where id = ${requestId}`;
  return inserted;
}

export interface RequestListItem extends RequestRow {
  category_name: string | null;
  subcategory_name: string | null;
  city_name: string | null;
  unread_messages: number;
}

export async function listCustomerRequests(customerId: string, opts: { status?: RequestStatus[] } = {}): Promise<RequestListItem[]> {
  const statuses = opts.status;
  return sql<RequestListItem[]>`
    select r.*, c.name_ar as category_name, s.name_ar as subcategory_name, ci.name_ar as city_name,
      coalesce((select sum(cp.unread_count) from public.conversation_participants cp join public.conversations cv on cv.id = cp.conversation_id where cv.request_id = r.id and cp.user_id = ${customerId}), 0)::int as unread_messages
    from public.requests r
    left join public.categories c on c.id = r.category_id
    left join public.subcategories s on s.id = r.subcategory_id
    left join public.cities ci on ci.id = r.city_id
    where r.customer_id = ${customerId}
      ${statuses?.length ? sql`and r.status in ${sql(statuses)}` : sql``}
    order by r.created_at desc`;
}

export interface RequestDetail extends RequestListItem {
  attachments: { id: string; file_id: string; original_name: string; mime_type: string; size_bytes: number }[];
}

async function loadRequestDetail(requestId: string): Promise<RequestDetail | null> {
  const [r] = await sql<RequestListItem[]>`
    select r.*, c.name_ar as category_name, s.name_ar as subcategory_name, ci.name_ar as city_name, 0 as unread_messages
    from public.requests r
    left join public.categories c on c.id = r.category_id
    left join public.subcategories s on s.id = r.subcategory_id
    left join public.cities ci on ci.id = r.city_id
    where r.id = ${requestId}`;
  if (!r) return null;
  const attachments = await sql<RequestDetail['attachments']>`
    select ra.id, f.id as file_id, f.original_name, f.mime_type, f.size_bytes from public.request_attachments ra
    join public.files f on f.id = ra.file_id where ra.request_id = ${requestId} and f.moderation_status <> 'rejected' order by ra.created_at`;
  return { ...r, attachments };
}

/** Customer-side: full request (owner only). */
export async function getCustomerRequest(requestId: string, customerId: string): Promise<RequestDetail | null> {
  const r = await loadRequestDetail(requestId);
  if (!r || r.customer_id !== customerId) return null;
  return r;
}

/** Sanitized request view for suppliers: never includes customer identity. */
export type SupplierRequestView = Omit<RequestDetail, 'customer_id' | 'details'> & {
  details: Record<string, unknown>;
  match: { id: string; status: string; score: string; reasons: string[]; created_at: string };
  customer_label: string;
};

export async function getSupplierRequest(requestId: string, supplierId: string): Promise<SupplierRequestView | null> {
  const [match] = await sql<{ id: string; status: string; score: string; reasons: string[]; created_at: string }[]>`
    select id, status, score, reasons, created_at from public.request_matches where request_id = ${requestId} and supplier_id = ${supplierId}`;
  if (!match) return null;
  const r = await loadRequestDetail(requestId);
  if (!r) return null;
  if (match.status === 'invited') {
    await sql`update public.request_matches set status = 'viewed', viewed_at = now() where id = ${match.id}`;
    match.status = 'viewed';
  }
  // strip identity
  const { customer_id: _customerId, ...rest } = r;
  void _customerId;
  return { ...rest, details: r.details, match, customer_label: `عميل في ${r.city_name ?? 'السعودية'}` };
}

export interface SupplierFeedItem {
  request_id: string; reference_code: string; title: string; supplier_summary: string | null; status: RequestStatus; urgency: string;
  budget_label: string | null; timeline: string | null; created_at: string; quotation_deadline: string | null; category_name: string | null; city_name: string | null;
  match_status: string; match_score: string; quotations_count: number; has_quoted: boolean; published_at: string | null;
}

export async function listSupplierFeed(supplierId: string, opts: { onlyOpen?: boolean } = {}): Promise<SupplierFeedItem[]> {
  return sql<SupplierFeedItem[]>`
    select r.id as request_id, r.reference_code, r.title, r.supplier_summary, r.status, r.urgency, r.budget_label, r.timeline, r.created_at, r.quotation_deadline, r.published_at,
      c.name_ar as category_name, ci.name_ar as city_name, m.status as match_status, m.score as match_score, r.quotations_count,
      exists (select 1 from public.quotations q where q.request_id = r.id and q.supplier_id = ${supplierId} and q.status <> 'withdrawn') as has_quoted
    from public.request_matches m
    join public.requests r on r.id = m.request_id
    left join public.categories c on c.id = r.category_id
    left join public.cities ci on ci.id = r.city_id
    where m.supplier_id = ${supplierId}
      ${opts.onlyOpen ? sql`and r.status in ${sql(OPEN_REQUEST_STATUSES)}` : sql``}
    order by r.created_at desc`;
}

export async function cancelRequest(requestId: string, customerId: string, reason?: string) {
  const res = await sql`update public.requests set status = 'cancelled', closed_reason = ${reason ?? null}
    where id = ${requestId} and customer_id = ${customerId} and status in ('draft','waiting_suppliers','receiving_quotations','reviewing_quotations') returning id`;
  if (!res.length) throw new Error('لا يمكن إلغاء هذا الطلب في حالته الحالية');
  await sql`update public.quotations set status = 'expired' where request_id = ${requestId} and status in ('submitted','updated')`;
  const suppliers = await sql<{ supplier_id: string }[]>`select supplier_id from public.request_matches where request_id = ${requestId}`;
  for (const s of suppliers) {
    await notify({ userId: s.supplier_id, type: 'request_cancelled', title: 'تم إلغاء طلب كنت مدعوًا له', link: `/supplier/requests/${requestId}` });
  }
}

export async function closeQuotationWindow(requestId: string, customerId: string) {
  const res = await sql`update public.requests set status = 'reviewing_quotations'
    where id = ${requestId} and customer_id = ${customerId} and status in ('waiting_suppliers','receiving_quotations') returning id`;
  if (!res.length) throw new Error('تعذّر إغلاق استقبال العروض');
}

export async function completeRequest(requestId: string, customerId: string) {
  const res = await sql`update public.requests set status = 'closed', completed_at = now()
    where id = ${requestId} and customer_id = ${customerId} and status = 'supplier_selected' returning selected_supplier_id`;
  if (!res.length) throw new Error('لا يمكن إكمال الطلب قبل اختيار مزود');
  const supplierId = (res[0] as { selected_supplier_id: string | null }).selected_supplier_id;
  if (supplierId) {
    await sql`update public.supplier_profiles set completed_count = completed_count + 1 where user_id = ${supplierId}`;
    await notify({ userId: supplierId, type: 'project_completed', title: 'تم تأكيد اكتمال المشروع من العميل', link: `/supplier/requests/${requestId}` });
  }
  await notify({ userId: customerId, type: 'review_prompt', title: 'كيف كانت تجربتك مع المزود؟ قيّمه الآن', link: `/dashboard/requests/${requestId}#review` });
}

/** Called opportunistically to move requests past their deadline into review. */
export async function expireQuotationWindows() {
  await sql`update public.requests set status = 'reviewing_quotations'
    where status in ('waiting_suppliers','receiving_quotations') and quotation_deadline < now() and quotations_count > 0`;
}

export async function addRequestAttachments(requestId: string, customerId: string, fileIds: string[]) {
  const [r] = await sql<{ id: string }[]>`select id from public.requests where id = ${requestId} and customer_id = ${customerId}`;
  if (!r) throw new Error('غير مصرح');
  for (const fileId of fileIds) {
    await sql`insert into public.request_attachments (request_id, file_id)
      select ${requestId}, id from public.files where id = ${fileId} and owner_id = ${customerId} and scope = 'request'
      and not exists (select 1 from public.request_attachments ra where ra.request_id = ${requestId} and ra.file_id = ${fileId})`;
  }
}
