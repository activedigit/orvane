import * as React from 'react';
import Link from 'next/link';
import { Star } from 'lucide-react';
import { cn, initials } from '@/lib/utils';

export function PageHeader({ title, description, actions, className }: { title: string; description?: string; actions?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div>
        <h1 className="text-xl font-bold text-ink sm:text-2xl">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function StatCard({ label, value, hint, icon, href, tone = 'default' }: { label: string; value: React.ReactNode; hint?: string; icon?: React.ReactNode; href?: string; tone?: 'default' | 'primary' | 'accent' }) {
  const body = (
    <div className={cn('rounded-lg border bg-surface p-4 shadow-card transition-colors', href && 'hover:border-primary/40', tone === 'primary' && 'border-primary/20 bg-primary-soft/40')}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-muted">{label}</span>
        {icon ? <span className="text-primary [&_svg]:size-5">{icon}</span> : null}
      </div>
      <div className="mt-2 text-2xl font-bold tabular text-ink">{value}</div>
      {hint ? <div className="mt-1 text-xs text-muted">{hint}</div> : null}
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

export function Stars({ value, count, size = 'sm' }: { value: number; count?: number; size?: 'sm' | 'md' }) {
  const rounded = Math.round(value * 2) / 2;
  return (
    <span className="inline-flex items-center gap-1" aria-label={`التقييم ${value} من 5`}>
      <span className="inline-flex" dir="ltr">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star key={i} className={cn(size === 'sm' ? 'size-3.5' : 'size-4.5', i <= rounded ? 'fill-accent text-accent' : 'text-line-2')} />
        ))}
      </span>
      {count != null ? (
        <span className="text-xs text-muted tabular">
          {value > 0 ? value.toFixed(1) : '—'} ({count})
        </span>
      ) : null}
    </span>
  );
}

export function Avatar({ name, src, className, size = 'md' }: { name: string; src?: string | null; className?: string; size?: 'sm' | 'md' | 'lg' }) {
  const sz = size === 'sm' ? 'size-8 text-xs' : size === 'lg' ? 'size-16 text-xl' : 'size-10 text-sm';
  return src ? (
     
    <img src={src} alt={name} className={cn('rounded-full object-cover bg-canvas-2', sz, className)} />
  ) : (
    <span className={cn('inline-flex items-center justify-center rounded-full bg-primary-soft font-semibold text-primary', sz, className)}>{initials(name)}</span>
  );
}

export function KeyValue({ items, className }: { items: { label: string; value: React.ReactNode }[]; className?: string }) {
  return (
    <dl className={cn('grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2', className)}>
      {items.map((it) => (
        <div key={it.label} className="flex flex-col gap-0.5">
          <dt className="text-xs text-muted">{it.label}</dt>
          <dd className="text-sm font-medium text-ink">{it.value ?? '—'}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Section({ title, children, actions, className }: { title?: string; children: React.ReactNode; actions?: React.ReactNode; className?: string }) {
  return (
    <section className={cn('space-y-3', className)}>
      {title ? (
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-ink">{title}</h2>
          {actions}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function Alert({ tone = 'info', title, children, className }: { tone?: 'info' | 'success' | 'warning' | 'danger'; title?: string; children?: React.ReactNode; className?: string }) {
  const tones = { info: 'bg-info-soft text-info border-info/20', success: 'bg-success-soft text-success border-success/20', warning: 'bg-warning-soft text-warning border-warning/20', danger: 'bg-danger-soft text-danger border-danger/20' };
  return (
    <div className={cn('rounded-md border px-4 py-3 text-sm', tones[tone], className)}>
      {title ? <div className="font-semibold">{title}</div> : null}
      {children ? <div className={cn(title && 'mt-0.5')}>{children}</div> : null}
    </div>
  );
}
