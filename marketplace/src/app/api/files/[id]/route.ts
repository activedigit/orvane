import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { canViewFile, getFile, readFileData } from '@/lib/services/files';
import { logSecurityEvent } from '@/lib/security/events';

/** Streams a stored file after an authorization check. Never exposes storage paths. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return new NextResponse('Not found', { status: 404 });
  const file = await getFile(id);
  if (!file) return new NextResponse('Not found', { status: 404 });
  const user = await getCurrentUser();
  if (!(await canViewFile(file, user))) {
    await logSecurityEvent({ userId: user?.id, eventType: 'unauthorized_access', severity: 'medium', details: { fileId: id } });
    return new NextResponse('Not found', { status: 404 });
  }
  const data = await readFileData(file);
  if (!data) return new NextResponse('Not found', { status: 404 });
  const inline = file.mime_type.startsWith('image/') || file.mime_type === 'application/pdf' || file.mime_type.startsWith('audio/');
  return new NextResponse(new Uint8Array(data), {
    headers: {
      'content-type': file.mime_type,
      'content-length': String(data.length),
      'content-disposition': `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(file.original_name)}`,
      'cache-control': 'private, max-age=300',
      'x-content-type-options': 'nosniff',
    },
  });
}
