import Link from 'next/link';
import { requirePageRole } from '@/lib/auth';
import { sql } from '@/lib/db';
import { PageHeader, Section } from '@/components/ui/misc';
import { DataTable } from '@/components/ui/data-table';
import { Field, Input, Select, SubmitButton } from '@/components/admin/forms';
import { adminGrantCreditsAction, adminSettingAction } from '@/actions/admin';
import { getSetting } from '@/lib/settings';
import { formatDateTime } from '@/lib/utils';

export default async function AdminCreditsPage() {
  await requirePageRole(['admin']);
  const [suppliers, ledger, bonus] = await Promise.all([
    sql<{ user_id: string; company_name: string; credits_balance: number }[]>`select user_id, company_name, credits_balance from public.supplier_profiles order by company_name`,
    sql<{ id: string; amount: number; balance_after: number; reason: string; note: string | null; created_at: string; company_name: string; supplier_id: string }[]>`select c.id, c.amount, c.balance_after, c.reason, c.note, c.created_at, c.supplier_id, sp.company_name from public.credits c join public.supplier_profiles sp on sp.user_id = c.supplier_id order by c.created_at desc limit 200`,
    getSetting('supplier.signup_bonus_credits'),
  ]);
  return (
    <>
      <PageHeader title="النقاط الترويجية" description="امنح رصيدًا ترويجيًا لمزود، أو حدد رصيدًا ترحيبيًا تلقائيًا لكل مزود جديد." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="منح نقاط لمزود">
          <form action={adminGrantCreditsAction} className="space-y-3 rounded-lg border border-line bg-surface p-4">
            <Field label="المزود" required><Select name="supplierId" required defaultValue=""><option value="" disabled>اختر</option>{suppliers.map((s) => <option key={s.user_id} value={s.user_id}>{s.company_name} (رصيد {s.credits_balance})</option>)}</Select></Field>
            <Field label="عدد النقاط" required hint="قيمة سالبة للخصم"><Input name="amount" type="number" required /></Field>
            <Field label="ملاحظة"><Input name="note" placeholder="مثال: حملة إطلاق" /></Field>
            <SubmitButton>منح</SubmitButton>
          </form>
        </Section>
        <Section title="الرصيد الترحيبي للمزودين الجدد">
          <form action={adminSettingAction} className="space-y-3 rounded-lg border border-line bg-surface p-4">
            <input type="hidden" name="key" value="supplier.signup_bonus_credits" />
            <Field label="نقاط عند التسجيل" hint="0 لتعطيل"><Input name="value" type="number" defaultValue={Number(bonus)} /></Field>
            <SubmitButton variant="secondary">حفظ</SubmitButton>
          </form>
        </Section>
      </div>
      <Section title="سجل الحركات" className="mt-8">
        <DataTable rows={ledger} columns={[{ key: 'created_at', header: 'التاريخ', render: (r) => formatDateTime(r.created_at) }, { key: 'company_name', header: 'المزود', render: (r) => <Link href={`/admin/users/${r.supplier_id}`} className="text-primary hover:underline">{r.company_name}</Link> }, { key: 'reason', header: 'النوع' }, { key: 'note', header: 'ملاحظة', render: (r) => r.note ?? '—' }, { key: 'amount', header: 'المبلغ', render: (r) => <span className={r.amount < 0 ? 'text-danger' : 'text-success'}>{r.amount}</span> }, { key: 'balance_after', header: 'الرصيد' }]} />
      </Section>
    </>
  );
}
