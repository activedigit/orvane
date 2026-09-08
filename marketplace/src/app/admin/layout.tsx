import { requirePageRole } from '@/lib/auth';
import { DashboardShell, type NavItem } from '@/components/layout/dashboard-shell';
import { adminOverview } from '@/lib/services/admin';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageRole(['admin'], '/admin');
  const o = await adminOverview();
  const nav: NavItem[] = [
    { href: '/admin', label: 'نظرة عامة', icon: 'dashboard', exact: true },
    { href: '/admin/analytics', label: 'التحليلات', icon: 'analytics' },
    { href: '/admin/requests', label: 'الطلبات', icon: 'requests' },
    { href: '/admin/quotations', label: 'العروض', icon: 'quotations' },
    { href: '/admin/verification', label: 'التوثيق', icon: 'verification', badge: o.pending_verifications || undefined },
    { href: '/admin/users', label: 'المستخدمون', icon: 'users' },
    { href: '/admin/chats', label: 'المحادثات', icon: 'chats' },
    { href: '/admin/payments', label: 'المدفوعات', icon: 'payments' },
    { href: '/admin/pricing', label: 'أسعار العملاء', icon: 'pricing' },
    { href: '/admin/subscriptions', label: 'الاشتراكات', icon: 'subscription' },
    { href: '/admin/credits', label: 'النقاط الترويجية', icon: 'credits' },
    { href: '/admin/categories', label: 'الفئات', icon: 'categories' },
    { href: '/admin/cities', label: 'المدن', icon: 'cities' },
    { href: '/admin/reviews', label: 'التقييمات', icon: 'reviews' },
    { href: '/admin/reports', label: 'البلاغات', icon: 'reports', badge: o.open_reports || undefined },
    { href: '/admin/blocked', label: 'المحظورون', icon: 'blocked' },
    { href: '/admin/security', label: 'الأمان والمراقبة', icon: 'security' },
    { href: '/admin/notifications', label: 'الإشعارات', icon: 'broadcast' },
    { href: '/admin/settings', label: 'الإعدادات', icon: 'settings' },
  ];
  return (
    <DashboardShell user={user} nav={nav} homeHref="/admin" title="لوحة الإدارة" notificationsHref="/admin/reports">
      {children}
    </DashboardShell>
  );
}
