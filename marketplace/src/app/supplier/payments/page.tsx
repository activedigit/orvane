import { requirePageRole } from '@/lib/auth';
import { supplierPayments } from '@/lib/services/dashboard';
import { PageHeader } from '@/components/ui/misc';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { formatDateTime, formatSAR } from '@/lib/utils';
import { PAYMENT_STATUS } from '@/lib/domain/labels';
import { PAYMENT_METHOD_LABELS } from '@/lib/payments/gateway';

const PURPOSE: Record<string, string> = { lead_unlock: 'فتح بيانات عميل', subscription: 'اشتراك', credits: 'شراء نقاط' };

export default async function PaymentsPage() {
  const user = await requirePageRole(['supplier']);
  const rows = await supplierPayments(user.id);
  return (
    <>
      <PageHeader title="المدفوعات" description="سجل عمليات الدفع الخاصة بحسابك." />
      <DataTable rows={rows} empty="لا توجد مدفوعات" columns={[
        { key: 'created_at', header: 'التاريخ', render: (r) => formatDateTime(r.created_at) },
        { key: 'purpose', header: 'الغرض', render: (r) => PURPOSE[r.purpose] ?? r.purpose },
        { key: 'amount', header: 'المبلغ', className: 'tabular', render: (r) => formatSAR(r.amount) },
        { key: 'payment_method', header: 'الطريقة', render: (r) => (r.payment_method ? PAYMENT_METHOD_LABELS[r.payment_method as keyof typeof PAYMENT_METHOD_LABELS] ?? r.payment_method : '—') },
        { key: 'status', header: 'الحالة', render: (r) => <Badge tone={r.status === 'succeeded' ? 'success' : r.status === 'failed' ? 'danger' : 'warning'}>{PAYMENT_STATUS[r.status] ?? r.status}</Badge> },
      ]} />
    </>
  );
}
