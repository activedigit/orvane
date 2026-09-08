import { requirePageRole } from '@/lib/auth';
import { adminListPayments } from '@/lib/services/admin';
import { PageHeader } from '@/components/ui/misc';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { ActionForm } from '@/components/admin/forms';
import { adminMarkPaymentPaidAction } from '@/actions/admin';
import { formatDateTime, formatSAR } from '@/lib/utils';
import { PAYMENT_STATUS } from '@/lib/domain/labels';

const PURPOSE: Record<string, string> = { lead_unlock: 'فتح بيانات عميل', subscription: 'اشتراك', credits: 'شراء نقاط' };

export default async function AdminPaymentsPage() {
  await requirePageRole(['admin']);
  const rows = await adminListPayments();
  return (
    <>
      <PageHeader title="المدفوعات" description="جميع عمليات الدفع. يمكن تأكيد عملية معلقة يدويًا (تحويل بنكي مثلًا)." />
      <DataTable rows={rows} columns={[
        { key: 'created_at', header: 'التاريخ', render: (p) => formatDateTime(p.created_at) }, { key: 'user_name', header: 'المستخدم', render: (p) => p.company_name ?? p.user_name },
        { key: 'purpose', header: 'الغرض', render: (p) => PURPOSE[p.purpose] ?? p.purpose }, { key: 'amount', header: 'المبلغ', render: (p) => formatSAR(p.amount) },
        { key: 'gateway', header: 'البوابة', render: (p) => `${p.gateway}${p.payment_method ? ` / ${p.payment_method}` : ''}` },
        { key: 'status', header: 'الحالة', render: (p) => <Badge tone={p.status === 'succeeded' ? 'success' : p.status === 'failed' ? 'danger' : 'warning'}>{PAYMENT_STATUS[p.status]}</Badge> },
        { key: 'id', header: '', render: (p) => (p.status === 'pending' || p.status === 'failed' ? <ActionForm action={adminMarkPaymentPaidAction} fields={{ id: p.id }} label="تأكيد الدفع يدويًا" /> : null) },
      ]} />
    </>
  );
}
