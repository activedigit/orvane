import 'server-only';
import { sql } from '@/lib/db';
import { notify } from '@/lib/notifications/service';
import { recomputeSupplierRating } from './reviews';

export async function adminOverview() {
  const [k] = await sql<{ requests: number; quotations: number; avg_quotes: string; suppliers: number; customers: number; revenue: string; unlock_rate: string; selection_rate: string; open_reports: number; pending_verifications: number }[]>`
    select
      (select count(*) from public.requests where status <> 'draft')::int as requests,
      (select count(*) from public.quotations where status <> 'withdrawn')::int as quotations,
      (select coalesce(round(avg(quotations_count), 1), 0) from public.requests where status <> 'draft') as avg_quotes,
      (select count(*) from public.users where role = 'supplier')::int as suppliers,
      (select count(*) from public.users where role = 'customer')::int as customers,
      (select coalesce(sum(amount), 0) from public.payments where status = 'succeeded') as revenue,
      (select case when count(*) = 0 then 0 else round(100.0 * count(*) filter (where status = 'unlocked') / count(*)) end from public.supplier_selections) as unlock_rate,
      (select case when count(*) = 0 then 0 else round(100.0 * count(*) filter (where selected_supplier_id is not null) / count(*)) end from public.requests where status <> 'draft') as selection_rate,
      (select count(*) from public.reports where status in ('open','reviewing'))::int as open_reports,
      (select count(*) from public.supplier_profiles where verification_status in ('pending','under_review'))::int as pending_verifications`;
  return k;
}

export async function adminFunnel() {
  const [f] = await sql<{ created: number; dispatched: number; quoted: number; selected: number; unlocked: number; completed: number }[]>`
    select
      (select count(*) from public.requests where status <> 'draft')::int as created,
      (select count(*) from public.requests where status <> 'draft' and matched_count > 0)::int as dispatched,
      (select count(*) from public.requests where status <> 'draft' and quotations_count > 0)::int as quoted,
      (select count(*) from public.requests where selected_supplier_id is not null)::int as selected,
      (select count(*) from public.requests where unlocked_at is not null)::int as unlocked,
      (select count(*) from public.requests where status = 'closed')::int as completed`;
  return f;
}

export async function adminRevenueByCategory() {
  return sql<{ name_ar: string; revenue: string; unlocks: number }[]>`
    select c.name_ar, coalesce(sum(lu.price), 0) as revenue, count(lu.id)::int as unlocks
    from public.lead_unlocks lu join public.requests r on r.id = lu.request_id join public.categories c on c.id = r.category_id
    group by c.name_ar order by revenue desc`;
}
export async function adminRevenueByCity() {
  return sql<{ name_ar: string; revenue: string; unlocks: number }[]>`
    select ci.name_ar, coalesce(sum(lu.price), 0) as revenue, count(lu.id)::int as unlocks
    from public.lead_unlocks lu join public.requests r on r.id = lu.request_id join public.cities ci on ci.id = r.city_id
    group by ci.name_ar order by revenue desc`;
}
export async function adminTopSuppliers(limit = 10) {
  return sql<{ user_id: string; company_name: string; won_count: number; quotations_count: number; rating_avg: string; revenue: string }[]>`
    select sp.user_id, sp.company_name, sp.won_count, sp.quotations_count, sp.rating_avg, coalesce((select sum(price) from public.lead_unlocks lu where lu.supplier_id = sp.user_id), 0) as revenue
    from public.supplier_profiles sp order by sp.won_count desc, sp.quotations_count desc limit ${limit}`;
}
export async function adminTopCategories(limit = 10) {
  return sql<{ name_ar: string; requests: number; quotations: number }[]>`
    select c.name_ar, count(r.id)::int as requests, coalesce(sum(r.quotations_count), 0)::int as quotations
    from public.categories c left join public.requests r on r.category_id = c.id and r.status <> 'draft'
    group by c.name_ar order by requests desc limit ${limit}`;
}

export interface AdminUserRow { id: string; email: string | null; phone: string | null; full_name: string; role: string; status: string; created_at: string; last_seen_at: string | null; company_name: string | null; verification_status: string | null }
export async function adminListUsers(opts: { role?: string; status?: string; q?: string; limit?: number } = {}) {
  const q = opts.q ? `%${opts.q}%` : null;
  return sql<AdminUserRow[]>`
    select u.id, u.email, u.phone, u.full_name, u.role, u.status, u.created_at, u.last_seen_at, sp.company_name, sp.verification_status
    from public.users u left join public.supplier_profiles sp on sp.user_id = u.id
    where true ${opts.role ? sql`and u.role = ${opts.role}` : sql``} ${opts.status ? sql`and u.status = ${opts.status}` : sql``}
      ${q ? sql`and (u.full_name ilike ${q} or u.email ilike ${q} or coalesce(sp.company_name,'') ilike ${q})` : sql``}
    order by u.created_at desc limit ${opts.limit ?? 200}`;
}

