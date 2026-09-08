import 'server-only';
import { cache } from 'react';
import { sql } from '@/lib/db';
import type { CategoryRow, CityRow, SubcategoryRow } from '@/lib/db/types';

export type CategoryWithSubs = CategoryRow & { subcategories: SubcategoryRow[] };

export const getCities = cache(async (): Promise<CityRow[]> => {
  return sql<CityRow[]>`select * from public.cities where is_active order by sort_order, name_ar`;
});

export const getCategories = cache(async (): Promise<CategoryWithSubs[]> => {
  const cats = await sql<CategoryRow[]>`select * from public.categories where is_active order by sort_order, name_ar`;
  const subs = await sql<SubcategoryRow[]>`select * from public.subcategories where is_active order by sort_order, name_ar`;
  return cats.map((c) => ({ ...c, subcategories: subs.filter((s) => s.category_id === c.id) }));
});

export async function getCategoryBySlug(slug: string) {
  const all = await getCategories();
  return all.find((c) => c.slug === slug) ?? null;
}
