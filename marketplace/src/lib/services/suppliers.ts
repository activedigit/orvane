import 'server-only';
import { sql } from '@/lib/db';
import { getSetting } from '@/lib/settings';
import type { SupplierProfileRow } from '@/lib/db/types';

/** What a customer may see about a supplier before selecting them. */
export interface SupplierPublicCard {
  supplierId: string;
  /** e.g. "شركة متخصصة في اللوحات – الرياض" when privacy mode hides identity. */
  displayName: string;
  isIdentityRevealed: boolean;
  slug: string | null;
  logoFileId: string | null;
  cityName: string | null;
  categories: string[];
  yearsExperience: number;
  ratingAvg: number;
  ratingCount: number;
  quotationsCount: number;
  wonCount: number;
  completedCount: number;
  avgResponseMinutes: number | null;
  verified: boolean;
  descriptionSnippet: string;
}

export interface SupplierContact { companyName: string; contactName: string; phone: string | null; whatsapp: string | null; email: string | null; website: string | null }

export function anonymousLabel(categories: string[], cityName: string | null) {
  const cat = categories[0] ? `شركة متخصصة في ${categories[0]}` : 'مزود خدمة موثّق';
  return cityName ? `${cat} – ${cityName}` : cat;
}

/** Builds the sanitized supplier card. `revealed` = customer already selected this supplier (identity may be shown). */
export async function getSupplierPublicCard(supplierId: string, opts: { revealed?: boolean } = {}): Promise<SupplierPublicCard | null> {
  // Identity columns are nulled inside SQL when privacy applies, so identifying data never leaves the database
  // for anonymous views (not even into server logs / dev debug payloads). Private contact fields are never selected here.
  const platformHides = (await getSetting('supplier.privacy_mode')) === 'hidden';
  const revealed = !!opts.revealed;
  const [p] = await sql<{ company_name: string | null; slug: string | null; description_ar: string | null; logo_file_id: string | null; years_experience: number; verification_status: string; rating_avg: string; rating_count: number; quotations_count: number; won_count: number; completed_count: number; avg_response_minutes: number | null; hidden: boolean; city_name: string | null }[]>`
    with p as (
      select sp.*, ci.name_ar as city_name,
        (not ${revealed}) and (sp.privacy_mode = 'hidden' or (sp.privacy_mode = 'inherit' and ${platformHides})) as hidden
      from public.supplier_profiles sp left join public.cities ci on ci.id = sp.city_id where sp.user_id = ${supplierId})
    select case when hidden then null else company_name end as company_name, case when hidden then null else slug end as slug,
      case when hidden then null else left(description_ar, 200) end as description_ar, case when hidden then null else logo_file_id end as logo_file_id,
      years_experience, verification_status, rating_avg, rating_count, quotations_count, won_count, completed_count, avg_response_minutes, hidden, city_name
    from p`;
  if (!p) return null;
  const cats = await sql<{ name_ar: string }[]>`
    select distinct c.name_ar from public.supplier_categories sc join public.categories c on c.id = sc.category_id where sc.supplier_id = ${supplierId} order by c.name_ar`;
  const categories = cats.map((c) => c.name_ar);
  const hidden = p.hidden;
  return {
    supplierId,
    displayName: hidden || !p.company_name ? anonymousLabel(categories, p.city_name) : p.company_name,
    isIdentityRevealed: !hidden,
    slug: hidden ? null : p.slug,
    logoFileId: hidden ? null : p.logo_file_id,
    cityName: p.city_name,
    categories,
    yearsExperience: p.years_experience,
    ratingAvg: Number(p.rating_avg),
    ratingCount: p.rating_count,
    quotationsCount: p.quotations_count,
    wonCount: p.won_count,
    completedCount: p.completed_count,
    avgResponseMinutes: p.avg_response_minutes,
    verified: p.verification_status === 'verified',
    descriptionSnippet: hidden ? '' : p.description_ar ?? '',
  };
}

