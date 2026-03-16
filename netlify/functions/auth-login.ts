/**
 * POST /api/auth-login
 * Signs in via Supabase Auth and returns session + account role.
 *
 * Body: { email, password }
 * Response: { access_token, refresh_token, role, account_id, username }
 *
 * NOTE: The frontend can also call supabase.auth.signInWithPassword() directly.
 * This function is provided for compatibility with the old login flow.
 */
import type { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
)

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ detail: 'Method not allowed' }) }
  }

  let body: { email: string; password: string }
  try {
    body = JSON.parse(event.body ?? '{}')
  } catch {
    return { statusCode: 400, body: JSON.stringify({ detail: 'Invalid JSON' }) }
  }

  const { email, password } = body
  if (!email || !password) {
    return { statusCode: 422, body: JSON.stringify({ detail: 'email and password required' }) }
  }

  // Use anon key client for sign-in (service key supports admin sign-in too)
  const anonClient = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
  )

  const { data: authData, error: authError } = await anonClient.auth.signInWithPassword({
    email,
    password,
  })

  if (authError || !authData.session) {
    return {
      statusCode: 401,
      body: JSON.stringify({ detail: authError?.message ?? 'Invalid credentials' }),
    }
  }

  // Fetch account role
  const { data: account, error: accError } = await supabase
    .from('accounts')
    .select('role, username, is_active')
    .eq('account_id', authData.user.id)
    .single()

  if (accError || !account) {
    return { statusCode: 500, body: JSON.stringify({ detail: 'Account not found' }) }
  }

  if (!account.is_active) {
    return { statusCode: 403, body: JSON.stringify({ detail: 'Account is inactive' }) }
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      access_token:  authData.session.access_token,
      refresh_token: authData.session.refresh_token,
      account_id:    authData.user.id,
      role:          account.role,
      username:      account.username,
    }),
  }
}
