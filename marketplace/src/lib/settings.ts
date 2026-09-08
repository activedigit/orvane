import 'server-only';
import { sql } from '@/lib/db';

/** Admin-editable settings with safe defaults. Keys map to admin_settings.key */
export const SETTING_DEFAULTS = {
  'matching.max_suppliers': 8,
  'matching.min_score': 40,
  'pricing.default_lead_price': 199,
  'pricing.currency': 'SAR',
  'supplier.privacy_mode': 'hidden', // hidden | visible  (identity before selection)
  'chat.filter_after_unlock': false,
  'chat.block_mostly_contact_messages': true,
  'requests.quotation_window_days': 7,
  'selection.unlock_expiry_days': 7,
  'supplier.signup_bonus_credits': 0,
  'platform.support_email': 'support@orood.sa',
  'platform.support_phone': '',
  'platform.name': 'عروض',
} as const;

export type SettingKey = keyof typeof SETTING_DEFAULTS;
export type SettingValue<K extends SettingKey> = (typeof SETTING_DEFAULTS)[K];

let cache: { at: number; values: Record<string, unknown> } | null = null;
const TTL = 15_000;

export async function getAllSettings(): Promise<Record<string, unknown>> {
  if (cache && Date.now() - cache.at < TTL) return cache.values;
  const rows = await sql<{ key: string; value: unknown }[]>`select key, value from public.admin_settings`;
  const values: Record<string, unknown> = { ...SETTING_DEFAULTS };
  for (const r of rows) values[r.key] = r.value;
  cache = { at: Date.now(), values };
  return values;
}

export async function getSetting<K extends SettingKey>(key: K): Promise<SettingValue<K>> {
  const all = await getAllSettings();
  return (all[key] ?? SETTING_DEFAULTS[key]) as SettingValue<K>;
}

export async function setSetting(key: string, value: unknown, updatedBy?: string, description?: string) {
  await sql`insert into public.admin_settings (key, value, description_ar, updated_by)
    values (${key}, ${sql.json(value as never)}, ${description ?? null}, ${updatedBy ?? null})
    on conflict (key) do update set value = excluded.value, updated_by = excluded.updated_by, updated_at = now()`;
  cache = null;
}
