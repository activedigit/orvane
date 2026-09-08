import { requirePageRole } from '@/lib/auth';
import { DashboardShell, type NavItem } from '@/components/layout/dashboard-shell';
import { customerStats } from '@/lib/services/dashboard';

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageRole(['customer'], '/dashboard');
  const stats = await customerStats(user.id);
  const nav: NavItem[] = [
    { href: '/dashboard', label: 'الرئيسية', icon: 'dashboard', exact: true },
    { href: '/dashboard/requests', label: 'طلباتي', icon: 'requests', badge: stats.active_requests || undefined },
    { href: '/dashboard/quotations', label: 'العروض المستلمة', icon: 'quotations', badge: stats.new_quotations || undefined },
    { href: '/dashboard/messages', label: 'المحادثات', icon: 'messages', badge: stats.new_messages || undefined },
    { href: '/dashboard/selected', label: 'المزودون المختارون', icon: 'selected' },
    { href: '/dashboard/reviews', label: 'التقييمات', icon: 'reviews' },
    { href: '/dashboard/notifications', label: 'الإشعارات', icon: 'notifications' },
    { href: '/dashboard/account', label: 'الحساب', icon: 'account' },
  ];
  return (
    <DashboardShell user={user} nav={nav} homeHref="/dashboard" title="لوحة العميل" notificationsHref="/dashboard/notifications">
      {children}
    </DashboardShell>
  );
}
