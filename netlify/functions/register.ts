/**
 * POST /api/register
 * Public endpoint — farmer self-registration.
 * Uses service role key so it bypasses RLS and email confirmation.
 */
import type { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

function adminClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' }
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  let email: string, password: string, full_name: string, mobile_number: string
  try {
    ;({ email, password, full_name, mobile_number } = JSON.parse(event.body || '{}'))
  } catch {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid JSON body' }) }
  }

  if (!email || !password || !full_name || !mobile_number) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Missing required fields' }) }
  }

  const supabase = adminClient()

  // The DB trigger handle_new_user fires on auth.users insert and automatically
  // creates accounts + farmers rows from raw_user_meta_data.
  const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name,
      mobile_number,
      role: 'farmer',
    },
  })
  if (authErr) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: authErr.message }) }
  }

  return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ success: true, user_id: authData.user.id }) }
}
