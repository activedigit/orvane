import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { enforceRateLimit } from '@/lib/security/events';
import { uploadFile, type FileScope } from '@/lib/services/files';

const SCOPES: FileScope[] = ['request', 'quotation', 'message', 'verification', 'logo', 'portfolio', 'avatar'];

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.status === 'blocked') return NextResponse.json({ error: 'يجب تسجيل الدخول' }, { status: 401 });
  try {
    await enforceRateLimit('upload', user.id, user.id);
    const form = await req.formData();
    const file = form.get('file');
    const scope = String(form.get('scope') || '') as FileScope;
    if (!(file instanceof File)) return NextResponse.json({ error: 'لم يتم إرفاق ملف' }, { status: 400 });
    if (!SCOPES.includes(scope)) return NextResponse.json({ error: 'نطاق غير صحيح' }, { status: 400 });
    if (scope === 'verification' || scope === 'logo' || scope === 'portfolio' || scope === 'quotation') {
      if (user.role !== 'supplier') return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
    }
    if (scope === 'request' && user.role !== 'customer') return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
    const data = Buffer.from(await file.arrayBuffer());
    const row = await uploadFile(user, { data, mimeType: file.type || 'application/octet-stream', originalName: file.name, scope });
    return NextResponse.json({ id: row.id, name: row.original_name, mime: row.mime_type, size: row.size_bytes, moderation: row.moderation_status });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'فشل الرفع' }, { status: 400 });
  }
}