export async function adminSetUserStatus(adminId: string, userId: string, status: 'active' | 'blocked', reason?: string) {
  await sql`update public.users set status = ${status}, blocked_reason = ${status === 'blocked' ? reason ?? null : null} where id = ${userId} and role <> 'admin'`;
  await sql`insert into public.security_events (user_id, event_type, severity, details) values (${userId}, ${status === 'blocked' ? 'user_blocked' : 'user_unblocked'}, 'high', ${sql.json({ by: adminId, reason: reason ?? null })})`;
}

export async function adminSetVerification(adminId: string, supplierId: string, status: 'verified' | 'rejected' | 'under_review' | 'pending', note?: string) {
  await sql`update public.supplier_profiles set verification_status = ${status}, verified_at = ${status === 'verified' ? sql`now()` : null} where user_id = ${supplierId}`;
  if (status === 'verified' || status === 'rejected') {
    await sql`update public.verification_documents set status = ${status === 'verified' ? 'approved' : 'rejected'}, reviewed_by = ${adminId}, review_note = ${note ?? null}, reviewed_at = now() where supplier_id = ${supplierId} and status = 'pending'`;
  }
  await notify({
    userId: supplierId,
    type: 'verification',
    title: status === 'verified' ? 'تم توثيق حسابك بنجاح، ستبدأ باستقبال الطلبات المناسبة' : status === 'rejected' ? 'لم يتم قبول طلب التوثيق' : 'طلب التوثيق قيد المراجعة',
    body: note ?? null,
    link: '/supplier/profile',
  });
}

export async function adminGrantCredits(adminId: string, supplierId: string, amount: number, note?: string) {
  await sql.begin(async (tx) => {
    const [upd] = await tx<{ credits_balance: number }[]>`update public.supplier_profiles set credits_balance = credits_balance + ${amount} where user_id = ${supplierId} returning credits_balance`;
    if (!upd) throw new Error('المزود غير موجود');
    await tx`insert into public.credits (supplier_id, amount, balance_after, reason, note, created_by) values (${supplierId}, ${amount}, ${upd.credits_balance}, ${amount >= 0 ? 'promo' : 'admin_grant'}, ${note ?? null}, ${adminId})`;
  });
  await notify({ userId: supplierId, type: 'credits', title: amount >= 0 ? `تمت إضافة ${amount} نقطة ترويجية لرصيدك` : 'تم تعديل رصيد نقاطك', body: note ?? null, link: '/supplier/credits' });
}

export async function adminListRequests(opts: { status?: string; q?: string; limit?: number } = {}) {
  const q = opts.q ? `%${opts.q}%` : null;
  return sql<{ id: string; reference_code: string; title: string; status: string; created_at: string; quotations_count: number; matched_count: number; customer_name: string; category_name: string | null; city_name: string | null; budget_label: string | null; unlocked_at: string | null }[]>`
    select r.id, r.reference_code, r.title, r.status, r.created_at, r.quotations_count, r.matched_count, u.full_name as customer_name, c.name_ar as category_name, ci.name_ar as city_name, r.budget_label, r.unlocked_at
    from public.requests r join public.users u on u.id = r.customer_id left join public.categories c on c.id = r.category_id left join public.cities ci on ci.id = r.city_id
    where true ${opts.status ? sql`and r.status = ${opts.status}` : sql``} ${q ? sql`and (r.title ilike ${q} or r.reference_code ilike ${q} or u.full_name ilike ${q})` : sql``}
    order by r.created_at desc limit ${opts.limit ?? 200}`;
}

