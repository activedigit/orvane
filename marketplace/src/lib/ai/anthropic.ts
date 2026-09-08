import 'server-only';
import { config } from '@/lib/config';
import { rulesAiProvider } from './rules';
import type { AiProvider, RequestAnalysis } from './types';

/**
 * LLM-backed provider (Anthropic Messages API via fetch, no SDK dependency).
 * Every method falls back to the rules provider on any error so the
 * platform never depends on the LLM being available.
 */
async function callClaude(system: string, user: string, maxTokens = 600): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': config.ai.anthropicApiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: config.ai.anthropicModel,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }],
    }),
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) throw new Error(`anthropic ${res.status}`);
  const data = (await res.json()) as { content: { type: string; text?: string }[] };
  return data.content.filter((c) => c.type === 'text').map((c) => c.text || '').join('');
}

function extractJson<T>(text: string): T {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('no json');
  return JSON.parse(m[0]) as T;
}

export const anthropicAiProvider: AiProvider = {
  name: 'anthropic',
  async analyzeRequest(text, ctx): Promise<RequestAnalysis> {
    const base = await rulesAiProvider.analyzeRequest(text, ctx);
    try {
      const system = `أنت مساعد لتصنيف طلبات الخدمات في السعودية. أعد JSON فقط بالمفاتيح: title, categorySlug, subcategorySlug, citySlug, urgency (normal|urgent), budgetMin, budgetMax, projectType, confidence (0-1). استخدم null عند عدم التأكد.`;
      const user = `الفئات: ${ctx.categories.map((c) => `${c.slug} (${c.name_ar}): ${c.subcategories.map((s) => s.slug).join(', ')}`).join('\n')}\nالمدن: ${ctx.cities.map((c) => `${c.slug} (${c.name_ar})`).join(', ')}\n\nالطلب: ${text}`;
      const out = extractJson<{ title?: string; categorySlug?: string | null; subcategorySlug?: string | null; citySlug?: string | null; urgency?: string; budgetMin?: number | null; budgetMax?: number | null; projectType?: string | null; confidence?: number }>(await callClaude(system, user));
      const cat = ctx.categories.find((c) => c.slug === out.categorySlug) || null;
      const sub = cat?.subcategories.find((s) => s.slug === out.subcategorySlug) || null;
      const city = ctx.cities.find((c) => c.slug === out.citySlug) || null;
      const merged: RequestAnalysis = {
        ...base,
        title: out.title || base.title,
        categoryId: cat?.id ?? base.categoryId,
        subcategoryId: sub?.id ?? base.subcategoryId,
        cityId: city?.id ?? base.cityId,
        urgency: out.urgency === 'urgent' ? 'urgent' : base.urgency,
        budgetMin: out.budgetMin ?? base.budgetMin,
        budgetMax: out.budgetMax ?? base.budgetMax,
        projectType: out.projectType ?? null,
        confidence: typeof out.confidence === 'number' ? out.confidence : base.confidence,
        provider: 'anthropic',
      };
      merged.missing = [];
      if (!merged.cityId) merged.missing.push('city');
      if (!merged.categoryId) merged.missing.push('category');
      if (merged.categoryId && !merged.subcategoryId) merged.missing.push('subcategory');
      if (merged.budgetMax == null) merged.missing.push('budget');
      merged.missing.push('timeline', 'details');
      return merged;
    } catch {
      return base;
    }
  },
  async detectContactSharing(text) {
    const base = await rulesAiProvider.detectContactSharing(text);
    if (base.score >= 0.6) return base;
    try {
      const out = extractJson<{ score: number; reasons: string[] }>(
        await callClaude('حدد هل الرسالة تحاول مشاركة وسيلة تواصل (جوال، إيميل، حساب تواصل) بشكل مباشر أو ملتوي. أعد JSON: {"score":0-1,"reasons":[]}', text, 200),
      );
      return { score: Math.max(base.score, out.score), reasons: [...base.reasons, ...out.reasons] };
    } catch {
      return base;
    }
  },
  detectSpam: (t) => rulesAiProvider.detectSpam(t),
  async summarizeForSupplier(input) {
    try {
      return await callClaude('لخّص طلب العميل التالي في جملتين لمزود خدمة، بدون أي معلومات تواصل، بالعربية.', JSON.stringify(input), 300);
    } catch {
      return rulesAiProvider.summarizeForSupplier(input);
    }
  },
  async suggestQuotationStructure(input) {
    try {
      const out = extractJson<{ items: string[] }>(await callClaude('اقترح بنود عرض السعر المناسبة لهذا الطلب. أعد JSON: {"items":[...]}', JSON.stringify(input), 300));
      return out.items?.length ? out.items : rulesAiProvider.suggestQuotationStructure(input);
    } catch {
      return rulesAiProvider.suggestQuotationStructure(input);
    }
  },
};
