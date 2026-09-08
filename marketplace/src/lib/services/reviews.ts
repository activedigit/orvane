import 'server-only';
import { sql } from '@/lib/db';
import { notify } from '@/lib/notifications/service';
import { filterContactInfo } from '@/lib/moderation/text-filter';

export interface ReviewInput { quality: number; communication: number; priceAccuracy: number; deliveryTime: number; overall: number; comment?: string | null }

export async function createReview(customerId: string, requestId: string, input: ReviewInput) {
  const [req] = await sql<{ customer_id: string; selected_supplier_id: string | null; status: string; unlocked_at: string | null }[]>`
    select customer_id, selected_supplier_id, status, unlocked_at from public.requests where id = ${requestId}`;
  if (!req || req.customer_id !== customerId) throw new Error('غير مصرح');
  if (!req.selected_supplier_id || !req.unlocked_at) throw new Error('يمكن التقييم بعد اكتمال التعاقد مع المزود');
  const vals = [input.quality, input.communication, input.priceAccuracy, input.deliveryTime, input.overall];
  if (vals.some((v) => !Number.isInteger(v) || v < 1 || v > 5)) throw new Error('قيم التقييم يجب أن تكون بين 1 و 5');
  const comment = input.comment ? filterContactInfo(input.comment).text.slice(0, 1000) : null;
  const supplierId = req.selected_supplier_id;
  await sql`insert into public.reviews (request_id, supplier_id, customer_id, quality, communication, price_accuracy, delivery_time, overall, comment)
    values (${requestId}, ${supplierId}, ${customerId}, ${input.quality}, ${input.communication}, ${input.priceAccuracy}, ${input.deliveryTime}, ${input.overall}, ${comment})
    on conflict (request_id, supplier_id) do update set quality = excluded.quality, communication = excluded.communication, price_accuracy = excluded.price_accuracy,
      delivery_time = excluded.delivery_time, overall = excluded.overall, comment = excluded.comment`;
  await recomputeSupplierRating(supplierId);
  if (req.status === 'supplier_selected') {
    await sql`update public.requests set status = 'closed', completed_at = coalesce(completed_at, now()) where id = ${requestId}`;
    await sql`update public.supplier_profiles set completed_count = completed_count + 1 where user_id = ${supplierId}`;
  }
  await notify({ userId: supplierId, type: 'new_review', title: 'وصلك تقييم جديد من عميل', link: '/supplier/reviews' });
}

export async function recomputeSupplierRating(supplierId: string) {
  await sql`update public.supplier_profiles sp set
    rating_avg = coalesce((select round(avg(overall)::numeric, 2) from public.reviews r where r.supplier_id = ${supplierId} and r.status = 'published'), 0),
    rating_count = (select count(*) from public.reviews r where r.supplier_id = ${supplierId} and r.status = 'published')
    where sp.user_id = ${supplierId}`;
}

export async function getReviewForRequest(requestId: string, customerId: string) {
  const [r] = await sql<{ id: string; overall: number; quality: number; communication: number; price_accuracy: number; delivery_time: number; comment: string | null }[]>`
    select id, overall, quality, communication, price_accuracy, delivery_time, comment from public.reviews where request_id = ${requestId} and customer_id = ${customerId}`;
  return r ?? null;
}

export async function listCustomerReviews(customerId: string) {
  return sql<{ id: string; overall: number; comment: string | null; created_at: string; request_title: string; company_name: string; request_id: string }[]>`
    select r.id, r.overall, r.comment, r.created_at, rq.title as request_title, sp.company_name, r.request_id
    from public.reviews r join public.requests rq on rq.id = r.request_id join public.supplier_profiles sp on sp.user_id = r.supplier_id
    where r.customer_id = ${customerId} order by r.created_at desc`;
}

export async function listSupplierReviews(supplierId: string) {
  return sql<{ id: string; overall: number; quality: number; communication: number; price_accuracy: number; delivery_time: number; comment: string | null; created_at: string; request_title: string; customer_name: string }[]>`
    select r.id, r.overall, r.quality, r.communication, r.price_accuracy, r.delivery_time, r.comment, r.created_at, rq.title as request_title, split_part(u.full_name, ' ', 1) as customer_name
    from public.reviews r join public.requests rq on rq.id = r.request_id join public.users u on u.id = r.customer_id
    where r.supplier_id = ${supplierId} and r.status = 'published' order by r.created_at desc`;
}
