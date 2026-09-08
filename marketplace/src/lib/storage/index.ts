import 'server-only';
import { config } from '@/lib/config';
import type { StorageProvider } from './provider';

export async function getStorage(): Promise<StorageProvider> {
  if (config.storage.provider === 'supabase') {
    const { supabaseStorageProvider } = await import('./supabase');
    return supabaseStorageProvider;
  }
  const { localStorageProvider } = await import('./local');
  return localStorageProvider;
}
