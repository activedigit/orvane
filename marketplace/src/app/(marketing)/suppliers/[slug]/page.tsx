import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BadgeCheck, MapPin, Briefcase, Clock } from 'lucide-react';
import { getSupplierPublicProfile } from '@/lib/services/suppliers';
import { Avatar, Stars, KeyValue } from '@/components/ui/misc';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';

export default async function SupplierProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getSupplierPublicProfile(slug);
  if (!data) notFound();
  const { profile, categories, cities, portfolio, reviews } = data;
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="rounded-lg border border-line bg-surface p-6 shadow-card">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <Avatar name={profile.company_name} src={profile.logo_file_id ? `/api/files/${profile.logo_file_id}` : null} size="lg" />
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-ink">{profile.company_name}</h1>
              {profile.verification_status === 'verified' ? (
                <Badge tone="success">
                  <BadgeCheck className="size-3.5" /> موثّق
                </Badge>
              ) : null}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
              <Stars value={Number(profile.rating_avg)} count={profile.rating_count} />
              {profile.city_name ? (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-4" /> {profile.city_name}
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1">
                <Briefcase className="size-4" /> {profile.years_experience} سنوات خبرة
              </span>
              {profile.avg_response_minutes ? (
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-4" /> يرد خلال {profile.avg_response_minutes < 60 ? `${profile.avg_response_minutes} دقيقة` : `${Math.round(profile.avg_response_minutes / 60)} ساعة`}
                </span>
              ) : null}
            </div>
            <p className="mt-4 text-sm leading-relaxed text-ink-2">{profile.description_ar}</p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {categories.map((c) => (
                <Link key={c.id} href={`/categories/${c.slug}`} className="rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-medium text-primary">
                  {c.name_ar}
                </Link>
              ))}
            </div>
          </div>
          <div className="shrink-0">
            <Button asChild>
              <Link href="/requests/new">اطلب عرض سعر</Link>
            </Button>
            <p className="mt-2 max-w-40 text-xs text-muted">بيانات التواصل تظهر بعد اختيارك للمزود.</p>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 border-t border-line pt-5 sm:grid-cols-4">
          {[
            ['المشاريع المكتملة', profile.completed_count],
            ['عروض مقدمة', profile.quotations_count],
            ['عملاء اختاروه', profile.won_count],
            ['المدن', cities.join('، ') || '—'],
          ].map(([l, v]) => (
            <div key={String(l)}>
              <div className="text-xs text-muted">{l}</div>
              <div className="text-lg font-semibold text-ink tabular">{v}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 font-semibold text-ink">أعمال سابقة</h2>
          {portfolio.length ? (
            <ul className="grid gap-3 sm:grid-cols-2">
              {portfolio.map((p) => (
                <li key={p.id} className="overflow-hidden rounded-lg border border-line bg-surface">
                  {p.file_id ? (
                     
                    <img src={`/api/files/${p.file_id}`} alt={p.title} className="aspect-video w-full object-cover" />
                  ) : (
                    <div className="aspect-video w-full bg-canvas-2" />
                  )}
                  <div className="p-3">
                    <div className="text-sm font-semibold text-ink">{p.title}</div>
                    {p.description_ar ? <div className="text-xs text-muted">{p.description_ar}</div> : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">لم يضف المزود أعمالًا بعد.</p>
          )}
        </section>
        <section>
          <h2 className="mb-3 font-semibold text-ink">تقييمات العملاء</h2>
          {reviews.length ? (
            <ul className="space-y-3">
              {reviews.map((r) => (
                <li key={r.id} className="rounded-lg border border-line bg-surface p-4">
                  <div className="flex items-center justify-between">
                    <Stars value={r.overall} />
                    <span className="text-xs text-muted">{r.customer_name} • {formatDate(r.created_at)}</span>
                  </div>
                  {r.comment ? <p className="mt-2 text-sm text-ink-2">{r.comment}</p> : null}
                  <KeyValue className="mt-3 grid-cols-2 sm:grid-cols-4" items={[{ label: 'الجودة', value: `${r.quality}/5` }, { label: 'التواصل', value: `${r.communication}/5` }, { label: 'دقة السعر', value: `${r.price_accuracy}/5` }, { label: 'الالتزام بالوقت', value: `${r.delivery_time}/5` }]} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">لا توجد تقييمات بعد.</p>
          )}
        </section>
      </div>
    </div>
  );
}
