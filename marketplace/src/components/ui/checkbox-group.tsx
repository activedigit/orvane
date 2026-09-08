'use client';
import { cn } from '@/lib/utils';

export function CheckboxGroup({ name, options, defaultValues = [], columns = 2 }: { name: string; options: { value: string; label: string }[]; defaultValues?: string[]; columns?: 2 | 3 }) {
  return (
    <div className={cn('grid gap-2', columns === 3 ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2')}>
      {options.map((o) => (
        <label key={o.value} className="flex cursor-pointer items-center gap-2 rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink-2 has-[:checked]:border-primary has-[:checked]:bg-primary-soft has-[:checked]:text-primary">
          <input type="checkbox" name={name} value={o.value} defaultChecked={defaultValues.includes(o.value)} className="size-4 accent-primary" />
          <span>{o.label}</span>
        </label>
      ))}
    </div>
  );
}
