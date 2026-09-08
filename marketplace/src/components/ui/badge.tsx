import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva('inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap', {
  variants: {
    tone: {
      neutral: 'bg-canvas-2 text-ink-2 border-line',
      info: 'bg-info-soft text-info border-info/20',
      success: 'bg-success-soft text-success border-success/20',
      warning: 'bg-warning-soft text-warning border-warning/20',
      danger: 'bg-danger-soft text-danger border-danger/20',
      primary: 'bg-primary-soft text-primary border-primary/20',
      accent: 'bg-accent-soft text-accent border-accent/30',
    },
  },
  defaultVariants: { tone: 'neutral' },
});

export function Badge({ className, tone, ...props }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
