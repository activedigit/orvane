import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const STEPS = [
  { key: 'sent', label: 'تم إرسال الطلب' },
  { key: 'quotes', label: 'استقبال العروض' },
  { key: 'review', label: 'المقارنة والاختيار' },
  { key: 'selected', label: 'تم اختيار المزود' },
  { key: 'unlocked', label: 'التواصل المباشر' },
  { key: 'done', label: 'اكتمال المشروع' },
];

export function StatusStepper({ status, unlocked }: { status: string; unlocked: boolean }) {
  const idx = status === 'closed' ? 5 : unlocked ? 4 : status === 'supplier_selected' ? 3 : status === 'reviewing_quotations' ? 2 : status === 'receiving_quotations' ? 1 : 0;
  if (status === 'cancelled') return null;
  return (
    <ol className="flex items-center gap-0 overflow-x-auto scroll-thin">
      {STEPS.map((s, i) => {
        const done = i < idx;
        const active = i === idx;
        return (
          <li key={s.key} className="flex shrink-0 items-center">
            <div className="flex flex-col items-center gap-1">
              <span className={cn('flex size-7 items-center justify-center rounded-full border text-xs font-semibold', done ? 'border-success bg-success text-white' : active ? 'border-primary bg-primary-soft text-primary' : 'border-line bg-surface text-muted')}>{done ? <Check className="size-4" /> : i + 1}</span>
              <span className={cn('whitespace-nowrap text-[11px]', active ? 'font-semibold text-primary' : done ? 'text-ink-2' : 'text-muted')}>{s.label}</span>
            </div>
            {i < STEPS.length - 1 ? <span className={cn('mx-2 mb-5 h-px w-8 sm:w-12', i < idx ? 'bg-success' : 'bg-line')} /> : null}
          </li>
        );
      })}
    </ol>
  );
}
