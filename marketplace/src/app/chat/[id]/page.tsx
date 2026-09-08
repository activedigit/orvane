import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getConversationHeader, listMessages, markConversationRead } from '@/lib/services/chat';
import { ChatRoom } from '@/components/chat/chat-room';
import { Logo } from '@/components/layout/logo';

export const metadata = { title: 'محادثة' };

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/chat/${id}`);
  const header = await getConversationHeader(id, user);
  if (!header) notFound();
  const messages = await listMessages(id, user);
  await markConversationRead(id, user.id);
  const role = header.role;
  const backHref = role === 'supplier' ? '/supplier/messages' : role === 'admin' ? '/admin/chats' : '/dashboard/messages';
  const requestHref = role === 'supplier' ? `/supplier/requests/${header.conversation.request_id}` : role === 'admin' ? `/admin/requests/${header.conversation.request_id}` : `/dashboard/requests/${header.conversation.request_id}`;
  const otherUserId = role === 'supplier' ? header.conversation.customer_id : header.conversation.supplier_id;
  return (
    <div className="min-h-dvh bg-canvas">
      <header className="hidden h-14 items-center justify-between border-b border-line bg-surface px-4 md:flex">
        <Logo href={backHref} />
        <span className="text-sm text-muted">محادثة خاصة</span>
      </header>
      <div className="mx-auto max-w-3xl md:px-4 md:py-4">
        <ChatRoom
          conversationId={id}
          initialMessages={messages}
          otherLabel={header.otherLabel}
          requestTitle={header.request?.title ?? ''}
          referenceCode={header.request?.reference_code ?? ''}
          unlocked={header.unlocked}
          backHref={backHref}
          requestHref={requestHref}
          otherUserId={otherUserId}
          requestId={header.conversation.request_id}
          role={role}
        />
      </div>
    </div>
  );
}
