import { requirePageRole } from '@/lib/auth';
import { supplierCredits, supplierStats } from '@/lib/services/dashboard';
import { PageHeader, StatCard, Section } from '@/components/ui/misc';
import { DataTable } from '@/components/ui/data-table';
import { BuyCredits } from '@/components/supplier/buy-credits';
import { formatDateTime } from '@/lib/utils';
import { Coins } from 'lucide-react';

const REASONS: Record<string, string> = { purchase: 'شراء', promo: 'رصيد ترويجي', admin_grant: 'تعديل إداري', lead_unlock: 'فتح بيانات عميل', refund: 'استرداد', signup_bonus: 'رصيد ترحيبي' };

export default async function CreditsPage() {
  const user = await requirePageRole(['supplier']);
  const [stats, ledger] = await Promise.all([supplierStats(user.id), supplierCredits(user.id)]);
  return (
    <>
      <PageHeader title="الرصيد" description="نقطة واحدة = ريال واحد عند فتح بيانات العملاء. اشحن رصيدك مسبقًا لفتح البيانات فورًا." />
      <div className="grid gap-3 sm:grid-cols-3"><StatCard label="رصيدك الحالي" value={`${stats.credits_balance} نقطة`} icon={<Coins />} tone="primary" /></div>
      <div className="mt-8"><Section title="شحن الرصيد"><BuyCredits /></Section></div>
      <div className="mt-8">
        <Section title="سجل الحركات">
          <DataTable rows={ledger} empty="لا توجد حركات" columns={[
            { key: 'created_at', header: 'التاريخ', render: (r) => formatDateTime(r.created_at) },
            { key: 'reason', header: 'النوع', render: (r) => REASONS[r.reason] ?? r.reason },
            { key: 'note', header: 'ملاحظة', render: (r) => r.note ?? '—' },
            { key: 'amount', header: 'المبلغ', className: 'tabular', render: (r) => <span className={r.amount < 0 ? 'text-danger' : 'text-success'}>{r.amount > 0 ? '+' : ''}{r.amount}</span> },
            { key: 'balance_after', header: 'الرصيد بعدها', className: 'tabular' },
          ]} />
        </Section>
      </div>
    </>
  );
}
