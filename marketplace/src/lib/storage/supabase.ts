import 'server-only';
import { config } from '@/lib/config';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import type { StorageProvider } from './provider';

/** Private bucket; files are always streamed through the authorized /api/files route. */
export const supabaseStorageProvider: StorageProvider = {
  name: 'supabase',
  async put(p, data, mimeType) {
    const admin = createSupabaseAdminClient();
    const { error } = await admin.storage.from(config.supabase.storageBucket).upload(p, data, { contentType: mimeType, upsert: true });
    if (error) throw new Error(error.message);
  },
  async get(p) {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.storage.from(config.supabase.storageBucket).download(p);
    if (error || !data) return null;
    return Buffer.from(await data.arrayBuffer());
  },
  async remove(p) {
    const admin = createSupabaseAdminClient();
    await admin.storage.from(config.supabase.storageBucket).remove([p]);
  },
};
