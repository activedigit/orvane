import 'server-only';
import { sql } from '@/lib/db';
import { filterContactInfo } from '@/lib/moderation/text-filter';
import { getSetting } from '@/lib/settings';
import { notify } from '@/lib/notifications/service';
import { logSecurityEvent } from '@/lib/security/events';
import { getSupplierPublicCard } from './suppliers';
import type { ConversationRow, MessageRow } from '@/lib/db/types';
import type { SessionUser } from '@/lib/auth/types';

export interface ConversationAccess { conversation: ConversationRow; role: 'customer' | 'supplier' | 'admin' }

export async function getConversationAccess(conversationId: string, user: SessionUser): Promise<ConversationAccess | null> {
  const [c] = await sql<ConversationRow[]>`select * from public.conversations where id = ${conversationId}`;
  if (!c) return null;
  if (user.role === 'admin') return { conversation: c, role: 'admin' };
  if (c.customer_id === user.id) return { conversation: c, role: 'customer' };
  if (c.supplier_id === user.id) return { conversation: c, role: 'supplier' };
  await logSecurityEvent({ userId: user.id, eventType: 'unauthorized_access', severity: 'medium', details: { conversationId } });
  return null;
}

/** Customer starts a chat from a quotation; supplier from their quotation/selection. Only allowed between request owner and a matched supplier. */
export async function getOrCreateConversation(requestId: string, supplierId: string, actor: SessionUser): Promise<ConversationRow> {
  const [req] = await sql<{ customer_id: string; status: string }[]>`select customer_id, status from public.requests where id = ${requestId}`;
  if (!req) throw new Error('الطلب غير موجود');
  const isCustomer = actor.id === req.customer_id;
  const isSupplier = actor.id === supplierId;
  if (!isCustomer && !isSupplier && actor.role !== 'admin') throw new Error('غير مصرح');
  const [match] = await sql<{ id: string }[]>`select id from public.request_matches where request_id = ${requestId} and supplier_id = ${supplierId}`;
  if (!match) throw new Error('هذا المزود غير مرتبط بالطلب');
  const [existing] = await sql<ConversationRow[]>`select * from public.conversations where request_id = ${requestId} and supplier_id = ${supplierId}`;
  if (existing) return existing;
  const [quot] = await sql<{ id: string }[]>`select id from public.quotations where request_id = ${requestId} and supplier_id = ${supplierId}`;
  const [unlocked] = await sql<{ id: string }[]>`select id from public.lead_unlocks where request_id = ${requestId} and supplier_id = ${supplierId}`;
  const conv = await sql.begin(async (tx) => {
    const [c] = await tx<ConversationRow[]>`insert into public.conversations (request_id, customer_id, supplier_id, quotation_id, status)
      values (${requestId}, ${req.customer_id}, ${supplierId}, ${quot?.id ?? null}, ${unlocked ? 'unlocked' : 'active'}) returning *`;
    await tx`insert into public.conversation_participants (conversation_id, user_id, role) values (${c.id}, ${req.customer_id}, 'customer'), (${c.id}, ${supplierId}, 'supplier')`;
    await tx`insert into public.messages (conversation_id, sender_id, kind, body) values (${c.id}, null, 'system', 'هذه المحادثة خاصة ومجهولة. يتم إخفاء أي معلومات تواصل تلقائيًا حتى يتم اختيار المزود وفتح البيانات.')`;
    return c;
  });
  return conv;
}

export interface ConversationListItem extends ConversationRow {
  request_title: string; reference_code: string; request_status: string; unread_count: number; other_party_label: string; other_party_id: string; unlocked: boolean;
}

