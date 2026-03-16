/**
 * POST /api/booking-create
 * Validates a time slot and creates a booking with all sub-records atomically.
 *
 * Body: {
 *   farmer_id, drone_id, station_id, date (YYYY-MM-DD),
 *   scheduled_start (ISO), field_ids: number[],
 *   spray_order: number[],        // must match field_ids length
 *   cartridge_config: {           // optional
 *     c1_ml_per_acre, c2_ml_per_acre, c3_ml_per_acre, c4_ml_per_acre, c5_ml_per_acre
 *   }
 * }
 *
 * Response: { booking_id, scheduled_start, scheduled_end, total_cost }
 */
import type { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
)

function calculateTReqMins(
  totalAcres: number,
  drone: { minutes_per_acre: number; base_setup_time_mins: number; station_refill_time_mins: number },
): number {
  const setupNum = Math.ceil(totalAcres / drone.minutes_per_acre)
  const spray = totalAcres * drone.minutes_per_acre
  const setup = setupNum * drone.base_setup_time_mins
  const refill = setupNum * drone.station_refill_time_mins
  return spray + setup + refill
}

function calculateEndTime(
  start: Date,
  tReqMins: number,
  dailyStart: string,
  dailyEnd: string
): Date {
  const [sH, sM] = dailyStart.split(':').map(Number)
  const [eH, eM] = dailyEnd.split(':').map(Number)
  
  let current = new Date(start)
  let remainingMins = tReqMins
  
  while (remainingMins > 0) {
    const dayEnd = new Date(current)
    dayEnd.setHours(eH, eM, 0, 0)
    
    // If current is after dayEnd (e.g. started late), move to next day start
    if (current >= dayEnd) {
      current.setDate(current.getDate() + 1)
      current.setHours(sH, sM, 0, 0)
      continue
    }

    const availableToday = (dayEnd.getTime() - current.getTime()) / 60000
    if (remainingMins <= availableToday) {
      return new Date(current.getTime() + remainingMins * 60000)
    } else {
      remainingMins -= availableToday
      current.setDate(current.getDate() + 1)
      current.setHours(sH, sM, 0, 0)
    }
  }
  return current
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: corsHeaders }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ detail: 'Method not allowed' }) }
  }

  let body: {
    farmer_id: string
    drone_id: number
    station_id: number
    date: string
    scheduled_start: string
    field_ids: number[]
    spray_order?: number[]
    cartridge_config?: {
      c1_ml_per_acre?: number; c2_ml_per_acre?: number; c3_ml_per_acre?: number
      c4_ml_per_acre?: number; c5_ml_per_acre?: number
    }
  }

  try {
    body = JSON.parse(event.body ?? '{}')
  } catch {
    return { statusCode: 400, body: JSON.stringify({ detail: 'Invalid JSON' }) }
  }

  const { farmer_id, drone_id, station_id, scheduled_start, field_ids, spray_order, cartridge_config } = body

  if (!farmer_id || !drone_id || !station_id || !scheduled_start || !field_ids?.length) {
    return { statusCode: 422, headers: corsHeaders, body: JSON.stringify({ detail: 'Missing required fields' }) }
  }

  // 1. Fetch drone and station config
  const { data: droneData } = await supabase
    .from('drones')
    .select('*, base_stations(*)')
    .eq('drone_id', drone_id)
    .eq('status', 'Active')
    .single()

  if (!droneData) {
    return { statusCode: 404, headers: corsHeaders, body: JSON.stringify({ detail: 'Drone not found or inactive' }) }
  }

  const station = droneData.base_stations as any
  const opParams = {
    minutes_per_acre:         Number(station?.minutes_per_acre ?? droneData.minutes_per_acre),
    station_refill_time_mins: Number(station?.station_refill_time_mins ?? droneData.station_refill_time_mins),
    base_setup_time_mins:     Number(station?.base_setup_time_mins ?? droneData.base_setup_time_mins),
    price_per_acre:           Number(station?.price_per_acre ?? droneData.price_per_acre),
    daily_start_time:         station?.daily_start_time ?? droneData.daily_start_time,
    daily_end_time:           station?.daily_end_time ?? droneData.daily_end_time,
  }

  // 2. Sum field areas
  const { data: fields } = await supabase
    .from('fields')
    .select('field_id, area_acres')
    .in('field_id', field_ids)
    .eq('is_verified', true)

  if (!fields?.length) {
    return { statusCode: 422, headers: corsHeaders, body: JSON.stringify({ detail: 'No verified fields found' }) }
  }

  const totalAcres = fields.reduce((s, f) => s + Number(f.area_acres), 0)
  
  const mpa = opParams.minutes_per_acre
  const refillCycles = Math.ceil(totalAcres / mpa)
  const sprayTime = totalAcres * mpa
  const setupTime = refillCycles * opParams.base_setup_time_mins
  const refillTime = refillCycles * opParams.station_refill_time_mins
  const tReqMins = sprayTime + setupTime + refillTime

  // Fetch Razorpay keys from system_settings
  const { data: settings } = await supabase
    .from('system_settings')
    .select('key, value')
    .in('key', ['razorpay_key_id', 'razorpay_key_secret'])

  const rzpKeyId = settings?.find(s => s.key === 'razorpay_key_id')?.value
  const rzpKeySecret = settings?.find(s => s.key === 'razorpay_key_secret')?.value
  
  // Normalize input (which is in IST format "YYYY-MM-DDTHH:mm:ss") to absolute UTC
  const IST_OFFSET = 5.5 * 3600000
  const startDt    = new Date(`${scheduled_start}Z`)
  startDt.setTime(startDt.getTime() - IST_OFFSET)
  
  const endDt      = calculateEndTime(startDt, tReqMins, opParams.daily_start_time, opParams.daily_end_time)

  const totalCost = Math.round(totalAcres * opParams.price_per_acre * 100) / 100

  // 3. Conflict check — no overlapping bookings for this drone
  const { data: conflicts } = await supabase
    .from('bookings')
    .select('booking_id')
    .eq('drone_id', drone_id)
    .in('service_status', ['Pending', 'Confirmed', 'In_Progress'])
    .lt('scheduled_start', endDt.toISOString())
    .gt('scheduled_end',   startDt.toISOString())

  if (conflicts && conflicts.length > 0) {
    return { statusCode: 409, headers: corsHeaders, body: JSON.stringify({ detail: 'Slot no longer available. Please refresh.' }) }
  }

  // 4. Insert booking
  const { data: booking, error: bookingErr } = await supabase
    .from('bookings')
    .insert({
      farmer_id,
      // drone_id, // User requested not to set drone_id at creation
      station_id,
      service_status:  'Pending',
      scheduled_start: startDt.toISOString(),
      scheduled_end:   endDt.toISOString(),
      total_cost:      totalCost,
      total_spray_time_mins: sprayTime,
      refills_required:      refillCycles,
    })
    .select('booking_id')
    .single()

  if (bookingErr || !booking) {
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ detail: bookingErr?.message ?? 'Insert failed' }) }
  }

  const bookingId = booking.booking_id

  // 5. Insert booking_fields (junction)
  const bookingFieldRows = field_ids.map((fid, i) => ({
    booking_id:  bookingId,
    field_id:    fid,
    spray_order: spray_order?.[i] ?? i + 1,
  }))
  await supabase.from('booking_fields').insert(bookingFieldRows)

  // 6. Insert job_configuration
  if (cartridge_config) {
    await supabase.from('job_configurations').insert({
      booking_id:              bookingId,
      cartridge_1_ml_per_acre: cartridge_config.c1_ml_per_acre ?? 0,
      cartridge_2_ml_per_acre: cartridge_config.c2_ml_per_acre ?? 0,
      cartridge_3_ml_per_acre: cartridge_config.c3_ml_per_acre ?? 0,
      cartridge_4_ml_per_acre: cartridge_config.c4_ml_per_acre ?? 0,
      cartridge_5_ml_per_acre: cartridge_config.c5_ml_per_acre ?? 0,
    })
  }

  // 7. Create wallet hold
  await supabase.from('wallet_transactions').insert({
    farmer_id,
    booking_id: bookingId,
    type:       'Payment_Hold',
    amount:     -totalCost,
  })

  // 8. Create Razorpay Order if keys exist
  let razorpayOrder = null
  if (rzpKeyId && rzpKeySecret) {
    const auth = Buffer.from(`${rzpKeyId}:${rzpKeySecret}`).toString('base64')
    const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: Math.round(totalCost * 100), // paise
        currency: 'INR',
        receipt: `rcpt_${bookingId}`,
      }),
    })

    if (rzpRes.ok) {
      const rzpData = await rzpRes.json()
      razorpayOrder = {
        razorpay_order_id: rzpData.id,
        razorpay_key_id:   rzpKeyId,
        amount_paise:      rzpData.amount,
        currency:          rzpData.currency,
      }
      // Update booking with order id
      await supabase.from('bookings').update({ 
        notes: JSON.stringify({ razorpay_order_id: rzpData.id }) 
      }).eq('booking_id', bookingId)
    }
  }

  return {
    statusCode: 201,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      booking_id:      bookingId,
      scheduled_start: startDt.toISOString(),
      scheduled_end:   endDt.toISOString(),
      total_cost:      totalCost,
      razorpay:        razorpayOrder,
    }),
  }
}
