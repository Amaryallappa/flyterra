/**
 * POST /api/admin-assets
 * Admin-only service-role endpoint for asset & booking management.
 *
 * Actions:
 *   create_station / update_station / delete_station
 *   create_drone   / update_drone   / delete_drone
 *   create_battery / update_battery / delete_battery
 *   cancel_booking / hold_booking   / release_booking
 *   update_wallet  (update farmer wallet balance)
 *   update_razorpay (update razorpay settings)
 *   update_field_station (assign field to station)
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

  // ── STATIONS ───────────────────────────────────────────────────────────────
  if (action === 'create_station') {
    const { station_serial_no, active_date, last_known_lat, last_known_lng, station_live_video_url } = body as Record<string, unknown>
    const { data, error } = await supabase.from('base_stations').insert({
      station_serial_no, active_date,
      last_known_lat: last_known_lat ?? null,
      last_known_lng: last_known_lng ?? null,
      station_live_video_url: station_live_video_url ?? null,
    }).select().single()
    if (error) return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: error.message }) }
    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify(data) }
  }

  if (action === 'update_station') {
    const { id, ...patch } = body as Record<string, unknown>
    if (!id) return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'id required' }) }
    delete patch.action
    const { error } = await supabase.from('base_stations').update(patch).eq('station_id', id)
    if (error) return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: error.message }) }
    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ success: true }) }
  }

  if (action === 'delete_station') {
    const { id } = body as { id: number }
    if (!id) return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'id required' }) }
    const { error } = await supabase.from('base_stations').delete().eq('station_id', id)
    if (error) return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: error.message }) }
    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ success: true }) }
  }

  // ── DRONES ─────────────────────────────────────────────────────────────────
  if (action === 'create_drone') {
    const { action: _a, ...insertData } = body as Record<string, unknown>
    const { data, error } = await supabase.from('drones').insert(insertData).select().single()
    if (error) return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: error.message }) }
    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify(data) }
  }

  if (action === 'update_drone') {
    const { id, action: _a, ...patch } = body as Record<string, unknown>
    if (!id) return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'id required' }) }
    const { error } = await supabase.from('drones').update(patch).eq('drone_id', id)
    if (error) return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: error.message }) }
    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ success: true }) }
  }

  if (action === 'delete_drone') {
    const { id } = body as { id: number }
    if (!id) return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'id required' }) }
    const { error } = await supabase.from('drones').delete().eq('drone_id', id)
    if (error) return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: error.message }) }
    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ success: true }) }
  }

  // ── BATTERIES ──────────────────────────────────────────────────────────────
  if (action === 'create_battery') {
    const { action: _a, ...insertData } = body as Record<string, unknown>
    const { data, error } = await supabase.from('batteries').insert(insertData).select().single()
    if (error) return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: error.message }) }
    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify(data) }
  }

  if (action === 'update_battery') {
    const { id, action: _a, ...patch } = body as Record<string, unknown>
    if (!id) return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'id required' }) }
    const { error } = await supabase.from('batteries').update(patch).eq('battery_id', id)
    if (error) return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: error.message }) }
    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ success: true }) }
  }

  if (action === 'delete_battery') {
    const { id } = body as { id: number }
    if (!id) return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'id required' }) }
    const { error } = await supabase.from('batteries').delete().eq('battery_id', id)
    if (error) return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: error.message }) }
    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ success: true }) }
  }

  // ── BOOKINGS ───────────────────────────────────────────────────────────────
  if (action === 'cancel_booking') {
    const { id, reason } = body as { id: number; reason?: string }
    if (!id) return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'id required' }) }
    const { error } = await supabase.from('bookings').update({
      service_status: 'Cancelled',
      notes: reason ?? null,
    }).eq('booking_id', id)
    if (error) return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: error.message }) }
    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ success: true }) }
  }

  if (action === 'hold_booking') {
    const { id, reason } = body as { id: number; reason?: string }
    if (!id) return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'id required' }) }
    const { error } = await supabase.from('bookings').update({
      service_status: 'On_Hold',
      notes: reason ?? null,
    }).eq('booking_id', id)
    if (error) return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: error.message }) }
    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ success: true }) }
  }

  if (action === 'release_booking') {
    const { id } = body as { id: number }
    if (!id) return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'id required' }) }
    const { error } = await supabase.from('bookings').update({ service_status: 'Confirmed' }).eq('booking_id', id)
    if (error) return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: error.message }) }
    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ success: true }) }
  }

  // ── WALLET ─────────────────────────────────────────────────────────────────
  if (action === 'update_wallet') {
    const { farmer_id, new_balance, reason } = body as { farmer_id: string; new_balance: number; reason?: string }
    if (!farmer_id || new_balance === undefined) {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'farmer_id and new_balance required' }) }
    }

    // Get current balance to compute the delta
    const { data: farmer } = await supabase
      .from('farmers')
      .select('wallet_balance')
      .eq('farmer_id', farmer_id)
      .single()

    const currentBalance = Number(farmer?.wallet_balance ?? 0)
    const delta = new_balance - currentBalance

    // Insert wallet transaction
    await supabase.from('wallet_transactions').insert({
      farmer_id,
      type: delta >= 0 ? 'Deposit' : 'Withdrawal',
      amount: Math.abs(delta),
      reference_id: reason ?? 'Admin adjustment',
    })

    // Update farmer wallet_balance
    const { error } = await supabase
      .from('farmers')
      .update({ wallet_balance: new_balance })
      .eq('farmer_id', farmer_id)
    if (error) return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: error.message }) }

    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ success: true, new_balance }) }
  }

  // ── RAZORPAY SETTINGS ──────────────────────────────────────────────────────
  if (action === 'update_razorpay') {
    const { key_id, key_secret } = body as { key_id?: string; key_secret?: string }

    const updates: Promise<unknown>[] = []
    if (key_id !== undefined) {
      updates.push(
        supabase.from('system_settings')
          .update({ value: key_id, updated_by: adminId, updated_at: new Date().toISOString() })
          .eq('key', 'razorpay_key_id'),
      )
    }
    if (key_secret !== undefined) {
      updates.push(
        supabase.from('system_settings')
          .update({ value: key_secret, updated_by: adminId, updated_at: new Date().toISOString() })
          .eq('key', 'razorpay_key_secret'),
      )
    }
    await Promise.all(updates)
    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ success: true }) }
  }

  // ── FIELD STATION ASSIGNMENT ───────────────────────────────────────────────
  if (action === 'update_field_station') {
    const { field_id, station_id } = body as { field_id: number; station_id: number | null }
    if (!field_id) return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'field_id required' }) }
    const { error } = await supabase
      .from('fields')
      .update({ station_id: station_id ?? null })
      .eq('field_id', field_id)
    if (error) return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: error.message }) }
    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ success: true }) }
  }

  return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: `Unknown action: ${action}` }) }
}
