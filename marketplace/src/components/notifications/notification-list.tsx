'use client';
import { useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, CheckCheck } from 'lucide-react';
import { markNotificationsReadAction } from '@/actions/profile';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { timeAgo, cn } from '@/lib/utils';
import type { NotificationRow } from '@/lib/db/types';

export function NotificationList({ items }: { items: NotificationRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const unread = items.filter((n) => !n.is_read).length;
  if (!items.length) return <EmptyState icon={Bell} title="لا توجد إشعارات" description="ستصلك هنا تنبيهات العروض والرسائل والتحديثات." />;
  return (
    <div>
      {unread ? (
        <div className="mb-3 flex justify-end">
          <Button variant="ghost" size="sm" loading={pending} onClick={() => start(async () => { await markNotificationsReadAction(); router.refresh(); })}>
            <CheckCheck /> تعليم الكل كمقروء
          </Button>
        </div>
      ) : null}
      <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
        {items.map((n) => (
          <li key={n.id} className={cn('px-4 py-3', !n.is_read && 'bg-primary-soft/30')}>
            <Link
              href={n.link || '#'}
              onClick={() => {
                if (!n.is_read) start(async () => { await markNotificationsReadAction([n.id]); });
              }}
              className="block"
            >
              <div className={cn('text-sm', n.is_read ? 'text-ink-2' : 'font-semibold text-ink')}>{n.title}</div>
              {n.body ? <div className="mt-0.5 text-xs text-muted">{n.body}</div> : null}
              <div className="mt-0.5 text-[11px] text-muted">{timeAgo(n.created_at)}</div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
