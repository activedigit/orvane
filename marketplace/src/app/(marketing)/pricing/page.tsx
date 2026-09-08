import Link from 'next/link';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatSAR } from '@/lib/utils';
import { sql } from '@/lib/db';
import { listPlans } from '@/lib/services/dashboard';

export const metadata = { title: 'الأسعار والباقات للمزودين' };

export default async function PricingPage() {
  const rules = await sql<{ name_ar: string; price: string; category_name: string | null }[]>`
    select r.name_ar, r.price, c.name_ar as category_name from public.lead_pricing_rules r left join public.categories c on c.id = r.category_id where r.is_active order by r.priority, r.price`;
  const plans = await listPlans();
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-ink">لا تدفع إلا عندما يختارك العميل</h1>
        <p className="mx-auto mt-3 max-w-2xl text-muted">التسجيل وتقديم العروض مجاني. تدفع رسوم فتح بيانات التواصل فقط بعد أن يختار العميل عرضك ويطلب التواصل معك. الأسعار تختلف حسب حجم المشروع.</p>
      </div>

      <section className="mt-12">
        <h2 className="text-xl font-bold text-ink">الدفع لكل عميل مختار</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {rules.filter((r) => !r.category_name).map((r) => (
            <div key={r.name_ar} className="rounded-lg border border-line bg-surface p-5 shadow-card">
              <div className="text-sm text-muted">{r.name_ar}</div>
              <div className="mt-2 text-3xl font-bold text-ink tabular">{formatSAR(r.price)}</div>
              <div className="mt-1 text-xs text-muted">لكل عميل يختار عرضك</div>
            </div>
          ))}
        </div>
        {rules.some((r) => r.category_name) ? (
          <p className="mt-3 text-sm text-muted">أسعار خاصة لبعض الفئات: {rules.filter((r) => r.category_name).map((r) => `${r.category_name} (${formatSAR(r.price)})`).join('، ')}.</p>
        ) : null}
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-bold text-ink">الاشتراك الشهري</h2>
        <p className="mt-1 text-sm text-muted">للشركات النشطة: عدد ثابت من العملاء المختارين شهريًا بسعر أقل.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {plans.map((p) => (
            <div key={p.id} className="rounded-lg border border-line bg-surface p-6 shadow-card">
              <h3 className="text-lg font-semibold text-ink">{p.name_ar}</h3>
              <p className="text-sm text-muted">{p.description_ar}</p>
              <div className="mt-4 text-3xl font-bold text-ink tabular">
                {formatSAR(p.price_monthly)} <span className="text-sm font-normal text-muted">/ شهريًا</span>
              </div>
              <ul className="mt-4 space-y-2">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-ink-2">
                    <Check className="size-4 text-success" /> {f}
                  </li>
                ))}
              </ul>
              <Button asChild className="mt-6 w-full" variant="secondary">
                <Link href="/register/supplier">ابدأ الآن</Link>
              </Button>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12 rounded-lg border border-line bg-surface p-6">
        <h2 className="text-lg font-semibold text-ink">النقاط (الرصيد المسبق)</h2>
        <p className="mt-1 text-sm text-muted">اشحن رصيدًا مسبقًا واستخدمه لفتح بيانات العملاء بدون إدخال بطاقة في كل مرة. المنصة تدعم مدى، Apple Pay، Visa، Mastercard، و STC Pay عند ربط بوابة الدفع.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/register/supplier">سجّل كمزود خدمة</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/faq">الأسئلة الشائعة</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
