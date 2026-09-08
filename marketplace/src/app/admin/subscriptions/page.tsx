import { requirePageRole } from '@/lib/auth';
import { adminListSubscriptions } from '@/lib/services/admin';
import { sql } from '@/lib/db';
import { PageHeader, Section } from '@/components/ui/misc';
import { DataTable } from '@/components/ui/data-table';
import { Field, Input, SubmitButton, Textarea } from '@/components/admin/forms';
import { adminPlanAction } from '@/actions/admin';
import { formatDate, formatSAR } from '@/lib/utils';

export default async function AdminSubscriptionsPage() {
  await requirePageRole(['admin']);
  const [subs, plans] = await Promise.all([adminListSubscriptions(), sql<{ id: string; slug: string; name_ar: string; description_ar: string | null; price_monthly: string; included_leads: number; features: string[]; is_active: boolean; sort_order: number }[]>`select * from public.subscription_plans order by sort_order`]);
  return (
    <>
      <PageHeader title="الاشتراكات والباقات" />
      <Section title="الباقات">
        <div className="grid gap-4 lg:grid-cols-3">
          {[...plans, null].map((p, i) => (
            <form key={p?.id ?? 'new'} action={adminPlanAction} className="space-y-2 rounded-lg border border-line bg-surface p-4">
              {p ? <input type="hidden" name="id" value={p.id} /> : null}
              <h3 className="font-semibold text-ink">{p ? p.name_ar : 'باقة جديدة'}</h3>
              <div className="grid grid-cols-2 gap-2">
                <Field label="المعرّف (slug)"><Input name="slug" defaultValue={p?.slug ?? ''} dir="ltr" required /></Field>
                <Field label="الاسم"><Input name="nameAr" defaultValue={p?.name_ar ?? ''} required /></Field>
                <Field label="السعر الشهري"><Input name="priceMonthly" type="number" defaultValue={p ? Number(p.price_monthly) : ''} required /></Field>
                <Field label="عدد العملاء"><Input name="includedLeads" type="number" defaultValue={p?.included_leads ?? ''} required /></Field>
              </div>
              <Field label="الوصف"><Input name="descriptionAr" defaultValue={p?.description_ar ?? ''} /></Field>
              <Field label="المميزات (سطر لكل ميزة)"><Textarea name="features" rows={3} defaultValue={p?.features.join('\n') ?? ''} className="min-h-20" /></Field>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isActive" defaultChecked={p ? p.is_active : true} className="size-4 accent-primary" /> فعّالة</label>
                <input type="hidden" name="sortOrder" value={p?.sort_order ?? i + 1} />
                <SubmitButton size="sm">{p ? 'حفظ' : 'إضافة'}</SubmitButton>
              </div>
            </form>
          ))}
        </div>
      </Section>
      <Section title="اشتراكات المزودين" className="mt-8">
        <DataTable rows={subs} empty="لا توجد اشتراكات" columns={[{ key: 'company_name', header: 'المزود' }, { key: 'plan_name', header: 'الباقة' }, { key: 'status', header: 'الحالة' }, { key: 'used_leads', header: 'المستخدم', render: (s) => `${s.used_leads} / ${s.included_leads}` }, { key: 'starts_at', header: 'من', render: (s) => formatDate(s.starts_at) }, { key: 'ends_at', header: 'إلى', render: (s) => formatDate(s.ends_at) }]} />
      </Section>
      <p className="mt-4 text-xs text-muted">أسعار الباقات بالريال السعودي. مثال: {plans.map((p) => `${p.name_ar} ${formatSAR(p.price_monthly)}`).join('، ')}</p>
    </>
  );
}
