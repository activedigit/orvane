import { requirePageRole } from '@/lib/auth';
import { adminFunnel, adminRevenueByCategory, adminRevenueByCity, adminTopSuppliers, adminTopCategories, adminOverview } from '@/lib/services/admin';
import { PageHeader, Section, StatCard } from '@/components/ui/misc';
import { Funnel } from '@/components/admin/funnel';
import { DataTable } from '@/components/ui/data-table';
import { formatSAR } from '@/lib/utils';

export default async function AnalyticsPage() {
  await requirePageRole(['admin']);
  const [o, f, byCat, byCity, top, cats] = await Promise.all([adminOverview(), adminFunnel(), adminRevenueByCategory(), adminRevenueByCity(), adminTopSuppliers(10), adminTopCategories(10)]);
  return (
    <>
      <PageHeader title="التحليلات" description="الأداء التجاري للمنصة." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="الطلبات" value={o.requests} /><StatCard label="العروض" value={o.quotations} /><StatCard label="متوسط العروض / طلب" value={o.avg_quotes} />
        <StatCard label="الإيرادات" value={formatSAR(o.revenue)} tone="primary" /><StatCard label="معدل اختيار المزود" value={`${o.selection_rate}%`} /><StatCard label="معدل فتح البيانات" value={`${o.unlock_rate}%`} />
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Section title="قمع التحويل"><div className="rounded-lg border border-line bg-surface p-4"><Funnel f={f} /></div></Section>
        <div className="space-y-6">
          <Section title="الإيرادات حسب الفئة"><DataTable rows={byCat.map((r) => ({ ...r, id: r.name_ar }))} empty="لا توجد إيرادات بعد" columns={[{ key: 'name_ar', header: 'الفئة' }, { key: 'unlocks', header: 'عمليات فتح' }, { key: 'revenue', header: 'الإيراد', render: (r) => formatSAR(r.revenue) }]} /></Section>
          <Section title="الإيرادات حسب المدينة"><DataTable rows={byCity.map((r) => ({ ...r, id: r.name_ar }))} empty="لا توجد إيرادات بعد" columns={[{ key: 'name_ar', header: 'المدينة' }, { key: 'unlocks', header: 'عمليات فتح' }, { key: 'revenue', header: 'الإيراد', render: (r) => formatSAR(r.revenue) }]} /></Section>
        </div>
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Section title="أفضل المزودين"><DataTable rows={top.map((t) => ({ ...t, id: t.user_id }))} columns={[{ key: 'company_name', header: 'المزود' }, { key: 'won_count', header: 'فوز' }, { key: 'quotations_count', header: 'عروض' }, { key: 'rating_avg', header: 'تقييم' }, { key: 'revenue', header: 'إيراد', render: (r) => formatSAR(r.revenue) }]} /></Section>
        <Section title="أفضل الفئات"><DataTable rows={cats.map((c) => ({ ...c, id: c.name_ar }))} columns={[{ key: 'name_ar', header: 'الفئة' }, { key: 'requests', header: 'طلبات' }, { key: 'quotations', header: 'عروض' }]} /></Section>
      </div>
    </>
  );
}
