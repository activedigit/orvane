import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export const metadata = { title: 'كيف تعمل المنصة' };

const CUSTOMER = [
  { t: 'اكتب طلبك بكلماتك', d: 'مثال: "أحتاج تصميم وتركيب لوحة خارجية لمحل في الرياض". النظام يفهم طلبك ويسألك عن التفاصيل الناقصة فقط: المدينة، الميزانية، موعد التنفيذ، المقاسات، الصور.' },
  { t: 'نرسل طلبك للمزودين المناسبين فقط', d: 'نطابق طلبك مع مزودين موثّقين في نفس الفئة والمدينة، وضمن نطاق ميزانيتك، ونراعي التقييم وسرعة الاستجابة. عادةً 5 إلى 10 مزودين لكل طلب.' },
  { t: 'استقبل عروضًا خاصة', d: 'كل مزود يقدم عرضه دون أن يرى عروض الآخرين: السعر، ما يشمله، مدة التنفيذ، الضمان، وصلاحية العرض.' },
  { t: 'قارن وتحدث بخصوصية', d: 'قارن العروض جنبًا إلى جنب، ورتّبها حسب السعر أو التقييم أو مدة التنفيذ. اسأل أي مزود عبر محادثة خاصة داخل المنصة دون كشف بياناتك.' },
  { t: 'اختر المزود وابدأ التواصل', d: 'عندما تختار عرضًا، يتلقى المزود إشعارًا ويفتح بيانات التواصل. عندها فقط تظهر بياناتكما لبعضكما.' },
];
const SUPPLIER = [
  { t: 'سجّل ووثّق حسابك', d: 'أنشئ ملفك التجاري، حدد فئاتك والمدن التي تغطيها، وارفع السجل التجاري ليتم توثيق حسابك.' },
  { t: 'استقبل الطلبات المناسبة', d: 'يصلك إشعار عند وجود طلب في تخصصك ومدينتك. لا نرسل كل الطلبات للجميع.' },
  { t: 'قدّم عرضك الخاص', d: 'حدد سعرك وتفاصيل عرضك. لا يرى المنافسون عرضك، ولا ترى عروضهم.' },
  { t: 'ادفع فقط عندما يختارك العميل', d: 'إذا اختار العميل عرضك، تدفع رسوم فتح بيانات التواصل حسب حجم المشروع، وتتواصل معه مباشرة.' },
];

export default function HowItWorksPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-3xl font-bold text-ink">كيف تعمل المنصة؟</h1>
      <p className="mt-2 text-muted">منصة عروض أسعار خاصة: العميل يطلب مرة واحدة، الشركات المناسبة تقدم عروضها، والعميل هو من يختار.</p>

      <h2 className="mt-10 text-xl font-bold text-ink">للعملاء</h2>
      <ol className="mt-4 space-y-4">
        {CUSTOMER.map((s, i) => (
          <li key={s.t} className="flex gap-4 rounded-lg border border-line bg-surface p-5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-fg">{i + 1}</span>
            <div>
              <h3 className="font-semibold text-ink">{s.t}</h3>
              <p className="mt-1 text-sm text-muted">{s.d}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-6">
        <Button asChild size="lg">
          <Link href="/requests/new">
            ابدأ طلبك <ArrowLeft />
          </Link>
        </Button>
      </div>

      <h2 className="mt-12 text-xl font-bold text-ink">لمزودي الخدمات</h2>
      <ol className="mt-4 space-y-4">
        {SUPPLIER.map((s, i) => (
          <li key={s.t} className="flex gap-4 rounded-lg border border-line bg-surface p-5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-white">{i + 1}</span>
            <div>
              <h3 className="font-semibold text-ink">{s.t}</h3>
              <p className="mt-1 text-sm text-muted">{s.d}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-6 flex gap-3">
        <Button asChild size="lg" variant="secondary">
          <Link href="/register/supplier">سجّل كمزود خدمة</Link>
        </Button>
        <Button asChild size="lg" variant="ghost">
          <Link href="/pricing">الأسعار والباقات</Link>
        </Button>
      </div>
    </div>
  );
}
