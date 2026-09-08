import { requirePageRole } from '@/lib/auth';
import { adminListPricingRules } from '@/lib/services/admin';
import { getCategories } from '@/lib/services/reference';
import { getSetting } from '@/lib/settings';
import { PageHeader, Section, Alert } from '@/components/ui/misc';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { ActionForm, Field, Input, Select, SubmitButton } from '@/components/admin/forms';
import { adminDeletePricingRuleAction, adminPricingRuleAction, adminSettingAction } from '@/actions/admin';
import { formatSAR } from '@/lib/utils';

export default async function PricingPage() {
  await requirePageRole(['admin']);
  const [rules, categories, defaultPrice] = await Promise.all([adminListPricingRules(), getCategories(), getSetting('pricing.default_lead_price')]);
  return (
    <>
      <PageHeader title="أسعار فتح بيانات العملاء" description="السعر يُحدد حسب الفئة وقيمة المشروع (قيمة العرض المختار). القاعدة الأكثر تحديدًا تفوز، ثم الأولوية الأعلى." />
      <Alert tone="info" className="mb-4">السعر الافتراضي عند عدم تطابق أي قاعدة: <strong>{formatSAR(defaultPrice)}</strong>. غيّره من الإعدادات أو من هنا:
        <form action={adminSettingAction} className="mt-2 flex gap-2"><input type="hidden" name="key" value="pricing.default_lead_price" /><Input name="value" type="number" defaultValue={Number(defaultPrice)} className="h-9 max-w-32" /><SubmitButton size="sm" variant="secondary">حفظ</SubmitButton></form>
      </Alert>
      <DataTable rows={rules} columns={[
        { key: 'name_ar', header: 'القاعدة' }, { key: 'category_name', header: 'الفئة', render: (r) => r.category_name ?? 'كل الفئات' },
        { key: 'min_project_value', header: 'من (ر.س)', render: (r) => (r.min_project_value ? formatSAR(r.min_project_value, { withCurrency: false }) : '—') }, { key: 'max_project_value', header: 'إلى (ر.س)', render: (r) => (r.max_project_value ? formatSAR(r.max_project_value, { withCurrency: false }) : '—') },
        { key: 'price', header: 'السعر', render: (r) => <strong>{formatSAR(r.price)}</strong> }, { key: 'priority', header: 'الأولوية' },
        { key: 'is_active', header: 'الحالة', render: (r) => <Badge tone={r.is_active ? 'success' : 'neutral'}>{r.is_active ? 'فعّالة' : 'موقوفة'}</Badge> },
        { key: 'id', header: '', render: (r) => <span className="flex gap-1"><ActionForm action={adminPricingRuleAction} fields={{ id: r.id, nameAr: r.name_ar, categoryId: r.category_id ?? '', minValue: r.min_project_value ?? '', maxValue: r.max_project_value ?? '', price: r.price, priority: String(r.priority), isActive: r.is_active ? '' : 'on' }} label={r.is_active ? 'إيقاف' : 'تفعيل'} variant="ghost" /><ActionForm action={adminDeletePricingRuleAction} fields={{ id: r.id }} label="حذف" variant="ghost" /></span> },
      ]} />
      <Section title="إضافة قاعدة" className="mt-8">
        <form action={adminPricingRuleAction} className="grid gap-3 rounded-lg border border-line bg-surface p-4 sm:grid-cols-3">
          <Field label="الاسم" required><Input name="nameAr" required placeholder="مثال: مشروع متوسط" /></Field>
          <Field label="الفئة"><Select name="categoryId" defaultValue=""><option value="">كل الفئات</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name_ar}</option>)}</Select></Field>
          <Field label="السعر (ر.س)" required><Input name="price" type="number" min={0} required /></Field>
          <Field label="من قيمة مشروع"><Input name="minValue" type="number" min={0} /></Field>
          <Field label="إلى قيمة مشروع"><Input name="maxValue" type="number" min={0} /></Field>
          <Field label="الأولوية"><Input name="priority" type="number" defaultValue={10} /></Field>
          <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" name="isActive" defaultChecked className="size-4 accent-primary" /> فعّالة</label>
          <div className="flex items-end"><SubmitButton>إضافة</SubmitButton></div>
        </form>
      </Section>
    </>
  );
}
