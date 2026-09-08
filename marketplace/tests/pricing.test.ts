import { describe, it, expect } from 'vitest';
import { resolveLeadPrice, type PricingRule } from '@/lib/services/pricing';

const rule = (o: Partial<PricingRule>): PricingRule => ({ id: 'r', name_ar: 'r', category_id: null, min_project_value: null, max_project_value: null, price: '199', priority: 0, is_active: true, ...o });
const rules: PricingRule[] = [
  rule({ id: 'small', max_project_value: '9999', price: '99' }),
  rule({ id: 'medium', min_project_value: '10000', max_project_value: '50000', price: '199' }),
  rule({ id: 'large', min_project_value: '50001', price: '399' }),
  rule({ id: 'cat', category_id: 'business', price: '149', priority: 20 }),
  rule({ id: 'off', category_id: 'business', price: '1', priority: 99, is_active: false }),
];

describe('lead pricing', () => {
  it('picks by project value', () => {
    expect(resolveLeadPrice(rules, { categoryId: 'signage', projectValue: 5000 }, 199).price).toBe(99);
    expect(resolveLeadPrice(rules, { categoryId: 'signage', projectValue: 24000 }, 199).price).toBe(199);
    expect(resolveLeadPrice(rules, { categoryId: 'signage', projectValue: 80000 }, 199).price).toBe(399);
  });
  it('prefers category-specific rules and ignores inactive ones', () => {
    expect(resolveLeadPrice(rules, { categoryId: 'business', projectValue: 80000 }, 199).price).toBe(149);
  });
  it('falls back to the default when nothing matches', () => {
    expect(resolveLeadPrice([], { categoryId: null, projectValue: null }, 250).price).toBe(250);
  });
});
