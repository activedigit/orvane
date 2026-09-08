import { requirePageRole } from '@/lib/auth';
import { DashboardShell, type NavItem } from '@/components/layout/dashboard-shell';
import { supplierStats } from '@/lib/services/dashboard';

export default async function SupplierLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageRole(['supplier'], '/supplier');
  const s = await supplierStats(user.id);
  const nav: NavItem[] = [
    { href: '/supplier', label: 'الرئيسية', icon: 'dashboard', exact: true },
    { href: '/supplier/requests', label: 'الطلبات المناسبة', icon: 'requests', badge: s.new_requests || undefined },
    { href: '/supplier/quotations', label: 'عروضي', icon: 'quotations' },
    { href: '/supplier/messages', label: 'المحادثات', icon: 'messages', badge: s.unread_messages || undefined },
    { href: '/supplier/leads', label: 'العملاء المختارون', icon: 'leads', badge: s.pending_leads || undefined },
    { href: '/supplier/credits', label: 'الرصيد', icon: 'credits' },
    { href: '/supplier/payments', label: 'المدفوعات', icon: 'payments' },
    { href: '/supplier/subscription', label: 'الاشتراك', icon: 'subscription' },
    { href: '/supplier/profile', label: 'ملفي التجاري', icon: 'profile' },
    { href: '/supplier/reviews', label: 'التقييمات', icon: 'reviews' },
    { href: '/supplier/notifications', label: 'الإشعارات', icon: 'notifications' },
  ];
  return (
    <DashboardShell user={user} nav={nav} homeHref="/supplier" title="لوحة المزود" notificationsHref="/supplier/notifications">
      {children}
    </DashboardShell>
  );
}
