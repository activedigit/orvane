import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { config } from '@/lib/config';

/** Cookie-bound client for the current request (user-scoped, respects RLS). */
export async function createSupabaseServerClient() {
  const store = await cookies();
  return createServerClient(config.supabase.url, config.supabase.anonKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Called from a Server Component: middleware refreshes the session instead.
        }
      },
    },
  });
}

/** Service-role client. Server only. Bypasses RLS — use after explicit authorization checks. */
export function createSupabaseAdminClient() {
  if (!config.supabase.serviceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY غير مضبوط');
  return createClient(config.supabase.url, config.supabase.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
