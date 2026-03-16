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

  const { booking_id, razorpay_order_id, razorpay_payment_id, razorpay_signature } = bodyData

  if (!booking_id || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return { statusCode: 422, headers: corsHeaders, body: JSON.stringify({ detail: 'Missing payment data' }) }
  }

  // 1. Fetch Razorpay secret
  const { data: settings } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', 'razorpay_key_secret')
    .single()

  const secret = settings?.value
  if (!secret) {
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ detail: 'Razorpay configuration error' }) }
  }

  // 2. Verify signature
  const hmacInput = razorpay_order_id + '|' + razorpay_payment_id
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(hmacInput)
    .digest('hex')

  if (expectedSignature !== razorpay_signature) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ detail: 'Invalid payment signature' }) }
  }

  // 3. Update booking status
  const { data: booking, error: fetchErr } = await supabase
    .from('bookings')
    .select('notes, service_status')
    .eq('booking_id', booking_id)
    .single()

  if (fetchErr || !booking) {
    return { statusCode: 404, headers: corsHeaders, body: JSON.stringify({ detail: 'Booking not found' }) }
  }

  let notes: any = {}
  try {
    notes = JSON.parse(booking.notes || '{}')
  } catch {
    notes = { raw_notes: booking.notes }
  }

  // Security: ensure this order_id was actually for this booking
  if (notes.razorpay_order_id && notes.razorpay_order_id !== razorpay_order_id) {
    return { statusCode: 403, headers: corsHeaders, body: JSON.stringify({ detail: 'Order ID mismatch' }) }
  }

  const { error: updateErr } = await supabase
    .from('bookings')
    .update({ 
      service_status: 'Confirmed', 
      notes: JSON.stringify({ 
        ...notes, 
        razorpay_payment_id, 
        razorpay_signature,
        verified_at: new Date().toISOString() 
      }) 
    })
    .eq('booking_id', booking_id)

  if (updateErr) {
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ detail: 'Failed to confirm booking' }) }
  }

  return {
    statusCode: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'Payment verified and booking confirmed' }),
  }
}
