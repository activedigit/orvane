import Link from 'next/link';
import { requirePageRole } from '@/lib/auth';
import { adminListQuotations } from '@/lib/services/admin';
import { PageHeader } from '@/components/ui/misc';
import { DataTable } from '@/components/ui/data-table';
import { QuotationStatusBadge } from '@/components/ui/status-badge';
import { ActionForm } from '@/components/admin/forms';
import { adminSetFeaturedQuotationAction } from '@/actions/admin';
import { formatDateTime, formatSAR } from '@/lib/utils';

export default async function AdminQuotationsPage() {
  await requirePageRole(['admin']);
  const rows = await adminListQuotations();
  return (
    <>
      <PageHeader title="العروض" description="كل العروض المقدمة. يمكن تمييز عرض بشارة «عرض مميز»." />
      <DataTable rows={rows} columns={[
        { key: 'reference_code', header: 'الطلب', render: (q) => <Link href={`/admin/requests/${q.request_id}`} className="text-primary hover:underline">{q.reference_code}</Link> },
        { key: 'request_title', header: 'العنوان' }, { key: 'company_name', header: 'المزود' },
        { key: 'price', header: 'السعر', render: (q) => formatSAR(q.price) }, { key: 'delivery_days', header: 'المدة', render: (q) => q.delivery_days ?? '—' },
        { key: 'status', header: 'الحالة', render: (q) => <QuotationStatusBadge status={q.status} /> }, { key: 'submitted_at', header: 'التاريخ', render: (q) => formatDateTime(q.submitted_at) },
        { key: 'is_featured', header: 'مميز', render: (q) => <ActionForm action={adminSetFeaturedQuotationAction} fields={{ id: q.id, featured: q.is_featured ? 'false' : 'true' }} label={q.is_featured ? 'إزالة التمييز' : 'تمييز'} variant={q.is_featured ? 'ghost' : 'secondary'} /> },
      ]} />
    </>
  );
}
