import { redirect } from 'next/navigation';
import { getCurrentUser, homeForRole } from '@/lib/auth';
import { getCategories, getCities } from '@/lib/services/reference';
import { SupplierRegisterForm } from '@/components/auth/supplier-register-form';
import { BadgeCheck, Inbox, Lock } from 'lucide-react';

export const metadata = { title: 'تسجيل مزود خدمة' };

export default async function SupplierRegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect(homeForRole(user.role));
  const [categories, cities] = await Promise.all([getCategories(), getCities()]);
  return (
    <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-5">
      <aside className="lg:col-span-2">
        <h1 className="text-2xl font-bold text-ink">سجّل كمزود خدمة</h1>
        <p className="mt-2 text-muted">استقبل فرصًا حقيقية من عملاء يبحثون عن خدماتك الآن.</p>
        <ul className="mt-6 space-y-4">
          {[
            { icon: Inbox, t: 'طلبات مناسبة فقط', d: 'تصلك الطلبات في فئاتك ومدنك فقط، مع ملخص واضح لكل طلب.' },
            { icon: Lock, t: 'عروض خاصة', d: 'لا يرى المنافسون عرضك ولا أسعارك.' },
            { icon: BadgeCheck, t: 'ادفع عند الفوز فقط', d: 'رسوم فتح بيانات العميل تُدفع بعد اختياره لعرضك.' },
          ].map((f) => (
            <li key={f.t} className="flex gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
                <f.icon className="size-4.5" />
              </span>
              <div>
                <div className="font-semibold text-ink">{f.t}</div>
                <div className="text-sm text-muted">{f.d}</div>
              </div>
            </li>
          ))}
        </ul>
      </aside>
      <div className="rounded-xl border border-line bg-surface p-6 shadow-card sm:p-8 lg:col-span-3">
        <SupplierRegisterForm categories={categories.map((c) => ({ id: c.id, name_ar: c.name_ar }))} cities={cities.map((c) => ({ id: c.id, name_ar: c.name_ar }))} />
      </div>
    </div>
  );
}
