import { requirePageRole } from '@/lib/auth';
import { listSupplierReviews } from '@/lib/services/reviews';
import { getOwnSupplierProfile } from '@/lib/services/suppliers';
import { PageHeader, Stars, StatCard, KeyValue } from '@/components/ui/misc';
import { EmptyState } from '@/components/ui/empty-state';
import { formatDate } from '@/lib/utils';
import { Star } from 'lucide-react';

export default async function SupplierReviewsPage() {
  const user = await requirePageRole(['supplier']);
  const [reviews, own] = await Promise.all([listSupplierReviews(user.id), getOwnSupplierProfile(user.id)]);
  return (
    <>
      <PageHeader title="التقييمات" description="تقييمات العملاء بعد اكتمال المشاريع. تؤثر على ترتيبك في المطابقة." />
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="متوسط التقييم" value={<Stars value={Number(own?.profile.rating_avg ?? 0)} count={own?.profile.rating_count ?? 0} size="md" />} icon={<Star />} />
        <StatCard label="مشاريع مكتملة" value={own?.profile.completed_count ?? 0} />
        <StatCard label="عملاء اختاروك" value={own?.profile.won_count ?? 0} />
      </div>
      <div className="mt-6">
        {reviews.length ? (
          <ul className="space-y-3">
            {reviews.map((r) => (
              <li key={r.id} className="rounded-lg border border-line bg-surface p-4">
                <div className="flex items-center justify-between"><Stars value={r.overall} /><span className="text-xs text-muted">{r.customer_name} • {formatDate(r.created_at)}</span></div>
                <div className="mt-1 text-xs text-muted">{r.request_title}</div>
                {r.comment ? <p className="mt-2 text-sm text-ink-2">{r.comment}</p> : null}
                <KeyValue className="mt-3 grid-cols-2 sm:grid-cols-4" items={[{ label: 'الجودة', value: `${r.quality}/5` }, { label: 'التواصل', value: `${r.communication}/5` }, { label: 'دقة السعر', value: `${r.price_accuracy}/5` }, { label: 'الالتزام بالوقت', value: `${r.delivery_time}/5` }]} />
              </li>
            ))}
          </ul>
        ) : <EmptyState icon={Star} title="لا توجد تقييمات بعد" description="ستظهر التقييمات بعد إكمال المشاريع مع العملاء." />}
      </div>
    </>
  );
}
