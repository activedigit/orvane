import Link from 'next/link';
import { MapPin, Inbox, MessageSquare, Clock } from 'lucide-react';
import { RequestStatusBadge } from '@/components/ui/status-badge';
import { Badge } from '@/components/ui/badge';
import { timeAgo } from '@/lib/utils';
import type { RequestListItem } from '@/lib/services/requests';

export function RequestCard({ r, href }: { r: RequestListItem; href: string }) {
  return (
    <Link href={href} className="block rounded-lg border border-line bg-surface p-4 shadow-card transition-colors hover:border-primary/40">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted tabular">{r.reference_code}</span>
            <RequestStatusBadge status={r.status} />
            {r.urgency === 'urgent' ? <Badge tone="danger">عاجل</Badge> : null}
          </div>
          <h3 className="mt-1 truncate font-semibold text-ink">{r.title}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            {r.category_name ? <span>{r.category_name}</span> : null}
            {r.city_name ? (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3.5" /> {r.city_name}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5" /> {timeAgo(r.created_at)}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1 text-xs text-muted">
          <span className="inline-flex items-center gap-1">
            <Inbox className="size-3.5" /> {r.quotations_count} عروض
          </span>
          {r.unread_messages > 0 ? (
            <span className="inline-flex items-center gap-1 font-medium text-primary">
              <MessageSquare className="size-3.5" /> {r.unread_messages} جديدة
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
