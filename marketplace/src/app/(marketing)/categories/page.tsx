import Link from 'next/link';
import { CategoryIcon } from '@/components/marketing/category-icon';
import { getCategories } from '@/lib/services/reference';

export const metadata = { title: 'الخدمات' };

export default async function CategoriesPage() {
  const categories = await getCategories();
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-3xl font-bold text-ink">تصفح الخدمات</h1>
      <p className="mt-2 text-muted">اختر الفئة لتبدأ طلبك، أو اكتب ما تحتاجه مباشرة من الصفحة الرئيسية وسنصنفه لك.</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((c) => (
          <Link key={c.id} href={`/categories/${c.slug}`} className="rounded-lg border border-line bg-surface p-5 shadow-card transition-colors hover:border-primary/40">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-md bg-primary-soft text-primary">
                <CategoryIcon icon={c.icon} className="size-5" />
              </span>
              <h2 className="font-semibold text-ink">{c.name_ar}</h2>
            </div>
            <p className="mt-3 text-sm text-muted">{c.description_ar}</p>
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {c.subcategories.slice(0, 4).map((s) => (
                <li key={s.id} className="rounded-full bg-canvas-2 px-2 py-0.5 text-xs text-ink-2">
                  {s.name_ar}
                </li>
              ))}
            </ul>
          </Link>
        ))}
      </div>
    </div>
  );
}
