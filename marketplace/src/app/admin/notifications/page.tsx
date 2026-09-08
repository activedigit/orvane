import { requirePageRole } from '@/lib/auth';
import { sql } from '@/lib/db';
import { PageHeader, Section } from '@/components/ui/misc';
import { Field, Input, Select, SubmitButton, Textarea } from '@/components/admin/forms';
import { adminBroadcastAction } from '@/actions/admin';
import { DataTable } from '@/components/ui/data-table';
import { formatDateTime } from '@/lib/utils';

export default async function AdminNotificationsPage() {
  await requirePageRole(['admin']);
  const recent = await sql<{ id: string; type: string; title: string; created_at: string; channels: Record<string, string>; user_name: string }[]>`select n.id, n.type, n.title, n.created_at, n.channels, u.full_name as user_name from public.notifications n join public.users u on u.id = n.user_id order by n.created_at desc limit 50`;
  return (
    <>
      <PageHeader title="الإشعارات" description="إرسال إعلان لجميع المستخدمين أو لفئة، ومتابعة آخر الإشعارات المرسلة عبر القنوات." />
      <Section title="إرسال إعلان">
        <form action={adminBroadcastAction} className="grid gap-3 rounded-lg border border-line bg-surface p-4 sm:grid-cols-2">
          <Field label="الجمهور"><Select name="audience" defaultValue="all"><option value="all">الجميع</option><option value="customers">العملاء</option><option value="suppliers">المزودون</option></Select></Field>
          <Field label="رابط (اختياري)"><Input name="link" dir="ltr" placeholder="/pricing" /></Field>
          <Field label="العنوان" required><Input name="title" required /></Field>
          <Field label="النص" required><Textarea name="body" rows={2} className="min-h-16" required /></Field>
          <div><SubmitButton>إرسال</SubmitButton></div>
        </form>
      </Section>
      <Section title="آخر الإشعارات" className="mt-8">
        <DataTable rows={recent} columns={[{ key: 'created_at', header: 'التاريخ', render: (n) => formatDateTime(n.created_at) }, { key: 'user_name', header: 'المستخدم' }, { key: 'type', header: 'النوع' }, { key: 'title', header: 'العنوان' }, { key: 'channels', header: 'القنوات', render: (n) => Object.entries(n.channels).map(([k, v]) => `${k}: ${v}`).join(' • ') }]} />
      </Section>
    </>
  );
}