export async function adminRequestDetail(requestId: string) {
  const [r] = await sql<Record<string, unknown>[]>`
    select r.*, u.full_name as customer_name, u.email as customer_email, u.phone as customer_phone, c.name_ar as category_name, ci.name_ar as city_name
    from public.requests r join public.users u on u.id = r.customer_id left join public.categories c on c.id = r.category_id left join public.cities ci on ci.id = r.city_id where r.id = ${requestId}`;
  if (!r) return null;
  const matches = await sql<{ supplier_id: string; company_name: string; status: string; score: string; reasons: string[]; created_at: string }[]>`
    select m.supplier_id, sp.company_name, m.status, m.score, m.reasons, m.created_at from public.request_matches m join public.supplier_profiles sp on sp.user_id = m.supplier_id where m.request_id = ${requestId} order by m.score desc`;
  const quotations = await sql<{ id: string; supplier_id: string; company_name: string; price: string; delivery_days: number | null; status: string; submitted_at: string }[]>`
    select q.id, q.supplier_id, sp.company_name, q.price, q.delivery_days, q.status, q.submitted_at from public.quotations q join public.supplier_profiles sp on sp.user_id = q.supplier_id where q.request_id = ${requestId} order by q.submitted_at`;
  const conversations = await sql<{ id: string; supplier_id: string; company_name: string; status: string; last_message_at: string | null }[]>`
    select c.id, c.supplier_id, sp.company_name, c.status, c.last_message_at from public.conversations c join public.supplier_profiles sp on sp.user_id = c.supplier_id where c.request_id = ${requestId}`;
  return { request: r, matches, quotations, conversations };
}

export async function adminListQuotations(limit = 200) {
  return sql<{ id: string; price: string; status: string; submitted_at: string; delivery_days: number | null; company_name: string; request_title: string; request_id: string; reference_code: string; is_featured: boolean }[]>`
    select q.id, q.price, q.status, q.submitted_at, q.delivery_days, q.is_featured, sp.company_name, r.title as request_title, r.id as request_id, r.reference_code
    from public.quotations q join public.supplier_profiles sp on sp.user_id = q.supplier_id join public.requests r on r.id = q.request_id order by q.submitted_at desc limit ${limit}`;
}

export async function adminListConversations(limit = 200) {
  return sql<{ id: string; status: string; last_message_at: string | null; last_message_preview: string | null; request_title: string; reference_code: string; customer_name: string; company_name: string; filtered_count: number }[]>`
    select c.id, c.status, c.last_message_at, c.last_message_preview, r.title as request_title, r.reference_code, u.full_name as customer_name, sp.company_name,
      (select count(*) from public.messages m where m.conversation_id = c.id and m.was_filtered)::int as filtered_count
    from public.conversations c join public.requests r on r.id = c.request_id join public.users u on u.id = c.customer_id join public.supplier_profiles sp on sp.user_id = c.supplier_id
    order by c.last_message_at desc nulls last limit ${limit}`;
}

export async function adminListPayments(limit = 200) {
  return sql<{ id: string; amount: string; purpose: string; status: string; gateway: string; payment_method: string | null; created_at: string; paid_at: string | null; user_name: string; company_name: string | null }[]>`
    select p.id, p.amount, p.purpose, p.status, p.gateway, p.payment_method, p.created_at, p.paid_at, u.full_name as user_name, sp.company_name
    from public.payments p join public.users u on u.id = p.user_id left join public.supplier_profiles sp on sp.user_id = p.user_id order by p.created_at desc limit ${limit}`;
}

export async function adminListPricingRules() {
  return sql<{ id: string; name_ar: string; category_id: string | null; category_name: string | null; min_project_value: string | null; max_project_value: string | null; price: string; priority: number; is_active: boolean }[]>`
    select r.*, c.name_ar as category_name from public.lead_pricing_rules r left join public.categories c on c.id = r.category_id order by r.priority desc, r.created_at`;
}
export async function adminUpsertPricingRule(input: { id?: string; nameAr: string; categoryId: string | null; minValue: number | null; maxValue: number | null; price: number; priority: number; isActive: boolean }) {
  if (input.id) {
    await sql`update public.lead_pricing_rules set name_ar = ${input.nameAr}, category_id = ${input.categoryId}, min_project_value = ${input.minValue}, max_project_value = ${input.maxValue}, price = ${input.price}, priority = ${input.priority}, is_active = ${input.isActive} where id = ${input.id}`;
  } else {
    await sql`insert into public.lead_pricing_rules (name_ar, category_id, min_project_value, max_project_value, price, priority, is_active) values (${input.nameAr}, ${input.categoryId}, ${input.minValue}, ${input.maxValue}, ${input.price}, ${input.priority}, ${input.isActive})`;
  }
}
export async function adminDeletePricingRule(id: string) {
  await sql`delete from public.lead_pricing_rules where id = ${id}`;
}