/** Full public profile page (directory-style page for verified suppliers, no contact info). */
export async function getSupplierPublicProfile(slug: string) {
  // Public profile: explicit public columns only (no phone / whatsapp / website / CR number).
  const [p] = await sql<{ user_id: string; company_name: string; slug: string; description_ar: string; logo_file_id: string | null; years_experience: number; verification_status: string; rating_avg: string; rating_count: number; quotations_count: number; won_count: number; completed_count: number; avg_response_minutes: number | null; created_at: string; city_name: string | null }[]>`
    select sp.user_id, sp.company_name, sp.slug, sp.description_ar, sp.logo_file_id, sp.years_experience, sp.verification_status, sp.rating_avg, sp.rating_count, sp.quotations_count, sp.won_count, sp.completed_count, sp.avg_response_minutes, sp.created_at, ci.name_ar as city_name
    from public.supplier_profiles sp
    join public.users u on u.id = sp.user_id and u.status = 'active'
    left join public.cities ci on ci.id = sp.city_id where sp.slug = ${slug}`;
  if (!p) return null;
  const categories = await sql<{ id: string; name_ar: string; slug: string }[]>`
    select distinct c.id, c.name_ar, c.slug from public.supplier_categories sc join public.categories c on c.id = sc.category_id where sc.supplier_id = ${p.user_id}`;
  const cities = await sql<{ name_ar: string }[]>`select ci.name_ar from public.service_areas sa join public.cities ci on ci.id = sa.city_id where sa.supplier_id = ${p.user_id} order by ci.sort_order`;
  const portfolio = await sql<{ id: string; title: string; description_ar: string | null; file_id: string | null }[]>`
    select id, title, description_ar, file_id from public.portfolio_items where supplier_id = ${p.user_id} order by sort_order, created_at`;
  const reviews = await sql<{ id: string; overall: number; quality: number; communication: number; price_accuracy: number; delivery_time: number; comment: string | null; created_at: string; customer_name: string }[]>`
    select r.id, r.overall, r.quality, r.communication, r.price_accuracy, r.delivery_time, r.comment, r.created_at, split_part(u.full_name, ' ', 1) || ' ' || left(split_part(u.full_name, ' ', 2), 1) || '.' as customer_name
    from public.reviews r join public.users u on u.id = r.customer_id where r.supplier_id = ${p.user_id} and r.status = 'published' order by r.created_at desc limit 20`;
  return { profile: p, categories, cities: cities.map((c) => c.name_ar), portfolio, reviews };
}

/** Supplier contact — only call after verifying an unlock exists for the viewer. */
export async function getSupplierContact(supplierId: string): Promise<SupplierContact | null> {
  const [row] = await sql<{ company_name: string; full_name: string; phone: string | null; whatsapp: string | null; contact_phone: string | null; email: string | null; website: string | null }[]>`
    select sp.company_name, u.full_name, u.phone, sp.whatsapp, sp.contact_phone, u.email, sp.website
    from public.supplier_profiles sp join public.users u on u.id = sp.user_id where sp.user_id = ${supplierId}`;
  if (!row) return null;
  return { companyName: row.company_name, contactName: row.full_name, phone: row.contact_phone || row.phone, whatsapp: row.whatsapp || row.contact_phone || row.phone, email: row.email, website: row.website };
}

export async function getOwnSupplierProfile(supplierId: string) {
  const [p] = await sql<SupplierProfileRow[]>`select * from public.supplier_profiles where user_id = ${supplierId}`;
  if (!p) return null;
  const categories = await sql<{ category_id: string; subcategory_id: string | null }[]>`select category_id, subcategory_id from public.supplier_categories where supplier_id = ${supplierId}`;
  const cities = await sql<{ city_id: string }[]>`select city_id from public.service_areas where supplier_id = ${supplierId}`;
  const portfolio = await sql<{ id: string; title: string; description_ar: string | null; file_id: string | null }[]>`select id, title, description_ar, file_id from public.portfolio_items where supplier_id = ${supplierId} order by sort_order, created_at`;
  const documents = await sql<{ id: string; doc_type: string; status: string; review_note: string | null; created_at: string; file_id: string | null }[]>`select id, doc_type, status, review_note, created_at, file_id from public.verification_documents where supplier_id = ${supplierId} order by created_at desc`;
  return { profile: p, categoryIds: [...new Set(categories.map((c) => c.category_id))], subcategoryIds: categories.map((c) => c.subcategory_id).filter((x): x is string => !!x), cityIds: cities.map((c) => c.city_id), portfolio, documents };
}

