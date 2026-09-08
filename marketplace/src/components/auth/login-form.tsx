'use client';
import { useActionState } from 'react';
import Link from 'next/link';
import { loginAction } from '@/actions/auth';
import { Field, Input } from '@/components/ui/input';
import { SubmitButton } from '@/components/ui/submit-button';
import { Alert } from '@/components/ui/misc';

export function LoginForm({ next, demo }: { next?: string; demo: boolean }) {
  const [state, action] = useActionState(loginAction, null);
  const err = state && !state.ok ? state : null;
  return (
    <form action={action} className="space-y-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      {err ? <Alert tone="danger">{err.error}</Alert> : null}
      <Field label="البريد الإلكتروني" error={err?.fieldErrors?.email}>
        <Input name="email" type="email" dir="ltr" autoComplete="email" required placeholder="name@company.com" />
      </Field>
      <Field label="كلمة المرور" error={err?.fieldErrors?.password}>
        <Input name="password" type="password" dir="ltr" autoComplete="current-password" required />
      </Field>
      <SubmitButton className="w-full" size="lg">
        تسجيل الدخول
      </SubmitButton>
      <p className="text-center text-sm text-muted">
        ليس لديك حساب؟{' '}
        <Link href={`/register${next ? `?next=${encodeURIComponent(next)}` : ''}`} className="font-medium text-primary hover:underline">
          أنشئ حساب عميل
        </Link>{' '}
        أو{' '}
        <Link href="/register/supplier" className="font-medium text-primary hover:underline">
          سجّل كمزود
        </Link>
      </p>
      {demo ? (
        <div className="rounded-md border border-dashed border-line-2 bg-canvas p-3 text-xs text-muted">
          <div className="font-semibold text-ink-2">حسابات تجريبية (كلمة المرور: Demo@1234)</div>
          <ul className="mt-1 space-y-0.5 ltr text-left">
            <li>customer1@demo.sa — عميل</li>
            <li>supplier1@demo.sa — مزود (لوحات، الرياض)</li>
            <li>supplier9@demo.sa — مزود لديه عميل اختاره</li>
            <li>admin@demo.sa — مدير</li>
          </ul>
        </div>
      ) : null}
    </form>
  );
}
