import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { sql } from '@/lib/db';
import { homeForRole } from '@/lib/auth';

/** Supabase OAuth / magic-link callback: exchanges the code for a session. */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const next = req.nextUrl.searchParams.get('next');
  if (code) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      const [u] = await sql<{ role: 'customer' | 'supplier' | 'admin' }[]>`select role from public.users where id = ${data.user.id}`;
      return NextResponse.redirect(new URL(next && next.startsWith('/') ? next : homeForRole(u?.role ?? 'customer'), req.url));
    }
  }
  return NextResponse.redirect(new URL('/login?error=oauth', req.url));
}
