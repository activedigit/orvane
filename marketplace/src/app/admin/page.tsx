import Link from 'next/link';
import { requirePageRole } from '@/lib/auth';
import { adminOverview, adminFunnel, adminTopSuppliers, adminTopCategories, adminListReports, adminListVerificationQueue } from '@/lib/services/admin';
import { PageHeader, StatCard, Section } from '@/components/ui/misc';
import { Funnel } from '@/components/admin/funnel';
import { DataTable } from '@/components/ui/data-table';
import { formatSAR } from '@/lib/utils';

export default async function AdminHome() {
  await requirePageRole(['admin']);
  const [o, f, top, cats, reports, queue] = await Promise.all([adminOverview(), adminFunnel(), adminTopSuppliers(5), adminTopCategories(5), adminListReports(), adminListVerificationQueue()]);
  const openReports = reports.filter((r) => ['open', 'reviewing'].includes(r.status)).slice(0, 5);
  const pendingQ = queue.filter((q) => q.verification_status !== 'verified' && q.verification_status !== 'rejected').slice(0, 5);
  return (
    <>
      <PageHeader title="نظرة عامة" description="مؤشرات المنصة الرئيسية وقمع التحويل." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="عدد الطلبات" value={o.requests} href="/admin/requests" />
        <StatCard label="عدد العروض" value={o.quotations} hint={`متوسط ${o.avg_quotes} عرض لكل طلب`} href="/admin/quotations" />
        <StatCard label="الإيرادات" value={formatSAR(o.revenue)} tone="primary" href="/admin/payments" />
        <StatCard label="معدل فتح البيانات" value={`${o.unlock_rate}%`} hint={`معدل اختيار المزود ${o.selection_rate}%`} />
        <StatCard label="المزودون" value={o.suppliers} href="/admin/users?role=supplier" />
        <StatCard label="العملاء" value={o.customers} href="/admin/users?role=customer" />
        <StatCard label="بانتظار التوثيق" value={o.pending_verifications} href="/admin/verification" />
        <StatCard label="بلاغات مفتوحة" value={o.open_reports} href="/admin/reports" />
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Section title="قمع التحويل"><div className="rounded-lg border border-line bg-surface p-4"><Funnel f={f} /></div></Section>
        <div className="space-y-6">
          <Section title="أفضل المزودين" actions={<Link href="/admin/analytics" className="text-sm text-primary hover:underline">التحليلات</Link>}>
            <DataTable rows={top.map((t) => ({ ...t, id: t.user_id }))} columns={[{ key: 'company_name', header: 'المزود', render: (r) => <Link href={`/admin/users/${r.user_id}`} className="text-primary hover:underline">{r.company_name}</Link> }, { key: 'won_count', header: 'فوز' }, { key: 'quotations_count', header: 'عروض' }, { key: 'revenue', header: 'إيراد', render: (r) => formatSAR(r.revenue) }]} />
          </Section>
          <Section title="أفضل الفئات">
            <DataTable rows={cats.map((c) => ({ ...c, id: c.name_ar }))} columns={[{ key: 'name_ar', header: 'الفئة' }, { key: 'requests', header: 'طلبات' }, { key: 'quotations', header: 'عروض' }]} />
          </Section>
        </div>
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Section title="بلاغات تحتاج مراجعة" actions={<Link href="/admin/reports" className="text-sm text-primary hover:underline">الكل</Link>}>
          <DataTable rows={openReports} empty="لا توجد بلاغات مفتوحة" columns={[{ key: 'reason', header: 'السبب' }, { key: 'reporter_name', header: 'المبلّغ', render: (r) => r.reporter_name ?? '—' }, { key: 'reported_name', header: 'ضد', render: (r) => r.reported_name ?? '—' }]} />
        </Section>
        <Section title="مزودون بانتظار التوثيق" actions={<Link href="/admin/verification" className="text-sm text-primary hover:underline">الكل</Link>}>
          <DataTable rows={pendingQ.map((q) => ({ ...q, id: q.user_id }))} empty="لا يوجد" columns={[{ key: 'company_name', header: 'الشركة', render: (r) => <Link href={`/admin/users/${r.user_id}`} className="text-primary hover:underline">{r.company_name}</Link> }, { key: 'docs', header: 'مستندات' }]} />
        </Section>
      </div>
    </>
  );
}
