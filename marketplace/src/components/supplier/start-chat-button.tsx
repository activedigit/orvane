'use client';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { startConversationAction } from '@/actions/chat';
import { Button } from '@/components/ui/button';

export function StartChatButton({ requestId, supplierId, conversationId, variant = 'secondary' }: { requestId: string; supplierId: string; conversationId: string | null; variant?: 'secondary' | 'default' }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      variant={variant}
      loading={pending}
      onClick={() => {
        if (conversationId) return router.push(`/chat/${conversationId}`);
        start(async () => {
          const res = await startConversationAction(requestId, supplierId);
          if (!res.ok) { toast.error(res.error); return; }
          router.push(`/chat/${res.data.conversationId}`);
        });
      }}
    >
      <MessageSquare /> {conversationId ? 'فتح المحادثة' : 'محادثة مع العميل'}
    </Button>
  );
}
