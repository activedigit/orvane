import Link from 'next/link';
import { requirePageRole } from '@/lib/auth';
import { adminListRequests } from '@/lib/services/admin';
import { PageHeader } from '@/components/ui/misc';
import { DataTable } from '@/components/ui/data-table';
import { RequestStatusBadge } from '@/components/ui/status-badge';
import { Input, Select } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';
import { REQUEST_STATUS } from '@/lib/domain/labels';

export default async function AdminRequestsPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  await requirePageRole(['admin']);
  const { status, q } = await searchParams;
  const rows = await adminListRequests({ status: status || undefined, q: q || undefined });
  return (
    <>
      <PageHeader title="الطلبات" />
      <form className="mb-4 flex flex-wrap gap-2">
        <Input name="q" defaultValue={q} placeholder="بحث بالرقم أو العنوان أو العميل" className="max-w-xs" />
        <Select name="status" defaultValue={status ?? ''} className="w-auto"><option value="">كل الحالات</option>{Object.entries(REQUEST_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</Select>
        <Button type="submit" variant="secondary">بحث</Button>
      </form>
      <DataTable rows={rows} columns={[
        { key: 'reference_code', header: 'الرقم', render: (r) => <Link href={`/admin/requests/${r.id}`} className="font-medium text-primary hover:underline">{r.reference_code}</Link> },
        { key: 'title', header: 'العنوان' }, { key: 'customer_name', header: 'العميل' }, { key: 'category_name', header: 'الفئة' }, { key: 'city_name', header: 'المدينة' },
        { key: 'matched_count', header: 'مزودون' }, { key: 'quotations_count', header: 'عروض' },
        { key: 'status', header: 'الحالة', render: (r) => <RequestStatusBadge status={r.status} /> }, { key: 'created_at', header: 'التاريخ', render: (r) => formatDate(r.created_at) },
      ]} />
    </>
  );
}
