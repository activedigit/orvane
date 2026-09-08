import Link from 'next/link';
import { Plus } from 'lucide-react';
import { requirePageRole } from '@/lib/auth';
import { listCustomerRequests } from '@/lib/services/requests';
import { PageHeader } from '@/components/ui/misc';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { RequestCard } from '@/components/request/request-card';
import { REQUEST_STATUS } from '@/lib/domain/labels';
import { cn } from '@/lib/utils';
import type { RequestStatus } from '@/lib/db/types';

const FILTERS: { key: string; label: string; statuses?: RequestStatus[] }[] = [
  { key: 'all', label: 'الكل' },
  { key: 'active', label: 'نشطة', statuses: ['waiting_suppliers', 'receiving_quotations', 'reviewing_quotations'] },
  { key: 'selected', label: 'تم اختيار مزود', statuses: ['supplier_selected'] },
  { key: 'closed', label: 'مكتملة', statuses: ['closed'] },
  { key: 'cancelled', label: 'ملغاة', statuses: ['cancelled'] },
];

export default async function RequestsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const user = await requirePageRole(['customer']);
  const { status = 'all' } = await searchParams;
  const f = FILTERS.find((x) => x.key === status) ?? FILTERS[0];
  const requests = await listCustomerRequests(user.id, { status: f.statuses });
  return (
    <>
      <PageHeader title="طلباتي" actions={<Button asChild><Link href="/requests/new"><Plus /> طلب جديد</Link></Button>} />
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((x) => (
          <Link key={x.key} href={`/dashboard/requests?status=${x.key}`} className={cn('rounded-full border px-3 py-1 text-sm', x.key === f.key ? 'border-primary bg-primary-soft text-primary' : 'border-line bg-surface text-ink-2 hover:border-line-2')}>
            {x.label}
          </Link>
        ))}
      </div>
      {requests.length ? (
        <div className="space-y-3">
          {requests.map((r) => (
            <RequestCard key={r.id} r={r} href={`/dashboard/requests/${r.id}`} />
          ))}
        </div>
      ) : (
        <EmptyState title="لا توجد طلبات هنا" description={f.key === 'all' ? 'ابدأ طلبك الأول وسنرسله للمزودين المناسبين.' : `لا توجد طلبات بحالة «${f.label}».`} action={<Button asChild><Link href="/requests/new">ابدأ طلبك</Link></Button>} />
      )}
      <p className="sr-only">{Object.values(REQUEST_STATUS).map((s) => s.label).join(' ')}</p>
    </>
  );
}
