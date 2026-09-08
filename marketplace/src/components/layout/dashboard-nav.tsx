'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { NavItem } from './dashboard-shell';
import { NAV_ICONS } from './nav-icons';

function isActive(pathname: string, item: NavItem) {
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + '/');
}

export function SidebarNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav className="sticky top-20 space-y-1">
      {items.map((it) => {
        const active = isActive(pathname, it);
        const Icon = NAV_ICONS[it.icon];
        return (
          <Link key={it.href} href={it.href} className={cn('flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors', active ? 'bg-primary-soft text-primary' : 'text-ink-2 hover:bg-canvas-2 hover:text-ink')}>
            <Icon className="size-4.5 shrink-0" />
            <span className="flex-1">{it.label}</span>
            {it.badge ? <span className="rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-fg">{it.badge}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}

export function BottomNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid border-t border-line bg-surface safe-bottom md:hidden" style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}>
      {items.map((it) => {
        const active = isActive(pathname, it);
        const Icon = NAV_ICONS[it.icon];
        return (
          <Link key={it.href} href={it.href} className={cn('relative flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium', active ? 'text-primary' : 'text-muted')}>
            <Icon className="size-5" />
            <span>{it.label}</span>
            {it.badge ? <span className="absolute top-1 end-1/4 rounded-full bg-danger px-1 text-[10px] leading-4 text-white">{it.badge}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}
