import Link from 'next/link';
import { requirePageRole } from '@/lib/auth';
import { sql } from '@/lib/db';
import { PageHeader } from '@/components/ui/misc';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { formatSAR, formatDate } from '@/lib/utils';
import { getSupplierPublicCard } from '@/lib/services/suppliers';
import { UserCheck } from 'lucide-react';

export default async function SelectedSuppliersPage() {
  const user = await requirePageRole(['customer']);
  const rows = await sql<{ id: string; request_id: string; supplier_id: string; status: string; created_at: string; request_title: string; reference_code: string; price: string; request_status: string }[]>`
    select ss.id, ss.request_id, ss.supplier_id, ss.status, ss.created_at, r.title as request_title, r.reference_code, r.status as request_status, q.price
    from public.supplier_selections ss join public.requests r on r.id = ss.request_id join public.quotations q on q.id = ss.quotation_id
    where ss.customer_id = ${user.id} order by ss.created_at desc`;
  const cards = await Promise.all(rows.map((r) => getSupplierPublicCard(r.supplier_id, { revealed: true })));
  return (
    <>
      <PageHeader title="المزودون المختارون" description="المزودون الذين اخترتهم لطلباتك." />
      {rows.length ? (
        <div className="space-y-2">
          {rows.map((r, i) => (
            <Link key={r.id} href={`/dashboard/requests/${r.request_id}`} className="flex flex-col gap-2 rounded-lg border border-line bg-surface p-4 hover:border-primary/40 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="font-semibold text-ink">{cards[i]?.displayName}</div>
                <div className="text-xs text-muted">{r.reference_code} • {r.request_title} • {formatDate(r.created_at)}</div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="font-bold tabular">{formatSAR(r.price)}</span>
                {r.status === 'unlocked' ? <Badge tone="success">تم فتح التواصل</Badge> : <Badge tone="warning">بانتظار المزود</Badge>}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState icon={UserCheck} title="لم تختر أي مزود بعد" description="عند اختيار عرض من صفحة الطلب سيظهر المزود هنا." />
      )}
    </>
  );
}
