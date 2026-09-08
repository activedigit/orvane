import 'server-only';
import { sql } from '@/lib/db';
import { getSetting } from '@/lib/settings';

export interface PricingRule {
  id: string; name_ar: string; category_id: string | null; min_project_value: string | null; max_project_value: string | null; price: string; priority: number; is_active: boolean;
}

/** Pure rule resolution (unit-testable). Most specific active rule wins: category-specific > generic; then higher priority. */
export function resolveLeadPrice(rules: PricingRule[], input: { categoryId: string | null; projectValue: number | null }, fallback: number): { price: number; rule: PricingRule | null } {
  const value = input.projectValue;
  const applicable = rules.filter((r) => {
    if (!r.is_active) return false;
    if (r.category_id && r.category_id !== input.categoryId) return false;
    if (r.min_project_value != null && (value == null || value < Number(r.min_project_value))) return false;
    if (r.max_project_value != null && (value == null || value > Number(r.max_project_value))) return false;
    return true;
  });
  applicable.sort((a, b) => {
    const specA = (a.category_id ? 2 : 0) + (a.min_project_value != null || a.max_project_value != null ? 1 : 0);
    const specB = (b.category_id ? 2 : 0) + (b.min_project_value != null || b.max_project_value != null ? 1 : 0);
    if (specB !== specA) return specB - specA;
    return b.priority - a.priority;
  });
  const rule = applicable[0] ?? null;
  return { price: rule ? Number(rule.price) : fallback, rule };
}

export async function computeLeadPrice(input: { categoryId: string | null; projectValue: number | null }) {
  const rules = await sql<PricingRule[]>`select * from public.lead_pricing_rules where is_active order by priority desc`;
  const fallback = Number(await getSetting('pricing.default_lead_price'));
  return resolveLeadPrice(rules, input, fallback);
}
