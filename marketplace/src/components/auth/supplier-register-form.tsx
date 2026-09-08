'use client';
import { useActionState } from 'react';
import Link from 'next/link';
import { registerSupplierAction } from '@/actions/auth';
import { Field, Input, Select, Textarea } from '@/components/ui/input';
import { SubmitButton } from '@/components/ui/submit-button';
import { Alert } from '@/components/ui/misc';
import { CheckboxGroup } from '@/components/ui/checkbox-group';

export function SupplierRegisterForm({ categories, cities }: { categories: { id: string; name_ar: string }[]; cities: { id: string; name_ar: string }[] }) {
  const [state, action] = useActionState(registerSupplierAction, null);
  const err = state && !state.ok ? state : null;
  if (state?.ok) return <Alert tone="success" title="تم إنشاء الحساب">أرسلنا رابط تأكيد إلى بريدك الإلكتروني. أكّد بريدك ثم سجّل الدخول لإكمال ملفك التجاري.</Alert>;
  return (
    <form action={action} className="space-y-6">
      {err ? <Alert tone="danger">{err.error}</Alert> : null}
      <section className="space-y-4">
        <h2 className="font-semibold text-ink">بيانات الشركة</h2>
        <Field label="اسم الشركة / المؤسسة" required error={err?.fieldErrors?.companyName}>
          <Input name="companyName" required placeholder="مثال: شركة الأفق للوحات الإعلانية" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="المدينة الرئيسية" required error={err?.fieldErrors?.cityId}>
            <Select name="cityId" required defaultValue="">
              <option value="" disabled>
                اختر المدينة
              </option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name_ar}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="سنوات الخبرة" required error={err?.fieldErrors?.yearsExperience}>
            <Input name="yearsExperience" type="number" min={0} max={60} defaultValue={3} required />
          </Field>
        </div>
        <Field label="رقم السجل التجاري" hint="مطلوب للتوثيق، ويمكن إضافته لاحقًا" error={err?.fieldErrors?.commercialRegister}>
          <Input name="commercialRegister" dir="ltr" placeholder="1010xxxxxx" />
        </Field>
        <Field label="نبذة عن الشركة وخدماتها" required error={err?.fieldErrors?.description} hint="تظهر للعملاء بعد اختيارك. لا تضع معلومات تواصل هنا.">
          <Textarea name="description" required minLength={20} placeholder="متخصصون في ... منذ ... نقدم ..." />
        </Field>
      </section>
      <section className="space-y-4">
        <h2 className="font-semibold text-ink">الفئات والمدن</h2>
        <Field label="الفئات التي تقدمها" required error={err?.fieldErrors?.categoryIds}>
          <CheckboxGroup name="categoryIds" options={categories.map((c) => ({ value: c.id, label: c.name_ar }))} />
        </Field>
        <Field label="المدن التي تغطيها" required error={err?.fieldErrors?.cityIds}>
          <CheckboxGroup name="cityIds" options={cities.map((c) => ({ value: c.id, label: c.name_ar }))} />
        </Field>
      </section>
      <section className="space-y-4">
        <h2 className="font-semibold text-ink">بيانات الدخول</h2>
        <Field label="اسم المسؤول" required error={err?.fieldErrors?.fullName}>
          <Input name="fullName" required />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="رقم الجوال" required error={err?.fieldErrors?.phone}>
            <Input name="phone" type="tel" dir="ltr" required placeholder="05xxxxxxxx" />
          </Field>
          <Field label="البريد الإلكتروني" required error={err?.fieldErrors?.email}>
            <Input name="email" type="email" dir="ltr" required />
          </Field>
        </div>
        <Field label="كلمة المرور" required error={err?.fieldErrors?.password} hint="8 أحرف على الأقل">
          <Input name="password" type="password" dir="ltr" required minLength={8} />
        </Field>
      </section>
      <SubmitButton className="w-full" size="lg">
        إنشاء حساب مزود
      </SubmitButton>
      <p className="text-center text-sm text-muted">
        لديك حساب؟{' '}
        <Link href="/login" className="font-medium text-primary hover:underline">
          تسجيل الدخول
        </Link>
      </p>
    </form>
  );
}