export async function adminListSubscriptions() {
  return sql<{ id: string; status: string; starts_at: string; ends_at: string; included_leads: number; used_leads: number; company_name: string; plan_name: string }[]>`
    select s.id, s.status, s.starts_at, s.ends_at, s.included_leads, s.used_leads, sp.company_name, p.name_ar as plan_name
    from public.subscriptions s join public.supplier_profiles sp on sp.user_id = s.supplier_id join public.subscription_plans p on p.id = s.plan_id order by s.created_at desc limit 200`;
}
export async function adminUpsertPlan(input: { id?: string; slug: string; nameAr: string; descriptionAr: string | null; priceMonthly: number; includedLeads: number; features: string[]; isActive: boolean; sortOrder: number }) {
  if (input.id) {
    await sql`update public.subscription_plans set slug = ${input.slug}, name_ar = ${input.nameAr}, description_ar = ${input.descriptionAr}, price_monthly = ${input.priceMonthly}, included_leads = ${input.includedLeads}, features = ${sql.json(input.features)}, is_active = ${input.isActive}, sort_order = ${input.sortOrder} where id = ${input.id}`;
  } else {
    await sql`insert into public.subscription_plans (slug, name_ar, description_ar, price_monthly, included_leads, features, is_active, sort_order) values (${input.slug}, ${input.nameAr}, ${input.descriptionAr}, ${input.priceMonthly}, ${input.includedLeads}, ${sql.json(input.features)}, ${input.isActive}, ${input.sortOrder})`;
  }
}

export async function adminListReviews() {
  return sql<{ id: string; overall: number; comment: string | null; status: string; created_at: string; company_name: string; customer_name: string; request_title: string; supplier_id: string }[]>`
    select r.id, r.overall, r.comment, r.status, r.created_at, sp.company_name, u.full_name as customer_name, rq.title as request_title, r.supplier_id
    from public.reviews r join public.supplier_profiles sp on sp.user_id = r.supplier_id join public.users u on u.id = r.customer_id join public.requests rq on rq.id = r.request_id order by r.created_at desc limit 200`;
}
export async function adminSetReviewStatus(id: string, status: 'published' | 'hidden') {
  const [r] = await sql<{ supplier_id: string }[]>`update public.reviews set status = ${status} where id = ${id} returning supplier_id`;
  if (r) await recomputeSupplierRating(r.supplier_id);
}

export async function adminListReports() {
  return sql<{ id: string; reason: string; details: string | null; status: string; admin_note: string | null; created_at: string; reporter_name: string | null; reported_name: string | null; request_id: string | null; conversation_id: string | null }[]>`
    select r.id, r.reason, r.details, r.status, r.admin_note, r.created_at, a.full_name as reporter_name, b.full_name as reported_name, r.request_id, r.conversation_id
    from public.reports r left join public.users a on a.id = r.reporter_id left join public.users b on b.id = r.reported_user_id order by r.created_at desc limit 200`;
}
export async function adminResolveReport(adminId: string, id: string, status: 'reviewing' | 'resolved' | 'dismissed', note?: string) {
  await sql`update public.reports set status = ${status}, admin_note = ${note ?? null}, resolved_by = ${adminId}, resolved_at = ${status === 'reviewing' ? null : sql`now()`} where id = ${id}`;
}

export async function adminModerationLogs(limit = 200) {
  return sql<{ id: string; kind: string; action: string; detections: unknown; original_excerpt: string | null; created_at: string; user_name: string | null; conversation_id: string | null }[]>`
    select m.id, m.kind, m.action, m.detections, m.original_excerpt, m.created_at, u.full_name as user_name, m.conversation_id
    from public.moderation_logs m left join public.users u on u.id = m.user_id order by m.created_at desc limit ${limit}`;
}
export async function adminSecurityEvents(limit = 200) {
  return sql<{ id: string; event_type: string; severity: string; ip: string | null; details: unknown; created_at: string; user_name: string | null }[]>`
    select e.id, e.event_type, e.severity, e.ip, e.details, e.created_at, u.full_name as user_name from public.security_events e left join public.users u on u.id = e.user_id order by e.created_at desc limit ${limit}`;
}

export async function adminListVerificationQueue() {
  return sql<{ user_id: string; company_name: string; verification_status: string; created_at: string; full_name: string; email: string | null; commercial_register: string | null; docs: number }[]>`
    select sp.user_id, sp.company_name, sp.verification_status, sp.created_at, u.full_name, u.email, sp.commercial_register,
      (select count(*) from public.verification_documents d where d.supplier_id = sp.user_id)::int as docs
    from public.supplier_profiles sp join public.users u on u.id = sp.user_id order by case sp.verification_status when 'under_review' then 0 when 'pending' then 1 else 2 end, sp.created_at desc`;
}

