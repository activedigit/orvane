import { Badge } from './badge';
import { REQUEST_STATUS, QUOTATION_STATUS } from '@/lib/domain/labels';
import type { QuotationStatus, RequestStatus } from '@/lib/db/types';

export function RequestStatusBadge({ status }: { status: RequestStatus | string }) {
  const s = REQUEST_STATUS[status as RequestStatus] ?? { label: status, tone: 'neutral' as const };
  return <Badge tone={s.tone}>{s.label}</Badge>;
}
export function QuotationStatusBadge({ status }: { status: QuotationStatus | string }) {
  const s = QUOTATION_STATUS[status as QuotationStatus] ?? { label: status, tone: 'neutral' as const };
  return <Badge tone={s.tone}>{s.label}</Badge>;
}
