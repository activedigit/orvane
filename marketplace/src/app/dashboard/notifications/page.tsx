import { requirePageRole } from '@/lib/auth';
import { listNotifications } from '@/lib/services/notifications';
import { PageHeader } from '@/components/ui/misc';
import { NotificationList } from '@/components/notifications/notification-list';

export default async function CustomerNotificationsPage() {
  const user = await requirePageRole(['customer']);
  const items = await listNotifications(user.id);
  return (
    <>
      <PageHeader title="الإشعارات" />
      <NotificationList items={items} />
    </>
  );
}
