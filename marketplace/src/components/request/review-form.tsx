'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Star } from 'lucide-react';
import { toast } from 'sonner';
import { submitReviewAction } from '@/actions/selection';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const CRITERIA = [
  { key: 'quality', label: 'الجودة' },
  { key: 'communication', label: 'التواصل' },
  { key: 'priceAccuracy', label: 'دقة السعر' },
  { key: 'deliveryTime', label: 'الالتزام بالوقت' },
  { key: 'overall', label: 'التجربة العامة' },
] as const;

function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="inline-flex gap-1" dir="ltr" role="radiogroup">
      {[1, 2, 3, 4, 5].map((i) => (
        <button key={i} type="button" role="radio" aria-checked={value === i} onClick={() => onChange(i)} className="p-0.5" aria-label={`${i} من 5`}>
          <Star className={cn('size-6 transition-colors', i <= value ? 'fill-accent text-accent' : 'text-line-2 hover:text-accent')} />
        </button>
      ))}
    </div>
  );
}

export function ReviewForm({ requestId, existing }: { requestId: string; existing: { quality: number; communication: number; price_accuracy: number; delivery_time: number; overall: number; comment: string | null } | null }) {
  const router = useRouter();
  const [vals, setVals] = useState<Record<(typeof CRITERIA)[number]['key'], number>>({
    quality: existing?.quality ?? 0, communication: existing?.communication ?? 0, priceAccuracy: existing?.price_accuracy ?? 0, deliveryTime: existing?.delivery_time ?? 0, overall: existing?.overall ?? 0,
  });
  const [comment, setComment] = useState(existing?.comment ?? '');
  const [pending, start] = useTransition();
  const complete = Object.values(vals).every((v) => v > 0);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await submitReviewAction(requestId, { ...vals, comment });
          if (!res.ok) { toast.error(res.error); return; }
          toast.success('شكرًا لتقييمك');
          router.refresh();
        });
      }}
      className="space-y-4"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {CRITERIA.map((c) => (
          <div key={c.key} className="flex items-center justify-between rounded-md bg-canvas px-3 py-2">
            <span className="text-sm text-ink-2">{c.label}</span>
            <StarInput value={vals[c.key]} onChange={(v) => setVals({ ...vals, [c.key]: v })} />
          </div>
        ))}
      </div>
      <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="اكتب تجربتك مع المزود (اختياري)" rows={3} />
      <Button type="submit" disabled={!complete} loading={pending}>
        {existing ? 'تحديث التقييم' : 'إرسال التقييم'}
      </Button>
    </form>
  );
}
