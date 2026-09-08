import Link from 'next/link';
import { requirePageRole } from '@/lib/auth';
import { listSupplierFeed } from '@/lib/services/requests';
import { PageHeader } from '@/components/ui/misc';
import { EmptyState } from '@/components/ui/empty-state';
import { FeedCard } from '@/components/supplier/feed-card';
import { cn } from '@/lib/utils';

const FILTERS = [
  { key: 'open', label: 'مفتوحة' },
  { key: 'new', label: 'جديدة' },
  { key: 'quoted', label: 'قدّمت عرضًا' },
  { key: 'all', label: 'الكل' },
];

export default async function SupplierRequestsPage({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  const user = await requirePageRole(['supplier']);
  const { f = 'open' } = await searchParams;
  let feed = await listSupplierFeed(user.id, { onlyOpen: f !== 'all' });
  if (f === 'new') feed = feed.filter((r) => r.match_status === 'invited' || r.match_status === 'viewed');
  if (f === 'quoted') feed = feed.filter((r) => r.has_quoted);
  return (
    <>
      <PageHeader title="الطلبات المناسبة" description="طلبات مطابقة لفئاتك ومدنك. لا نرسل لك طلبات خارج تخصصك." />
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((x) => (
          <Link key={x.key} href={`/supplier/requests?f=${x.key}`} className={cn('rounded-full border px-3 py-1 text-sm', x.key === f ? 'border-primary bg-primary-soft text-primary' : 'border-line bg-surface text-ink-2')}>
            {x.label}
          </Link>
        ))}
      </div>
      {feed.length ? <div className="space-y-3">{feed.map((r) => <FeedCard key={r.request_id} r={r} />)}</div> : <EmptyState title="لا توجد طلبات" description="ستصلك إشعارات فور وجود طلب جديد مناسب لخدماتك." />}
    </>
  );
}
