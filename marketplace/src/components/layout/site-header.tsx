import Link from 'next/link';
import { getCurrentUser, homeForRole } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Logo } from './logo';
import { MobileNav } from './mobile-nav';

const NAV = [
  { href: '/how-it-works', label: 'كيف تعمل المنصة' },
  { href: '/categories', label: 'الخدمات' },
  { href: '/pricing', label: 'للمزودين' },
  { href: '/faq', label: 'الأسئلة الشائعة' },
];

export async function SiteHeader() {
  const user = await getCurrentUser();
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-8">
          <Logo />
          <nav className="hidden items-center gap-6 md:flex">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="text-sm font-medium text-ink-2 hover:text-primary">
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <Button asChild variant="secondary" size="sm">
              <Link href={homeForRole(user.role)}>لوحة التحكم</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">تسجيل الدخول</Link>
              </Button>
              <Button asChild variant="secondary" size="sm">
                <Link href="/register/supplier">سجّل كمزود خدمة</Link>
              </Button>
            </>
          )}
          <Button asChild size="sm">
            <Link href="/requests/new">ابدأ طلبك</Link>
          </Button>
        </div>
        <MobileNav nav={NAV} user={user ? { role: user.role, home: homeForRole(user.role) } : null} />
      </div>
    </header>
  );
}
