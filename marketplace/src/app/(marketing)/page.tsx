import Link from 'next/link';
import { ArrowLeft, ShieldCheck, Lock, UserCheck, PenLine, Inbox, Scale, MessagesSquare } from 'lucide-react';
import { HeroForm } from '@/components/marketing/hero-form';
import { CategoryIcon } from '@/components/marketing/category-icon';
import { Button } from '@/components/ui/button';
import { getCategories } from '@/lib/services/reference';

const STEPS = [
  { icon: PenLine, title: 'اكتب طلبك', text: 'صف الخدمة أو المشروع بكلماتك، ونسألك عن التفاصيل الناقصة فقط.' },
  { icon: Inbox, title: 'استقبل عروضًا', text: 'يصل طلبك للشركات الموثّقة المناسبة لفئته ومدينته، وتقدّم عروضها بشكل خاص.' },
  { icon: Scale, title: 'قارن واختَر', text: 'قارن السعر ومدة التنفيذ والضمان والتقييمات جنبًا إلى جنب.' },
  { icon: MessagesSquare, title: 'تواصل مع المزود المناسب', text: 'اسأل عبر محادثة خاصة، ثم اختر من يتواصل معك مباشرة.' },
];

export default async function HomePage() {
  const categories = await getCategories();
  return (
    <>
      {/* Hero */}
      <section className="border-b border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 pb-14 pt-12 sm:pt-20">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-soft px-3 py-1 text-xs font-medium text-primary">
              <ShieldCheck className="size-3.5" /> وش تحتاج؟ احصل على عروض أسعار من الشركات المناسبة
            </span>
            <h1 className="mt-5 text-3xl font-bold leading-tight text-ink sm:text-5xl sm:leading-tight">اطلب مرة واحدة، واستقبل عروض أسعار من الشركات المناسبة</h1>
            <p className="mt-4 text-base text-muted sm:text-lg">اكتب ما تحتاجه، قارن العروض، واختر المزود الأنسب لك.</p>
          </div>
          <div className="mx-auto mt-8 max-w-2xl">
            <HeroForm />
            <p className="mt-4 text-center text-xs text-muted sm:text-sm">بدون اتصالات عشوائية • بياناتك تبقى خاصة • أنت تختار من يتواصل معك</p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold text-ink">كيف تعمل المنصة؟</h2>
          <p className="mt-2 text-sm text-muted">أربع خطوات من الطلب إلى التعاقد، وكل شيء داخل المنصة.</p>
        </div>
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="relative rounded-lg border border-line bg-surface p-5 shadow-card">
              <div className="mb-3 flex items-center justify-between">
                <span className="flex size-10 items-center justify-center rounded-md bg-primary-soft text-primary">
                  <s.icon className="size-5" />
                </span>
                <span className="text-xs font-semibold text-muted tabular">0{i + 1}</span>
              </div>
              <h3 className="font-semibold text-ink">{s.title}</h3>
              <p className="mt-1 text-sm text-muted">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Categories */}
      <section className="border-y border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-bold text-ink">الخدمات</h2>
              <p className="mt-2 text-sm text-muted">اختر الفئة أو اكتب طلبك مباشرة وسنصنفه لك.</p>
            </div>
            <Link href="/categories" className="hidden text-sm font-medium text-primary hover:underline sm:inline-flex sm:items-center sm:gap-1">
              كل الخدمات <ArrowLeft className="size-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {categories.map((c) => (
              <Link key={c.id} href={`/categories/${c.slug}`} className="group flex items-center gap-3 rounded-lg border border-line bg-canvas p-4 transition-colors hover:border-primary/40 hover:bg-primary-soft/40">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-surface text-primary shadow-card">
                  <CategoryIcon icon={c.icon} className="size-5" />
                </span>
                <span className="text-sm font-semibold text-ink group-hover:text-primary">{c.name_ar}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Why */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="text-2xl font-bold leading-snug text-ink sm:text-3xl">بدل ما تبحث عن الشركات… خل الشركات المناسبة تقدم لك عروضها.</h2>
            <p className="mt-3 text-muted">هذه ليست دليل شركات ولا موقع بيع بيانات. طلبك يصل فقط لمزودين موثّقين في نفس الفئة والمدينة، ويقدمون عروضهم دون أن يروا عروض بعضهم.</p>
            <div className="mt-6">
              <Button asChild size="lg">
                <Link href="/requests/new">
                  ابدأ طلبك الآن <ArrowLeft />
                </Link>
              </Button>
            </div>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {[
              { icon: Lock, title: 'بياناتك محمية', text: 'لا يرى أي مزود رقمك أو بريدك قبل أن تختاره بنفسك.' },
              { icon: ShieldCheck, title: 'مزودون موثّقون', text: 'نراجع السجل التجاري والمستندات قبل تفعيل أي مزود.' },
              { icon: Scale, title: 'مقارنة عادلة', text: 'لا نعرض الأرخص كأنه الأفضل؛ قارن التقييم والمدة والضمان.' },
              { icon: UserCheck, title: 'أنت من يختار', text: 'يدفع المزود فقط بعد أن تختاره وتطلب التواصل معه.' },
            ].map((f) => (
              <li key={f.title} className="rounded-lg border border-line bg-surface p-4 shadow-card">
                <f.icon className="size-5 text-primary" />
                <h3 className="mt-2 font-semibold text-ink">{f.title}</h3>
                <p className="mt-1 text-sm text-muted">{f.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Supplier CTA */}
      <section className="border-t border-line bg-primary text-primary-fg">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-14 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold">هل أنت مزود خدمة؟</h2>
            <p className="mt-2 max-w-xl text-primary-fg/80">استقبل فرصًا حقيقية من عملاء يبحثون عن خدماتك الآن. لا تدفع إلا عندما يختارك العميل ويريد التواصل معك.</p>
          </div>
          <Button asChild size="lg" variant="secondary" className="shrink-0">
            <Link href="/register/supplier">سجّل كمزود خدمة</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
