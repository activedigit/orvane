import { requirePageRole } from '@/lib/auth';
import { adminAllCategories } from '@/lib/services/admin';
import { PageHeader, Section } from '@/components/ui/misc';
import { Field, Input, Select, SubmitButton } from '@/components/admin/forms';
import { adminCategoryAction, adminSubcategoryAction } from '@/actions/admin';
import { Badge } from '@/components/ui/badge';

export default async function AdminCategoriesPage() {
  await requirePageRole(['admin']);
  const cats = await adminAllCategories();
  return (
    <>
      <PageHeader title="الفئات والتخصصات" description="الكلمات المفتاحية تُستخدم لتصنيف الطلبات تلقائيًا من النص الحر." />
      <div className="space-y-4">
        {cats.map((c) => (
          <details key={c.id} className="rounded-lg border border-line bg-surface">
            <summary className="flex cursor-pointer items-center justify-between px-4 py-3"><span className="font-semibold text-ink">{c.name_ar} <span className="text-xs text-muted">({c.subcategories.length} تخصص)</span></span><Badge tone={c.is_active ? 'success' : 'neutral'}>{c.is_active ? 'فعّالة' : 'موقوفة'}</Badge></summary>
            <div className="grid gap-4 border-t border-line p-4 lg:grid-cols-2">
              <form action={adminCategoryAction} className="space-y-2">
                <input type="hidden" name="id" value={c.id} />
                <div className="grid grid-cols-2 gap-2"><Field label="الاسم"><Input name="nameAr" defaultValue={c.name_ar} required /></Field><Field label="slug"><Input name="slug" defaultValue={c.slug} dir="ltr" required /></Field></div>
                <Field label="الوصف"><Input name="descriptionAr" defaultValue={c.description_ar ?? ''} /></Field>
                <div className="grid grid-cols-2 gap-2"><Field label="الأيقونة"><Input name="icon" defaultValue={c.icon ?? ''} dir="ltr" /></Field><Field label="الترتيب"><Input name="sortOrder" type="number" defaultValue={c.sort_order} /></Field></div>
                <Field label="كلمات مفتاحية (مفصولة بفاصلة)"><Input name="keywords" defaultValue={c.keywords.join('، ')} /></Field>
                <div className="flex items-center justify-between"><label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isActive" defaultChecked={c.is_active} className="size-4 accent-primary" /> فعّالة</label><SubmitButton size="sm">حفظ الفئة</SubmitButton></div>
              </form>
              <div className="space-y-2">
                {c.subcategories.map((s) => (
                  <form key={s.id} action={adminSubcategoryAction} className="flex flex-wrap items-end gap-2 rounded-md border border-line p-2">
                    <input type="hidden" name="id" value={s.id} /><input type="hidden" name="categoryId" value={c.id} /><input type="hidden" name="sortOrder" value={s.sort_order} />
                    <Field label="الاسم"><Input name="nameAr" defaultValue={s.name_ar} className="h-9" required /></Field>
                    <Field label="slug"><Input name="slug" defaultValue={s.slug} dir="ltr" className="h-9" required /></Field>
                    <Field label="كلمات"><Input name="keywords" defaultValue={s.keywords.join('، ')} className="h-9" /></Field>
                    <label className="flex items-center gap-1 pb-2 text-xs"><input type="checkbox" name="isActive" defaultChecked={s.is_active} className="size-4 accent-primary" /> فعّال</label>
                    <SubmitButton size="sm" variant="secondary">حفظ</SubmitButton>
                  </form>
                ))}
                <form action={adminSubcategoryAction} className="flex flex-wrap items-end gap-2 rounded-md border border-dashed border-line-2 p-2">
                  <input type="hidden" name="categoryId" value={c.id} /><input type="hidden" name="sortOrder" value={c.subcategories.length} /><input type="hidden" name="isActive" value="on" />
                  <Field label="تخصص جديد"><Input name="nameAr" className="h-9" required /></Field>
                  <Field label="slug"><Input name="slug" dir="ltr" className="h-9" required /></Field>
                  <Field label="كلمات"><Input name="keywords" className="h-9" /></Field>
                  <SubmitButton size="sm">إضافة</SubmitButton>
                </form>
              </div>
            </div>
          </details>
        ))}
      </div>
      <Section title="إضافة فئة" className="mt-8">
        <form action={adminCategoryAction} className="grid gap-3 rounded-lg border border-line bg-surface p-4 sm:grid-cols-3">
          <Field label="الاسم" required><Input name="nameAr" required /></Field>
          <Field label="slug" required><Input name="slug" dir="ltr" required /></Field>
          <Field label="الأيقونة"><Select name="icon" defaultValue="briefcase">{['signpost', 'hard-hat', 'paint-roller', 'shield-check', 'globe', 'wind', 'sun', 'truck', 'sparkles', 'chef-hat', 'sofa', 'briefcase'].map((i) => <option key={i} value={i}>{i}</option>)}</Select></Field>
          <Field label="الوصف" ><Input name="descriptionAr" /></Field>
          <Field label="كلمات مفتاحية"><Input name="keywords" /></Field>
          <Field label="الترتيب"><Input name="sortOrder" type="number" defaultValue={cats.length} /></Field>
          <input type="hidden" name="isActive" value="on" />
          <div><SubmitButton>إضافة الفئة</SubmitButton></div>
        </form>
      </Section>
    </>
  );
}
