import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requirePageRole } from '@/lib/auth';
import { adminRequestDetail } from '@/lib/services/admin';
import { PageHeader, KeyValue, Section } from '@/components/ui/misc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { RequestStatusBadge, QuotationStatusBadge } from '@/components/ui/status-badge';
import { ActionForm } from '@/components/admin/forms';
import { adminRedispatchAction, adminRequestStatusAction } from '@/actions/admin';
import { formatDateTime, formatSAR } from '@/lib/utils';
import { MATCH_STATUS } from '@/lib/domain/labels';

export default async function AdminRequestPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePageRole(['admin']);
  const { id } = await params;
  const d = await adminRequestDetail(id);
  if (!d) notFound();
  const r = d.request as Record<string, string | number | null>;
  return (
    <>
      <PageHeader title={`${r.reference_code} — ${r.title}`} actions={<RequestStatusBadge status={String(r.status)} />} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card><CardHeader><CardTitle>الطلب</CardTitle></CardHeader><CardContent>
            <p className="text-sm text-ink-2">{r.description}</p>
            <KeyValue className="mt-4" items={[{ label: 'العميل', value: `${r.customer_name} • ${r.customer_phone ?? ''} • ${r.customer_email ?? ''}` }, { label: 'الفئة', value: r.category_name }, { label: 'المدينة', value: r.city_name }, { label: 'الميزانية', value: r.budget_label }, { label: 'أُنشئ', value: formatDateTime(String(r.created_at)) }, { label: 'فتح البيانات', value: r.unlocked_at ? formatDateTime(String(r.unlocked_at)) : '—' }]} />
          </CardContent></Card>
          <Section title={`المزودون المطابقون (${d.matches.length})`}>
            <DataTable rows={d.matches.map((m) => ({ ...m, id: m.supplier_id }))} empty="لم تتم المطابقة" columns={[{ key: 'company_name', header: 'المزود', render: (m) => <Link href={`/admin/users/${m.supplier_id}`} className="text-primary hover:underline">{m.company_name}</Link> }, { key: 'score', header: 'الدرجة' }, { key: 'status', header: 'الحالة', render: (m) => MATCH_STATUS[m.status] ?? m.status }, { key: 'reasons', header: 'الأسباب', render: (m) => m.reasons.join('، ') }]} />
          </Section>
          <Section title={`العروض (${d.quotations.length})`}>
            <DataTable rows={d.quotations} empty="لا توجد عروض" columns={[{ key: 'company_name', header: 'المزود' }, { key: 'price', header: 'السعر', render: (q) => formatSAR(q.price) }, { key: 'delivery_days', header: 'المدة (يوم)', render: (q) => q.delivery_days ?? '—' }, { key: 'status', header: 'الحالة', render: (q) => <QuotationStatusBadge status={q.status} /> }, { key: 'submitted_at', header: 'التاريخ', render: (q) => formatDateTime(q.submitted_at) }]} />
          </Section>
          <Section title="المحادثات">
            <DataTable rows={d.conversations} empty="لا توجد محادثات" columns={[{ key: 'company_name', header: 'المزود' }, { key: 'status', header: 'الحالة' }, { key: 'last_message_at', header: 'آخر رسالة', render: (c) => formatDateTime(c.last_message_at) }, { key: 'id', header: '', render: (c) => <Link href={`/admin/chats/${c.id}`} className="text-primary hover:underline">عرض</Link> }]} />
          </Section>
        </div>
        <div className="space-y-3">
          <Card><CardHeader><CardTitle>إجراءات</CardTitle></CardHeader><CardContent className="flex flex-col gap-2">
            <ActionForm action={adminRedispatchAction} fields={{ id }} label="إعادة المطابقة وإرسال لمزودين إضافيين" />
            <ActionForm action={adminRequestStatusAction} fields={{ id, status: 'reviewing_quotations' }} label="إغلاق استقبال العروض" />
            <ActionForm action={adminRequestStatusAction} fields={{ id, status: 'closed' }} label="تعليم كمكتمل" />
            <ActionForm action={adminRequestStatusAction} fields={{ id, status: 'cancelled', reason: 'أُلغي بواسطة الإدارة' }} label="إلغاء الطلب" variant="destructive" />
          </CardContent></Card>
        </div>
      </div>
    </>
  );
}
