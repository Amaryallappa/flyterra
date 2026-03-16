/**
 * POST /api/operations-launch
 * Confirms a booking and creates operation rows for each field.
 * Called by the operator when they are ready to start the mission.
 *
 * Body: { booking_id }
 *
 * This updates:
 *   bookings.service_status → In_Progress
 *   operations rows → one per booking_field (Queued)
 *   bookings.actual_start → now
 *
 * Supabase Realtime then notifies:
 *   - Web dashboards (operations table subscription)
 *   - Base station (polls GET /rest/v1/operations?station_id=eq.X&status=eq.Queued)
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

  let body: { booking_id: number }
  try {
    body = JSON.parse(event.body ?? '{}')
  } catch {
    return { statusCode: 400, body: JSON.stringify({ detail: 'Invalid JSON' }) }
  }

  const { booking_id } = body
  if (!booking_id) {
    return { statusCode: 422, body: JSON.stringify({ detail: 'booking_id required' }) }
  }

  // 1. Fetch booking with fields
  const { data: booking, error: bookingErr } = await supabase
    .from('bookings')
    .select('booking_id, drone_id, station_id, service_status')
    .eq('booking_id', booking_id)
    .single()

  if (bookingErr || !booking) {
    return { statusCode: 404, body: JSON.stringify({ detail: 'Booking not found' }) }
  }
  if (!['Confirmed', 'Pending'].includes(booking.service_status)) {
    return {
      statusCode: 409,
      body: JSON.stringify({ detail: `Cannot launch booking in status: ${booking.service_status}` }),
    }
  }

  // 2. Fetch booking fields with spray order
  const { data: bookingFields } = await supabase
    .from('booking_fields')
    .select('field_id, spray_order')
    .eq('booking_id', booking_id)
    .order('spray_order', { ascending: true })

  if (!bookingFields?.length) {
    return { statusCode: 422, body: JSON.stringify({ detail: 'No fields in booking' }) }
  }

  // 3. Create operation rows (one per field, all Queued)
  const operationRows = bookingFields.map((bf) => ({
    booking_id:   booking_id,
    field_id:     bf.field_id,
    drone_id:     booking.drone_id,
    station_id:   booking.station_id,
    status:       'Queued',
    current_phase:'Idle',
    spray_order:  bf.spray_order,
    scheduled_at: new Date().toISOString(),
  }))

  const { error: opErr } = await supabase.from('operations').insert(operationRows)
  if (opErr) {
    return { statusCode: 500, body: JSON.stringify({ detail: opErr.message }) }
  }

  // 4. Update booking status → In_Progress + set actual_start
  await supabase
    .from('bookings')
    .update({ service_status: 'In_Progress', actual_start: new Date().toISOString() })
    .eq('booking_id', booking_id)

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message:         'Operations queued',
      booking_id,
      operations_count: operationRows.length,
    }),
  }
}
