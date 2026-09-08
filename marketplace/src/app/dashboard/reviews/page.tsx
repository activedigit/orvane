import Link from 'next/link';
import { requirePageRole } from '@/lib/auth';
import { listCustomerReviews } from '@/lib/services/reviews';
import { PageHeader, Stars } from '@/components/ui/misc';
import { EmptyState } from '@/components/ui/empty-state';
import { formatDate } from '@/lib/utils';
import { Star } from 'lucide-react';

export default async function CustomerReviewsPage() {
  const user = await requirePageRole(['customer']);
  const reviews = await listCustomerReviews(user.id);
  return (
    <>
      <PageHeader title="التقييمات" description="تقييماتك للمزودين بعد اكتمال المشاريع." />
      {reviews.length ? (
        <ul className="space-y-2">
          {reviews.map((r) => (
            <li key={r.id} className="rounded-lg border border-line bg-surface p-4">
              <div className="flex items-center justify-between gap-2">
                <Link href={`/dashboard/requests/${r.request_id}`} className="font-semibold text-ink hover:text-primary">{r.company_name}</Link>
                <Stars value={r.overall} />
              </div>
              <div className="text-xs text-muted">{r.request_title} • {formatDate(r.created_at)}</div>
              {r.comment ? <p className="mt-2 text-sm text-ink-2">{r.comment}</p> : null}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={Star} title="لا توجد تقييمات بعد" description="بعد اكتمال مشروعك مع مزود، يمكنك تقييمه من صفحة الطلب." />
      )}
    </>
  );
}
