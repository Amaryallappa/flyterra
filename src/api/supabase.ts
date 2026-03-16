/**
 * Supabase client — single instance for the entire app.
 * Replaces the old axios `api` client for all CRUD operations.
 *
 * Auth:   supabase.auth.signInWithPassword / signOut
 * Data:   supabase.from('table').select/insert/update/delete
 * Realtime: use realtime.ts helpers
 */
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local')
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,       // keeps session in localStorage across refreshes
    autoRefreshToken: true,
  },
})

// ── Auth helpers ──────────────────────────────────────────────────────────────

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

/** Returns the account row (role, username) for the current user. */
export async function getMyAccount() {
  const session = await getSession()
  if (!session) return null
  const { data, error } = await supabase
    .from('accounts')
    .select('account_id, username, role, is_active')
    .eq('account_id', session.user.id)
    .single()
  if (error) throw error
  return data
}

// ── Error helper ──────────────────────────────────────────────────────────────

/** Extract a human-readable string from a Supabase error or any thrown error. */
export function supabaseErrorMsg(err: unknown, fallback = 'Something went wrong'): string {
  if (!err) return fallback
  if (typeof err === 'object' && 'message' in err) return (err as { message: string }).message
  return fallback
}
