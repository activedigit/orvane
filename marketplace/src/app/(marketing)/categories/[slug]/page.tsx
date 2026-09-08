import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getCategoryBySlug } from '@/lib/services/reference';
import { listVerifiedSuppliers } from '@/lib/services/suppliers';
import { CategoryIcon } from '@/components/marketing/category-icon';
import { HeroForm } from '@/components/marketing/hero-form';
import { Stars } from '@/components/ui/misc';
import { Badge } from '@/components/ui/badge';

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cat = await getCategoryBySlug(slug);
  if (!cat) notFound();
  const suppliers = await listVerifiedSuppliers({ categorySlug: slug, limit: 6 });
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <Link href="/categories" className="inline-flex items-center gap-1 text-sm text-muted hover:text-primary">
        كل الخدمات <ArrowLeft className="size-3.5 rotate-180" />
      </Link>
      <div className="mt-4 flex items-center gap-4">
        <span className="flex size-14 items-center justify-center rounded-lg bg-primary-soft text-primary">
          <CategoryIcon icon={cat.icon} className="size-7" />
        </span>
        <div>
          <h1 className="text-3xl font-bold text-ink">{cat.name_ar}</h1>
          <p className="mt-1 text-muted">{cat.description_ar}</p>
        </div>
      </div>
      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="mb-3 font-semibold text-ink">اطلب عروض أسعار في {cat.name_ar}</h2>
          <HeroForm compact />
          <h3 className="mt-8 mb-3 font-semibold text-ink">الخدمات الفرعية</h3>
          <ul className="flex flex-wrap gap-2">
            {cat.subcategories.map((s) => (
              <li key={s.id}>
                <Link href={`/requests/new?text=${encodeURIComponent(`أحتاج ${s.name_ar}`)}`} className="rounded-full border border-line bg-surface px-3 py-1.5 text-sm text-ink-2 hover:border-primary hover:text-primary">
                  {s.name_ar}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <aside>
          <h2 className="mb-3 font-semibold text-ink">مزودون موثّقون في هذه الفئة</h2>
          <ul className="space-y-2">
            {suppliers.map((s) => (
              <li key={s.user_id}>
                <Link href={`/suppliers/${s.slug}`} className="block rounded-lg border border-line bg-surface p-3 hover:border-primary/40">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-ink">{s.company_name}</span>
                    <Badge tone="success">موثّق</Badge>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs text-muted">
                    <Stars value={Number(s.rating_avg)} count={s.rating_count} />
                    <span>{s.city_name}</span>
                  </div>
                </Link>
              </li>
            ))}
            {suppliers.length === 0 ? <li className="text-sm text-muted">لا يوجد مزودون معروضون حاليًا.</li> : null}
          </ul>
          <p className="mt-3 text-xs text-muted">هذه ليست قائمة للتواصل المباشر. اطلب عرض سعر وستصلك عروض المزودين المناسبين.</p>
        </aside>
      </div>
    </div>
  );
}
