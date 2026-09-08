/**
 * Conversational questionnaire engine (pure, testable). Given the AI
 * analysis of the free-text request, it produces the list of questions
 * still needed. The client renders one question at a time.
 */
import type { CategoryWithSubs } from '@/lib/services/reference';
import type { CityRow } from '@/lib/db/types';
import type { RequestAnalysis } from '@/lib/ai/types';

export type QuestionType = 'select' | 'multiselect' | 'text' | 'number' | 'yesno' | 'attachments';
export interface QuestionOption { value: string; label: string; hint?: string }
export interface Question {
  id: string;
  type: QuestionType;
  prompt: string;
  hint?: string;
  options?: QuestionOption[];
  optional?: boolean;
  placeholder?: string;
}

export const BUDGET_OPTIONS: QuestionOption[] = [
  { value: '0-5000', label: 'أقل من 5,000 ر.س' },
  { value: '5000-15000', label: '5,000 – 15,000 ر.س' },
  { value: '15000-50000', label: '15,000 – 50,000 ر.س' },
  { value: '50000-100000', label: '50,000 – 100,000 ر.س' },
  { value: '100000-', label: 'أكثر من 100,000 ر.س' },
  { value: 'unknown', label: 'غير محدد بعد', hint: 'سيقترح المزودون الأسعار' },
];

export const TIMELINE_OPTIONS: QuestionOption[] = [
  { value: 'asap', label: 'في أقرب وقت ممكن' },
  { value: 'week', label: 'خلال أسبوع' },
  { value: 'month', label: 'خلال شهر' },
  { value: 'flexible', label: 'الوقت مرن' },
];

export const TIMELINE_LABELS: Record<string, string> = { asap: 'في أقرب وقت', week: 'خلال أسبوع', month: 'خلال شهر', flexible: 'مرن' };

/** Category-specific detail questions keyed by category slug. */
const CATEGORY_QUESTIONS: Record<string, Question[]> = {
  signage: [
    { id: 'details.sign_type', type: 'select', prompt: 'وش نوع اللوحة؟', options: [
      { value: 'outdoor', label: 'لوحة خارجية للمحل' }, { value: 'indoor', label: 'لوحة داخلية' }, { value: 'neon', label: 'نيون / أكريليك مضيء' },
      { value: 'digital', label: 'شاشة رقمية' }, { value: 'vehicle', label: 'تغليف سيارات' }, { value: 'other', label: 'أخرى' } ] },
    { id: 'details.dimensions', type: 'text', prompt: 'ما هي المقاسات التقريبية؟', placeholder: 'مثال: 4 متر × 1 متر', optional: true },
    { id: 'details.lighting', type: 'yesno', prompt: 'هل تحتاج إضاءة؟' },
  ],
  contracting: [
    { id: 'details.work_type', type: 'select', prompt: 'وش نوع العمل المطلوب؟', options: [
      { value: 'build', label: 'بناء جديد' }, { value: 'extension', label: 'ملحق / توسعة' }, { value: 'renovation', label: 'ترميم' }, { value: 'demolition', label: 'هدم وإزالة' }, { value: 'other', label: 'أخرى' } ] },
    { id: 'details.area_sqm', type: 'number', prompt: 'كم المساحة التقريبية بالمتر المربع؟', optional: true, placeholder: 'مثال: 300' },
    { id: 'details.has_drawings', type: 'yesno', prompt: 'هل توجد مخططات هندسية جاهزة؟' },
  ],
  finishing: [
    { id: 'details.finish_type', type: 'multiselect', prompt: 'وش الأعمال المطلوبة؟', options: [
      { value: 'paint', label: 'دهانات' }, { value: 'gypsum', label: 'جبس بورد' }, { value: 'tiles', label: 'بلاط ورخام' }, { value: 'doors', label: 'أبواب ونوافذ' }, { value: 'electrical', label: 'كهرباء' }, { value: 'plumbing', label: 'سباكة' }, { value: 'full', label: 'تشطيب كامل' } ] },
    { id: 'details.area_sqm', type: 'number', prompt: 'كم المساحة التقريبية بالمتر المربع؟', optional: true, placeholder: 'مثال: 200' },
    { id: 'details.property_type', type: 'select', prompt: 'نوع العقار؟', options: [ { value: 'apartment', label: 'شقة' }, { value: 'villa', label: 'فيلا' }, { value: 'office', label: 'مكتب' }, { value: 'shop', label: 'محل تجاري' }, { value: 'other', label: 'أخرى' } ] },
  ],
  security: [
    { id: 'details.site_type', type: 'select', prompt: 'وش نوع الموقع؟', options: [ { value: 'warehouse', label: 'مستودع' }, { value: 'shop', label: 'محل' }, { value: 'villa', label: 'فيلا / منزل' }, { value: 'office', label: 'مكتب' }, { value: 'building', label: 'عمارة' }, { value: 'other', label: 'أخرى' } ] },
    { id: 'details.camera_count', type: 'number', prompt: 'كم عدد الكاميرات التقريبي؟', optional: true, placeholder: 'مثال: 8' },
    { id: 'details.needs_remote', type: 'yesno', prompt: 'هل تحتاج المتابعة عن بُعد من الجوال؟' },
  ],
  web: [
    { id: 'details.site_type', type: 'select', prompt: 'وش نوع المشروع؟', options: [ { value: 'store', label: 'متجر إلكتروني' }, { value: 'corporate', label: 'موقع تعريفي للشركة' }, { value: 'app', label: 'تطبيق جوال' }, { value: 'landing', label: 'صفحة هبوط' }, { value: 'other', label: 'أخرى' } ] },
    { id: 'details.has_brand', type: 'yesno', prompt: 'هل لديك هوية بصرية (شعار وألوان) جاهزة؟' },
    { id: 'details.features', type: 'text', prompt: 'وش أهم المميزات المطلوبة؟', placeholder: 'مثال: دفع إلكتروني، ربط مع شركات الشحن، لغتين', optional: true },
  ],
  hvac: [
    { id: 'details.ac_type', type: 'select', prompt: 'وش نوع التكييف؟', options: [ { value: 'split', label: 'سبليت' }, { value: 'central', label: 'مركزي' }, { value: 'ducted', label: 'كونسيلد / مخفي' }, { value: 'maintenance', label: 'صيانة وتنظيف' }, { value: 'other', label: 'أخرى' } ] },
    { id: 'details.units', type: 'number', prompt: 'كم عدد الوحدات؟', optional: true, placeholder: 'مثال: 6' },
  ],
  solar: [
    { id: 'details.property_type', type: 'select', prompt: 'أين سيتم التركيب؟', options: [ { value: 'villa', label: 'فيلا / منزل' }, { value: 'farm', label: 'مزرعة / استراحة' }, { value: 'commercial', label: 'منشأة تجارية' }, { value: 'industrial', label: 'منشأة صناعية' } ] },
    { id: 'details.monthly_bill', type: 'number', prompt: 'كم متوسط فاتورة الكهرباء الشهرية بالريال؟', optional: true, placeholder: 'مثال: 1500' },
  ],
};

