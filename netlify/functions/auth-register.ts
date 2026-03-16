/**
 * POST /api/auth-register
 * Creates a Supabase Auth user + inserts account + farmer/operator profile rows.
 *
 * Body: { email, password, username, role, full_name, mobile_number, address? }
 * role: "Farmer" | "Operator"  (Admin created manually via Supabase dashboard)
 */
import type { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,   // service_role — bypasses RLS
)

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ detail: 'Method not allowed' }) }
  }

  let body: {
    email: string
    password: string
    username: string
    role: 'Farmer' | 'Operator'
    full_name: string
    mobile_number: string
    address?: string
  }

  try {
    body = JSON.parse(event.body ?? '{}')
  } catch {
    return { statusCode: 400, body: JSON.stringify({ detail: 'Invalid JSON' }) }
  }

  const { email, password, username, role, full_name, mobile_number, address } = body

  if (!email || !password || !username || !role || !full_name || !mobile_number) {
    return { statusCode: 422, body: JSON.stringify({ detail: 'Missing required fields' }) }
  }
  if (!['Farmer', 'Operator'].includes(role)) {
    return { statusCode: 422, body: JSON.stringify({ detail: 'Invalid role' }) }
  }

  // 1. Create Supabase Auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,            // auto-confirm so user can log in immediately
    user_metadata: { role, username },
  })
  if (authError) {
    return {
      statusCode: 400,
      body: JSON.stringify({ detail: authError.message }),
    }
  }

  const userId = authData.user.id

  // 2. Insert into accounts
  const { error: accError } = await supabase
    .from('accounts')
    .insert({ account_id: userId, username, role, is_active: true })

  if (accError) {
    // Rollback auth user if account insert fails
    await supabase.auth.admin.deleteUser(userId)
    return { statusCode: 500, body: JSON.stringify({ detail: accError.message }) }
  }

  // 3. Insert role-specific profile
  if (role === 'Farmer') {
    const { error: farmerError } = await supabase
      .from('farmers')
      .insert({ farmer_id: userId, full_name, mobile_number, address })
    if (farmerError) {
      await supabase.auth.admin.deleteUser(userId)
      return { statusCode: 500, body: JSON.stringify({ detail: farmerError.message }) }
    }
  } else {
    const { error: opError } = await supabase
      .from('operators')
      .insert({ operator_id: userId, full_name, mobile_number, address })
    if (opError) {
      await supabase.auth.admin.deleteUser(userId)
      return { statusCode: 500, body: JSON.stringify({ detail: opError.message }) }
    }
  }

  return {
    statusCode: 201,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'Account created', account_id: userId }),
  }
}
