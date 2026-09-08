import 'server-only';
import { sql } from '@/lib/db';
import { computeLeadPrice } from './pricing';
import { getSetting } from '@/lib/settings';
import { notify } from '@/lib/notifications/service';

/**
 * Customer chooses a quotation. Creates a pending selection (lead), marks
 * the request as supplier_selected and notifies the supplier. The customer's
 * contact details stay locked until the supplier unlocks the lead.
 */
export async function selectSupplier(customerId: string, quotationId: string) {
  const [q] = await sql<{ id: string; request_id: string; supplier_id: string; price: string; status: string }[]>`select id, request_id, supplier_id, price, status from public.quotations where id = ${quotationId}`;
  if (!q) throw new Error('العرض غير موجود');
  const [req] = await sql<{ customer_id: string; status: string; category_id: string | null; title: string; selected_supplier_id: string | null }[]>`
    select customer_id, status, category_id, title, selected_supplier_id from public.requests where id = ${q.request_id}`;
  if (!req || req.customer_id !== customerId) throw new Error('غير مصرح');
  if (req.selected_supplier_id) throw new Error('تم اختيار مزود لهذا الطلب مسبقًا');
  if (!['waiting_suppliers', 'receiving_quotations', 'reviewing_quotations'].includes(req.status)) throw new Error('لا يمكن اختيار مزود في حالة الطلب الحالية');
  if (['withdrawn', 'expired'].includes(q.status)) throw new Error('هذا العرض لم يعد متاحًا');

  const { price, rule } = await computeLeadPrice({ categoryId: req.category_id, projectValue: Number(q.price) });
  const expiryDays = Number(await getSetting('selection.unlock_expiry_days'));

  const selection = await sql.begin(async (tx) => {
    const [s] = await tx<{ id: string }[]>`insert into public.supplier_selections (request_id, quotation_id, supplier_id, customer_id, lead_price, pricing_rule_id, expires_at)
      values (${q.request_id}, ${q.id}, ${q.supplier_id}, ${customerId}, ${price}, ${rule?.id ?? null}, now() + (${expiryDays} || ' days')::interval) returning id`;
    await tx`update public.requests set status = 'supplier_selected', selected_quotation_id = ${q.id}, selected_supplier_id = ${q.supplier_id} where id = ${q.request_id}`;
    await tx`update public.quotations set status = 'selected' where id = ${q.id}`;
    await tx`update public.quotations set status = 'rejected' where request_id = ${q.request_id} and id <> ${q.id} and status in ('submitted','updated')`;
    await tx`update public.request_matches set status = 'expired' where request_id = ${q.request_id} and supplier_id <> ${q.supplier_id} and status in ('invited','viewed')`;
    return s;
  });

  await notify({
    userId: q.supplier_id,
    type: 'selected',
    title: 'مبروك! العميل اختار عرضك ويرغب بالتواصل معك.',
    body: `افتح بيانات التواصل مقابل ${price} ر.س — ${req.title}`,
    link: `/supplier/leads/${selection.id}`,
    data: { selectionId: selection.id, requestId: q.request_id },
  });
  const others = await sql<{ supplier_id: string }[]>`select supplier_id from public.quotations where request_id = ${q.request_id} and supplier_id <> ${q.supplier_id} and status = 'rejected'`;
  for (const o of others) {
    await notify({ userId: o.supplier_id, type: 'not_selected', title: 'العميل اختار عرضًا آخر لهذا الطلب', body: req.title, link: `/supplier/quotations` });
  }
  return { selectionId: selection.id, leadPrice: price };
}

export interface SelectionView {
  id: string; request_id: string; quotation_id: string; supplier_id: string; customer_id: string; lead_price: string; status: string; expires_at: string | null; created_at: string;
  request_title: string; reference_code: string; city_name: string | null; category_name: string | null; quotation_price: string; request_status: string;
}

export async function getSelectionForSupplier(selectionId: string, supplierId: string): Promise<SelectionView | null> {
  const [s] = await sql<SelectionView[]>`
    select ss.*, r.title as request_title, r.reference_code, r.status as request_status, ci.name_ar as city_name, c.name_ar as category_name, q.price as quotation_price
    from public.supplier_selections ss
    join public.requests r on r.id = ss.request_id
    join public.quotations q on q.id = ss.quotation_id
    left join public.cities ci on ci.id = r.city_id
    left join public.categories c on c.id = r.category_id
    where ss.id = ${selectionId} and ss.supplier_id = ${supplierId}`;
  return s ?? null;
}

export async function listSupplierSelections(supplierId: string): Promise<SelectionView[]> {
  return sql<SelectionView[]>`
    select ss.*, r.title as request_title, r.reference_code, r.status as request_status, ci.name_ar as city_name, c.name_ar as category_name, q.price as quotation_price
    from public.supplier_selections ss
    join public.requests r on r.id = ss.request_id
    join public.quotations q on q.id = ss.quotation_id
    left join public.cities ci on ci.id = r.city_id
    left join public.categories c on c.id = r.category_id
    where ss.supplier_id = ${supplierId} order by ss.created_at desc`;
}
