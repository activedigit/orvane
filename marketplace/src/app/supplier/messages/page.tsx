import { requirePageRole } from '@/lib/auth';
import { listConversations } from '@/lib/services/chat';
import { PageHeader } from '@/components/ui/misc';
import { EmptyState } from '@/components/ui/empty-state';
import { ConversationList } from '@/components/chat/conversation-list';
import { MessageSquare } from 'lucide-react';

export default async function SupplierMessagesPage() {
  const user = await requirePageRole(['supplier']);
  const items = await listConversations(user);
  return (
    <>
      <PageHeader title="المحادثات" description="محادثات مجهولة مع العملاء. تُخفى معلومات التواصل تلقائيًا حتى يختارك العميل وتفتح البيانات." />
      {items.length ? <ConversationList items={items} /> : <EmptyState icon={MessageSquare} title="لا توجد محادثات" description="ابدأ محادثة من صفحة أي طلب مناسب." />}
    </>
  );
}
