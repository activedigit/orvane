import Link from 'next/link';
import { requirePageRole } from '@/lib/auth';
import { listSupplierQuotations } from '@/lib/services/quotations';
import { PageHeader } from '@/components/ui/misc';
import { EmptyState } from '@/components/ui/empty-state';
import { QuotationStatusBadge, RequestStatusBadge } from '@/components/ui/status-badge';
import { Badge } from '@/components/ui/badge';
import { formatSAR, pluralDays, timeAgo } from '@/lib/utils';

export default async function SupplierQuotationsPage() {
  const user = await requirePageRole(['supplier']);
  const items = await listSupplierQuotations(user.id);
  return (
    <>
      <PageHeader title="عروضي" description="كل العروض التي قدمتها وحالتها." />
      {items.length ? (
        <div className="space-y-2">
          {items.map((q) => (
            <Link key={q.id} href={q.selection_id ? `/supplier/leads/${q.selection_id}` : `/supplier/requests/${q.request_id}`} className="flex flex-col gap-2 rounded-lg border border-line bg-surface p-4 hover:border-primary/40 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted"><span className="tabular">{q.reference_code}</span><RequestStatusBadge status={q.request_status} /></div>
                <div className="mt-0.5 font-semibold text-ink">{q.request_title}</div>
                <div className="text-xs text-muted">{q.category_name} • {q.city_name} • {timeAgo(q.submitted_at)}</div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-bold tabular text-ink">{formatSAR(q.price)}</span>
                <span className="text-muted">{q.delivery_days ? pluralDays(q.delivery_days) : ''}</span>
                <QuotationStatusBadge status={q.status} />
                {q.selection_status === 'pending_unlock' ? <Badge tone="warning">بانتظار فتح البيانات</Badge> : q.unlocked ? <Badge tone="success">تم فتح البيانات</Badge> : null}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState title="لم تقدم أي عرض بعد" description="افتح الطلبات المناسبة وقدّم عرضك الأول." />
      )}
    </>
  );
}
