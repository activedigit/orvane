import { describe, it, expect } from 'vitest';
import { scoreCandidate, type MatchCandidate } from '@/lib/services/matching';

const base: MatchCandidate = {
  supplier_id: 's1', company_name: 'x', verification_status: 'verified', is_available: true, rating_avg: '4.5', rating_count: 10, quotations_count: 20, won_count: 8,
  avg_response_minutes: 30, min_budget: '1000', max_budget: '100000', has_subcategory: true, covers_city: true, open_invites: 0,
};
const req = { budgetMax: 12000, subcategoryId: 'sub', urgency: 'normal' };

describe('supplier matching', () => {
  it('rejects unverified, unavailable, or out-of-city suppliers', () => {
    expect(scoreCandidate({ ...base, verification_status: 'pending' }, req)).toBeNull();
    expect(scoreCandidate({ ...base, is_available: false }, req)).toBeNull();
    expect(scoreCandidate({ ...base, covers_city: false }, req)).toBeNull();
  });
  it('scores better suppliers higher', () => {
    const good = scoreCandidate(base, req)!;
    const worse = scoreCandidate({ ...base, rating_avg: '3.0', avg_response_minutes: 600, has_subcategory: false, won_count: 1 }, req)!;
    expect(good.score).toBeGreaterThan(worse.score);
    expect(good.reasons).toContain('تقييم مرتفع');
  });
  it('penalizes budget mismatch and load', () => {
    const inRange = scoreCandidate(base, req)!.score;
    const outOfRange = scoreCandidate({ ...base, min_budget: '50000' }, req)!.score;
    const loaded = scoreCandidate({ ...base, open_invites: 5 }, req)!.score;
    expect(outOfRange).toBeLessThan(inRange);
    expect(loaded).toBeLessThan(inRange);
  });
});
