import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { requirePageRole } from '@/lib/auth';
import { sql } from '@/lib/db';
import { config } from '@/lib/config';
import { Logo } from '@/components/layout/logo';
import { MockCheckout } from '@/components/supplier/mock-checkout';
import { Alert } from '@/components/ui/misc';
import { PAYMENT_STATUS } from '@/lib/domain/labels';
import type { PaymentMethod } from '@/lib/payments/gateway';

export const metadata = { title: 'إتمام الدفع' };

export default async function PayPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePageRole(['supplier']);
  const { id } = await params;
  const [p] = await sql<{ id: string; amount: string; purpose: string; status: string; payment_method: PaymentMethod | null; metadata: Record<string, string>; user_id: string }[]>`select id, amount, purpose, status, payment_method, metadata, user_id from public.payments where id = ${id}`;
  if (!p || p.user_id !== user.id) notFound();
  if (p.status === 'succeeded') redirect(p.metadata.selectionId ? `/supplier/leads/${p.metadata.selectionId}` : '/supplier/payments');
  const desc = p.purpose === 'lead_unlock' ? 'فتح بيانات عميل اختار عرضك' : p.purpose === 'credits' ? `شراء ${p.metadata.credits} نقطة` : 'اشتراك شهري';
  return (
    <div className="min-h-dvh bg-canvas">
      <header className="flex h-16 items-center justify-between px-4 sm:px-8"><Logo href="/supplier" /><Link href="/supplier" className="text-sm text-muted hover:text-primary">إلغاء والعودة</Link></header>
      <main className="mx-auto max-w-md px-4 py-6">
        <div className="rounded-xl border border-line bg-surface p-6 shadow-card">
          <h1 className="text-xl font-bold text-ink">إتمام الدفع</h1>
          {p.status === 'failed' ? <Alert tone="danger" className="mt-3">فشلت المحاولة السابقة ({PAYMENT_STATUS[p.status]}). يمكنك المحاولة مرة أخرى.</Alert> : null}
          <div className="mt-4">
            {config.payments.gateway === 'mock' ? (
              <MockCheckout paymentId={p.id} amount={Number(p.amount)} description={desc} initialMethod={p.payment_method} successHref={p.purpose === 'credits' ? '/supplier/credits' : '/supplier/subscription'} />
            ) : (
              <Alert tone="info">جارٍ تحويلك إلى بوابة الدفع…</Alert>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
