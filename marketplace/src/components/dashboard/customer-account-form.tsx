'use client';
import { useActionState, useEffect } from 'react';
import { toast } from 'sonner';
import { updateCustomerProfileAction } from '@/actions/profile';
import { Field, Input, Select } from '@/components/ui/input';
import { SubmitButton } from '@/components/ui/submit-button';
import { Alert } from '@/components/ui/misc';

export function CustomerAccountForm({ user, profile, cities }: { user: { fullName: string; email: string | null; phone: string | null }; profile: { whatsapp: string | null; city_id: string | null; company_name: string | null } | null; cities: { id: string; name_ar: string }[] }) {
  const [state, action] = useActionState(updateCustomerProfileAction, null);
  useEffect(() => {
    if (state?.ok) toast.success('تم حفظ البيانات');
  }, [state]);
  const err = state && !state.ok ? state : null;
  return (
    <form action={action} className="space-y-4">
      {err ? <Alert tone="danger">{err.error}</Alert> : null}
      <Field label="الاسم الكامل" required error={err?.fieldErrors?.fullName}>
        <Input name="fullName" defaultValue={user.fullName} required />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="رقم الجوال" required error={err?.fieldErrors?.phone} hint="يظهر فقط للمزود الذي تختاره بعد فتحه للبيانات">
          <Input name="phone" dir="ltr" defaultValue={user.phone ?? ''} required />
        </Field>
        <Field label="رقم واتساب" hint="اتركه فارغًا إذا كان نفس رقم الجوال">
          <Input name="whatsapp" dir="ltr" defaultValue={profile?.whatsapp ?? ''} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="البريد الإلكتروني">
          <Input value={user.email ?? ''} dir="ltr" disabled />
        </Field>
        <Field label="المدينة">
          <Select name="cityId" defaultValue={profile?.city_id ?? ''}>
            <option value="">اختر المدينة</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>{c.name_ar}</option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="اسم الشركة (اختياري)">
        <Input name="companyName" defaultValue={profile?.company_name ?? ''} />
      </Field>
      <SubmitButton>حفظ</SubmitButton>
    </form>
  );
}
