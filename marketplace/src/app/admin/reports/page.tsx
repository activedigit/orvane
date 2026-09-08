import Link from 'next/link';
import { requirePageRole } from '@/lib/auth';
import { adminListReports } from '@/lib/services/admin';
import { PageHeader } from '@/components/ui/misc';
import { Badge } from '@/components/ui/badge';
import { ActionForm, Input } from '@/components/admin/forms';
import { adminReportAction } from '@/actions/admin';
import { SubmitButton } from '@/components/ui/submit-button';
import { formatDateTime } from '@/lib/utils';

const STATUS: Record<string, { label: string; tone: 'warning' | 'info' | 'success' | 'neutral' }> = { open: { label: 'مفتوح', tone: 'warning' }, reviewing: { label: 'قيد المراجعة', tone: 'info' }, resolved: { label: 'تمت المعالجة', tone: 'success' }, dismissed: { label: 'مرفوض', tone: 'neutral' } };

export default async function AdminReportsPage() {
  await requirePageRole(['admin']);
  const rows = await adminListReports();
  return (
    <>
      <PageHeader title="البلاغات والشكاوى ورسائل التواصل" />
      <ul className="space-y-3">
        {rows.map((r) => (
          <li key={r.id} className="rounded-lg border border-line bg-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-semibold text-ink">{r.reason}</div>
              <div className="flex items-center gap-2 text-xs text-muted"><Badge tone={STATUS[r.status]?.tone}>{STATUS[r.status]?.label}</Badge>{formatDateTime(r.created_at)}</div>
            </div>
            <div className="mt-1 text-xs text-muted">{r.reporter_name ? `من: ${r.reporter_name}` : 'زائر'}{r.reported_name ? ` • ضد: ${r.reported_name}` : ''}{r.conversation_id ? <> • <Link href={`/admin/chats/${r.conversation_id}`} className="text-primary hover:underline">المحادثة</Link></> : null}{r.request_id ? <> • <Link href={`/admin/requests/${r.request_id}`} className="text-primary hover:underline">الطلب</Link></> : null}</div>
            {r.details ? <p className="mt-2 whitespace-pre-line text-sm text-ink-2">{r.details}</p> : null}
            {r.admin_note ? <p className="mt-1 text-xs text-muted">ملاحظة الإدارة: {r.admin_note}</p> : null}
            {['open', 'reviewing'].includes(r.status) ? (
              <form action={adminReportAction} className="mt-3 flex flex-wrap items-center gap-2">
                <input type="hidden" name="id" value={r.id} />
                <Input name="note" placeholder="ملاحظة" className="h-9 max-w-xs" />
                <SubmitButton size="sm" name="status" value="resolved">تمت المعالجة</SubmitButton>
                <SubmitButton size="sm" variant="secondary" name="status" value="reviewing">قيد المراجعة</SubmitButton>
                <SubmitButton size="sm" variant="ghost" name="status" value="dismissed">رفض</SubmitButton>
              </form>
            ) : null}
            {!['open', 'reviewing'].includes(r.status) ? <ActionForm action={adminReportAction} fields={{ id: r.id, status: 'reviewing' }} label="إعادة فتح" variant="ghost" /> : null}
          </li>
        ))}
        {!rows.length ? <li className="rounded-lg border border-dashed border-line-2 p-8 text-center text-sm text-muted">لا توجد بلاغات</li> : null}
      </ul>
    </>
  );
}
