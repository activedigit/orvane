import { describe, it, expect } from 'vitest';
import { buildQuestions, parseBudget } from '@/lib/requests/questionnaire';
import { rulesAiProvider, extractBudget } from '@/lib/ai/rules';

const categories = [
  { id: 'c1', slug: 'signage', name_ar: 'اللوحات والإعلانات', keywords: ['لوحة', 'لوحات', 'نيون'], subcategories: [{ id: 's1', slug: 'outdoor-signs', name_ar: 'لوحات خارجية للمحلات', keywords: ['لوحة خارجية', 'واجهة'] }] },
  { id: 'c2', slug: 'security', name_ar: 'أنظمة الأمن والسلامة', keywords: ['كاميرا', 'كاميرات', 'مراقبة'], subcategories: [{ id: 's2', slug: 'cctv', name_ar: 'كاميرات مراقبة', keywords: ['كاميرا'] }] },
];
const cities = [{ id: 'r', slug: 'riyadh', name_ar: 'الرياض' }, { id: 'j', slug: 'jeddah', name_ar: 'جدة' }];

describe('rule-based request analysis', () => {
  it('detects category, subcategory and city from free text', async () => {
    const a = await rulesAiProvider.analyzeRequest('أحتاج تصميم وتركيب لوحة خارجية لمحل في الرياض', { categories, cities });
    expect(a.categoryId).toBe('c1');
    expect(a.subcategoryId).toBe('s1');
    expect(a.cityId).toBe('r');
    expect(a.missing).not.toContain('city');
  });
  it('detects urgency and budget', async () => {
    const a = await rulesAiProvider.analyzeRequest('تركيب كاميرات مراقبة لمستودع بجدة عاجل، الميزانية 25000 ريال', { categories, cities });
    expect(a.categoryId).toBe('c2');
    expect(a.cityId).toBe('j');
    expect(a.urgency).toBe('urgent');
    expect(a.budgetMax).toBe(25000);
  });
  it('extracts budgets in different forms', () => {
    expect(extractBudget('من 10000 إلى 20000 ريال')).toEqual({ min: 10000, max: 20000 });
    expect(extractBudget('بحدود 15 ألف')).toEqual({ min: null, max: 15000 });
    expect(extractBudget('لا أعرف')).toEqual({ min: null, max: null });
  });
});

describe('questionnaire', () => {
  it('asks only for missing fields', async () => {
    const a = await rulesAiProvider.analyzeRequest('أحتاج تصميم وتركيب لوحة خارجية لمحل في الرياض', { categories, cities });
    const qs = buildQuestions(a, { categories: categories as never, cities: cities as never }, { isAuthenticated: true });
    const ids = qs.map((q) => q.id);
    expect(ids).not.toContain('city');
    expect(ids).not.toContain('subcategory');
    expect(ids).toContain('budget');
    expect(ids).toContain('timeline');
    expect(ids.some((i) => i.startsWith('details.'))).toBe(true);
  });
  it('asks for category when text is unclear', async () => {
    const a = await rulesAiProvider.analyzeRequest('أحتاج مساعدة في مشروع جديد', { categories, cities });
    const qs = buildQuestions(a, { categories: categories as never, cities: cities as never }, { isAuthenticated: false });
    expect(qs[0].id).toBe('category');
    expect(qs.some((q) => q.id === 'city')).toBe(true);
  });
  it('parses budget choices', () => {
    expect(parseBudget('5000-15000')).toMatchObject({ min: 5000, max: 15000 });
    expect(parseBudget('100000-')).toMatchObject({ min: 100000, max: null });
    expect(parseBudget('unknown')).toMatchObject({ min: null, max: null });
  });
});
