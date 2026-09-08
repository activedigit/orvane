import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { Logo } from '@/components/layout/logo';
import { RequestWizard } from '@/components/request/wizard';
import { Alert } from '@/components/ui/misc';

export const metadata = { title: 'طلب عروض أسعار' };

export default async function NewRequestPage({ searchParams }: { searchParams: Promise<{ text?: string; resume?: string }> }) {
  const user = await getCurrentUser();
  const { text, resume } = await searchParams;
  return (
    <div className="min-h-dvh bg-canvas">
      <header className="flex h-16 items-center justify-between px-4 sm:px-8">
        <Logo />
        <Link href={user ? '/dashboard' : '/'} className="text-sm text-muted hover:text-primary">
          {user ? 'لوحة التحكم' : 'العودة للرئيسية'}
        </Link>
      </header>
      <main className="mx-auto max-w-2xl px-4 pb-16 pt-4">
        <div className="mb-5 text-center">
          <h1 className="text-2xl font-bold text-ink">وش تحتاج؟</h1>
          <p className="mt-1 text-sm text-muted">احصل على عروض أسعار من الشركات المناسبة خلال ساعات.</p>
        </div>
        {user && user.role !== 'customer' ? (
          <Alert tone="warning" title="حساب غير مناسب">إنشاء الطلبات متاح لحسابات العملاء فقط. سجّل الخروج وأنشئ حساب عميل لتجربة الطلب.</Alert>
        ) : (
          <RequestWizard initialText={text ?? ''} isAuthenticated={!!user} resume={resume === '1'} />
        )}
      </main>
    </div>
  );
}
