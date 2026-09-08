'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Coins, CreditCard, Lock, BadgeCheck } from 'lucide-react';
import { toast } from 'sonner';
import { startUnlockAction } from '@/actions/selection';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { PaymentMethodPicker } from '@/components/supplier/payment-method-picker';
import { formatSAR, cn } from '@/lib/utils';
import type { PaymentMethod } from '@/lib/payments/gateway';
import type { UnlockOptions } from '@/lib/services/unlock';

type Method = 'credits' | 'subscription' | 'payment';

export function UnlockPanel({ selectionId, options }: { selectionId: string; options: UnlockOptions }) {
  const router = useRouter();
  const [method, setMethod] = useState<Method>(options.subscription && options.subscription.remaining > 0 ? 'subscription' : options.creditsBalance >= options.leadPrice ? 'credits' : 'payment');
  const [payMethod, setPayMethod] = useState<PaymentMethod>('mada');
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();

  const go = () =>
    start(async () => {
      const res = await startUnlockAction(selectionId, method, method === 'payment' ? payMethod : undefined);
      if (!res.ok) { toast.error(res.error); return; }
      setConfirm(false);
      if (res.data.unlocked) {
        toast.success('تم فتح بيانات العميل');
        router.refresh();
      } else {
        router.push(res.data.redirectUrl);
      }
    });

  const choices: { key: Method; title: string; desc: string; icon: React.ReactNode; disabled?: boolean }[] = [
    { key: 'subscription', title: 'من اشتراكي', desc: options.subscription ? `${options.subscription.plan} — متبقي ${options.subscription.remaining} عملاء` : 'لا يوجد اشتراك نشط', icon: <BadgeCheck />, disabled: !options.subscription || options.subscription.remaining <= 0 },
    { key: 'credits', title: 'من رصيد النقاط', desc: `رصيدك: ${options.creditsBalance} نقطة (المطلوب ${Math.ceil(options.leadPrice)})`, icon: <Coins />, disabled: options.creditsBalance < options.leadPrice },
    { key: 'payment', title: 'دفع مباشر', desc: 'مدى، Apple Pay، Visa، Mastercard، STC Pay', icon: <CreditCard /> },
  ];

  return (
    <div className="rounded-lg border border-primary/30 bg-surface p-5 shadow-card">
      <div className="flex items-center gap-2 text-sm font-semibold text-primary"><Lock className="size-4" /> افتح بيانات التواصل مقابل {formatSAR(options.leadPrice)}</div>
      <p className="mt-1 text-sm text-muted">بعد الفتح تحصل على اسم العميل ورقم جواله وواتساب وبريده، ويحصل هو على بياناتك.</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {choices.map((c) => (
          <button key={c.key} type="button" disabled={c.disabled} onClick={() => setMethod(c.key)} className={cn('rounded-md border p-3 text-start transition-colors disabled:cursor-not-allowed disabled:opacity-50', method === c.key ? 'border-primary bg-primary-soft' : 'border-line hover:border-line-2')}>
            <div className="flex items-center gap-2 text-sm font-semibold text-ink [&_svg]:size-4 [&_svg]:text-primary">{c.icon} {c.title}</div>
            <div className="mt-1 text-xs text-muted">{c.desc}</div>
          </button>
        ))}
      </div>
      {method === 'payment' ? <div className="mt-4"><PaymentMethodPicker value={payMethod} onChange={setPayMethod} /></div> : null}
      <Button size="lg" className="mt-5 w-full" onClick={() => setConfirm(true)}>
        <Lock /> فتح بيانات العميل
      </Button>
      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent title="تأكيد فتح بيانات العميل" description={method === 'payment' ? `سيتم تحويلك لإتمام الدفع بقيمة ${formatSAR(options.leadPrice)}.` : method === 'credits' ? `سيتم خصم ${Math.ceil(options.leadPrice)} نقطة من رصيدك.` : 'سيتم احتساب هذا العميل ضمن اشتراكك.'}>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirm(false)} disabled={pending}>تراجع</Button>
            <Button onClick={go} loading={pending}>تأكيد</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
