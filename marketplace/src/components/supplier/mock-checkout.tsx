'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { confirmMockPaymentAction } from '@/actions/selection';
import { Button } from '@/components/ui/button';
import { PaymentMethodPicker } from './payment-method-picker';
import { formatSAR } from '@/lib/utils';
import type { PaymentMethod } from '@/lib/payments/gateway';

export function MockCheckout({ paymentId, amount, description, initialMethod, successHref }: { paymentId: string; amount: number; description: string; initialMethod: PaymentMethod | null; successHref: string }) {
  const router = useRouter();
  const [method, setMethod] = useState<PaymentMethod>(initialMethod ?? 'mada');
  const [pending, start] = useTransition();
  const run = (outcome: 'success' | 'fail') =>
    start(async () => {
      const res = await confirmMockPaymentAction(paymentId, outcome, method);
      if (!res.ok) { toast.error(res.error); return; }
      if (res.data.status === 'succeeded') {
        toast.success('تمت عملية الدفع بنجاح');
        router.push(res.data.selectionId ? `/supplier/leads/${res.data.selectionId}` : successHref);
      } else {
        toast.error('فشلت عملية الدفع (محاكاة)');
        router.refresh();
      }
    });
  return (
    <div className="space-y-5">
      <div className="rounded-md bg-canvas p-4">
        <div className="text-sm text-muted">{description}</div>
        <div className="mt-1 text-3xl font-bold tabular text-ink">{formatSAR(amount)}</div>
      </div>
      <PaymentMethodPicker value={method} onChange={setMethod} />
      <div className="rounded-md border border-dashed border-line-2 p-3 text-xs text-muted">
        <ShieldCheck className="me-1 inline size-3.5" /> بوابة دفع تجريبية: لا يتم تحصيل أي مبلغ. عند ربط بوابة سعودية (مثل Moyasar) سيظهر هنا نموذج البطاقة / Apple Pay / STC Pay الحقيقي.
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <Button size="lg" onClick={() => run('success')} loading={pending}>إتمام الدفع (نجاح)</Button>
        <Button size="lg" variant="secondary" onClick={() => run('fail')} disabled={pending}>محاكاة فشل الدفع</Button>
      </div>
    </div>
  );
}
