import Link from 'next/link';
import { Inbox, Send, UserCheck, Trophy, Banknote, AlertTriangle, Lock } from 'lucide-react';
import { requirePageRole } from '@/lib/auth';
import { supplierStats } from '@/lib/services/dashboard';
import { listSupplierFeed } from '@/lib/services/requests';
import { listSupplierSelections } from '@/lib/services/selection';
import { getOwnSupplierProfile } from '@/lib/services/suppliers';
import { PageHeader, StatCard, Section, Alert } from '@/components/ui/misc';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { FeedCard } from '@/components/supplier/feed-card';
import { formatSAR } from '@/lib/utils';
import { VERIFICATION_STATUS } from '@/lib/domain/labels';

export default async function SupplierHome() {
  const user = await requirePageRole(['supplier']);
  const [stats, feed, selections, own] = await Promise.all([supplierStats(user.id), listSupplierFeed(user.id, { onlyOpen: true }), listSupplierSelections(user.id), getOwnSupplierProfile(user.id)]);
  const pending = selections.filter((s) => s.status === 'pending_unlock');
  const verification = own?.profile.verification_status ?? 'pending';
  return (
    <>
      <PageHeader title={own?.profile.company_name ?? user.fullName} description="ملخص نشاطك: طلبات جديدة، عروضك، والعملاء الذين اختاروك." />
      {verification !== 'verified' ? (
        <Alert tone="warning" title={`حالة التوثيق: ${VERIFICATION_STATUS[verification]}`} className="mb-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>لن تستقبل الطلبات ولن تتمكن من تقديم العروض حتى يتم توثيق حسابك برفع السجل التجاري.</span>
            <Button asChild size="sm" variant="secondary"><Link href="/supplier/profile#verification">رفع المستندات</Link></Button>
          </div>
        </Alert>
      ) : null}
      {pending.length ? (
        <Alert tone="success" title="مبروك! العميل اختار عرضك ويرغب بالتواصل معك." className="mb-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>لديك {pending.length} عميل بانتظار فتح بيانات التواصل.</span>
            <Button asChild size="sm"><Link href={`/supplier/leads/${pending[0].id}`}><Lock /> فتح بيانات العميل</Link></Button>
          </div>
        </Alert>
      ) : null}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="طلبات جديدة" value={stats.new_requests} icon={<Inbox />} href="/supplier/requests" tone="primary" />
        <StatCard label="عروض مرسلة" value={stats.sent_quotations} icon={<Send />} href="/supplier/quotations" />
        <StatCard label="عملاء اختاروني" value={stats.selected_by_customers} icon={<UserCheck />} href="/supplier/leads" />
        <StatCard label="معدل الفوز" value={`${stats.win_rate}%`} icon={<Trophy />} />
        <StatCard label="قيمة المشاريع المحتملة" value={formatSAR(stats.pipeline_value)} icon={<Banknote />} hint="مجموع عروضك على الطلبات المفتوحة" />
      </div>
      <div className="mt-8">
        <Section title="طلبات مناسبة لخدماتك" actions={<Link href="/supplier/requests" className="text-sm text-primary hover:underline">عرض الكل</Link>}>
          {feed.length ? (
            <div className="space-y-3">{feed.slice(0, 5).map((r) => <FeedCard key={r.request_id} r={r} />)}</div>
          ) : (
            <EmptyState icon={AlertTriangle} title="لا توجد طلبات مفتوحة حاليًا" description="ستصلك إشعارات فور وجود طلب جديد في فئاتك ومدنك." />
          )}
        </Section>
      </div>
    </>
  );
}
