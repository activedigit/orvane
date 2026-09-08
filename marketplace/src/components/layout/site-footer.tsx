import Link from 'next/link';
import { Logo } from './logo';

const COLS = [
  { title: 'المنصة', links: [{ href: '/how-it-works', label: 'كيف تعمل' }, { href: '/categories', label: 'الخدمات' }, { href: '/faq', label: 'الأسئلة الشائعة' }, { href: '/contact', label: 'تواصل معنا' }] },
  { title: 'للمزودين', links: [{ href: '/pricing', label: 'الأسعار والباقات' }, { href: '/register/supplier', label: 'سجّل كمزود خدمة' }, { href: '/login', label: 'تسجيل الدخول' }] },
  { title: 'قانوني', links: [{ href: '/terms', label: 'الشروط والأحكام' }, { href: '/privacy', label: 'سياسة الخصوصية' }] },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-4">
        <div className="space-y-3">
          <Logo />
          <p className="text-sm text-muted">العميل يطلب مرة واحدة، الشركات المناسبة تقدم عروضها، والعميل هو من يختار.</p>
        </div>
        {COLS.map((c) => (
          <div key={c.title}>
            <h4 className="mb-3 text-sm font-semibold text-ink">{c.title}</h4>
            <ul className="space-y-2">
              {c.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-muted hover:text-primary">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-4 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} {process.env.NEXT_PUBLIC_APP_NAME || 'عروض'}. جميع الحقوق محفوظة.</span>
          <span>المملكة العربية السعودية • الأسعار بالريال السعودي (ر.س)</span>
        </div>
      </div>
    </footer>
  );
}