export async function listConversations(user: SessionUser): Promise<ConversationListItem[]> {
  // customer_name is only materialized once the lead is unlocked; before that the supplier sees "عميل".
  const rows = await sql<(ConversationRow & { request_title: string; reference_code: string; request_status: string; unread_count: number; customer_name: string | null; selected_supplier_id: string | null })[]>`
    select c.*, r.title as request_title, r.reference_code, r.status as request_status, r.selected_supplier_id, coalesce(cp.unread_count, 0) as unread_count,
      case when c.status = 'unlocked' then u.full_name else null end as customer_name
    from public.conversations c
    join public.requests r on r.id = c.request_id
    join public.users u on u.id = c.customer_id
    left join public.conversation_participants cp on cp.conversation_id = c.id and cp.user_id = ${user.id}
    where c.customer_id = ${user.id} or c.supplier_id = ${user.id}
    order by c.last_message_at desc nulls last, c.created_at desc`;
  const out: ConversationListItem[] = [];
  for (const c of rows) {
    const unlocked = c.status === 'unlocked';
    if (user.id === c.customer_id) {
      const card = await getSupplierPublicCard(c.supplier_id, { revealed: unlocked || c.selected_supplier_id === c.supplier_id });
      out.push({ ...c, other_party_label: card?.displayName ?? 'مزود خدمة', other_party_id: c.supplier_id, unlocked });
    } else {
      out.push({ ...c, other_party_label: unlocked && c.customer_name ? c.customer_name : 'عميل', other_party_id: c.customer_id, unlocked });
    }
  }
  return out;
}

export interface MessageView extends MessageRow {
  attachments: { file_id: string; original_name: string; mime_type: string }[];
  is_mine: boolean;
}

export async function listMessages(conversationId: string, user: SessionUser, opts: { after?: string | null; limit?: number } = {}): Promise<MessageView[]> {
  const access = await getConversationAccess(conversationId, user);
  if (!access) throw new Error('غير مصرح');
  const rows = await sql<MessageRow[]>`
    select id, conversation_id, sender_id, kind, body, was_filtered, filter_meta, created_at from public.messages
    where conversation_id = ${conversationId} ${opts.after ? sql`and created_at > ${opts.after}` : sql``}
    order by created_at asc limit ${opts.limit ?? 200}`;
  const ids = rows.map((r) => r.id);
  const atts = ids.length
    ? await sql<{ message_id: string; file_id: string; original_name: string; mime_type: string }[]>`
        select ma.message_id, f.id as file_id, f.original_name, f.mime_type from public.message_attachments ma join public.files f on f.id = ma.file_id
        where ma.message_id in ${sql(ids)} and f.moderation_status <> 'rejected'`
    : [];
  return rows.map((m) => ({ ...m, is_mine: m.sender_id === user.id, attachments: atts.filter((a) => a.message_id === m.id).map(({ message_id: _m, ...a }) => { void _m; return a; }) }));
}

export async function markConversationRead(conversationId: string, userId: string) {
  await sql`update public.conversation_participants set unread_count = 0, last_read_at = now() where conversation_id = ${conversationId} and user_id = ${userId}`;
}

export interface SendMessageInput { body: string; kind?: 'text' | 'image' | 'file' | 'voice'; attachmentFileIds?: string[] }

