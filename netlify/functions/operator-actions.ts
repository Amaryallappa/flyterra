/**
 * POST /api/operator-actions
 * Operator service-role endpoint for field verification and booking state changes.
 *
 * Actions:
 *   verify_field     → set fields.is_verified = true
 *   complete_booking → set bookings.service_status = 'Completed', actual_end = now
 *   abort_booking    → set bookings.service_status = 'Cancelled', operations status = 'Failed'
 */
import type { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

function serviceClient() {
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

/** Verify the caller is an authenticated Operator or Admin */
async function requireOperator(authHeader: string | undefined): Promise<string | null> {
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.slice(7)
  const supabase = serviceClient()
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return null
  const { data } = await supabase
    .from('accounts')
    .select('role')
    .eq('account_id', user.id)
    .single()
  return data?.role === 'Operator' || data?.role === 'Admin' ? user.id : null
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' }
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  const operatorId = await requireOperator(event.headers['authorization'])
  if (!operatorId) {
    return { statusCode: 403, headers: corsHeaders, body: JSON.stringify({ error: 'Forbidden — Operator only' }) }
  }

  let body: Record<string, unknown>
  try {
    body = JSON.parse(event.body || '{}')
  } catch {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid JSON body' }) }
  }

  const supabase = serviceClient()
  const { action } = body

  // ── VERIFY FIELD ──────────────────────────────────────────────────────────
  if (action === 'verify_field') {
    const { 
      field_id, 
      station_id,
      base_to_field_file_path,
      field_to_base_file_path,
      mission_file_path,
      exclusion_file_path
    } = body as { 
      field_id: number; 
      station_id?: number;
      base_to_field_file_path?: string;
      field_to_base_file_path?: string;
      mission_file_path?: string;
      exclusion_file_path?: string;
    }
    
    if (!field_id) return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'field_id required' }) }

    const updateData: any = {
      is_verified: true,
      verification_date: new Date().toISOString(),
    }

    if (station_id) updateData.station_id = station_id
    if (base_to_field_file_path) updateData.base_to_field_file_path = base_to_field_file_path
    if (field_to_base_file_path) updateData.field_to_base_file_path = field_to_base_file_path
    if (mission_file_path) updateData.mission_file_path = mission_file_path
    if (exclusion_file_path) updateData.exclusion_file_path = exclusion_file_path

    const { error } = await supabase
      .from('fields')
      .update(updateData)
      .eq('field_id', field_id)

    if (error) return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: error.message }) }
    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ success: true }) }
  }

  // ── COMPLETE BOOKING ──────────────────────────────────────────────────────
  if (action === 'complete_booking') {
    const { booking_id } = body as { booking_id: number }
    if (!booking_id) return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'booking_id required' }) }

    const { error } = await supabase
      .from('bookings')
      .update({
        service_status: 'Completed',
        actual_end: new Date().toISOString(),
      })
      .eq('booking_id', booking_id)

    if (error) return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: error.message }) }
    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ success: true }) }
  }

  // ── ABORT BOOKING ─────────────────────────────────────────────────────────
  if (action === 'abort_booking') {
    const { booking_id } = body as { booking_id: number }
    if (!booking_id) return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'booking_id required' }) }

    // Mark all active operations as Failed
    await supabase
      .from('operations')
      .update({ status: 'Failed', notes: 'Aborted by operator' })
      .eq('booking_id', booking_id)
      .in('status', ['Pending', 'Queued', 'In_Progress', 'Paused_Refill'])

    const { error } = await supabase
      .from('bookings')
      .update({
        service_status: 'Cancelled',
        actual_end: new Date().toISOString(),
      })
      .eq('booking_id', booking_id)

    if (error) return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: error.message }) }
    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ success: true }) }
  }

  return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: `Unknown action: ${action}` }) }
}
