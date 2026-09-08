import 'server-only';
import { sql } from '@/lib/db';
import { consoleEmailChannel, consolePushChannel, consoleWhatsappChannel, type NotificationChannel } from './channels';

const channels: NotificationChannel[] = [consoleEmailChannel, consoleWhatsappChannel, consolePushChannel];

export interface NotifyInput {
  userId: string;
  type: string;
  title: string;
  body?: string | null;
  link?: string | null;
  data?: Record<string, unknown>;
}

/** Creates the in-app notification and fans out to enabled channels (never throws). */
export async function notify(input: NotifyInput) {
  const [user] = await sql<{ email: string | null; phone: string | null }[]>`select email, phone from public.users where id = ${input.userId}`;
  const status: Record<string, string> = { in_app: 'sent' };
  for (const ch of channels) {
    if (!ch.isEnabled()) { status[ch.name] = 'skipped'; continue; }
    try {
      status[ch.name] = await ch.send({ ...input, email: user?.email, phone: user?.phone });
    } catch {
      status[ch.name] = 'failed';
    }
  }
  await sql`insert into public.notifications (user_id, type, title, body, link, data, channels)
    values (${input.userId}, ${input.type}, ${input.title}, ${input.body ?? null}, ${input.link ?? null}, ${sql.json((input.data ?? {}) as never)}, ${sql.json(status)})`.catch(() => {});
}

export async function notifyMany(userIds: string[], input: Omit<NotifyInput, 'userId'>) {
  await Promise.all(userIds.map((userId) => notify({ ...input, userId })));
}
