import { redirect } from 'next/navigation';
import { getCurrentUser, homeForRole } from '@/lib/auth';
import { LoginForm } from '@/components/auth/login-form';
import { sql } from '@/lib/db';

export const metadata = { title: 'تسجيل الدخول' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const user = await getCurrentUser();
  const { next } = await searchParams;
  if (user) redirect(next && next.startsWith('/') ? next : homeForRole(user.role));
  const [demo] = await sql<{ ok: boolean }[]>`select exists (select 1 from public.users where email = 'admin@demo.sa') as ok`;
  return (
    <div className="w-full max-w-md rounded-xl border border-line bg-surface p-6 shadow-card sm:p-8">
      <h1 className="text-2xl font-bold text-ink">تسجيل الدخول</h1>
      <p className="mt-1 text-sm text-muted">أهلًا بعودتك.</p>
      <div className="mt-6">
        <LoginForm next={next} demo={demo?.ok ?? false} />
      </div>
    </div>
  );
}
