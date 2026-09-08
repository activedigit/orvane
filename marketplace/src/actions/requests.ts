'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { getCurrentUser, requireRole } from '@/lib/auth';
import { enforceRateLimit } from '@/lib/security/events';
import { analyzeRequestText, createRequest, cancelRequest, closeQuotationWindow, completeRequest } from '@/lib/services/requests';
import { parseBudget, questionsForCategory } from '@/lib/requests/questionnaire';
import { getCategories, getCities } from '@/lib/services/reference';
import { getAiProvider } from '@/lib/ai';
import { run, type ActionResult } from './result';
import type { AnalyzeResult } from '@/lib/services/requests';

export interface AnalyzeResponse extends AnalyzeResult {
  isAuthenticated: boolean;
  categories: { id: string; slug: string; name_ar: string; subcategories: { id: string; name_ar: string }[] }[];
  cities: { id: string; name_ar: string }[];
}

export async function analyzeRequestAction(text: string): Promise<ActionResult<AnalyzeResponse>> {
  return run<AnalyzeResponse>(async () => {
    const t = text.trim();
    if (t.length < 10) throw new Error('اكتب وصفًا أوضح لطلبك (10 أحرف على الأقل)');
    if (t.length > 3000) throw new Error('الوصف طويل جدًا');
    const user = await getCurrentUser();
    await enforceRateLimit('createRequest', user?.id ?? null, user?.id);
    const ai = await getAiProvider();
    const spam = await ai.detectSpam(t);
    if (spam.isSpam) throw new Error('يبدو أن النص غير واضح، صف لنا الخدمة التي تحتاجها بالتفصيل');
    const res = await analyzeRequestText(t, !!user);
    const categories = await getCategories();
    return { ...res, isAuthenticated: !!user, categories: categories.map((c) => ({ id: c.id, slug: c.slug, name_ar: c.name_ar, subcategories: c.subcategories.map((s) => ({ id: s.id, name_ar: s.name_ar })) })), cities: (await getCities()).map((c) => ({ id: c.id, name_ar: c.name_ar })) };
  });
}

export async function categoryQuestionsAction(categoryId: string) {
  return run(async () => {
    const cats = await getCategories();
    const cat = cats.find((c) => c.id === categoryId);
    return { questions: questionsForCategory(cat?.slug ?? null), subcategories: cat?.subcategories.map((s) => ({ id: s.id, name_ar: s.name_ar })) ?? [], name: cat?.name_ar ?? '' };
  });
}

const submitSchema = z.object({
  description: z.string().trim().min(10).max(3000),
  categoryId: z.string().uuid(),
  subcategoryId: z.string().uuid().nullable().optional(),
  cityId: z.string().uuid(),
  budget: z.string().optional(),
  budgetMin: z.number().nullable().optional(),
  budgetMax: z.number().nullable().optional(),
  timeline: z.enum(['asap', 'week', 'month', 'flexible']).nullable().optional(),
  urgent: z.boolean().optional(),
  details: z.record(z.string(), z.unknown()).default({}),
  attachmentFileIds: z.array(z.string().uuid()).optional(),
  aiMeta: z.record(z.string(), z.unknown()).optional(),
});

export async function submitRequestAction(input: z.infer<typeof submitSchema>): Promise<ActionResult<{ requestId: string }>> {
  return run(async () => {
    const user = await requireRole('customer');
    await enforceRateLimit('createRequest', user.id, user.id);
    const d = submitSchema.parse(input);
    const budget = d.budget ? parseBudget(d.budget) : { min: d.budgetMin ?? null, max: d.budgetMax ?? null, label: null };
    const req = await createRequest(user.id, {
      description: d.description,
      categoryId: d.categoryId,
      subcategoryId: d.subcategoryId ?? null,
      cityId: d.cityId,
      budgetMin: budget.min,
      budgetMax: budget.max,
      budgetLabel: budget.label,
      timeline: d.timeline ?? null,
      urgency: d.urgent || d.timeline === 'asap' ? 'urgent' : 'normal',
      details: d.details,
      attachmentFileIds: d.attachmentFileIds,
      aiMeta: d.aiMeta,
    });
    revalidatePath('/dashboard');
    return { requestId: req.id };
  });
}

export async function cancelRequestAction(requestId: string, reason?: string) {
  return run(async () => {
    const user = await requireRole('customer');
    await cancelRequest(requestId, user.id, reason);
    revalidatePath(`/dashboard/requests/${requestId}`);
  });
}
export async function closeQuotationsAction(requestId: string) {
  return run(async () => {
    const user = await requireRole('customer');
    await closeQuotationWindow(requestId, user.id);
    revalidatePath(`/dashboard/requests/${requestId}`);
  });
}
export async function completeRequestAction(requestId: string) {
  return run(async () => {
    const user = await requireRole('customer');
    await completeRequest(requestId, user.id);
    revalidatePath(`/dashboard/requests/${requestId}`);
  });
}

export async function addRequestAttachmentsAction(requestId: string, fileIds: string[]) {
  return run(async () => {
    const user = await requireRole('customer');
    const { addRequestAttachments } = await import('@/lib/services/requests');
    await addRequestAttachments(requestId, user.id, fileIds);
    revalidatePath(`/dashboard/requests/${requestId}`);
  });
}
