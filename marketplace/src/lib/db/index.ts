import postgres, { type Sql } from 'postgres';
import { config, assertServerConfig } from '@/lib/config';

declare global {
  var __orood_sql: Sql | undefined;
}

/**
 * Single postgres.js connection pool for the server. Works with Supabase
 * (session or transaction pooler) and with any plain PostgreSQL.
 * `prepare: false` keeps it compatible with PgBouncer transaction mode.
 */
export function getSql(): Sql {
  if (!globalThis.__orood_sql) {
    assertServerConfig();
    globalThis.__orood_sql = postgres(config.databaseUrl, {
      max: Number(process.env.DATABASE_POOL_MAX || 10),
      prepare: false,
      idle_timeout: 20,
      connect_timeout: 15,
      onnotice: () => {},
      transform: { undefined: null },
      ssl: config.databaseUrl.includes('supabase.co') || config.databaseUrl.includes('sslmode=require') ? 'require' : undefined,
    });
  }
  return globalThis.__orood_sql;
}

export const sql: Sql = new Proxy(function () {} as unknown as Sql, {
  apply(_t, _this, args) {
    return (getSql() as unknown as (...a: unknown[]) => unknown)(...args);
  },
  get(_t, prop) {
    const real = getSql() as unknown as Record<string | symbol, unknown>;
    const v = real[prop];
    return typeof v === 'function' ? (v as (...a: unknown[]) => unknown).bind(real) : v;
  },
}) as Sql;

export type DbRow = Record<string, unknown>;
