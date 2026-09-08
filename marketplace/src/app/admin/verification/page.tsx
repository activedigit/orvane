import Link from 'next/link';
import { requirePageRole } from '@/lib/auth';
import { adminListVerificationQueue } from '@/lib/services/admin';
import { PageHeader } from '@/components/ui/misc';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { ActionForm } from '@/components/admin/forms';
import { adminVerificationAction } from '@/actions/admin';
import { formatDate } from '@/lib/utils';
import { VERIFICATION_STATUS } from '@/lib/domain/labels';

export default async function VerificationPage() {
  await requirePageRole(['admin']);
  const rows = await adminListVerificationQueue();
  return (
    <>
      <PageHeader title="توثيق المزودين" description="راجع السجل التجاري والمستندات قبل تفعيل استقبال الطلبات." />
      <DataTable rows={rows.map((r) => ({ ...r, id: r.user_id }))} columns={[
        { key: 'company_name', header: 'الشركة', render: (r) => <Link href={`/admin/users/${r.user_id}`} className="font-medium text-primary hover:underline">{r.company_name}</Link> },
        { key: 'full_name', header: 'المسؤول' },
        { key: 'commercial_register', header: 'السجل', render: (r) => <span className="ltr">{r.commercial_register ?? '—'}</span> },
        { key: 'docs', header: 'مستندات' },
        { key: 'created_at', header: 'التسجيل', render: (r) => formatDate(r.created_at) },
        { key: 'verification_status', header: 'الحالة', render: (r) => <Badge tone={r.verification_status === 'verified' ? 'success' : r.verification_status === 'rejected' ? 'danger' : 'warning'}>{VERIFICATION_STATUS[r.verification_status]}</Badge> },
        { key: 'actions', header: '', render: (r) => r.verification_status === 'verified' ? <ActionForm action={adminVerificationAction} fields={{ supplierId: r.user_id, status: 'pending' }} label="إلغاء التوثيق" variant="ghost" /> : <span className="flex gap-1"><ActionForm action={adminVerificationAction} fields={{ supplierId: r.user_id, status: 'verified' }} label="توثيق" variant="default" /><ActionForm action={adminVerificationAction} fields={{ supplierId: r.user_id, status: 'rejected', note: 'المستندات غير مكتملة' }} label="رفض" variant="ghost" /></span> },
      ]} />
    </>
  );
}
