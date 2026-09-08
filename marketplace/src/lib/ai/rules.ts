import { detectContactInfo, normalizeDigits } from '@/lib/moderation/text-filter';
import type { AiProvider, RequestAnalysis } from './types';

const CITY_ALIASES: Record<string, string[]> = {
  riyadh: ['الرياض', 'بالرياض', 'للرياض', 'riyadh'],
  jeddah: ['جدة', 'جده', 'بجدة', 'بجده', 'jeddah'],
  dammam: ['الدمام', 'بالدمام', 'dammam'],
  khobar: ['الخبر', 'بالخبر', 'khobar'],
  makkah: ['مكة', 'مكه', 'بمكة', 'مكة المكرمة', 'makkah', 'mecca'],
  madinah: ['المدينة', 'المدينة المنورة', 'بالمدينة', 'madinah', 'medina'],
};

const URGENT_WORDS = ['عاجل', 'ضروري', 'بسرعة', 'بأسرع', 'اليوم', 'بكرة', 'بكره', 'فورًا', 'فورا', 'مستعجل', 'urgent'];

function normalizeArabic(s: string) {
  return normalizeDigits(s)
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[ً-ْ]/g, '')
    .toLowerCase();
}

function scoreKeywords(text: string, keywords: string[]) {
  let score = 0;
  for (const k of keywords) {
    const nk = normalizeArabic(k);
    if (!nk) continue;
    if (text.includes(nk)) score += nk.length >= 6 ? 3 : 2;
  }
  return score;
}

export function extractBudget(text: string): { min: number | null; max: number | null } {
  const t = normalizeDigits(text).replace(/,/g, '');
  const range = t.match(/(\d{3,7})\s*(?:-|إلى|الى|و|ل)\s*(\d{3,7})\s*(?:ريال|ر\.س|رس|sar)?/i);
  if (range) return { min: Number(range[1]), max: Number(range[2]) };
  const thousand = t.match(/(\d{1,3})\s*(?:الف|ألف|k)(?![\p{L}])/iu);
  if (thousand) return { min: null, max: Number(thousand[1]) * 1000 };
  const single = t.match(/(\d{4,7})\s*(?:ريال|ر\.س|رس|sar)/i) || t.match(/(?:ميزانية|ميزانيه|بحدود|حوالي|تقريبا|تقريبًا)\s*(\d{4,7})/i);
  if (single) return { min: null, max: Number(single[1]) };
  return { min: null, max: null };
}

export const rulesAiProvider: AiProvider = {
  name: 'rules',
  async analyzeRequest(text, ctx): Promise<RequestAnalysis> {
    const n = normalizeArabic(text);
    // city
    let cityId: string | null = null;
    for (const c of ctx.cities) {
      const aliases = [c.name_ar, ...(CITY_ALIASES[c.slug] || [])].map(normalizeArabic);
      if (aliases.some((a) => a && n.includes(a))) { cityId = c.id; break; }
    }
    // category
    const candidates = ctx.categories
      .map((c) => ({ id: c.id, score: scoreKeywords(n, [c.name_ar, ...c.keywords]) + c.subcategories.reduce((s, sc) => s + scoreKeywords(n, [sc.name_ar, ...sc.keywords]), 0) }))
      .filter((c) => c.score > 0)
      .sort((a, b) => b.score - a.score);
    const best = candidates[0];
    const categoryId = best ? best.id : null;
    let subcategoryId: string | null = null;
    if (categoryId) {
      const cat = ctx.categories.find((c) => c.id === categoryId)!;
      const sub = cat.subcategories
        .map((sc) => ({ id: sc.id, score: scoreKeywords(n, [sc.name_ar, ...sc.keywords]) }))
        .filter((s) => s.score > 0)
        .sort((a, b) => b.score - a.score)[0];
      subcategoryId = sub?.id ?? null;
    }
    const urgency = URGENT_WORDS.some((w) => n.includes(normalizeArabic(w))) ? 'urgent' : 'normal';
    const budget = extractBudget(text);
    const missing: RequestAnalysis['missing'] = [];
    if (!cityId) missing.push('city');
    if (!categoryId) missing.push('category');
    if (categoryId && !subcategoryId) missing.push('subcategory');
    if (budget.max == null) missing.push('budget');
    missing.push('timeline', 'details');
    const confidence = Math.min(1, (best?.score ?? 0) / 8) * (categoryId ? 1 : 0);
    const title = text.trim().split(/[\n.،,]/)[0].slice(0, 80);
    return {
      title,
      categoryId,
      subcategoryId,
      cityId,
      urgency,
      budgetMin: budget.min,
      budgetMax: budget.max,
      projectType: null,
      missing,
      confidence,
      provider: 'rules',
      categoryCandidates: candidates.slice(0, 3),
    };
  },
  async detectContactSharing(text) {
    const d = detectContactInfo(text);
    const hard = d.filter((x) => x.type !== 'keyword').length;
    const soft = d.filter((x) => x.type === 'keyword').length;
    const score = Math.min(1, hard * 0.6 + soft * 0.25);
    return { score, reasons: d.map((x) => x.type) };
  },
  async detectSpam(text) {
    const reasons: string[] = [];
    const n = normalizeArabic(text);
    if (text.length < 8) reasons.push('short');
    if ((text.match(/https?:\/\//g) || []).length > 1) reasons.push('links');
    if (/(.)\1{7,}/.test(text)) reasons.push('repeated_chars');
    if (/(ربح|اربح|جوائز|مجانا 100)/.test(n)) reasons.push('promo_words');
    return { isSpam: reasons.length >= 2, reasons };
  },
  async summarizeForSupplier(input) {
    const parts: string[] = [];
    if (input.category) parts.push(`خدمة: ${input.category}${input.subcategory ? ` – ${input.subcategory}` : ''}`);
    if (input.city) parts.push(`المدينة: ${input.city}`);
    if (input.budgetLabel) parts.push(`الميزانية: ${input.budgetLabel}`);
    if (input.timeline) parts.push(`موعد التنفيذ: ${input.timeline}`);
    if (input.urgency === 'urgent') parts.push('طلب عاجل');
    return parts.join(' • ');
  },
  async suggestQuotationStructure(input) {
    const base = ['السعر الإجمالي شامل الضريبة', 'ما يشمله السعر (مواد، تركيب، توصيل)', 'مدة التنفيذ المتوقعة', 'مدة صلاحية العرض', 'الضمان'];
    if (input.category?.includes('لوحات')) base.splice(1, 0, 'المقاسات ونوع الخامة والإضاءة');
    if (input.category?.includes('مقاولات') || input.category?.includes('تشطيبات')) base.splice(1, 0, 'جدول الأعمال والمراحل');
    if (input.category?.includes('كاميرات') || input.category?.includes('أمن')) base.splice(1, 0, 'عدد الكاميرات والمواصفات ومدة التخزين');
    return base;
  },
};

export { normalizeArabic };
