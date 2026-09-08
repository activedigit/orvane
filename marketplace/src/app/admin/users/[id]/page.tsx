import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requirePageRole } from '@/lib/auth';
import { sql } from '@/lib/db';
import { PageHeader, KeyValue, Section } from '@/components/ui/misc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input, Textarea, Select } from '@/components/ui/input';
import { SubmitButton } from '@/components/ui/submit-button';
import { adminGrantCreditsAction, adminUserStatusAction, adminVerificationAction } from '@/actions/admin';
import { formatDate, formatDateTime, formatSAR } from '@/lib/utils';
import { VERIFICATION_STATUS } from '@/lib/domain/labels';
import { DataTable } from '@/components/ui/data-table';

export default async function AdminUserPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePageRole(['admin']);
  const { id } = await params;
  const [u] = await sql<{ id: string; full_name: string; email: string | null; phone: string | null; role: string; status: string; blocked_reason: string | null; created_at: string; last_seen_at: string | null }[]>`select id, full_name, email, phone, role, status, blocked_reason, created_at, last_seen_at from public.users where id = ${id}`;
  if (!u) notFound();
  const [sp] = await sql<{ company_name: string; slug: string; verification_status: string; commercial_register: string | null; credits_balance: number; rating_avg: string; rating_count: number; quotations_count: number; won_count: number; completed_count: number; description_ar: string; city_name: string | null }[]>`
    select sp.*, ci.name_ar as city_name from public.supplier_profiles sp left join public.cities ci on ci.id = sp.city_id where sp.user_id = ${id}`;
  const docs = sp ? await sql<{ id: string; doc_type: string; status: string; file_id: string | null; created_at: string; review_note: string | null }[]>`select id, doc_type, status, file_id, created_at, review_note from public.verification_documents where supplier_id = ${id} order by created_at desc` : [];
  const requests = u.role === 'customer' ? await sql<{ id: string; reference_code: string; title: string; status: string; created_at: string }[]>`select id, reference_code, title, status, created_at from public.requests where customer_id = ${id} order by created_at desc limit 20` : [];
  const payments = await sql<{ id: string; amount: string; purpose: string; status: string; created_at: string }[]>`select id, amount, purpose, status, created_at from public.payments where user_id = ${id} order by created_at desc limit 20`;
  const events = await sql<{ id: string; event_type: string; severity: string; created_at: string }[]>`select id, event_type, severity, created_at from public.security_events where user_id = ${id} order by created_at desc limit 20`;
  return (
    <>
      <PageHeader title={u.full_name} description={`${u.role === 'supplier' ? 'مزود' : u.role === 'customer' ? 'عميل' : 'مدير'} • ${u.email ?? ''}`} actions={<Badge tone={u.status === 'blocked' ? 'danger' : 'success'}>{u.status === 'blocked' ? 'محظور' : 'نشط'}</Badge>} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card><CardHeader><CardTitle>البيانات</CardTitle></CardHeader><CardContent>
            <KeyValue items={[{ label: 'البريد', value: <span className="ltr">{u.email}</span> }, { label: 'الجوال', value: <span className="ltr">{u.phone ?? '—'}</span> }, { label: 'التسجيل', value: formatDate(u.created_at) }, { label: 'آخر ظهور', value: formatDateTime(u.last_seen_at) }, ...(u.blocked_reason ? [{ label: 'سبب الحظر', value: u.blocked_reason }] : [])]} />
          </CardContent></Card>
          {sp ? (
            <Card><CardHeader><CardTitle>الملف التجاري</CardTitle><Link href={`/suppliers/${sp.slug}`} className="text-sm text-primary hover:underline">الصفحة العامة</Link></CardHeader><CardContent>
              <KeyValue items={[{ label: 'الشركة', value: sp.company_name }, { label: 'المدينة', value: sp.city_name }, { label: 'السجل التجاري', value: sp.commercial_register ?? '—' }, { label: 'التوثيق', value: VERIFICATION_STATUS[sp.verification_status] }, { label: 'الرصيد', value: `${sp.credits_balance} نقطة` }, { label: 'التقييم', value: `${sp.rating_avg} (${sp.rating_count})` }, { label: 'عروض / فوز / مكتمل', value: `${sp.quotations_count} / ${sp.won_count} / ${sp.completed_count}` }]} />
              <p className="mt-3 text-sm text-ink-2">{sp.description_ar}</p>
              <Section title="مستندات التوثيق" className="mt-4">
                <DataTable rows={docs} empty="لا توجد مستندات" columns={[{ key: 'doc_type', header: 'النوع' }, { key: 'status', header: 'الحالة' }, { key: 'created_at', header: 'التاريخ', render: (d) => formatDate(d.created_at) }, { key: 'file_id', header: 'الملف', render: (d) => (d.file_id ? <a href={`/api/files/${d.file_id}`} target="_blank" rel="noreferrer" className="text-primary underline">فتح</a> : '—') }]} />
              </Section>
            </CardContent></Card>
          ) : null}
          {requests.length ? <Section title="طلبات العميل"><DataTable rows={requests} columns={[{ key: 'reference_code', header: 'الرقم', render: (r) => <Link href={`/admin/requests/${r.id}`} className="text-primary hover:underline">{r.reference_code}</Link> }, { key: 'title', header: 'العنوان' }, { key: 'status', header: 'الحالة' }, { key: 'created_at', header: 'التاريخ', render: (r) => formatDate(r.created_at) }]} /></Section> : null}
          <Section title="المدفوعات"><DataTable rows={payments} empty="لا توجد" columns={[{ key: 'created_at', header: 'التاريخ', render: (p) => formatDateTime(p.created_at) }, { key: 'purpose', header: 'الغرض' }, { key: 'amount', header: 'المبلغ', render: (p) => formatSAR(p.amount) }, { key: 'status', header: 'الحالة' }]} /></Section>
          <Section title="أحداث أمنية"><DataTable rows={events} empty="لا توجد" columns={[{ key: 'created_at', header: 'التاريخ', render: (e) => formatDateTime(e.created_at) }, { key: 'event_type', header: 'النوع' }, { key: 'severity', header: 'الخطورة' }]} /></Section>
        </div>
        <div className="space-y-6">
          {u.role !== 'admin' ? (
            <Card><CardHeader><CardTitle>{u.status === 'blocked' ? 'إلغاء الحظر' : 'حظر المستخدم'}</CardTitle></CardHeader><CardContent>
              <form action={adminUserStatusAction} className="space-y-3">
                <input type="hidden" name="userId" value={u.id} /><input type="hidden" name="status" value={u.status === 'blocked' ? 'active' : 'blocked'} />
                {u.status !== 'blocked' ? <Textarea name="reason" placeholder="سبب الحظر" rows={2} className="min-h-16" /> : null}
                <SubmitButton variant={u.status === 'blocked' ? 'secondary' : 'destructive'} className="w-full">{u.status === 'blocked' ? 'إلغاء الحظر' : 'حظر'}</SubmitButton>
              </form>
            </CardContent></Card>
          ) : null}
          {sp ? (
            <>
              <Card><CardHeader><CardTitle>التوثيق</CardTitle></CardHeader><CardContent>
                <form action={adminVerificationAction} className="space-y-3">
                  <input type="hidden" name="supplierId" value={u.id} />
                  <Select name="status" defaultValue={sp.verification_status}><option value="pending">بانتظار التوثيق</option><option value="under_review">قيد المراجعة</option><option value="verified">موثّق</option><option value="rejected">مرفوض</option></Select>
                  <Input name="note" placeholder="ملاحظة للمزود (اختياري)" />
                  <SubmitButton className="w-full">حفظ حالة التوثيق</SubmitButton>
                </form>
              </CardContent></Card>
              <Card><CardHeader><CardTitle>نقاط ترويجية</CardTitle></CardHeader><CardContent>
                <form action={adminGrantCreditsAction} className="space-y-3">
                  <input type="hidden" name="supplierId" value={u.id} />
                  <Input name="amount" type="number" placeholder="عدد النقاط (سالب للخصم)" required />
                  <Input name="note" placeholder="ملاحظة" />
                  <SubmitButton variant="secondary" className="w-full">إضافة للرصيد</SubmitButton>
                </form>
              </CardContent></Card>
            </>
          ) : null}
        </div>
      </div>
    </>
  );
}
