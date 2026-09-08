import { notFound } from 'next/navigation';
import { requirePageRole } from '@/lib/auth';
import { adminMessagesForConversation } from '@/lib/services/admin';
import { sql } from '@/lib/db';
import { PageHeader } from '@/components/ui/misc';
import { Badge } from '@/components/ui/badge';
import { formatDateTime, cn } from '@/lib/utils';

export default async function AdminChatPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePageRole(['admin']);
  const { id } = await params;
  const [c] = await sql<{ id: string; status: string; customer_name: string; company_name: string; reference_code: string; title: string; customer_id: string }[]>`
    select c.id, c.status, c.customer_id, u.full_name as customer_name, sp.company_name, r.reference_code, r.title from public.conversations c join public.users u on u.id = c.customer_id join public.supplier_profiles sp on sp.user_id = c.supplier_id join public.requests r on r.id = c.request_id where c.id = ${id}`;
  if (!c) notFound();
  const messages = await adminMessagesForConversation(id);
  const logs = await sql<{ id: string; action: string; original_excerpt: string | null; created_at: string; user_name: string | null }[]>`select m.id, m.action, m.original_excerpt, m.created_at, u.full_name as user_name from public.moderation_logs m left join public.users u on u.id = m.user_id where m.conversation_id = ${id} order by m.created_at desc`;
  return (
    <>
      <PageHeader title={`محادثة ${c.reference_code}`} description={`${c.customer_name} ↔ ${c.company_name} • ${c.title}`} actions={<Badge tone={c.status === 'unlocked' ? 'success' : 'neutral'}>{c.status}</Badge>} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-2 rounded-lg border border-line bg-surface p-4 lg:col-span-2">
          {messages.map((m) => (
            <div key={m.id} className={cn('rounded-md px-3 py-2 text-sm', m.kind === 'system' ? 'bg-canvas-2 text-center text-xs text-muted' : m.was_filtered ? 'border border-warning/40 bg-warning-soft' : 'bg-canvas')}>
              {m.kind !== 'system' ? <div className="mb-0.5 text-xs text-muted">{m.sender_name} • {formatDateTime(m.created_at)} {m.was_filtered ? '• مُصفّاة' : ''}</div> : null}
              <div>{m.body || `[${m.kind}]`}</div>
            </div>
          ))}
        </div>
        <div>
          <h3 className="mb-2 font-semibold text-ink">سجل المراقبة</h3>
          <ul className="space-y-2">
            {logs.map((l) => (
              <li key={l.id} className="rounded-md border border-line bg-surface p-3 text-xs">
                <div className="flex items-center justify-between"><Badge tone={l.action === 'blocked' ? 'danger' : l.action === 'masked' ? 'warning' : 'neutral'}>{l.action}</Badge><span className="text-muted">{formatDateTime(l.created_at)}</span></div>
                <div className="mt-1 text-muted">{l.user_name}</div>
                <div className="mt-1 text-ink-2">{l.original_excerpt}</div>
              </li>
            ))}
            {!logs.length ? <li className="text-sm text-muted">لا توجد محاولات مخالفة.</li> : null}
          </ul>
        </div>
      </div>
    </>
  );
}
