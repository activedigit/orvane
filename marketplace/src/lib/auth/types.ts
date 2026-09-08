import type { Role } from '@/lib/db/types';

export interface SignUpInput {
  email: string;
  password: string;
  fullName: string;
  role: Exclude<Role, 'admin'>;
  phone?: string;
}

export type AuthResult = { ok: true; userId: string; needsEmailConfirmation?: boolean } | { ok: false; error: string };

export interface SessionUser {
  id: string;
  email: string | null;
  phone: string | null;
  fullName: string;
  role: Role;
  status: 'active' | 'blocked' | 'pending';
}

/**
 * Pluggable authentication. Two implementations ship:
 *  - `local`    : bcrypt + signed JWT cookie, for running without Supabase.
 *  - `supabase` : Supabase Auth (email/password now; phone OTP, Google, Apple ready).
 */
export interface AuthProvider {
  readonly name: 'local' | 'supabase';
  signUp(input: SignUpInput): Promise<AuthResult>;
  signIn(email: string, password: string): Promise<AuthResult>;
  signOut(): Promise<void>;
  /** Returns the authenticated user id from the current request cookies, or null. */
  getSessionUserId(): Promise<string | null>;
  /** Phone OTP readiness (Supabase supports natively; local returns not-supported). */
  requestPhoneOtp?(phone: string): Promise<{ ok: boolean; error?: string }>;
  verifyPhoneOtp?(phone: string, token: string): Promise<AuthResult>;
  /** OAuth readiness (Google / Apple). Returns a redirect URL. */
  getOAuthUrl?(provider: 'google' | 'apple', redirectTo: string): Promise<{ ok: boolean; url?: string; error?: string }>;
  /** Admin-side user creation used by seeding / admin panel. */
  adminCreateUser(input: SignUpInput & { role: Role; id?: string }): Promise<AuthResult>;
}
