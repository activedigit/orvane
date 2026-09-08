'use client';
import { useActionState, useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { addPortfolioItemAction, deletePortfolioItemAction, setSupplierLogoAction, submitVerificationDocAction } from '@/actions/profile';
import { FileUploader, uploadToServer, type UploadedFile } from '@/components/upload/file-uploader';
import { Button } from '@/components/ui/button';
import { Field, Input, Select, Textarea } from '@/components/ui/input';
import { SubmitButton } from '@/components/ui/submit-button';
import { Avatar } from '@/components/ui/misc';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';

export function LogoUploader({ companyName, logoFileId }: { companyName: string; logoFileId: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex items-center gap-4">
      <Avatar name={companyName} src={logoFileId ? `/api/files/${logoFileId}` : null} size="lg" />
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-line-2 bg-surface px-3 py-2 text-sm text-ink-2 hover:border-primary">
        <Upload className="size-4" /> {busy ? 'جارٍ الرفع…' : 'تغيير الشعار'}
        <input type="file" accept="image/*" className="hidden" disabled={busy} onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          setBusy(true);
          try { const up = await uploadToServer(f, 'logo'); const r = await setSupplierLogoAction(up.id); if (!r.ok) throw new Error(r.error); toast.success('تم تحديث الشعار'); router.refresh(); }
          catch (err) { toast.error(err instanceof Error ? err.message : 'فشل الرفع'); }
          finally { setBusy(false); }
        }} />
      </label>
    </div>
  );
}

const DOC_TYPES = [['commercial_register', 'السجل التجاري'], ['vat', 'شهادة ضريبة القيمة المضافة'], ['license', 'رخصة / تصنيف'], ['id', 'هوية المسؤول'], ['other', 'أخرى']];
const DOC_STATUS: Record<string, { label: string; tone: 'warning' | 'success' | 'danger' }> = { pending: { label: 'قيد المراجعة', tone: 'warning' }, approved: { label: 'مقبول', tone: 'success' }, rejected: { label: 'مرفوض', tone: 'danger' } };

export function VerificationDocs({ documents }: { documents: { id: string; doc_type: string; status: string; review_note: string | null; created_at: string; file_id: string | null }[] }) {
  const router = useRouter();
  const [type, setType] = useState('commercial_register');
  const [file, setFile] = useState<UploadedFile[]>([]);
  const [pending, start] = useTransition();
  return (
    <div className="space-y-4">
      <ul className="space-y-2">
        {documents.map((d) => (
          <li key={d.id} className="flex items-center justify-between rounded-md border border-line px-3 py-2 text-sm">
            <div>
              <div className="font-medium text-ink">{DOC_TYPES.find(([k]) => k === d.doc_type)?.[1] ?? d.doc_type}</div>
              <div className="text-xs text-muted">{formatDate(d.created_at)}{d.review_note ? ` • ${d.review_note}` : ''}</div>
            </div>
            <Badge tone={DOC_STATUS[d.status]?.tone ?? 'neutral'}>{DOC_STATUS[d.status]?.label ?? d.status}</Badge>
          </li>
        ))}
        {!documents.length ? <li className="text-sm text-muted">لم ترفع أي مستند بعد.</li> : null}
      </ul>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <Field label="نوع المستند"><Select value={type} onChange={(e) => setType(e.target.value)}>{DOC_TYPES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
        <FileUploader scope="verification" value={file} onChange={setFile} max={1} compact label="اختيار الملف" accept="image/*,.pdf" />
      </div>
      <Button disabled={!file.length} loading={pending} onClick={() => start(async () => { const r = await submitVerificationDocAction(file[0].id, type); if (!r.ok) { toast.error(r.error); return; } toast.success('تم إرسال المستند للمراجعة'); setFile([]); router.refresh(); })}>إرسال للتوثيق</Button>
    </div>
  );
}

export function PortfolioManager({ items }: { items: { id: string; title: string; description_ar: string | null; file_id: string | null }[] }) {
  const router = useRouter();
  const [state, action] = useActionState(addPortfolioItemAction, null);
  const [file, setFile] = useState<UploadedFile[]>([]);
  const [pending, start] = useTransition();
  useEffect(() => { if (state?.ok) { toast.success('تمت إضافة العمل'); setFile([]); router.refresh(); } }, [state, router]);
  return (
    <div className="space-y-4">
      {items.length ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {items.map((p) => (
            <li key={p.id} className="flex gap-3 rounded-md border border-line p-2">
              {p.file_id ? <img src={`/api/files/${p.file_id}`} alt={p.title} className="size-16 rounded object-cover" /> : <div className="size-16 rounded bg-canvas-2" />}
              <div className="min-w-0 flex-1"><div className="truncate text-sm font-medium text-ink">{p.title}</div><div className="truncate text-xs text-muted">{p.description_ar}</div></div>
              <button type="button" className="p-1 text-muted hover:text-danger" aria-label="حذف" disabled={pending} onClick={() => start(async () => { await deletePortfolioItemAction(p.id); router.refresh(); })}><Trash2 className="size-4" /></button>
            </li>
          ))}
        </ul>
      ) : null}
      <form action={action} className="space-y-3 rounded-md border border-dashed border-line-2 p-3">
        {state && !state.ok ? <p className="text-xs text-danger">{state.error}</p> : null}
        {file[0] ? <input type="hidden" name="fileId" value={file[0].id} /> : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="عنوان المشروع" required><Input name="title" required placeholder="مثال: لوحة واجهة مطعم في حي الياسمين" /></Field>
          <Field label="صورة"><FileUploader scope="portfolio" value={file} onChange={setFile} max={1} compact label="اختيار صورة" accept="image/*" /></Field>
        </div>
        <Field label="وصف مختصر"><Textarea name="description" rows={2} className="min-h-16" /></Field>
        <SubmitButton size="sm" variant="secondary">إضافة عمل</SubmitButton>
      </form>
    </div>
  );
}
