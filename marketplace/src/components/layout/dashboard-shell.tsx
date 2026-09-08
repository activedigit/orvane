import Link from 'next/link';
import { Bell } from 'lucide-react';
import type { NavIconName } from './nav-icons';
import { Logo } from './logo';
import { SidebarNav, BottomNav } from './dashboard-nav';
import { UserMenu } from './user-menu';
import type { SessionUser } from '@/lib/auth/types';
import { countUnreadNotifications } from '@/lib/services/notifications';

export interface NavItem { href: string; label: string; icon: NavIconName; badge?: number; exact?: boolean }

export async function DashboardShell({ user, nav, children, homeHref, title, notificationsHref }: { user: SessionUser; nav: NavItem[]; children: React.ReactNode; homeHref: string; title: string; notificationsHref: string }) {
  const unread = await countUnreadNotifications(user.id);
  return (
    <div className="min-h-dvh bg-canvas">
      <header className="sticky top-0 z-40 border-b border-line bg-surface">
        <div className="flex h-14 items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-3">
            <Logo href={homeHref} />
            <span className="hidden text-sm text-muted sm:inline">/ {title}</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href={notificationsHref} className="relative rounded-md p-2 text-ink-2 hover:bg-canvas-2" aria-label="الإشعارات">
              <Bell className="size-5" />
              {unread > 0 ? <span className="absolute -top-0.5 -start-0.5 flex min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold leading-4 text-white">{unread > 99 ? '99+' : unread}</span> : null}
            </Link>
            <UserMenu user={user} />
          </div>
        </div>
      </header>
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6">
        <aside className="hidden w-60 shrink-0 md:block">
          <SidebarNav items={nav} />
        </aside>
        <main className="min-w-0 flex-1 pb-20 md:pb-0">{children}</main>
      </div>
      <BottomNav items={nav.slice(0, 5)} />
    </div>
  );
}
