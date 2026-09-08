import { describe, it, expect } from 'vitest';
import { filterContactInfo, detectContactInfo, MASK_TEXT } from '@/lib/moderation/text-filter';

const masked = (s: string) => filterContactInfo(s);

describe('contact info filter', () => {
  it('masks plain Saudi mobile numbers', () => {
    const r = masked('تواصل معي على 0551234567 لو سمحت');
    expect(r.wasFiltered).toBe(true);
    expect(r.text).not.toContain('0551234567');
    expect(r.text).toContain(MASK_TEXT);
  });
  it('masks spaced numbers', () => {
    expect(masked('رقمي 055 123 4567').text).not.toContain('123');
  });
  it('masks Arabic-Indic digits', () => {
    const r = masked('جوالي ٠٥٥١٢٣٤٥٦٧');
    expect(r.text).not.toContain('٠٥٥');
    expect(r.detections.some((d) => d.type === 'phone')).toBe(true);
  });
  it('masks international formats', () => {
    expect(masked('+966 55 123 4567').text).not.toContain('4567');
    expect(masked('00966551234567').text).not.toContain('551234567');
  });
  it('masks emails', () => {
    expect(masked('راسلني example@email.com').text).not.toContain('example@email.com');
    expect(masked('x at gmail dot com').text).not.toContain('gmail');
  });
  it('masks urls and social', () => {
    expect(masked('instagram.com/company').text).not.toContain('instagram.com');
    expect(masked('حسابي @companyname').text).not.toContain('@companyname');
    expect(masked('سناب: coolshop99').text).not.toContain('coolshop99');
    expect(masked('www.example.sa').text).not.toContain('example');
  });
  it('masks numbers written as Arabic words', () => {
    const r = masked('زيرو خمسة خمسة واحد اثنين ثلاثة أربعة خمسة ستة سبعة');
    expect(r.wasFiltered).toBe(true);
    expect(r.detections.some((d) => d.type === 'phone_words')).toBe(true);
  });
  it('keeps normal business text', () => {
    const cases = [
      'السعر 12,500 ر.س شامل التركيب خلال 7 أيام',
      'المقاس 3 متر × 2 متر والضمان سنتين',
      'نحتاج 5 كاميرات و 2 مسجل',
      'الميزانية 25000 ريال',
      'خمسة أيام عمل',
    ];
    for (const c of cases) {
      const r = masked(c);
      expect(r.wasFiltered, c).toBe(false);
    }
  });
  it('flags intent keywords without masking', () => {
    const d = detectContactInfo('ابعث رقمك عشان نتواصل');
    expect(d.some((x) => x.type === 'keyword')).toBe(true);
    expect(masked('ابعث رقمك عشان نتواصل').wasFiltered).toBe(false);
  });
});
