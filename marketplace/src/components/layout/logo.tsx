import Link from 'next/link';
import { cn } from '@/lib/utils';

export function Logo({ className, href = '/' }: { className?: string; href?: string }) {
  const name = process.env.NEXT_PUBLIC_APP_NAME || 'عروض';
  return (
    <Link href={href} className={cn('inline-flex items-center gap-2', className)} aria-label={name}>
      <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-fg">
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M4 7h16M4 12h10M4 17h7" />
          <path d="m16 15 2 2 4-4" />
        </svg>
      </span>
      <span className="text-lg font-bold tracking-tight text-ink">{name}</span>
    </Link>
  );
}
