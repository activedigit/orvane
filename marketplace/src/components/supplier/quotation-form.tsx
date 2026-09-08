'use client';
import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { submitQuotationAction } from '@/actions/quotations';
import { Field, Input, Textarea } from '@/components/ui/input';
import { SubmitButton } from '@/components/ui/submit-button';
import { Alert } from '@/components/ui/misc';
import { FileUploader, type UploadedFile } from '@/components/upload/file-uploader';
import type { QuotationRow } from '@/lib/db/types';

export function QuotationForm({ requestId, existing, suggestions, existingAttachments = [] }: { requestId: string; existing: QuotationRow | null; suggestions: string[]; existingAttachments?: { file_id: string; original_name: string; mime_type: string }[] }) {
  const router = useRouter();
  const [state, action] = useActionState(submitQuotationAction, null);
  const [files, setFiles] = useState<UploadedFile[]>(existingAttachments.map((a) => ({ id: a.file_id, name: a.original_name, mime: a.mime_type, size: 0 })));
  useEffect(() => {
    if (state?.ok) {
      toast.success(existing ? 'تم تحديث عرضك' : 'تم إرسال عرضك للعميل بشكل خاص');
      router.refresh();
    }
  }, [state, existing, router]);
  const err = state && !state.ok ? state : null;
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="requestId" value={requestId} />
      {files.map((f) => <input key={f.id} type="hidden" name="attachmentFileIds" value={f.id} />)}
      {err ? <Alert tone="danger">{err.error}</Alert> : null}
      {suggestions.length ? (
        <div className="rounded-md border border-line bg-canvas p-3 text-xs text-ink-2">
          <div className="mb-1 font-semibold text-ink">بنود يُنصح بتوضيحها في عرضك:</div>
          <ul className="list-inside list-disc space-y-0.5">{suggestions.map((s) => <li key={s}>{s}</li>)}</ul>
        </div>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="السعر (ر.س)" required error={err?.fieldErrors?.price}>
          <Input name="price" type="number" min={1} step="1" inputMode="numeric" required defaultValue={existing ? Number(existing.price) : ''} placeholder="12500" />
        </Field>
        <Field label="مدة التنفيذ (أيام)" error={err?.fieldErrors?.deliveryDays}>
          <Input name="deliveryDays" type="number" min={1} inputMode="numeric" defaultValue={existing?.delivery_days ?? ''} placeholder="7" />
        </Field>
        <Field label="صلاحية العرض (أيام)" required error={err?.fieldErrors?.validityDays}>
          <Input name="validityDays" type="number" min={1} max={90} inputMode="numeric" required defaultValue={existing?.validity_days ?? 14} />
        </Field>
      </div>
      <Field label="تفاصيل العرض" required error={err?.fieldErrors?.details} hint="اشرح ما ستقدمه بدقة. يتم إخفاء أي معلومات تواصل تلقائيًا.">
        <Textarea name="details" required minLength={10} defaultValue={existing?.details ?? ''} placeholder="مثال: حروف بارزة أكريليك مضيئة بسماكة 3 سم مع إضاءة LED خلفية..." />
      </Field>
      <Field label="ما يشمله السعر" error={err?.fieldErrors?.priceIncludes}>
        <Textarea name="priceIncludes" rows={2} defaultValue={existing?.price_includes ?? ''} placeholder="المواد، التركيب، التوصيل، الضريبة..." className="min-h-20" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="الضمان" error={err?.fieldErrors?.warranty}>
          <Input name="warranty" defaultValue={existing?.warranty ?? ''} placeholder="مثال: سنة واحدة" />
        </Field>
        <Field label="ملاحظات" error={err?.fieldErrors?.notes}>
          <Input name="notes" defaultValue={existing?.notes ?? ''} placeholder="اختياري" />
        </Field>
      </div>
      <Field label="مرفقات (كتالوج، نماذج أعمال، عرض PDF)">
        <FileUploader scope="quotation" value={files} onChange={setFiles} compact label="إرفاق ملفات" />
      </Field>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted">عرضك خاص: لا يراه المنافسون ولا ترى عروضهم.</p>
        <SubmitButton size="lg">{existing ? 'تحديث العرض' : 'إرسال العرض'}</SubmitButton>
      </div>
    </form>
  );
}
