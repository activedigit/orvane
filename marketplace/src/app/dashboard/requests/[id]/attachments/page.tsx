import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requirePageRole } from '@/lib/auth';
import { getCustomerRequest } from '@/lib/services/requests';
import { AttachmentsForm } from '@/components/request/attachments-form';
import { PageHeader } from '@/components/ui/misc';

export default async function AttachmentsPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePageRole(['customer']);
  const { id } = await params;
  const r = await getCustomerRequest(id, user.id);
  if (!r) notFound();
  return (
    <>
      <PageHeader title="إضافة مرفقات" description={`للطلب ${r.reference_code} — ${r.title}`} />
      <div className="max-w-xl rounded-lg border border-line bg-surface p-5">
        <AttachmentsForm requestId={r.id} />
        <Link href={`/dashboard/requests/${r.id}`} className="mt-4 inline-block text-sm text-muted hover:text-primary">
          العودة للطلب
        </Link>
      </div>
    </>
  );
}
