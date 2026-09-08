import 'server-only';
import { sql } from '@/lib/db';
import { getSetting } from '@/lib/settings';

export interface MatchCandidate {
  supplier_id: string;
  company_name: string;
  verification_status: string;
  is_available: boolean;
  rating_avg: string;
  rating_count: number;
  quotations_count: number;
  won_count: number;
  avg_response_minutes: number | null;
  min_budget: string | null;
  max_budget: string | null;
  has_subcategory: boolean;
  covers_city: boolean;
  open_invites: number;
}

export interface ScoredMatch { supplierId: string; score: number; reasons: string[] }

/**
 * Pure scoring so it can be unit-tested. Hard requirements: category match
 * (via query), available, verified, and city coverage.
 */
export function scoreCandidate(c: MatchCandidate, req: { budgetMax: number | null; subcategoryId: string | null; urgency: string }): ScoredMatch | null {
  if (!c.is_available) return null;
  if (c.verification_status !== 'verified') return null;
  if (!c.covers_city) return null;
  const reasons: string[] = ['يقدم نفس الفئة', 'يغطي المدينة', 'مزود موثّق'];
  let score = 40;
  if (req.subcategoryId) {
    if (c.has_subcategory) { score += 15; reasons.push('متخصص في التخصص الفرعي'); }
  }
  const rating = Number(c.rating_avg || 0);
  if (c.rating_count > 0) {
    score += Math.round(rating * 4); // up to +20
    if (rating >= 4.5) reasons.push('تقييم مرتفع');
  } else {
    score += 6; // neutral for new suppliers
  }
  if (c.quotations_count > 0) {
    const winRate = c.won_count / c.quotations_count;
    score += Math.round(winRate * 10);
    if (winRate >= 0.3) reasons.push('معدل فوز جيد');
  }
  if (c.avg_response_minutes != null) {
    if (c.avg_response_minutes <= 60) { score += 8; reasons.push('سرعة استجابة عالية'); }
    else if (c.avg_response_minutes <= 240) score += 4;
    if (req.urgency === 'urgent' && c.avg_response_minutes <= 120) score += 5;
  }
  if (req.budgetMax != null) {
    const min = c.min_budget != null ? Number(c.min_budget) : null;
    const max = c.max_budget != null ? Number(c.max_budget) : null;
    if ((min != null && req.budgetMax < min) || (max != null && req.budgetMax > max)) {
      score -= 20;
      reasons.push('الميزانية خارج نطاق المزود');
    } else if (min != null || max != null) {
      score += 5;
      reasons.push('الميزانية ضمن نطاق المزود');
    }
  }
  // spread load: penalize suppliers with many unanswered invites
  score -= Math.min(15, c.open_invites * 3);
  return { supplierId: c.supplier_id, score, reasons };
}

export async function findMatchingSuppliers(requestId: string): Promise<ScoredMatch[]> {
  const [req] = await sql<{ id: string; category_id: string | null; subcategory_id: string | null; city_id: string | null; budget_max: string | null; urgency: string; customer_id: string }[]>`
    select id, category_id, subcategory_id, city_id, budget_max, urgency, customer_id from public.requests where id = ${requestId}`;
  if (!req || !req.category_id || !req.city_id) return [];

  const candidates = await sql<MatchCandidate[]>`
    select sp.user_id as supplier_id, sp.company_name, sp.verification_status, sp.is_available, sp.rating_avg, sp.rating_count,
           sp.quotations_count, sp.won_count, sp.avg_response_minutes, sp.min_budget, sp.max_budget,
           exists (select 1 from public.supplier_categories sc2 where sc2.supplier_id = sp.user_id and sc2.subcategory_id = ${req.subcategory_id}) as has_subcategory,
           exists (select 1 from public.service_areas sa where sa.supplier_id = sp.user_id and sa.city_id = ${req.city_id}) as covers_city,
           (select count(*) from public.request_matches rm where rm.supplier_id = sp.user_id and rm.status = 'invited' and rm.created_at > now() - interval '7 days')::int as open_invites
    from public.supplier_profiles sp
    join public.users u on u.id = sp.user_id and u.status = 'active' and u.role = 'supplier'
    where exists (select 1 from public.supplier_categories sc where sc.supplier_id = sp.user_id and sc.category_id = ${req.category_id})
      and sp.user_id <> ${req.customer_id}`;

  const minScore = Number(await getSetting('matching.min_score'));
  const scored = candidates
    .map((c) => scoreCandidate(c, { budgetMax: req.budget_max != null ? Number(req.budget_max) : null, subcategoryId: req.subcategory_id, urgency: req.urgency }))
    .filter((m): m is ScoredMatch => !!m && m.score >= minScore)
    .sort((a, b) => b.score - a.score);
  return scored;
}
