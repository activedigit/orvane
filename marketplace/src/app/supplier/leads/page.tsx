import Link from 'next/link';
import { Lock, Unlock } from 'lucide-react';
import { requirePageRole } from '@/lib/auth';
import { listSupplierSelections } from '@/lib/services/selection';
import { PageHeader } from '@/components/ui/misc';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { formatSAR, formatDate } from '@/lib/utils';
import { SELECTION_STATUS } from '@/lib/domain/labels';

export default async function LeadsPage() {
  const user = await requirePageRole(['supplier']);
  const items = await listSupplierSelections(user.id);
  return (
    <>
      <PageHeader title="العملاء المختارون" description="العملاء الذين اختاروا عرضك. تدفع رسوم فتح البيانات فقط بعد اختيارك." />
      {items.length ? (
        <div className="space-y-2">
          {items.map((s) => (
            <Link key={s.id} href={`/supplier/leads/${s.id}`} className="flex flex-col gap-2 rounded-lg border border-line bg-surface p-4 hover:border-primary/40 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs text-muted"><span className="tabular">{s.reference_code}</span><span>{formatDate(s.created_at)}</span></div>
                <div className="font-semibold text-ink">{s.request_title}</div>
                <div className="text-xs text-muted">{s.category_name} • {s.city_name} • عرضك: {formatSAR(s.quotation_price)}</div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                {s.status === 'unlocked' ? <Badge tone="success"><Unlock className="size-3" /> {SELECTION_STATUS[s.status]}</Badge> : <Badge tone="warning"><Lock className="size-3" /> {SELECTION_STATUS[s.status]} — {formatSAR(s.lead_price)}</Badge>}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState icon={Lock} title="لم يخترك أي عميل بعد" description="عندما يختار عميل عرضك ستظهر بياناته هنا لفتحها." />
      )}
    </>
  );
}
