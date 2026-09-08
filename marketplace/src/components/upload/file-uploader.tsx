'use client';
import { useRef, useState } from 'react';
import { Paperclip, X, FileText, Image as ImageIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export interface UploadedFile { id: string; name: string; mime: string; size: number }

export async function uploadToServer(file: File, scope: string): Promise<UploadedFile> {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('scope', scope);
  const res = await fetch('/api/upload', { method: 'POST', body: fd });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'فشل الرفع');
  return data as UploadedFile;
}

export function FileUploader({ scope, value, onChange, accept = 'image/*,.pdf,.doc,.docx,.xls,.xlsx', max = 5, label = 'إضافة ملفات', className, compact }: {
  scope: 'request' | 'quotation' | 'message' | 'verification' | 'logo' | 'portfolio';
  value: UploadedFile[];
  onChange: (files: UploadedFile[]) => void;
  accept?: string;
  max?: number;
  label?: string;
  className?: string;
  compact?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const pick = async (list: FileList | null) => {
    if (!list?.length) return;
    if (value.length + list.length > max) return toast.error(`الحد الأقصى ${max} ملفات`);
    setBusy(true);
    try {
      const out = [...value];
      for (const f of Array.from(list)) out.push(await uploadToServer(f, scope));
      onChange(out);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'فشل الرفع');
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = '';
    }
  };
  return (
    <div className={className}>
      <input ref={ref} type="file" multiple={max > 1} accept={accept} className="hidden" onChange={(e) => pick(e.target.files)} />
      <button type="button" onClick={() => ref.current?.click()} disabled={busy} className={cn('inline-flex items-center gap-2 rounded-md border border-dashed border-line-2 bg-canvas text-sm text-ink-2 hover:border-primary hover:text-primary disabled:opacity-60', compact ? 'px-3 py-2' : 'w-full justify-center px-4 py-4')}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Paperclip className="size-4" />} {label}
      </button>
      {value.length ? (
        <ul className="mt-2 flex flex-wrap gap-2">
          {value.map((f) => (
            <li key={f.id} className="flex items-center gap-2 rounded-md border border-line bg-surface px-2 py-1 text-xs text-ink-2">
              {f.mime.startsWith('image/') ? <ImageIcon className="size-3.5" /> : <FileText className="size-3.5" />}
              <span className="max-w-40 truncate">{f.name}</span>
              <button type="button" onClick={() => onChange(value.filter((x) => x.id !== f.id))} aria-label="إزالة" className="text-muted hover:text-danger">
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
