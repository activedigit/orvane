import { ContactForm } from '@/components/marketing/contact-form';
import { getSetting } from '@/lib/settings';

export const metadata = { title: 'تواصل معنا' };

export default async function ContactPage() {
  const email = await getSetting('platform.support_email');
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold text-ink">تواصل معنا</h1>
      <p className="mt-2 text-muted">لديك سؤال أو اقتراح أو بلاغ؟ راسلنا وسنرد خلال يوم عمل.</p>
      <div className="mt-8 grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          <ContactForm />
        </div>
        <aside className="space-y-4 text-sm">
          <div className="rounded-lg border border-line bg-surface p-4">
            <div className="text-muted">البريد الإلكتروني</div>
            <div className="font-medium text-ink ltr">{email}</div>
          </div>
          <div className="rounded-lg border border-line bg-surface p-4">
            <div className="text-muted">ساعات العمل</div>
            <div className="font-medium text-ink">الأحد – الخميس، 9 صباحًا – 6 مساءً</div>
          </div>
        </aside>
      </div>
    </div>
  );
}
