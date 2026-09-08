'use server';
import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth';
import { selectSupplier } from '@/lib/services/selection';
import { startUnlock, fulfilPayment, failPayment, startCreditPurchase, startSubscription, type UnlockMethod } from '@/lib/services/unlock';
import { createReview, type ReviewInput } from '@/lib/services/reviews';
import { sql } from '@/lib/db';
import { config } from '@/lib/config';
import type { PaymentMethod } from '@/lib/payments';
import { run } from './result';

export async function selectSupplierAction(quotationId: string) {
  return run(async () => {
    const user = await requireRole('customer');
    const res = await selectSupplier(user.id, quotationId);
    revalidatePath('/dashboard');
    return res;
  });
}

export async function startUnlockAction(selectionId: string, method: UnlockMethod, paymentMethod?: PaymentMethod) {
  return run(async () => {
    const user = await requireRole('supplier');
    const res = await startUnlock(selectionId, user.id, method, paymentMethod);
    revalidatePath(`/supplier/leads/${selectionId}`);
    return res;
  });
}

/** Mock gateway confirmation. Only works when PAYMENT_GATEWAY=mock and the payment belongs to the caller. */
export async function confirmMockPaymentAction(paymentId: string, outcome: 'success' | 'fail', method: PaymentMethod) {
  return run(async () => {
    const user = await requireRole('supplier');
    if (config.payments.gateway !== 'mock') throw new Error('بوابة الدفع التجريبية غير مفعّلة');
    const [p] = await sql<{ user_id: string; status: string; metadata: Record<string, string> }[]>`select user_id, status, metadata from public.payments where id = ${paymentId}`;
    if (!p || p.user_id !== user.id) throw new Error('غير مصرح');
    if (outcome === 'fail') {
      await failPayment(paymentId);
      return { status: 'failed' as const, selectionId: p.metadata.selectionId ?? null };
    }
    await fulfilPayment(paymentId, { method, gatewayReference: `MOCK-${paymentId.slice(0, 8).toUpperCase()}` });
    return { status: 'succeeded' as const, selectionId: p.metadata.selectionId ?? null };
  });
}

export async function buyCreditsAction(pack: 'small' | 'medium' | 'large', paymentMethod?: PaymentMethod) {
  return run(async () => {
    const user = await requireRole('supplier');
    const packs = { small: { credits: 200, price: 190 }, medium: { credits: 500, price: 450 }, large: { credits: 1200, price: 999 } };
    const p = packs[pack];
    return startCreditPurchase(user.id, p.credits, p.price, paymentMethod);
  });
}

export async function subscribeAction(planId: string, paymentMethod?: PaymentMethod) {
  return run(async () => {
    const user = await requireRole('supplier');
    return startSubscription(user.id, planId, paymentMethod);
  });
}

export async function submitReviewAction(requestId: string, input: ReviewInput) {
  return run(async () => {
    const user = await requireRole('customer');
    await createReview(user.id, requestId, input);
    revalidatePath(`/dashboard/requests/${requestId}`);
  });
}
