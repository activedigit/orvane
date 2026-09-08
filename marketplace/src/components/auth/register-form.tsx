'use client';
import { useActionState } from 'react';
import Link from 'next/link';
import { registerCustomerAction } from '@/actions/auth';
import { Field, Input } from '@/components/ui/input';
import { SubmitButton } from '@/components/ui/submit-button';
import { Alert } from '@/components/ui/misc';

export function RegisterForm({ next, compact = false }: { next?: string; compact?: boolean }) {
  const [state, action] = useActionState(registerCustomerAction, null);
  const err = state && !state.ok ? state : null;
  if (state?.ok) return <Alert tone="success" title="تم إنشاء الحساب">أرسلنا رابط تأكيد إلى بريدك الإلكتروني. أكّد بريدك ثم سجّل الدخول.</Alert>;
  return (
    <form action={action} className="space-y-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      {err ? <Alert tone="danger">{err.error}</Alert> : null}
      <Field label="الاسم الكامل" required error={err?.fieldErrors?.fullName}>
        <Input name="fullName" autoComplete="name" required placeholder="مثال: فهد العتيبي" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="رقم الجوال" required error={err?.fieldErrors?.phone} hint={compact ? undefined : 'لن يظهر لأي مزود قبل أن تختاره'}>
          <Input name="phone" type="tel" dir="ltr" autoComplete="tel" required placeholder="05xxxxxxxx" />
        </Field>
        <Field label="البريد الإلكتروني" required error={err?.fieldErrors?.email}>
          <Input name="email" type="email" dir="ltr" autoComplete="email" required />
        </Field>
      </div>
      <Field label="كلمة المرور" required error={err?.fieldErrors?.password} hint="8 أحرف على الأقل">
        <Input name="password" type="password" dir="ltr" autoComplete="new-password" required minLength={8} />
      </Field>
      <SubmitButton className="w-full" size="lg">
        إنشاء الحساب
      </SubmitButton>
      <p className="text-center text-xs text-muted">
        بإنشاء الحساب أنت توافق على{' '}
        <Link href="/terms" className="text-primary hover:underline">
          الشروط
        </Link>{' '}
        و{' '}
        <Link href="/privacy" className="text-primary hover:underline">
          سياسة الخصوصية
        </Link>
        .
      </p>
      {!compact ? (
        <p className="text-center text-sm text-muted">
          لديك حساب؟{' '}
          <Link href="/login" className="font-medium text-primary hover:underline">
            تسجيل الدخول
          </Link>
        </p>
      ) : null}
    </form>
  );
}
