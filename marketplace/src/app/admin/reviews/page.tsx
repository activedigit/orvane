import { requirePageRole } from '@/lib/auth';
import { adminListReviews } from '@/lib/services/admin';
import { PageHeader, Stars } from '@/components/ui/misc';
import { DataTable } from '@/components/ui/data-table';
import { ActionForm } from '@/components/admin/forms';
import { adminReviewStatusAction } from '@/actions/admin';
import { formatDate, truncate } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export default async function AdminReviewsPage() {
  await requirePageRole(['admin']);
  const rows = await adminListReviews();
  return (
    <>
      <PageHeader title="التقييمات" description="إخفاء التقييمات المخالفة يعيد حساب متوسط المزود تلقائيًا." />
      <DataTable rows={rows} columns={[
        { key: 'company_name', header: 'المزود' }, { key: 'customer_name', header: 'العميل' }, { key: 'request_title', header: 'الطلب' },
        { key: 'overall', header: 'التقييم', render: (r) => <Stars value={r.overall} /> }, { key: 'comment', header: 'التعليق', render: (r) => truncate(r.comment, 60) },
        { key: 'status', header: 'الحالة', render: (r) => <Badge tone={r.status === 'published' ? 'success' : 'neutral'}>{r.status === 'published' ? 'منشور' : 'مخفي'}</Badge> }, { key: 'created_at', header: 'التاريخ', render: (r) => formatDate(r.created_at) },
        { key: 'id', header: '', render: (r) => <ActionForm action={adminReviewStatusAction} fields={{ id: r.id, status: r.status === 'published' ? 'hidden' : 'published' }} label={r.status === 'published' ? 'إخفاء' : 'نشر'} variant="ghost" /> },
      ]} />
    </>
  );
}
