import type { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: corsHeaders }
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: corsHeaders }

  let bodyData: any
  try {
    bodyData = JSON.parse(event.body ?? '{}')
  } catch {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ detail: 'Invalid JSON' }) }
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, booking_details } = bodyData

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !booking_details) {
    return { statusCode: 422, headers: corsHeaders, body: JSON.stringify({ detail: 'Missing required data' }) }
  }

  // 1. Fetch Razorpay secret
  const { data: settings } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', 'razorpay_key_secret')
    .single()

  const secret = settings?.value
  if (!secret) return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ detail: 'Razorpay config error' }) }

  // 2. Verify signature
  const hmacInput = razorpay_order_id + '|' + razorpay_payment_id
  const expectedSignature = crypto.createHmac('sha256', secret).update(hmacInput).digest('hex')

  if (expectedSignature !== razorpay_signature) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ detail: 'Invalid payment signature' }) }
  }

  // 3. Last-minute Conflict Check (to prevent double-booking)
  const { data: conflicts } = await supabase
    .from('bookings')
    .select('booking_id')
    .eq('station_id', booking_details.station_id)
    .in('service_status', ['Pending', 'Confirmed', 'In_Progress', 'On_Hold'])
    .lt('scheduled_start', booking_details.scheduled_end)
    .gt('scheduled_end',   booking_details.scheduled_start)

  if (conflicts && conflicts.length > 0) {
    // In a real high-scale system, we'd handle a refund here. 
    // For now, we block the creation.
    return { statusCode: 409, headers: corsHeaders, body: JSON.stringify({ detail: 'Slot was taken during payment. Please contact support.' }) }
  }

  // 4. Perform the Inserts (Finally storing in the database)
  
  // A. Create main booking
  const { data: booking, error: bErr } = await supabase
    .from('bookings')
    .insert({
      farmer_id:       booking_details.field_ids.length > 0 ? (await supabase.from('fields').select('farmer_id').eq('field_id', booking_details.field_ids[0]).single()).data?.farmer_id : null,
      station_id:      booking_details.station_id,
      drone_id:        booking_details.drone_id,
      service_status:  'Confirmed', // Since payment is already verified
      scheduled_start: booking_details.scheduled_start,
      scheduled_end:   booking_details.scheduled_end,
      total_cost:      booking_details.total_cost,
      notes: JSON.stringify({ 
        razorpay_order_id, 
        razorpay_payment_id, 
        razorpay_signature,
        verified_at: new Date().toISOString() 
      })
    })
    .select('booking_id, farmer_id')
    .single()

  if (bErr || !booking) {
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ detail: bErr?.message ?? 'Creation failed' }) }
  }

  const bookingId = booking.booking_id
  const farmerId = booking.farmer_id

  // B. Create sub-records
  const fieldRows = booking_details.field_ids.map((id: number, i: number) => ({
    booking_id: bookingId,
    field_id: id,
    spray_order: i + 1
  }))
  
  await Promise.all([
    supabase.from('booking_fields').insert(fieldRows),
    supabase.from('job_configurations').insert({
      booking_id: bookingId,
      cartridge_1_ml_per_acre: booking_details.cartridge_config.cartridge_1_ml_per_acre ?? 0,
      cartridge_2_ml_per_acre: booking_details.cartridge_config.cartridge_2_ml_per_acre ?? 0,
      cartridge_3_ml_per_acre: booking_details.cartridge_config.cartridge_3_ml_per_acre ?? 0,
      cartridge_4_ml_per_acre: booking_details.cartridge_config.cartridge_4_ml_per_acre ?? 0,
      cartridge_5_ml_per_acre: booking_details.cartridge_config.cartridge_5_ml_per_acre ?? 0,
    }),
    supabase.from('wallet_transactions').insert({
      farmer_id: farmerId,
      booking_id: bookingId,
      type: 'Payment_Hold',
      amount: -booking_details.total_cost
    })
  ])

  return {
    statusCode: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'Booking completed', booking_id: bookingId }),
  }
}
