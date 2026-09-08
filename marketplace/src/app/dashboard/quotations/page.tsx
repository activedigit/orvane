import Link from 'next/link';
import { requirePageRole } from '@/lib/auth';
import { sql } from '@/lib/db';
import { PageHeader } from '@/components/ui/misc';
import { EmptyState } from '@/components/ui/empty-state';
import { QuotationStatusBadge } from '@/components/ui/status-badge';
import { formatSAR, pluralDays, timeAgo } from '@/lib/utils';
import { getSupplierPublicCard } from '@/lib/services/suppliers';
import { Stars } from '@/components/ui/misc';

export default async function CustomerQuotationsPage() {
  const user = await requirePageRole(['customer']);
  const rows = await sql<{ id: string; request_id: string; supplier_id: string; price: string; delivery_days: number | null; status: string; submitted_at: string; request_title: string; reference_code: string; selected_supplier_id: string | null }[]>`
    select q.id, q.request_id, q.supplier_id, q.price, q.delivery_days, q.status, q.submitted_at, r.title as request_title, r.reference_code, r.selected_supplier_id
    from public.quotations q join public.requests r on r.id = q.request_id where r.customer_id = ${user.id} and q.status <> 'withdrawn' order by q.submitted_at desc limit 100`;
  const cards = await Promise.all(rows.map((r) => getSupplierPublicCard(r.supplier_id, { revealed: r.selected_supplier_id === r.supplier_id })));
  return (
    <>
      <PageHeader title="العروض المستلمة" description="كل العروض على طلباتك. افتح الطلب للمقارنة التفصيلية والاختيار." />
      {rows.length ? (
        <div className="space-y-2">
          {rows.map((q, i) => (
            <Link key={q.id} href={`/dashboard/requests/${q.request_id}`} className="flex flex-col gap-2 rounded-lg border border-line bg-surface p-4 hover:border-primary/40 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="text-xs text-muted">{q.reference_code} • {q.request_title}</div>
                <div className="mt-0.5 flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-ink">{cards[i]?.displayName}</span>
                  {cards[i] ? <Stars value={cards[i]!.ratingAvg} count={cards[i]!.ratingCount} /> : null}
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="font-bold text-ink tabular">{formatSAR(q.price)}</span>
                <span className="text-muted">{q.delivery_days ? pluralDays(q.delivery_days) : '—'}</span>
                <QuotationStatusBadge status={q.status} />
                <span className="text-xs text-muted">{timeAgo(q.submitted_at)}</span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState title="لا توجد عروض بعد" description="ستظهر هنا العروض فور وصولها على طلباتك." />
      )}
    </>
  );
}