const GENERIC_DETAILS: Question = { id: 'details.extra', type: 'text', prompt: 'أي تفاصيل إضافية تساعد المزودين على تسعير الطلب بدقة؟', placeholder: 'المواصفات، الكميات، أو أي شروط خاصة', optional: true };

export function buildQuestions(analysis: RequestAnalysis, ctx: { categories: CategoryWithSubs[]; cities: CityRow[] }, opts: { isAuthenticated: boolean }): Question[] {
  const qs: Question[] = [];
  const cat = analysis.categoryId ? ctx.categories.find((c) => c.id === analysis.categoryId) ?? null : null;

  if (!cat || analysis.confidence < 0.35) {
    const candidates = analysis.categoryCandidates.map((c) => ctx.categories.find((x) => x.id === c.id)).filter((x): x is CategoryWithSubs => !!x);
    const rest = ctx.categories.filter((c) => !candidates.some((x) => x.id === c.id));
    qs.push({
      id: 'category',
      type: 'select',
      prompt: cat ? `هل طلبك يخص «${cat.name_ar}»؟ اختر الفئة المناسبة:` : 'وش نوع الخدمة اللي تحتاجها؟',
      options: [...candidates, ...rest].map((c) => ({ value: c.id, label: c.name_ar })),
    });
  }
  if (cat && cat.subcategories.length && !analysis.subcategoryId) {
    qs.push({
      id: 'subcategory',
      type: 'select',
      prompt: `تحديدًا، أي خدمة ضمن «${cat.name_ar}»؟`,
      options: [...cat.subcategories.map((s) => ({ value: s.id, label: s.name_ar })), { value: '', label: 'غير متأكد / أخرى' }],
    });
  }
  if (!analysis.cityId) {
    qs.push({ id: 'city', type: 'select', prompt: 'في أي مدينة يتم التنفيذ؟', options: ctx.cities.map((c) => ({ value: c.id, label: c.name_ar })) });
  }
  const catQs = cat ? CATEGORY_QUESTIONS[cat.slug] ?? [GENERIC_DETAILS] : [GENERIC_DETAILS];
  qs.push(...catQs);
  if (analysis.budgetMax == null) {
    qs.push({ id: 'budget', type: 'select', prompt: 'كم الميزانية المتوقعة تقريبًا؟', options: BUDGET_OPTIONS });
  }
  qs.push({ id: 'timeline', type: 'select', prompt: 'متى تحتاج التنفيذ؟', options: TIMELINE_OPTIONS });
  if (analysis.urgency !== 'urgent') {
    qs.push({ id: 'urgent', type: 'yesno', prompt: 'هل الطلب عاجل؟', hint: 'الطلبات العاجلة تُرسل للمزودين الأسرع استجابة' });
  }
  qs.push({ id: 'attachments', type: 'attachments', prompt: 'أضف صورًا أو ملفات توضح طلبك (اختياري)', hint: opts.isAuthenticated ? 'صور الموقع، المخططات، أو أمثلة لما تريده' : 'سجّل الدخول بعد هذه الخطوة لرفع الملفات، أو أضفها لاحقًا من صفحة الطلب', optional: true });
  return qs;
}

/** Category questions must be resolvable after the user picks a category in the wizard. */
export function questionsForCategory(slug: string | null): Question[] {
  return (slug && CATEGORY_QUESTIONS[slug]) || [GENERIC_DETAILS];
}

export function parseBudget(value: string | undefined): { min: number | null; max: number | null; label: string | null } {
  if (!value || value === 'unknown') return { min: null, max: null, label: 'غير محدد' };
  const [a, b] = value.split('-');
  const min = a ? Number(a) : null;
  const max = b ? Number(b) : null;
  const label = BUDGET_OPTIONS.find((o) => o.value === value)?.label ?? null;
  return { min: min === 0 ? null : min, max, label };
}

export function budgetLabelFromNumbers(min: number | null, max: number | null): string | null {
  if (min == null && max == null) return null;
  if (min != null && max != null) return `${min.toLocaleString('en-US')} – ${max.toLocaleString('en-US')} ر.س`;
  if (max != null) return `بحدود ${max.toLocaleString('en-US')} ر.س`;
  return `من ${min!.toLocaleString('en-US')} ر.س`;
}
