/**
 * POST /api/admin-users
 * Admin-only endpoint for operator / admin account management.
 * Body: { action, ...payload }
 *
 * action = 'create'  → create operator account (trigger handles accounts + operators rows)
 * action = 'update'  → update operator profile / station assignment
 * action = 'delete'  → delete user (removes auth + DB rows via cascade)
 * action = 'toggle'  → toggle is_active on accounts row
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
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

/** Verify the caller is an authenticated Admin using their Bearer token */
async function requireAdmin(authHeader: string | undefined): Promise<string | null> {
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.slice(7)
  const supabase = adminClient()
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return null
  const { data } = await supabase
    .from('accounts')
    .select('role')
    .eq('account_id', user.id)
    .single()
  return data?.role === 'Admin' ? user.id : null
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' }
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  const adminId = await requireAdmin(event.headers['authorization'])
  if (!adminId) {
    return { statusCode: 403, headers: corsHeaders, body: JSON.stringify({ error: 'Forbidden — Admin only' }) }
  }

  let body: Record<string, unknown>
  try {
    body = JSON.parse(event.body || '{}')
  } catch {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid JSON body' }) }
  }

  const supabase = adminClient()
  const { action } = body

  // ── CREATE OPERATOR ────────────────────────────────────────────────────────
  if (action === 'create') {
    const { email, password, username, full_name, mobile_number, address, assigned_base_station_id } = body as {
      email: string; password: string; username: string; full_name: string
      mobile_number: string; address?: string; assigned_base_station_id?: number | null
    }

    if (!email || !password || !username || !full_name || !mobile_number) {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Missing required fields' }) }
    }

    // Pass metadata so the handle_new_user trigger creates accounts + operators rows correctly
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        username,
        role: 'Operator',
        full_name,
        mobile_number,
      },
      app_metadata: {
        role: 'Operator'
      }
    })
    if (authErr) {
      console.error('DEBUG: createUser error:', authErr)
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: authErr.message }) }
    }

    const userId = authData.user.id

    // Trigger created accounts + operators rows. Update address and station if provided.
    if (address || assigned_base_station_id !== undefined) {
      const patch: Record<string, unknown> = {}
      if (address) patch.address = address
      if (assigned_base_station_id !== undefined) patch.assigned_base_station_id = assigned_base_station_id ?? null

      const { error: updateErr } = await supabase
        .from('operators')
        .update(patch)
        .eq('operator_id', userId)

      if (updateErr) {
        // Non-fatal — log but don't fail the whole operation
        console.error('Failed to update operator extras:', updateErr.message)
      }
    }

    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ success: true, id: userId }) }
  }

  // ── UPDATE OPERATOR ────────────────────────────────────────────────────────
  if (action === 'update') {
    const { id, full_name, mobile_number, email, address, assigned_base_station_id, password } = body as {
      id: string; full_name?: string; mobile_number?: string
      email?: string | null; address?: string | null; assigned_base_station_id?: number | null
      password?: string
    }
    if (!id) return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'id required' }) }

    // 1. Update Auth password if provided
    if (password && password.length >= 8) {
      const { error: authErr } = await supabase.auth.admin.updateUserById(id, { password })
      if (authErr) return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: `Auth Error: ${authErr.message}` }) }
    }

    const patch: Record<string, unknown> = {}
    if (full_name     !== undefined) patch.full_name = full_name
    if (mobile_number !== undefined) patch.mobile_number = mobile_number
    if (email         !== undefined) patch.email = email || null
    if (address       !== undefined) patch.address = address || null
    if (assigned_base_station_id !== undefined) patch.assigned_base_station_id = assigned_base_station_id ?? null

    const { error } = await supabase.from('operators').update(patch).eq('operator_id', id)
    if (error) return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: error.message }) }

    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ success: true }) }
  }

  // ── DELETE USER ────────────────────────────────────────────────────────────
  if (action === 'delete') {
    const { id } = body as { id: string }
    if (!id) return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'id required' }) }

    // Deleting auth user cascades to accounts → operators/farmers (DB cascade)
    const { error } = await supabase.auth.admin.deleteUser(id)
    if (error) return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: error.message }) }

    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ success: true }) }
  }

  // ── TOGGLE ACTIVE ──────────────────────────────────────────────────────────
  if (action === 'toggle') {
    const { id, is_active } = body as { id: string; is_active: boolean }
    if (!id || is_active === undefined) {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'id and is_active required' }) }
    }

    const { error } = await supabase
      .from('accounts')
      .update({ is_active: !is_active })
      .eq('account_id', id)
    if (error) return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: error.message }) }

    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ success: true }) }
  }

  return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Unknown action' }) }
}
