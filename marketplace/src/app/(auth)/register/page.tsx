import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser, homeForRole } from '@/lib/auth';
import { RegisterForm } from '@/components/auth/register-form';

export const metadata = { title: 'إنشاء حساب عميل' };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const user = await getCurrentUser();
  const { next } = await searchParams;
  if (user) redirect(homeForRole(user.role));
  return (
    <div className="w-full max-w-md rounded-xl border border-line bg-surface p-6 shadow-card sm:p-8">
      <h1 className="text-2xl font-bold text-ink">إنشاء حساب عميل</h1>
      <p className="mt-1 text-sm text-muted">
        أنشئ حسابك لتستقبل العروض وتتابع طلباتك. مزود خدمة؟{' '}
        <Link href="/register/supplier" className="font-medium text-primary hover:underline">
          سجّل من هنا
        </Link>
      </p>
      <div className="mt-6">
        <RegisterForm next={next} />
      </div>
    </div>
  );
}
