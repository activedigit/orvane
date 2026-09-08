import Link from 'next/link';
import { requirePageRole } from '@/lib/auth';
import { adminListUsers } from '@/lib/services/admin';
import { PageHeader } from '@/components/ui/misc';
import { DataTable } from '@/components/ui/data-table';
import { ActionForm } from '@/components/admin/forms';
import { adminUserStatusAction } from '@/actions/admin';
import { formatDate } from '@/lib/utils';

export default async function BlockedPage() {
  await requirePageRole(['admin']);
  const rows = await adminListUsers({ status: 'blocked' });
  return (
    <>
      <PageHeader title="المستخدمون المحظورون" />
      <DataTable rows={rows} empty="لا يوجد مستخدمون محظورون" columns={[{ key: 'full_name', header: 'الاسم', render: (r) => <Link href={`/admin/users/${r.id}`} className="text-primary hover:underline">{r.full_name}</Link> }, { key: 'company_name', header: 'الشركة', render: (r) => r.company_name ?? '—' }, { key: 'email', header: 'البريد', render: (r) => <span className="ltr">{r.email}</span> }, { key: 'role', header: 'الدور' }, { key: 'created_at', header: 'التسجيل', render: (r) => formatDate(r.created_at) }, { key: 'id', header: '', render: (r) => <ActionForm action={adminUserStatusAction} fields={{ userId: r.id, status: 'active' }} label="إلغاء الحظر" /> }]} />
    </>
  );
}
