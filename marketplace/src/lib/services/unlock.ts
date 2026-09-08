import 'server-only';
import { sql } from '@/lib/db';
import { config } from '@/lib/config';
import { getPaymentGateway, type PaymentMethod } from '@/lib/payments';
import { notify } from '@/lib/notifications/service';
import { getSupplierContact, type SupplierContact } from './suppliers';

export interface CustomerContact { name: string; phone: string | null; whatsapp: string | null; email: string | null }

/** Returns the customer's contact details ONLY if the supplier has unlocked this request. */
export async function getCustomerContactForSupplier(requestId: string, supplierId: string): Promise<CustomerContact | null> {
  const [u] = await sql<{ full_name: string; phone: string | null; email: string | null; whatsapp: string | null }[]>`
    select u.full_name, u.phone, u.email, cp.whatsapp from public.lead_unlocks lu
    join public.users u on u.id = lu.customer_id
    left join public.customer_profiles cp on cp.user_id = u.id
    where lu.request_id = ${requestId} and lu.supplier_id = ${supplierId}`;
  if (!u) return null;
  return { name: u.full_name, phone: u.phone, whatsapp: u.whatsapp || u.phone, email: u.email };
}

/** Returns the selected supplier's contact for the customer ONLY after the supplier unlocked the lead. */
export async function getSupplierContactForCustomer(requestId: string, customerId: string): Promise<SupplierContact | null> {
  const [row] = await sql<{ supplier_id: string }[]>`select supplier_id from public.lead_unlocks where request_id = ${requestId} and customer_id = ${customerId}`;
  if (!row) return null;
  return getSupplierContact(row.supplier_id);
}

export type UnlockMethod = 'credits' | 'subscription' | 'payment';

export interface UnlockOptions { leadPrice: number; creditsBalance: number; subscription: { id: string; remaining: number; plan: string } | null; alreadyUnlocked: boolean }

export async function getUnlockOptions(selectionId: string, supplierId: string): Promise<UnlockOptions | null> {
  const [s] = await sql<{ lead_price: string; request_id: string; status: string }[]>`select lead_price, request_id, status from public.supplier_selections where id = ${selectionId} and supplier_id = ${supplierId}`;
  if (!s) return null;
  const [p] = await sql<{ credits_balance: number }[]>`select credits_balance from public.supplier_profiles where user_id = ${supplierId}`;
  const [sub] = await sql<{ id: string; included_leads: number; used_leads: number; name_ar: string }[]>`
    select s.id, s.included_leads, s.used_leads, pl.name_ar from public.subscriptions s join public.subscription_plans pl on pl.id = s.plan_id
    where s.supplier_id = ${supplierId} and s.status = 'active' and s.ends_at > now() order by s.ends_at desc limit 1`;
  return {
    leadPrice: Number(s.lead_price),
    creditsBalance: p?.credits_balance ?? 0,
    subscription: sub ? { id: sub.id, remaining: Math.max(0, sub.included_leads - sub.used_leads), plan: sub.name_ar } : null,
    alreadyUnlocked: s.status === 'unlocked',
  };
}

/**
 * Starts the unlock. Credits / subscription unlock immediately. Card payment
 * creates a pending payment and returns the gateway redirect URL.
 */
