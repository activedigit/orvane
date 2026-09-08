'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth';
import { enforceRateLimit } from '@/lib/security/events';
import { submitQuotation, withdrawQuotation } from '@/lib/services/quotations';
import { run, type ActionResult } from './result';

const schema = z.object({
  requestId: z.string().uuid(),
  price: z.coerce.number().positive('أدخل السعر'),
  details: z.string().trim().min(10, 'اكتب تفاصيل العرض (10 أحرف على الأقل)'),
  priceIncludes: z.string().trim().optional(),
  deliveryDays: z.coerce.number().int().positive().optional(),
  validityDays: z.coerce.number().int().min(1).max(90).default(14),
  warranty: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  attachmentFileIds: z.array(z.string().uuid()).optional(),
});

export async function submitQuotationAction(_prev: ActionResult<{ id: string }> | null, formData: FormData): Promise<ActionResult<{ id: string }>> {
  const raw = { ...Object.fromEntries(formData), attachmentFileIds: formData.getAll('attachmentFileIds').map(String).filter(Boolean) };
  for (const k of ['deliveryDays', 'priceIncludes', 'warranty', 'notes']) if ((raw as Record<string, unknown>)[k] === '') delete (raw as Record<string, unknown>)[k];
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'تحقق من البيانات المدخلة', fieldErrors: Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])) };
  return run(async () => {
    const user = await requireRole('supplier');
    await enforceRateLimit('submitQuotation', user.id, user.id);
    const d = parsed.data;
    const q = await submitQuotation(user.id, d.requestId, {
      price: d.price, details: d.details, priceIncludes: d.priceIncludes || null, deliveryDays: d.deliveryDays ?? null, validityDays: d.validityDays,
      warranty: d.warranty || null, notes: d.notes || null, attachmentFileIds: d.attachmentFileIds,
    });
    revalidatePath(`/supplier/requests/${d.requestId}`);
    revalidatePath('/supplier/quotations');
    return { id: q.id };
  });
}

export async function withdrawQuotationAction(quotationId: string) {
  return run(async () => {
    const user = await requireRole('supplier');
    await withdrawQuotation(user.id, quotationId);
    revalidatePath('/supplier/quotations');
  });
}
