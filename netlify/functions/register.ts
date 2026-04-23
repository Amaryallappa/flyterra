import type { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

// Consistent with working auth-login.ts
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

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

  let body: any
  try {
    body = JSON.parse(event.body || '{}')
  } catch {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid JSON body' }) }
  }

  const { email, password, full_name, mobile_number } = body

  if (!email || !password || !full_name || !mobile_number) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Missing required fields' }) }
  }

  // 1. Create Auth User
  const username = email.split('@')[0] + Math.floor(Math.random() * 1000)
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, mobile_number, role: 'Farmer', username }
  })

  if (authError) {
    console.error('Registration: Auth Error', authError.message)
    return { 
      statusCode: 400, 
      headers: corsHeaders, 
      body: JSON.stringify({ error: authError.message }) 
    }
  }

  const userId = authData.user.id

  try {
    // 2. Insert/Update Account Profile
    const { error: accError } = await supabase
      .from('accounts')
      .upsert({
        account_id: userId,
        username,
        role: 'Farmer',
        is_active: true
      }, { onConflict: 'account_id' })

    if (accError) throw accError

    // 3. Insert/Update Farmer Profile
    const { error: farmerError } = await supabase
      .from('farmers')
      .upsert({
        farmer_id: userId,
        full_name,
        mobile_number
      }, { onConflict: 'farmer_id' })

    if (farmerError) throw farmerError

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ success: true, user_id: userId })
    }

  } catch (err: any) {
    console.error('Registration: DB Error', err)
    // Cleanup if DB inserts fail
    await supabase.auth.admin.deleteUser(userId)
    return { 
      statusCode: 500, 
      headers: corsHeaders, 
      body: JSON.stringify({ 
        error: 'Failed to complete registration profile.',
        details: err.message || 'Unknown database error'
      }) 
    }
  }
}