export async function startUnlock(selectionId: string, supplierId: string, method: UnlockMethod, paymentMethod?: PaymentMethod): Promise<{ unlocked: true } | { unlocked: false; redirectUrl: string; paymentId: string }> {
  const [s] = await sql<{ id: string; request_id: string; customer_id: string; lead_price: string; status: string; expires_at: string | null }[]>`
    select id, request_id, customer_id, lead_price, status, expires_at from public.supplier_selections where id = ${selectionId} and supplier_id = ${supplierId}`;
  if (!s) throw new Error('غير مصرح');
  if (s.status === 'unlocked') return { unlocked: true };
  if (s.status !== 'pending_unlock') throw new Error('هذا الاختيار لم يعد متاحًا');
  const price = Number(s.lead_price);

  if (method === 'credits') {
    const [p] = await sql<{ credits_balance: number }[]>`select credits_balance from public.supplier_profiles where user_id = ${supplierId}`;
    const cost = Math.ceil(price);
    if (!p || p.credits_balance < cost) throw new Error('رصيد النقاط غير كافٍ');
    await sql.begin(async (tx) => {
      const [upd] = await tx<{ credits_balance: number }[]>`update public.supplier_profiles set credits_balance = credits_balance - ${cost} where user_id = ${supplierId} returning credits_balance`;
      await tx`insert into public.credits (supplier_id, amount, balance_after, reason, ref_type, ref_id) values (${supplierId}, ${-cost}, ${upd.credits_balance}, 'lead_unlock', 'selection', ${selectionId})`;
    });
    await fulfilUnlock(selectionId, { method: 'credits', paymentId: null });
    return { unlocked: true };
  }
  if (method === 'subscription') {
    const [sub] = await sql<{ id: string; included_leads: number; used_leads: number }[]>`
      select id, included_leads, used_leads from public.subscriptions where supplier_id = ${supplierId} and status = 'active' and ends_at > now() order by ends_at desc limit 1`;
    if (!sub || sub.used_leads >= sub.included_leads) throw new Error('لا يوجد اشتراك نشط أو استُهلكت العملاء المشمولون');
    await sql`update public.subscriptions set used_leads = used_leads + 1 where id = ${sub.id}`;
    await fulfilUnlock(selectionId, { method: 'subscription', paymentId: null });
    return { unlocked: true };
  }
  // card / wallet payment through gateway abstraction
  const gateway = await getPaymentGateway();
  const [user] = await sql<{ email: string | null }[]>`select email from public.users where id = ${supplierId}`;
  const [payment] = await sql<{ id: string }[]>`insert into public.payments (user_id, amount, currency, purpose, status, gateway, payment_method, metadata)
    values (${supplierId}, ${price}, 'SAR', 'lead_unlock', 'pending', ${gateway.name}, ${paymentMethod ?? null}, ${sql.json({ selectionId, requestId: s.request_id })}) returning id`;
  const session = await gateway.createCheckout({
    paymentId: payment.id, amount: price, currency: 'SAR', description: `فتح بيانات عميل — طلب ${s.request_id.slice(0, 8)}`,
    customerEmail: user?.email, returnUrl: `${config.appUrl}/pay/${payment.id}/return`, method: paymentMethod,
  });
  await sql`update public.payments set gateway_reference = ${session.gatewayReference ?? null} where id = ${payment.id}`;
  return { unlocked: false, redirectUrl: session.redirectUrl, paymentId: payment.id };
}

/** Marks a payment succeeded and fulfils what it paid for. Idempotent. */
export async function fulfilPayment(paymentId: string, opts: { method?: PaymentMethod; gatewayReference?: string | null } = {}) {
  const [p] = await sql<{ id: string; status: string; purpose: string; metadata: Record<string, string>; user_id: string }[]>`select id, status, purpose, metadata, user_id from public.payments where id = ${paymentId}`;
  if (!p) throw new Error('عملية الدفع غير موجودة');
  if (p.status === 'succeeded') return p;
  await sql`update public.payments set status = 'succeeded', paid_at = now(), payment_method = coalesce(${opts.method ?? null}, payment_method), gateway_reference = coalesce(${opts.gatewayReference ?? null}, gateway_reference) where id = ${paymentId}`;
  if (p.purpose === 'lead_unlock' && p.metadata.selectionId) {
    await fulfilUnlock(p.metadata.selectionId, { method: 'payment', paymentId });
  } else if (p.purpose === 'credits' && p.metadata.credits) {
    const amount = Number(p.metadata.credits);
    await sql.begin(async (tx) => {
      const [upd] = await tx<{ credits_balance: number }[]>`update public.supplier_profiles set credits_balance = credits_balance + ${amount} where user_id = ${p.user_id} returning credits_balance`;
      await tx`insert into public.credits (supplier_id, amount, balance_after, reason, ref_type, ref_id) values (${p.user_id}, ${amount}, ${upd.credits_balance}, 'purchase', 'payment', ${paymentId})`;
    });
  } else if (p.purpose === 'subscription' && p.metadata.planId) {
    const [plan] = await sql<{ id: string; included_leads: number }[]>`select id, included_leads from public.subscription_plans where id = ${p.metadata.planId}`;
    if (plan) {
      await sql`update public.subscriptions set status = 'expired' where supplier_id = ${p.user_id} and status = 'active'`;
      await sql`insert into public.subscriptions (supplier_id, plan_id, status, starts_at, ends_at, included_leads, payment_id) values (${p.user_id}, ${plan.id}, 'active', now(), now() + interval '30 days', ${plan.included_leads}, ${paymentId})`;
    }
  }
  return p;
}

