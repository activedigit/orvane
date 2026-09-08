import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { listMessages, markConversationRead } from '@/lib/services/chat';

/** Polling endpoint for chat (works without Supabase Realtime). */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const after = new URL(req.url).searchParams.get('after');
  try {
    const messages = await listMessages(id, user, { after });
    if (messages.some((m) => !m.is_mine)) await markConversationRead(id, user.id);
    return NextResponse.json({ messages });
  } catch {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
}
