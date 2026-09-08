import Link from 'next/link';
import { requirePageRole } from '@/lib/auth';
import { adminListUsers } from '@/lib/services/admin';
import { PageHeader } from '@/components/ui/misc';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Input, Select } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { formatDate, cn } from '@/lib/utils';
import { VERIFICATION_STATUS } from '@/lib/domain/labels';

const ROLE: Record<string, string> = { customer: 'عميل', supplier: 'مزود', admin: 'مدير' };

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ role?: string; q?: string; status?: string }> }) {
  await requirePageRole(['admin']);
  const { role, q, status } = await searchParams;
  const rows = await adminListUsers({ role: role || undefined, q: q || undefined, status: status || undefined });
  return (
    <>
      <PageHeader title="المستخدمون" description="العملاء والمزودون والمديرون." />
      <div className="mb-3 flex flex-wrap gap-2">
        {[['', 'الكل'], ['customer', 'العملاء'], ['supplier', 'المزودون'], ['admin', 'المديرون']].map(([k, l]) => (
          <Link key={k} href={`/admin/users${k ? `?role=${k}` : ''}`} className={cn('rounded-full border px-3 py-1 text-sm', (role || '') === k ? 'border-primary bg-primary-soft text-primary' : 'border-line bg-surface text-ink-2')}>{l}</Link>
        ))}
      </div>
      <form className="mb-4 flex flex-wrap gap-2">
        {role ? <input type="hidden" name="role" value={role} /> : null}
        <Input name="q" defaultValue={q} placeholder="بحث بالاسم أو البريد أو الشركة" className="max-w-xs" />
        <Select name="status" defaultValue={status ?? ''} className="w-auto"><option value="">كل الحالات</option><option value="active">نشط</option><option value="blocked">محظور</option></Select>
        <Button type="submit" variant="secondary">بحث</Button>
      </form>
      <DataTable rows={rows} columns={[
        { key: 'full_name', header: 'الاسم', render: (r) => <Link href={`/admin/users/${r.id}`} className="font-medium text-primary hover:underline">{r.full_name}</Link> },
        { key: 'company_name', header: 'الشركة', render: (r) => r.company_name ?? '—' },
        { key: 'email', header: 'البريد', render: (r) => <span className="ltr text-xs">{r.email}</span> },
        { key: 'role', header: 'الدور', render: (r) => ROLE[r.role] },
        { key: 'verification_status', header: 'التوثيق', render: (r) => (r.verification_status ? VERIFICATION_STATUS[r.verification_status] : '—') },
        { key: 'status', header: 'الحالة', render: (r) => <Badge tone={r.status === 'blocked' ? 'danger' : 'success'}>{r.status === 'blocked' ? 'محظور' : 'نشط'}</Badge> },
        { key: 'created_at', header: 'التسجيل', render: (r) => formatDate(r.created_at) },
      ]} />
    </>
  );
}
