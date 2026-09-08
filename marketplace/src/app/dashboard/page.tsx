import Link from 'next/link';
import { Plus, FileText, Inbox, MessageSquare, CheckCircle2 } from 'lucide-react';
import { requirePageRole } from '@/lib/auth';
import { customerStats } from '@/lib/services/dashboard';
import { listCustomerRequests } from '@/lib/services/requests';
import { listNotifications } from '@/lib/services/notifications';
import { PageHeader, StatCard, Section } from '@/components/ui/misc';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { RequestCard } from '@/components/request/request-card';
import { timeAgo } from '@/lib/utils';

export default async function CustomerHome() {
  const user = await requirePageRole(['customer']);
  const [stats, requests, notifications] = await Promise.all([customerStats(user.id), listCustomerRequests(user.id), listNotifications(user.id, 5)]);
  return (
    <>
      <PageHeader
        title={`أهلًا ${user.fullName.split(' ')[0]}`}
        description="تابع طلباتك وعروضك ومحادثاتك من مكان واحد."
        actions={
          <Button asChild>
            <Link href="/requests/new">
              <Plus /> طلب جديد
            </Link>
          </Button>
        }
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="طلبات نشطة" value={stats.active_requests} icon={<FileText />} href="/dashboard/requests" />
        <StatCard label="عروض جديدة" value={stats.new_quotations} icon={<Inbox />} href="/dashboard/quotations" tone="primary" />
        <StatCard label="رسائل جديدة" value={stats.new_messages} icon={<MessageSquare />} href="/dashboard/messages" />
        <StatCard label="طلبات مكتملة" value={stats.completed_requests} icon={<CheckCircle2 />} href="/dashboard/requests?status=closed" />
      </div>
      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Section title="آخر الطلبات" actions={<Link href="/dashboard/requests" className="text-sm text-primary hover:underline">عرض الكل</Link>}>
            {requests.length ? (
              <div className="space-y-3">
                {requests.slice(0, 4).map((r) => (
                  <RequestCard key={r.id} r={r} href={`/dashboard/requests/${r.id}`} />
                ))}
              </div>
            ) : (
              <EmptyState title="لا توجد طلبات بعد" description="اكتب ما تحتاجه وسنرسل طلبك للمزودين المناسبين." action={<Button asChild><Link href="/requests/new">ابدأ طلبك</Link></Button>} />
            )}
          </Section>
        </div>
        <Section title="آخر الإشعارات" actions={<Link href="/dashboard/notifications" className="text-sm text-primary hover:underline">الكل</Link>}>
          <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
            {notifications.length ? (
              notifications.map((n) => (
                <li key={n.id} className="px-4 py-3">
                  <Link href={n.link || '#'} className="block">
                    <div className={`text-sm ${n.is_read ? 'text-ink-2' : 'font-semibold text-ink'}`}>{n.title}</div>
                    <div className="text-xs text-muted">{timeAgo(n.created_at)}</div>
                  </Link>
                </li>
              ))
            ) : (
              <li className="px-4 py-6 text-center text-sm text-muted">لا توجد إشعارات</li>
            )}
          </ul>
        </Section>
      </div>
    </>
  );
}
