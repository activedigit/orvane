'use client';
import { useActionState, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { updateSupplierProfileAction } from '@/actions/profile';
import { Field, Input, Select, Textarea } from '@/components/ui/input';
import { SubmitButton } from '@/components/ui/submit-button';
import { Alert } from '@/components/ui/misc';
import { CheckboxGroup } from '@/components/ui/checkbox-group';
import { cn } from '@/lib/utils';
import type { SupplierProfileRow } from '@/lib/db/types';

interface Cat { id: string; name_ar: string; subcategories: { id: string; name_ar: string }[] }

export function SupplierProfileForm({ user, profile, categories, cities, categoryIds, subcategoryIds, cityIds }: { user: { fullName: string }; profile: SupplierProfileRow; categories: Cat[]; cities: { id: string; name_ar: string }[]; categoryIds: string[]; subcategoryIds: string[]; cityIds: string[] }) {
  const [state, action] = useActionState(updateSupplierProfileAction, null);
  const [selectedCats, setSelectedCats] = useState<string[]>(categoryIds);
  useEffect(() => {
    if (state?.ok) toast.success('تم حفظ الملف التجاري');
  }, [state]);
  const err = state && !state.ok ? state : null;
  return (
    <form action={action} className="space-y-6">
      {err ? <Alert tone="danger">{err.error}</Alert> : null}
      <section className="space-y-4">
        <h3 className="font-semibold text-ink">بيانات الشركة</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="اسم الشركة" required error={err?.fieldErrors?.companyName}><Input name="companyName" defaultValue={profile.company_name} required /></Field>
          <Field label="اسم المسؤول" required error={err?.fieldErrors?.fullName}><Input name="fullName" defaultValue={user.fullName} required /></Field>
        </div>
        <Field label="نبذة عن الشركة" required error={err?.fieldErrors?.description} hint="تظهر للعملاء بعد اختيارك. لا تضع معلومات تواصل هنا."><Textarea name="description" defaultValue={profile.description_ar} required minLength={20} /></Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="المدينة الرئيسية" required error={err?.fieldErrors?.cityId}>
            <Select name="cityId" defaultValue={profile.city_id ?? ''} required><option value="" disabled>اختر</option>{cities.map((c) => <option key={c.id} value={c.id}>{c.name_ar}</option>)}</Select>
          </Field>
          <Field label="سنوات الخبرة" required><Input name="yearsExperience" type="number" min={0} max={60} defaultValue={profile.years_experience} required /></Field>
          <Field label="رقم السجل التجاري"><Input name="commercialRegister" dir="ltr" defaultValue={profile.commercial_register ?? ''} /></Field>
        </div>
      </section>
      <section className="space-y-4">
        <h3 className="font-semibold text-ink">بيانات التواصل (تظهر للعميل بعد فتح البيانات فقط)</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="جوال التواصل"><Input name="contactPhone" dir="ltr" defaultValue={profile.contact_phone ?? ''} placeholder="05xxxxxxxx" /></Field>
          <Field label="واتساب"><Input name="whatsapp" dir="ltr" defaultValue={profile.whatsapp ?? ''} placeholder="05xxxxxxxx" /></Field>
          <Field label="الموقع الإلكتروني"><Input name="website" dir="ltr" defaultValue={profile.website ?? ''} placeholder="https://" /></Field>
        </div>
      </section>
      <section className="space-y-4">
        <h3 className="font-semibold text-ink">الفئات والتخصصات</h3>
        <Field label="الفئات" required error={err?.fieldErrors?.categoryIds}>
          <div className="grid gap-2 sm:grid-cols-2">
            {categories.map((c) => (
              <label key={c.id} className={cn('flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm', selectedCats.includes(c.id) ? 'border-primary bg-primary-soft text-primary' : 'border-line bg-surface text-ink-2')}>
                <input type="checkbox" name="categoryIds" value={c.id} checked={selectedCats.includes(c.id)} onChange={(e) => setSelectedCats(e.target.checked ? [...selectedCats, c.id] : selectedCats.filter((x) => x !== c.id))} className="size-4 accent-primary" />
                {c.name_ar}
              </label>
            ))}
          </div>
        </Field>
        {categories.filter((c) => selectedCats.includes(c.id) && c.subcategories.length).map((c) => (
          <Field key={c.id} label={`تخصصات ${c.name_ar}`} hint="اختر التخصصات الدقيقة لتحسين المطابقة">
            <CheckboxGroup name="subcategoryIds" columns={3} options={c.subcategories.map((s) => ({ value: s.id, label: s.name_ar }))} defaultValues={subcategoryIds} />
          </Field>
        ))}
        <Field label="المدن التي تغطيها" required error={err?.fieldErrors?.cityIds}><CheckboxGroup name="cityIds" columns={3} options={cities.map((c) => ({ value: c.id, label: c.name_ar }))} defaultValues={cityIds} /></Field>
      </section>
      <section className="space-y-4">
        <h3 className="font-semibold text-ink">نطاق المشاريع والإتاحة</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="أقل ميزانية تقبلها (ر.س)" hint="لن تصلك طلبات أقل من هذا الحد"><Input name="minBudget" type="number" min={0} defaultValue={profile.min_budget ?? ''} /></Field>
          <Field label="أعلى ميزانية (ر.س)" hint="اختياري"><Input name="maxBudget" type="number" min={0} defaultValue={profile.max_budget ?? ''} /></Field>
        </div>
        <label className="flex items-center gap-2 text-sm text-ink-2"><input type="checkbox" name="isAvailable" defaultChecked={profile.is_available} className="size-4 accent-primary" /> متاح لاستقبال طلبات جديدة</label>
        <Field label="ظهور هوية الشركة للعملاء قبل الاختيار" hint="في الوضع المخفي يظهر اسمك كـ «شركة متخصصة في ... – المدينة» حتى يختارك العميل">
          <Select name="privacyMode" defaultValue={profile.privacy_mode}>
            <option value="inherit">حسب إعداد المنصة</option>
            <option value="hidden">إخفاء الهوية حتى الاختيار</option>
            <option value="visible">إظهار اسم الشركة دائمًا</option>
          </Select>
        </Field>
      </section>
      <SubmitButton size="lg">حفظ الملف التجاري</SubmitButton>
    </form>
  );
}
