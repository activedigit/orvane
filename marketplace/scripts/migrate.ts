/**
 * Applies SQL migrations from supabase/migrations in filename order.
 * Files ending with `.supabase.sql` are applied only when the `auth`
 * schema exists (i.e. the target is a Supabase project) or when
 * `--supabase` is passed.
 */
import './load-env';
import fs from 'node:fs';
import path from 'node:path';
import postgres from 'postgres';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  const forceSupabase = process.argv.includes('--supabase');
  const sql = postgres(url, { max: 1, onnotice: () => {} });
  try {
    await sql`create table if not exists public.schema_migrations (name text primary key, applied_at timestamptz not null default now())`;
    const [{ has_auth }] = await sql<{ has_auth: boolean }[]>`select exists (select 1 from pg_namespace where nspname = 'auth') as has_auth`;
    const isSupabase = forceSupabase || has_auth;
    const dir = path.join(process.cwd(), 'supabase', 'migrations');
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
    const applied = new Set((await sql<{ name: string }[]>`select name from public.schema_migrations`).map((r) => r.name));
    for (const file of files) {
      if (applied.has(file)) continue;
      if (file.endsWith('.supabase.sql') && !isSupabase) {
        console.log(`skip  ${file} (Supabase only)`);
        continue;
      }
      const body = fs.readFileSync(path.join(dir, file), 'utf8');
      process.stdout.write(`apply ${file} ... `);
      await sql.begin(async (tx) => {
        await tx.unsafe(body);
        await tx`insert into public.schema_migrations (name) values (${file})`;
      });
      console.log('done');
    }
    console.log('migrations up to date');
  } finally {
    await sql.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
