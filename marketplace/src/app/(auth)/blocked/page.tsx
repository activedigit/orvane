import { logoutAction } from '@/actions/auth';
import { Button } from '@/components/ui/button';

export default function BlockedPage() {
  return (
    <div className="w-full max-w-md rounded-xl border border-line bg-surface p-8 text-center shadow-card">
      <h1 className="text-xl font-bold text-ink">تم إيقاف هذا الحساب</h1>
      <p className="mt-2 text-sm text-muted">إذا كنت تعتقد أن هذا خطأ، تواصل مع الدعم عبر صفحة التواصل.</p>
      <form action={logoutAction} className="mt-6">
        <Button variant="secondary">تسجيل الخروج</Button>
      </form>
    </div>
  );
}
