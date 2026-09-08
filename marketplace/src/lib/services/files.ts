import 'server-only';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { sql } from '@/lib/db';
import { config } from '@/lib/config';
import { getStorage } from '@/lib/storage';
import { moderateImage, getImagePipelineOptions } from '@/lib/moderation/image-pipeline';
import { filterContactInfo } from '@/lib/moderation/text-filter';
import type { FileRow } from '@/lib/db/types';
import type { SessionUser } from '@/lib/auth/types';

export type FileScope = FileRow['scope'];

const ALLOWED_MIME: Record<string, string[]> = {
  image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain'],
  audio: ['audio/webm', 'audio/ogg', 'audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/wav'],
};
const ALL_MIME = Object.values(ALLOWED_MIME).flat();

/** Sanitize file names so they cannot carry contact info (e.g. "call-0551234567.jpg"). */
export function safeDisplayName(name: string) {
  const ext = path.extname(name).toLowerCase().slice(0, 8);
  const base = path.basename(name, path.extname(name));
  const filtered = filterContactInfo(base);
  const clean = (filtered.wasFiltered ? 'ملف' : base).replace(/[^\p{L}\p{N} _.-]/gu, '').trim().slice(0, 60) || 'ملف';
  return clean + ext;
}

export async function uploadFile(owner: SessionUser, input: { data: Buffer; mimeType: string; originalName: string; scope: FileScope }): Promise<FileRow> {
  if (!ALL_MIME.includes(input.mimeType)) throw new Error('نوع الملف غير مدعوم');
  if (input.data.length > config.storage.maxUploadBytes) throw new Error(`حجم الملف يتجاوز الحد (${Math.round(config.storage.maxUploadBytes / 1024 / 1024)} م.ب)`);
  const ext = path.extname(input.originalName).toLowerCase().slice(0, 8) || '';
  const storagePath = `${input.scope}/${owner.id}/${randomUUID()}${ext}`;
  let data = input.data;
  let moderation: { status: FileRow['moderation_status']; meta: Record<string, unknown> } = { status: 'skipped', meta: {} };
  if (ALLOWED_MIME.image.includes(input.mimeType) && ['message', 'request', 'quotation', 'portfolio'].includes(input.scope)) {
    const res = await moderateImage(data, input.mimeType, getImagePipelineOptions());
    data = res.output;
    moderation = { status: res.status, meta: { providers: res.providers, detections: res.detections.map((d) => ({ type: d.type, source: d.source })) } };
    if (res.status === 'rejected') {
      await sql`insert into public.moderation_logs (user_id, kind, action, detections) values (${owner.id}, 'image', 'blocked', ${sql.json(moderation.meta as never)})`;
      throw new Error('تم رفض الصورة لاحتوائها على معلومات تواصل');
    }
  } else if (input.scope === 'message' || input.scope === 'quotation' || input.scope === 'request') {
    moderation = { status: 'approved', meta: { note: 'documents are passed through; connect an OCR provider for deep inspection' } };
  } else {
    moderation = { status: 'approved', meta: {} };
  }
  const storage = await getStorage();
  await storage.put(storagePath, data, input.mimeType);
  const [row] = await sql<FileRow[]>`insert into public.files (owner_id, provider, bucket, storage_path, original_name, mime_type, size_bytes, scope, moderation_status, moderation_meta)
    values (${owner.id}, ${storage.name}, ${config.supabase.storageBucket}, ${storagePath}, ${safeDisplayName(input.originalName)}, ${input.mimeType}, ${data.length}, ${input.scope}, ${moderation.status}, ${sql.json(moderation.meta as never)}) returning *`;
  return row;
}

/**
 * Authorization for reading a file. Public scopes (logo/avatar/portfolio) are
 * open; everything else requires a relationship (owner, matched supplier,
 * conversation participant, request owner, admin).
 */
export async function canViewFile(file: FileRow, user: SessionUser | null): Promise<boolean> {
  if (['logo', 'avatar', 'portfolio'].includes(file.scope)) return true;
  if (!user) return false;
  if (user.role === 'admin' || file.owner_id === user.id) return true;
  if (file.scope === 'request') {
    const [r] = await sql<{ ok: boolean }[]>`select exists (
      select 1 from public.request_attachments ra join public.requests r on r.id = ra.request_id
      where ra.file_id = ${file.id} and (r.customer_id = ${user.id} or exists (select 1 from public.request_matches m where m.request_id = r.id and m.supplier_id = ${user.id}))) as ok`;
    return r.ok;
  }
  if (file.scope === 'quotation') {
    const [r] = await sql<{ ok: boolean }[]>`select exists (
      select 1 from public.quotation_attachments qa join public.quotations q on q.id = qa.quotation_id join public.requests r on r.id = q.request_id
      where qa.file_id = ${file.id} and (q.supplier_id = ${user.id} or r.customer_id = ${user.id})) as ok`;
    return r.ok;
  }
  if (file.scope === 'message') {
    const [r] = await sql<{ ok: boolean }[]>`select exists (
      select 1 from public.message_attachments ma join public.messages m on m.id = ma.message_id
      join public.conversation_participants cp on cp.conversation_id = m.conversation_id
      where ma.file_id = ${file.id} and cp.user_id = ${user.id}) as ok`;
    return r.ok;
  }
  return false;
}

export async function getFile(fileId: string): Promise<FileRow | null> {
  const [f] = await sql<FileRow[]>`select * from public.files where id = ${fileId}`;
  return f ?? null;
}

export async function readFileData(file: FileRow): Promise<Buffer | null> {
  const storage = await getStorage();
  return storage.get(file.storage_path);
}
