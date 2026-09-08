import 'server-only';
import { sql } from '@/lib/db';

export async function customerStats(customerId: string) {
  const [r] = await sql<{ active_requests: number; new_quotations: number; new_messages: number; completed_requests: number }[]>`
    select
      (select count(*) from public.requests where customer_id = ${customerId} and status in ('waiting_suppliers','receiving_quotations','reviewing_quotations','supplier_selected'))::int as active_requests,
      (select count(*) from public.quotations q join public.requests r on r.id = q.request_id where r.customer_id = ${customerId} and q.status in ('submitted','updated') and q.submitted_at > now() - interval '7 days')::int as new_quotations,
      (select coalesce(sum(unread_count), 0) from public.conversation_participants where user_id = ${customerId})::int as new_messages,
      (select count(*) from public.requests where customer_id = ${customerId} and status = 'closed')::int as completed_requests`;
  return r;
}

export async function supplierStats(supplierId: string) {
  const [r] = await sql<{ new_requests: number; sent_quotations: number; selected_by_customers: number; win_rate: number; pipeline_value: string; credits_balance: number; unread_messages: number; pending_leads: number }[]>`
    select
      (select count(*) from public.request_matches m join public.requests r on r.id = m.request_id where m.supplier_id = ${supplierId} and m.status in ('invited','viewed') and r.status in ('waiting_suppliers','receiving_quotations'))::int as new_requests,
      (select count(*) from public.quotations where supplier_id = ${supplierId} and status <> 'withdrawn')::int as sent_quotations,
      (select count(*) from public.supplier_selections where supplier_id = ${supplierId})::int as selected_by_customers,
      (select case when count(*) = 0 then 0 else round(100.0 * count(*) filter (where status = 'selected') / count(*)) end from public.quotations where supplier_id = ${supplierId} and status <> 'withdrawn')::int as win_rate,
      (select coalesce(sum(q.price), 0) from public.quotations q join public.requests r on r.id = q.request_id where q.supplier_id = ${supplierId} and q.status in ('submitted','updated') and r.status in ('waiting_suppliers','receiving_quotations','reviewing_quotations')) as pipeline_value,
      (select credits_balance from public.supplier_profiles where user_id = ${supplierId}) as credits_balance,
      (select coalesce(sum(unread_count), 0) from public.conversation_participants where user_id = ${supplierId})::int as unread_messages,
      (select count(*) from public.supplier_selections where supplier_id = ${supplierId} and status = 'pending_unlock')::int as pending_leads`;
  return r;
}

export async function supplierPayments(supplierId: string) {
  return sql<{ id: string; amount: string; purpose: string; status: string; payment_method: string | null; gateway: string; created_at: string; paid_at: string | null }[]>`
    select id, amount, purpose, status, payment_method, gateway, created_at, paid_at from public.payments where user_id = ${supplierId} order by created_at desc limit 100`;
}
export async function supplierCredits(supplierId: string) {
  return sql<{ id: string; amount: number; balance_after: number; reason: string; note: string | null; created_at: string }[]>`
    select id, amount, balance_after, reason, note, created_at from public.credits where supplier_id = ${supplierId} order by created_at desc limit 100`;
}
export async function supplierSubscription(supplierId: string) {
  const [s] = await sql<{ id: string; status: string; starts_at: string; ends_at: string; included_leads: number; used_leads: number; plan_name: string; price_monthly: string }[]>`
    select s.id, s.status, s.starts_at, s.ends_at, s.included_leads, s.used_leads, p.name_ar as plan_name, p.price_monthly
    from public.subscriptions s join public.subscription_plans p on p.id = s.plan_id where s.supplier_id = ${supplierId} and s.status = 'active' and s.ends_at > now() order by s.ends_at desc limit 1`;
  return s ?? null;
}
export async function listPlans() {
  return sql<{ id: string; slug: string; name_ar: string; description_ar: string | null; price_monthly: string; included_leads: number; features: string[]; sort_order: number }[]>`
    select id, slug, name_ar, description_ar, price_monthly, included_leads, features, sort_order from public.subscription_plans where is_active order by sort_order`;
}
