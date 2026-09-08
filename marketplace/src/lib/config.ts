/**
 * Central runtime configuration. Reads environment variables once and
 * exposes typed values. Server-only values must never be imported by
 * client components (this module is safe: only NEXT_PUBLIC_* are public).
 */
const bool = (v: string | undefined, d = false) => (v == null ? d : ['1', 'true', 'yes'].includes(v.toLowerCase()));

export const config = {
  appName: process.env.NEXT_PUBLIC_APP_NAME || 'عروض',
  appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  databaseUrl: process.env.DATABASE_URL || '',
  auth: {
    provider: (process.env.AUTH_PROVIDER || (process.env.NEXT_PUBLIC_SUPABASE_URL ? 'supabase' : 'local')) as 'local' | 'supabase',
    secret: process.env.AUTH_SECRET || 'change-me-in-production-please-use-32-chars',
    sessionCookie: 'orood_session',
    sessionDays: 30,
  },
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    storageBucket: process.env.SUPABASE_STORAGE_BUCKET || 'private',
  },
  storage: {
    provider: (process.env.STORAGE_PROVIDER || (process.env.SUPABASE_SERVICE_ROLE_KEY ? 'supabase' : 'local')) as 'local' | 'supabase',
    localDir: process.env.LOCAL_STORAGE_DIR || './storage',
    maxUploadBytes: Number(process.env.MAX_UPLOAD_MB || 10) * 1024 * 1024,
  },
  ai: {
    provider: (process.env.AI_PROVIDER || 'rules') as 'rules' | 'anthropic',
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
    anthropicModel: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5',
  },
  payments: {
    gateway: (process.env.PAYMENT_GATEWAY || 'mock') as 'mock' | 'moyasar' | 'tap',
    moyasarSecretKey: process.env.MOYASAR_SECRET_KEY || '',
    moyasarPublishableKey: process.env.NEXT_PUBLIC_MOYASAR_PUBLISHABLE_KEY || '',
  },
  notifications: {
    emailEnabled: bool(process.env.EMAIL_ENABLED),
    whatsappEnabled: bool(process.env.WHATSAPP_ENABLED),
    pushEnabled: bool(process.env.PUSH_ENABLED),
  },
  isProd: process.env.NODE_ENV === 'production',
};

export function assertServerConfig() {
  if (!config.databaseUrl) throw new Error('DATABASE_URL غير مضبوط. راجع ملف .env.example');
}
