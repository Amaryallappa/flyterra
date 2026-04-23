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
  params: { minutes_per_acre: number; base_setup_time_mins: number; station_refill_time_mins: number; area_per_refill: number },
): { totalMins: number; nRefills: number; sprayTime: number; refillTime: number; setupTime: number } {
  const areaPerRefill = params.area_per_refill || 10
  
  let nRefills = Math.floor(totalAcres / areaPerRefill)
  if (totalAcres % areaPerRefill <= 0.1) {
    nRefills -= 1
  }
  if (nRefills < 0) nRefills = 0

  const sprayTime = totalAcres * params.minutes_per_acre
  const setupTime = params.base_setup_time_mins
  const refillTime = nRefills * params.station_refill_time_mins
  
  return {
    totalMins: sprayTime + setupTime + refillTime,
    nRefills,
    sprayTime,
    refillTime,
    setupTime
  }
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
    area_per_refill:          Number(station?.area_per_refill ?? droneData.area_per_refill ?? 10),
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
  
  const { totalMins, nRefills } = calculateTReqMins(totalAcres, opParams)
  const tReqMins = totalMins

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

  // 3. Conflict check — no overlapping bookings for this drone/station
  const { data: conflicts } = await supabase
    .from('bookings')
    .select('booking_id')
    .eq('station_id', station_id)
    .in('service_status', ['Pending', 'Confirmed', 'In_Progress', 'On_Hold'])
    .lt('scheduled_start', endDt.toISOString())
    .gt('scheduled_end',   startDt.toISOString())

  if (conflicts && conflicts.length > 0) {
    return { statusCode: 409, headers: corsHeaders, body: JSON.stringify({ detail: 'Slot no longer available. Please refresh.' }) }
  }

  // Generate a temporary reference ID for the Razorpay receipt
  const tempRefId = `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`

  // 4. Create Razorpay Order if keys exist (using temporary receipt)
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
        receipt: tempRefId,
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
    }
  }

  return {
    statusCode: 200, // Changed from 201 because we haven't created anything yet
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      temp_ref_id:     tempRefId,
      scheduled_start: startDt.toISOString(),
      scheduled_end:   endDt.toISOString(),
      total_cost:      totalCost,
      razorpay:        razorpayOrder,
    }),
  }
}
