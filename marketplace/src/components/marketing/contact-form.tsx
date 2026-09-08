'use client';
import { useActionState, useEffect } from 'react';
import { toast } from 'sonner';
import { contactAction } from '@/actions/profile';
import { Field, Input, Textarea } from '@/components/ui/input';
import { SubmitButton } from '@/components/ui/submit-button';
import { Alert } from '@/components/ui/misc';

export function ContactForm() {
  const [state, action] = useActionState(contactAction, null);
  useEffect(() => {
    if (state?.ok) toast.success('تم استلام رسالتك، سنتواصل معك قريبًا');
  }, [state]);
  if (state?.ok) return <Alert tone="success" title="تم الإرسال">شكرًا لتواصلك، سنرد عليك خلال يوم عمل.</Alert>;
  return (
    <form action={action} className="space-y-4 rounded-lg border border-line bg-surface p-5">
      {state && !state.ok ? <Alert tone="danger">{state.error}</Alert> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="الاسم" required error={state && !state.ok ? state.fieldErrors?.name : undefined}>
          <Input name="name" required />
        </Field>
        <Field label="البريد الإلكتروني" required error={state && !state.ok ? state.fieldErrors?.email : undefined}>
          <Input name="email" type="email" dir="ltr" required />
        </Field>
      </div>
      <Field label="الموضوع" required error={state && !state.ok ? state.fieldErrors?.subject : undefined}>
        <Input name="subject" required />
      </Field>
      <Field label="الرسالة" required error={state && !state.ok ? state.fieldErrors?.message : undefined}>
        <Textarea name="message" required />
      </Field>
      <SubmitButton>إرسال</SubmitButton>
    </form>
  );
}
