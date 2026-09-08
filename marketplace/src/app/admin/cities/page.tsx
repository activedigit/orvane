import { requirePageRole } from '@/lib/auth';
import { adminAllCities } from '@/lib/services/admin';
import { PageHeader, Section } from '@/components/ui/misc';
import { Field, Input, SubmitButton } from '@/components/admin/forms';
import { adminCityAction } from '@/actions/admin';

export default async function AdminCitiesPage() {
  await requirePageRole(['admin']);
  const cities = await adminAllCities();
  return (
    <>
      <PageHeader title="المدن" description="المدن المتاحة للطلبات ونطاقات تغطية المزودين." />
      <div className="space-y-2">
        {cities.map((c) => (
          <form key={c.id} action={adminCityAction} className="flex flex-wrap items-end gap-2 rounded-lg border border-line bg-surface p-3">
            <input type="hidden" name="id" value={c.id} />
            <Field label="الاسم"><Input name="nameAr" defaultValue={c.name_ar} className="h-9" required /></Field>
            <Field label="slug"><Input name="slug" defaultValue={c.slug} dir="ltr" className="h-9" required /></Field>
            <Field label="المنطقة"><Input name="regionAr" defaultValue={c.region_ar ?? ''} className="h-9" /></Field>
            <Field label="الترتيب"><Input name="sortOrder" type="number" defaultValue={c.sort_order} className="h-9 w-20" /></Field>
            <label className="flex items-center gap-1 pb-2 text-xs"><input type="checkbox" name="isActive" defaultChecked={c.is_active} className="size-4 accent-primary" /> فعّالة</label>
            <SubmitButton size="sm" variant="secondary">حفظ</SubmitButton>
          </form>
        ))}
      </div>
      <Section title="إضافة مدينة" className="mt-8">
        <form action={adminCityAction} className="flex flex-wrap items-end gap-2 rounded-lg border border-dashed border-line-2 bg-surface p-3">
          <Field label="الاسم"><Input name="nameAr" className="h-9" required /></Field>
          <Field label="slug"><Input name="slug" dir="ltr" className="h-9" required /></Field>
          <Field label="المنطقة"><Input name="regionAr" className="h-9" /></Field>
          <input type="hidden" name="sortOrder" value={cities.length} /><input type="hidden" name="isActive" value="on" />
          <SubmitButton size="sm">إضافة</SubmitButton>
        </form>
      </Section>
    </>
  );
}
