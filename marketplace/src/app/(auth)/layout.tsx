import Link from 'next/link';
import { Logo } from '@/components/layout/logo';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="flex h-16 items-center justify-between px-4 sm:px-8">
        <Logo />
        <Link href="/" className="text-sm text-muted hover:text-primary">
          العودة للرئيسية
        </Link>
      </header>
      <main className="flex flex-1 items-start justify-center px-4 py-8 sm:items-center">{children}</main>
    </div>
  );
}