export interface SupplierProfileInput {
  companyName: string; descriptionAr: string; cityId: string | null; yearsExperience: number; commercialRegister?: string | null;
  website?: string | null; whatsapp?: string | null; contactPhone?: string | null; minBudget?: number | null; maxBudget?: number | null;
  isAvailable: boolean; categoryIds: string[]; subcategoryIds: string[]; cityIds: string[]; privacyMode?: 'inherit' | 'hidden' | 'visible';
}

export async function upsertSupplierProfile(userId: string, input: SupplierProfileInput) {
  const [existing] = await sql<{ slug: string }[]>`select slug from public.supplier_profiles where user_id = ${userId}`;
  let slug = existing?.slug;
  if (!slug) {
    const base = `s-${userId.slice(0, 8)}`;
    slug = base;
  }
  await sql.begin(async (tx) => {
    await tx`insert into public.supplier_profiles (user_id, company_name, slug, description_ar, city_id, years_experience, commercial_register, website, whatsapp, contact_phone, min_budget, max_budget, is_available, privacy_mode)
      values (${userId}, ${input.companyName}, ${slug}, ${input.descriptionAr}, ${input.cityId}, ${input.yearsExperience}, ${input.commercialRegister ?? null}, ${input.website ?? null}, ${input.whatsapp ?? null}, ${input.contactPhone ?? null}, ${input.minBudget ?? null}, ${input.maxBudget ?? null}, ${input.isAvailable}, ${input.privacyMode ?? 'inherit'})
      on conflict (user_id) do update set company_name = excluded.company_name, description_ar = excluded.description_ar, city_id = excluded.city_id, years_experience = excluded.years_experience,
        commercial_register = excluded.commercial_register, website = excluded.website, whatsapp = excluded.whatsapp, contact_phone = excluded.contact_phone, min_budget = excluded.min_budget, max_budget = excluded.max_budget,
        is_available = excluded.is_available, privacy_mode = excluded.privacy_mode`;
    await tx`delete from public.supplier_categories where supplier_id = ${userId}`;
    const subs = await tx<{ id: string; category_id: string }[]>`select id, category_id from public.subcategories where id in ${tx(input.subcategoryIds.length ? input.subcategoryIds : ['00000000-0000-0000-0000-000000000000'])}`;
    for (const catId of input.categoryIds) {
      const catSubs = subs.filter((s) => s.category_id === catId);
      if (catSubs.length) {
        for (const s of catSubs) await tx`insert into public.supplier_categories (supplier_id, category_id, subcategory_id) values (${userId}, ${catId}, ${s.id}) on conflict do nothing`;
      }
      await tx`insert into public.supplier_categories (supplier_id, category_id, subcategory_id) values (${userId}, ${catId}, null) on conflict do nothing`;
    }
    await tx`delete from public.service_areas where supplier_id = ${userId}`;
    for (const cityId of input.cityIds) await tx`insert into public.service_areas (supplier_id, city_id) values (${userId}, ${cityId}) on conflict do nothing`;
  });
}

export async function listVerifiedSuppliers(opts: { categorySlug?: string; citySlug?: string; limit?: number } = {}) {
  return sql<{ user_id: string; company_name: string; slug: string; description_ar: string; logo_file_id: string | null; city_name: string | null; rating_avg: string; rating_count: number; completed_count: number; years_experience: number; categories: string[] }[]>`
    select sp.user_id, sp.company_name, sp.slug, sp.description_ar, sp.logo_file_id, ci.name_ar as city_name, sp.rating_avg, sp.rating_count, sp.completed_count, sp.years_experience,
      coalesce((select array_agg(distinct c.name_ar) from public.supplier_categories sc join public.categories c on c.id = sc.category_id where sc.supplier_id = sp.user_id), '{}') as categories
    from public.supplier_profiles sp
    join public.users u on u.id = sp.user_id and u.status = 'active'
    left join public.cities ci on ci.id = sp.city_id
    where sp.verification_status = 'verified'
      ${opts.categorySlug ? sql`and exists (select 1 from public.supplier_categories sc join public.categories c on c.id = sc.category_id where sc.supplier_id = sp.user_id and c.slug = ${opts.categorySlug})` : sql``}
      ${opts.citySlug ? sql`and exists (select 1 from public.service_areas sa join public.cities c on c.id = sa.city_id where sa.supplier_id = sp.user_id and c.slug = ${opts.citySlug})` : sql``}
    order by sp.rating_avg desc, sp.completed_count desc
    limit ${opts.limit ?? 24}`;
}
