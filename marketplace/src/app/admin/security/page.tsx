import Link from 'next/link';
import { requirePageRole } from '@/lib/auth';
import { adminModerationLogs, adminSecurityEvents } from '@/lib/services/admin';
import { PageHeader, Section } from '@/components/ui/misc';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { formatDateTime, truncate } from '@/lib/utils';

export default async function SecurityPage() {
  await requirePageRole(['admin']);
  const [logs, events] = await Promise.all([adminModerationLogs(), adminSecurityEvents()]);
  return (
    <>
      <PageHeader title="الأمان والمراقبة" description="محاولات مشاركة بيانات التواصل، تجاوز حدود الاستخدام، ومحاولات الوصول غير المصرح." />
      <Section title="سجل المراقبة (تصفية المحتوى)">
        <DataTable rows={logs} empty="لا توجد سجلات" columns={[
          { key: 'created_at', header: 'التاريخ', render: (l) => formatDateTime(l.created_at) }, { key: 'user_name', header: 'المستخدم', render: (l) => l.user_name ?? '—' }, { key: 'kind', header: 'النوع' },
          { key: 'action', header: 'الإجراء', render: (l) => <Badge tone={l.action === 'blocked' ? 'danger' : l.action === 'masked' || l.action === 'redacted' ? 'warning' : 'neutral'}>{l.action}</Badge> },
          { key: 'original_excerpt', header: 'النص الأصلي', render: (l) => <span className="text-xs">{truncate(l.original_excerpt, 80)}</span> },
          { key: 'conversation_id', header: '', render: (l) => (l.conversation_id ? <Link href={`/admin/chats/${l.conversation_id}`} className="text-primary hover:underline">المحادثة</Link> : null) },
        ]} />
      </Section>
      <Section title="الأحداث الأمنية" className="mt-8">
        <DataTable rows={events} empty="لا توجد أحداث" columns={[
          { key: 'created_at', header: 'التاريخ', render: (e) => formatDateTime(e.created_at) }, { key: 'user_name', header: 'المستخدم', render: (e) => e.user_name ?? '—' }, { key: 'event_type', header: 'النوع' },
          { key: 'severity', header: 'الخطورة', render: (e) => <Badge tone={e.severity === 'high' ? 'danger' : e.severity === 'medium' ? 'warning' : 'neutral'}>{e.severity}</Badge> }, { key: 'ip', header: 'IP', render: (e) => <span className="ltr text-xs">{e.ip ?? '—'}</span> },
          { key: 'details', header: 'تفاصيل', render: (e) => <span className="ltr text-xs">{truncate(JSON.stringify(e.details), 80)}</span> },
        ]} />
      </Section>
    </>
  );
}
