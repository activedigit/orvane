import Link from 'next/link';
import { Avatar } from '@/components/ui/misc';
import { Badge } from '@/components/ui/badge';
import { timeAgo, truncate } from '@/lib/utils';
import type { ConversationListItem } from '@/lib/services/chat';

export function ConversationList({ items }: { items: ConversationListItem[] }) {
  return (
    <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
      {items.map((c) => (
        <li key={c.id}>
          <Link href={`/chat/${c.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-canvas/70">
            <Avatar name={c.other_party_label} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className={`truncate text-sm ${c.unread_count ? 'font-bold text-ink' : 'font-medium text-ink'}`}>{c.other_party_label}</span>
                <span className="shrink-0 text-xs text-muted">{timeAgo(c.last_message_at || c.created_at)}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-xs text-muted">{c.reference_code} • {truncate(c.last_message_preview || c.request_title, 60)}</span>
                <span className="flex shrink-0 items-center gap-1">
                  {c.unlocked ? <Badge tone="success">مفتوح</Badge> : null}
                  {c.unread_count ? <span className="rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-fg">{c.unread_count}</span> : null}
                </span>
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
