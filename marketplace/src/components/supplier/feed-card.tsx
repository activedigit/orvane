import Link from 'next/link';
import { MapPin, Clock, Inbox, CalendarClock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { RequestStatusBadge } from '@/components/ui/status-badge';
import { timeAgo, formatDate, cn } from '@/lib/utils';
import { TIMELINE_LABELS } from '@/lib/requests/questionnaire';
import type { SupplierFeedItem } from '@/lib/services/requests';

export function FeedCard({ r }: { r: SupplierFeedItem }) {
  const isNew = r.match_status === 'invited';
  return (
    <Link href={`/supplier/requests/${r.request_id}`} className={cn('block rounded-lg border bg-surface p-4 shadow-card transition-colors hover:border-primary/40', isNew ? 'border-primary/40' : 'border-line')}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted tabular">{r.reference_code}</span>
            {isNew ? <Badge tone="primary">جديد</Badge> : null}
            {r.has_quoted ? <Badge tone="success">قدّمت عرضًا</Badge> : null}
            {r.urgency === 'urgent' ? <Badge tone="danger">عاجل</Badge> : null}
            <RequestStatusBadge status={r.status} />
          </div>
          <h3 className="mt-1 font-semibold text-ink">{r.title}</h3>
          {r.supplier_summary ? <p className="mt-1 text-xs text-muted">{r.supplier_summary}</p> : null}
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            {r.category_name ? <span>{r.category_name}</span> : null}
            {r.city_name ? <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" /> {r.city_name}</span> : null}
            {r.timeline ? <span className="inline-flex items-center gap-1"><CalendarClock className="size-3.5" /> {TIMELINE_LABELS[r.timeline]}</span> : null}
            <span className="inline-flex items-center gap-1"><Clock className="size-3.5" /> {timeAgo(r.published_at || r.created_at)}</span>
          </div>
        </div>
        <div className="shrink-0 text-end text-xs text-muted">
          <div className="text-sm font-semibold text-ink">{r.budget_label ?? 'ميزانية غير محددة'}</div>
          <div className="mt-1 inline-flex items-center gap-1"><Inbox className="size-3.5" /> {r.quotations_count} عروض</div>
          {r.quotation_deadline ? <div className="mt-1">حتى {formatDate(r.quotation_deadline)}</div> : null}
        </div>
      </div>
    </Link>
  );
}