export async function adminBroadcast(adminId: string, input: { audience: 'all' | 'customers' | 'suppliers'; title: string; body: string; link?: string | null }) {
  const users = await sql<{ id: string }[]>`select id from public.users where status = 'active' and role <> 'admin' ${input.audience === 'customers' ? sql`and role = 'customer'` : input.audience === 'suppliers' ? sql`and role = 'supplier'` : sql``}`;
  for (const u of users) await notify({ userId: u.id, type: 'announcement', title: input.title, body: input.body, link: input.link ?? null, data: { by: adminId } });
  return users.length;
}

export async function adminUpsertCategory(input: { id?: string; slug: string; nameAr: string; descriptionAr: string | null; icon: string | null; keywords: string[]; sortOrder: number; isActive: boolean }) {
  if (input.id) {
    await sql`update public.categories set slug = ${input.slug}, name_ar = ${input.nameAr}, description_ar = ${input.descriptionAr}, icon = ${input.icon}, keywords = ${input.keywords}, sort_order = ${input.sortOrder}, is_active = ${input.isActive} where id = ${input.id}`;
  } else {
    await sql`insert into public.categories (slug, name_ar, description_ar, icon, keywords, sort_order, is_active) values (${input.slug}, ${input.nameAr}, ${input.descriptionAr}, ${input.icon}, ${input.keywords}, ${input.sortOrder}, ${input.isActive})`;
  }
}
export async function adminUpsertSubcategory(input: { id?: string; categoryId: string; slug: string; nameAr: string; keywords: string[]; sortOrder: number; isActive: boolean }) {
  if (input.id) {
    await sql`update public.subcategories set category_id = ${input.categoryId}, slug = ${input.slug}, name_ar = ${input.nameAr}, keywords = ${input.keywords}, sort_order = ${input.sortOrder}, is_active = ${input.isActive} where id = ${input.id}`;
  } else {
    await sql`insert into public.subcategories (category_id, slug, name_ar, keywords, sort_order, is_active) values (${input.categoryId}, ${input.slug}, ${input.nameAr}, ${input.keywords}, ${input.sortOrder}, ${input.isActive})`;
  }
}
export async function adminUpsertCity(input: { id?: string; slug: string; nameAr: string; regionAr: string | null; sortOrder: number; isActive: boolean }) {
  if (input.id) {
    await sql`update public.cities set slug = ${input.slug}, name_ar = ${input.nameAr}, region_ar = ${input.regionAr}, sort_order = ${input.sortOrder}, is_active = ${input.isActive} where id = ${input.id}`;
  } else {
    await sql`insert into public.cities (slug, name_ar, region_ar, sort_order, is_active) values (${input.slug}, ${input.nameAr}, ${input.regionAr}, ${input.sortOrder}, ${input.isActive})`;
  }
}
export async function adminAllCategories() {
  const cats = await sql<{ id: string; slug: string; name_ar: string; description_ar: string | null; icon: string | null; keywords: string[]; sort_order: number; is_active: boolean }[]>`select * from public.categories order by sort_order, name_ar`;
  const subs = await sql<{ id: string; category_id: string; slug: string; name_ar: string; keywords: string[]; sort_order: number; is_active: boolean }[]>`select * from public.subcategories order by sort_order, name_ar`;
  return cats.map((c) => ({ ...c, subcategories: subs.filter((s) => s.category_id === c.id) }));
}
export async function adminAllCities() {
  return sql<{ id: string; slug: string; name_ar: string; region_ar: string | null; sort_order: number; is_active: boolean }[]>`select * from public.cities order by sort_order, name_ar`;
}
export async function adminSettingsRows() {
  return sql<{ key: string; value: unknown; description_ar: string | null; updated_at: string }[]>`select key, value, description_ar, updated_at from public.admin_settings order by key`;
}
export async function adminMessagesForConversation(conversationId: string) {
  return sql<{ id: string; sender_name: string | null; kind: string; body: string; was_filtered: boolean; created_at: string }[]>`
    select m.id, u.full_name as sender_name, m.kind, m.body, m.was_filtered, m.created_at from public.messages m left join public.users u on u.id = m.sender_id where m.conversation_id = ${conversationId} order by m.created_at`;
}