export async function sendMessage(conversationId: string, user: SessionUser, input: SendMessageInput): Promise<{ message: MessageView; filtered: boolean }> {
  const access = await getConversationAccess(conversationId, user);
  if (!access || access.role === 'admin') throw new Error('غير مصرح');
  const conv = access.conversation;
  if (conv.status === 'closed') throw new Error('المحادثة مغلقة');

  const filterAfterUnlock = await getSetting('chat.filter_after_unlock');
  const shouldFilter = conv.status !== 'unlocked' || filterAfterUnlock;
  let body = input.body.trim();
  let wasFiltered = false;
  let detections: unknown[] = [];
  if (shouldFilter && body) {
    const r = filterContactInfo(body);
    detections = r.detections;
    if (r.wasFiltered) {
      const block = await getSetting('chat.block_mostly_contact_messages');
      await sql`insert into public.moderation_logs (user_id, conversation_id, kind, action, detections, original_excerpt)
        values (${user.id}, ${conversationId}, 'text', ${block && r.isMostlyContact ? 'blocked' : 'masked'}, ${sql.json(r.detections as never)}, ${body.slice(0, 300)})`;
      await logSecurityEvent({ userId: user.id, eventType: 'contact_leak_attempt', severity: 'medium', details: { conversationId, types: r.detections.map((d) => d.type) } });
      if (block && r.isMostlyContact) {
        throw new Error('لا يمكن إرسال معلومات التواصل قبل اختيار المزود وفتح البيانات. تم إخفاء الرسالة لحماية عملية التعاقد.');
      }
      body = r.text;
      wasFiltered = true;
    } else if (r.detections.some((d) => d.type === 'keyword')) {
      await sql`insert into public.moderation_logs (user_id, conversation_id, kind, action, detections, original_excerpt)
        values (${user.id}, ${conversationId}, 'text', 'flagged', ${sql.json(r.detections as never)}, ${body.slice(0, 300)})`;
    }
  }
  const fileIds = input.attachmentFileIds ?? [];
  if (!body && !fileIds.length) throw new Error('الرسالة فارغة');

  const message = await sql.begin(async (tx) => {
    const [m] = await tx<MessageRow[]>`insert into public.messages (conversation_id, sender_id, kind, body, was_filtered, filter_meta)
      values (${conversationId}, ${user.id}, ${input.kind ?? (fileIds.length ? 'file' : 'text')}, ${body}, ${wasFiltered}, ${sql.json({ count: detections.length } as never)}) returning *`;
    for (const fileId of fileIds) {
      await tx`insert into public.message_attachments (message_id, file_id) select ${m.id}, id from public.files where id = ${fileId} and owner_id = ${user.id} and scope = 'message' and moderation_status <> 'rejected'`;
    }
    const preview = body ? body.slice(0, 80) : '📎 مرفق';
    await tx`update public.conversations set last_message_at = now(), last_message_preview = ${preview} where id = ${conversationId}`;
    await tx`update public.conversation_participants set unread_count = unread_count + 1 where conversation_id = ${conversationId} and user_id <> ${user.id}`;
    return m;
  });
  const otherId = access.role === 'customer' ? conv.supplier_id : conv.customer_id;
  const link = access.role === 'customer' ? `/chat/${conversationId}` : `/chat/${conversationId}`;
  await notify({ userId: otherId, type: 'new_message', title: 'رسالة جديدة في محادثتك', body: body.slice(0, 80) || 'مرفق جديد', link, data: { conversationId } });
  const [full] = await listMessages(conversationId, user, { after: null, limit: 1000 }).then((all) => all.filter((m) => m.id === message.id));
  return { message: full, filtered: wasFiltered };
}

/** Header info for the chat screen: other party label, request title, unlock state. */
export async function getConversationHeader(conversationId: string, user: SessionUser) {
  const access = await getConversationAccess(conversationId, user);
  if (!access) return null;
  const c = access.conversation;
  const [req] = await sql<{ title: string; reference_code: string; status: string; selected_supplier_id: string | null; customer_name: string | null }[]>`
    select r.title, r.reference_code, r.status, r.selected_supplier_id, case when ${c.status} = 'unlocked' then u.full_name else null end as customer_name
    from public.requests r join public.users u on u.id = r.customer_id where r.id = ${c.request_id}`;
  const unlocked = c.status === 'unlocked';
  let otherLabel = 'عميل';
  if (access.role !== 'supplier') {
    const card = await getSupplierPublicCard(c.supplier_id, { revealed: unlocked || req?.selected_supplier_id === c.supplier_id });
    otherLabel = card?.displayName ?? 'مزود خدمة';
  } else if (unlocked) {
    otherLabel = req?.customer_name ?? 'عميل';
  }
  return { conversation: c, role: access.role, request: req, unlocked, otherLabel, isSelected: req?.selected_supplier_id === c.supplier_id };
}
