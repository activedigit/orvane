import 'server-only';
import { sql } from '@/lib/db';
import type { NotificationRow } from '@/lib/db/types';

export async function listNotifications(userId: string, limit = 50): Promise<NotificationRow[]> {
  return sql<NotificationRow[]>`select * from public.notifications where user_id = ${userId} order by created_at desc limit ${limit}`;
}
export async function countUnreadNotifications(userId: string): Promise<number> {
  const [r] = await sql<{ n: number }[]>`select count(*)::int as n from public.notifications where user_id = ${userId} and not is_read`;
  return r?.n ?? 0;
}
export async function markNotificationsRead(userId: string, ids?: string[]) {
  if (ids?.length) await sql`update public.notifications set is_read = true, read_at = now() where user_id = ${userId} and id in ${sql(ids)}`;
  else await sql`update public.notifications set is_read = true, read_at = now() where user_id = ${userId} and not is_read`;
}
