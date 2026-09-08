import { Check } from 'lucide-react';
import { requirePageRole } from '@/lib/auth';
import { listPlans, supplierSubscription } from '@/lib/services/dashboard';
import { PageHeader, Alert } from '@/components/ui/misc';
import { SubscribeButton } from '@/components/supplier/buy-credits';
import { formatDate, formatSAR } from '@/lib/utils';

export default async function SubscriptionPage() {
  const user = await requirePageRole(['supplier']);
  const [current, plans] = await Promise.all([supplierSubscription(user.id), listPlans()]);
  return (
    <>
      <PageHeader title="الاشتراك" description="اشتراك شهري يشمل عددًا ثابتًا من العملاء المختارين بسعر أقل من الدفع لكل عميل." />
      {current ? (
        <Alert tone="success" title={`اشتراكك الحالي: ${current.plan_name}`}>استُخدم {current.used_leads} من {current.included_leads} عملاء • ينتهي في {formatDate(current.ends_at)}</Alert>
      ) : (
        <Alert tone="info">لا يوجد اشتراك نشط. تدفع حاليًا لكل عميل يختارك.</Alert>
      )}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {plans.map((p) => (
          <div key={p.id} className="rounded-lg border border-line bg-surface p-6 shadow-card">
            <h3 className="text-lg font-semibold text-ink">{p.name_ar}</h3>
            <p className="text-sm text-muted">{p.description_ar}</p>
            <div className="mt-3 text-3xl font-bold tabular text-ink">{formatSAR(p.price_monthly)} <span className="text-sm font-normal text-muted">/ شهريًا</span></div>
            <ul className="mt-4 space-y-2">{p.features.map((f) => <li key={f} className="flex items-center gap-2 text-sm text-ink-2"><Check className="size-4 text-success" /> {f}</li>)}</ul>
            <div className="mt-5"><SubscribeButton planId={p.id} label={current ? 'تغيير إلى هذه الباقة' : 'اشترك الآن'} /></div>
          </div>
        ))}
      </div>
    </>
  );
}
