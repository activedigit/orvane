'use client';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { buyCreditsAction, subscribeAction } from '@/actions/selection';
import { Button } from '@/components/ui/button';
import { formatSAR } from '@/lib/utils';

const PACKS = [
  { key: 'small', credits: 200, price: 190, note: 'يكفي لعميلين صغيرين' },
  { key: 'medium', credits: 500, price: 450, note: 'الأكثر شيوعًا' },
  { key: 'large', credits: 1200, price: 999, note: 'أفضل قيمة' },
] as const;

export function BuyCredits() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {PACKS.map((p) => (
        <div key={p.key} className="rounded-lg border border-line bg-surface p-4">
          <div className="text-2xl font-bold tabular text-ink">{p.credits} <span className="text-sm font-normal text-muted">نقطة</span></div>
          <div className="text-sm text-muted">{formatSAR(p.price)} • {p.note}</div>
          <Button className="mt-3 w-full" variant="secondary" disabled={pending} onClick={() => start(async () => { const r = await buyCreditsAction(p.key); if (!r.ok) { toast.error(r.error); return; } router.push(r.data.redirectUrl); })}>شراء</Button>
        </div>
      ))}
    </div>
  );
}

export function SubscribeButton({ planId, label }: { planId: string; label: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button className="w-full" loading={pending} onClick={() => start(async () => { const r = await subscribeAction(planId); if (!r.ok) { toast.error(r.error); return; } router.push(r.data.redirectUrl); })}>
      {label}
    </Button>
  );
}