export async function failPayment(paymentId: string) {
  await sql`update public.payments set status = 'failed' where id = ${paymentId} and status in ('pending','processing')`;
}

async function fulfilUnlock(selectionId: string, opts: { method: 'payment' | 'credits' | 'subscription' | 'promo' | 'admin'; paymentId: string | null }) {
  const [s] = await sql<{ id: string; request_id: string; supplier_id: string; customer_id: string; lead_price: string; status: string }[]>`select * from public.supplier_selections where id = ${selectionId}`;
  if (!s || s.status === 'unlocked') return;
  await sql.begin(async (tx) => {
    await tx`insert into public.lead_unlocks (selection_id, request_id, supplier_id, customer_id, payment_id, price, method)
      values (${s.id}, ${s.request_id}, ${s.supplier_id}, ${s.customer_id}, ${opts.paymentId}, ${s.lead_price}, ${opts.method}) on conflict (request_id, supplier_id) do nothing`;
    await tx`update public.supplier_selections set status = 'unlocked' where id = ${s.id}`;
    await tx`update public.requests set unlocked_at = now() where id = ${s.request_id}`;
    await tx`update public.conversations set status = 'unlocked' where request_id = ${s.request_id} and supplier_id = ${s.supplier_id}`;
    await tx`update public.supplier_profiles set won_count = won_count + 1 where user_id = ${s.supplier_id}`;
    const [conv] = await tx<{ id: string }[]>`select id from public.conversations where request_id = ${s.request_id} and supplier_id = ${s.supplier_id}`;
    if (conv) {
      await tx`insert into public.messages (conversation_id, sender_id, kind, body) values (${conv.id}, null, 'system', 'تم فتح بيانات التواصل. يمكنكما الآن التواصل مباشرة، وتبقى هذه المحادثة متاحة كمرجع.')`;
    }
  });
  await notify({ userId: s.supplier_id, type: 'lead_unlocked', title: 'تم فتح بيانات العميل بنجاح', link: `/supplier/leads/${s.id}` });
  await notify({ userId: s.customer_id, type: 'supplier_unlocked', title: 'المزود الذي اخترته جاهز للتواصل معك', body: 'أصبحت بيانات التواصل متاحة للطرفين', link: `/dashboard/requests/${s.request_id}` });
}

/** Supplier purchases a credit pack (mock/gateway). */
export async function startCreditPurchase(supplierId: string, credits: number, amountSar: number, paymentMethod?: PaymentMethod) {
  const gateway = await getPaymentGateway();
  const [payment] = await sql<{ id: string }[]>`insert into public.payments (user_id, amount, currency, purpose, status, gateway, payment_method, metadata)
    values (${supplierId}, ${amountSar}, 'SAR', 'credits', 'pending', ${gateway.name}, ${paymentMethod ?? null}, ${sql.json({ credits })}) returning id`;
  const session = await gateway.createCheckout({ paymentId: payment.id, amount: amountSar, currency: 'SAR', description: `شراء ${credits} نقطة`, returnUrl: `${config.appUrl}/pay/${payment.id}/return` });
  await sql`update public.payments set gateway_reference = ${session.gatewayReference ?? null} where id = ${payment.id}`;
  return { redirectUrl: session.redirectUrl, paymentId: payment.id };
}

export async function startSubscription(supplierId: string, planId: string, paymentMethod?: PaymentMethod) {
  const [plan] = await sql<{ id: string; price_monthly: string; name_ar: string }[]>`select id, price_monthly, name_ar from public.subscription_plans where id = ${planId} and is_active`;
  if (!plan) throw new Error('الباقة غير متاحة');
  const gateway = await getPaymentGateway();
  const [payment] = await sql<{ id: string }[]>`insert into public.payments (user_id, amount, currency, purpose, status, gateway, payment_method, metadata)
    values (${supplierId}, ${Number(plan.price_monthly)}, 'SAR', 'subscription', 'pending', ${gateway.name}, ${paymentMethod ?? null}, ${sql.json({ planId })}) returning id`;
  const session = await gateway.createCheckout({ paymentId: payment.id, amount: Number(plan.price_monthly), currency: 'SAR', description: `اشتراك ${plan.name_ar}`, returnUrl: `${config.appUrl}/pay/${payment.id}/return` });
  await sql`update public.payments set gateway_reference = ${session.gatewayReference ?? null} where id = ${payment.id}`;
  return { redirectUrl: session.redirectUrl, paymentId: payment.id };
}
