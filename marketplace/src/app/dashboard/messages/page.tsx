import { requirePageRole } from '@/lib/auth';
import { listConversations } from '@/lib/services/chat';
import { PageHeader } from '@/components/ui/misc';
import { EmptyState } from '@/components/ui/empty-state';
import { ConversationList } from '@/components/chat/conversation-list';
import { MessageSquare } from 'lucide-react';

export default async function CustomerMessagesPage() {
  const user = await requirePageRole(['customer']);
  const items = await listConversations(user);
  return (
    <>
      <PageHeader title="المحادثات" description="محادثات خاصة ومجهولة مع المزودين. يتم إخفاء معلومات التواصل تلقائيًا حتى تختار المزود." />
      {items.length ? <ConversationList items={items} /> : <EmptyState icon={MessageSquare} title="لا توجد محادثات" description="ابدأ محادثة مع أي مزود من صفحة العروض." />}
    </>
  );
}
