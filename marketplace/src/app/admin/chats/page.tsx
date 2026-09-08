import Link from 'next/link';
import { requirePageRole } from '@/lib/auth';
import { adminListConversations } from '@/lib/services/admin';
import { PageHeader } from '@/components/ui/misc';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { formatDateTime, truncate } from '@/lib/utils';

export default async function AdminChatsPage() {
  await requirePageRole(['admin']);
  const rows = await adminListConversations();
  return (
    <>
      <PageHeader title="المحادثات" description="مراقبة المحادثات ومحاولات مشاركة بيانات التواصل." />
      <DataTable rows={rows} columns={[
        { key: 'reference_code', header: 'الطلب', render: (c) => <Link href={`/admin/chats/${c.id}`} className="text-primary hover:underline">{c.reference_code}</Link> },
        { key: 'customer_name', header: 'العميل' }, { key: 'company_name', header: 'المزود' },
        { key: 'status', header: 'الحالة', render: (c) => <Badge tone={c.status === 'unlocked' ? 'success' : 'neutral'}>{c.status === 'unlocked' ? 'مفتوحة' : c.status === 'closed' ? 'مغلقة' : 'مجهولة'}</Badge> },
        { key: 'filtered_count', header: 'رسائل مُصفّاة', render: (c) => (c.filtered_count ? <Badge tone="warning">{c.filtered_count}</Badge> : '0') },
        { key: 'last_message_preview', header: 'آخر رسالة', render: (c) => truncate(c.last_message_preview, 50) }, { key: 'last_message_at', header: 'التاريخ', render: (c) => formatDateTime(c.last_message_at) },
      ]} />
    </>
  );
}
