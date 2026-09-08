'use server';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { enforceRateLimit } from '@/lib/security/events';
import { getOrCreateConversation, markConversationRead, sendMessage } from '@/lib/services/chat';
import { run } from './result';

export async function startConversationAction(requestId: string, supplierId: string) {
  return run(async () => {
    const user = await requireUser();
    const conv = await getOrCreateConversation(requestId, supplierId, user);
    return { conversationId: conv.id };
  });
}

export async function sendMessageAction(conversationId: string, body: string, attachmentFileIds?: string[], kind?: 'text' | 'image' | 'file' | 'voice') {
  return run(async () => {
    const user = await requireUser();
    await enforceRateLimit('sendMessage', user.id, user.id);
    if (body.length > 4000) throw new Error('الرسالة طويلة جدًا');
    const res = await sendMessage(conversationId, user, { body, attachmentFileIds, kind });
    return res;
  });
}

export async function markReadAction(conversationId: string) {
  return run(async () => {
    const user = await requireUser();
    await markConversationRead(conversationId, user.id);
    revalidatePath('/dashboard/messages');
    revalidatePath('/supplier/messages');
  });
}
