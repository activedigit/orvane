'use client';
import { cn } from '@/lib/utils';
import { PAYMENT_METHOD_LABELS, type PaymentMethod } from '@/lib/payments/gateway';

export function PaymentMethodPicker({ value, onChange }: { value: PaymentMethod; onChange: (m: PaymentMethod) => void }) {
  const methods = Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[];
  return (
    <div>
      <div className="mb-1.5 text-xs font-medium text-ink-2">طريقة الدفع</div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {methods.map((m) => (
          <button key={m} type="button" onClick={() => onChange(m)} className={cn('rounded-md border px-2 py-2 text-xs font-medium', value === m ? 'border-primary bg-primary-soft text-primary' : 'border-line bg-surface text-ink-2 hover:border-line-2')}>
            {PAYMENT_METHOD_LABELS[m]}
          </button>
        ))}
      </div>
    </div>
  );
}
