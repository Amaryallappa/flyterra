import type { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

// ── T_req formula (User Provided) ──────────────────────────────────────────────
// T_req = (A_total * R) + T_setup + (N_refills * T_station)

function calculateTReq(totalAcres: number, drone: DroneRow) {
  const areaPerRefill = drone.area_per_refill || 10
  
  // Calculate refills with 0.1 acre tolerance
  // If remainder is <= 0.1, we don't count an extra refill trip.
  let nRefills = Math.floor(totalAcres / areaPerRefill)
  if (totalAcres % areaPerRefill <= 0.1) {
    nRefills -= 1
  }
  if (nRefills < 0) nRefills = 0

  const sprayTime = totalAcres * drone.minutes_per_acre
  const setupTime = drone.base_setup_time_mins // Setup is only once per booking
  const refillTime = nRefills * drone.station_refill_time_mins
  
  const totalMins = sprayTime + setupTime + refillTime
  return { totalMins, nRefills, sprayTime, refillTime, setupTime }
}

function findAvailableSlots(
  targetDate: string,
  drone: DroneRow,
  existingBookings: Array<{ scheduled_start: string; scheduled_end: string }>,
  tReqMins: number,
  slotIntervalMins = 30,
): string[] {
  const IST_OFFSET = 5.5 * 60 * 60 * 1000
  // Robust parse for ISO or Suapbase format "YYYY-MM-DD HH:mm:ss+00"
  const parse = (d: string) => {
    if (!d) return 0
    const iso = d.replace(' ', 'T')
    return new Date(iso).getTime()
  }

  // Base day absolute timestamps at 00:00:00 UTC
  const base1 = new Date(`${targetDate}T00:00:00Z`).getTime()
  const nextDate = new Date(base1 + 86400000).toISOString().split('T')[0]
  const base2 = new Date(`${nextDate}T00:00:00Z`).getTime()
  
  const [sH, sM] = drone.daily_start_time.split(':').map(Number)
  const [eH, eM] = drone.daily_end_time.split(':').map(Number)

  // Work windows in absolute UTC
  const workStart1 = base1 + (sH * 3600000) + (sM * 60000) - IST_OFFSET
  const workEnd1   = base1 + (eH * 3600000) + (eM * 60000) - IST_OFFSET
  const workStart2 = base2 + (sH * 3600000) + (sM * 60000) - IST_OFFSET
  const workEnd2   = base2 + (eH * 3600000) + (eM * 60000) - IST_OFFSET

  const tReqMs = tReqMins * 60000
  const slotMs = slotIntervalMins * 60000
  
  // Buffering now to avoid past slots
  const now = Date.now()
  const bufferMins = 15
  const nowWithBuffer = now + (bufferMins * 60000)

  // Mapping occupied blocks precisely
  const occupied = existingBookings
    .map(b => ({ start: parse(b.scheduled_start), end: parse(b.scheduled_end) }))
    .filter(b => b.start > 0 && b.end > 0)
    .sort((a, b) => a.start - b.start)

  const isFree = (start: number, end: number) => {
    // If ANY part of our window overlaps with an occupied block, it's not free
    return !occupied.some(b => (start < b.end && end > b.start))
  }

  const slots: string[] = []
  // Align cursor to exact interval boundaries
  let cursor = workStart1
  
  while (cursor + (tReqMins > 120 ? slotMs : tReqMs) <= workEnd1) {
    // Only show slots that are in the future
    if (cursor >= nowWithBuffer) {
      if (tReqMins <= 120) {
        if (isFree(cursor, cursor + tReqMs)) {
          const d = new Date(cursor + IST_OFFSET)
          slots.push(`${String(d.getUTCHours()).padStart(2,'0')}:${String(d.getUTCMinutes()).padStart(2,'0')}`)
        }
      } else {
        const timeOnDay1 = workEnd1 - cursor
        // Must be free for the rest of Day 1
        if (isFree(cursor, workEnd1)) {
          if (timeOnDay1 >= tReqMs) {
            const d = new Date(cursor + IST_OFFSET)
            slots.push(`${String(d.getUTCHours()).padStart(2,'0')}:${String(d.getUTCMinutes()).padStart(2,'0')}`)
          } else {
            // Check overflow into Day 2
            const remainingMs = tReqMs - timeOnDay1
            if (isFree(workStart2, workStart2 + remainingMs)) {
              const d = new Date(cursor + IST_OFFSET)
              slots.push(`${String(d.getUTCHours()).padStart(2,'0')}:${String(d.getUTCMinutes()).padStart(2,'0')}`)
            }
          }
        }
      }
    }
    cursor += slotMs
  }
  return slots
}

type DroneRow = {
  drone_id: number
  minutes_per_acre: number
  base_setup_time_mins: number
  max_acres_per_tank: number
  station_refill_time_mins: number
  area_per_refill: number
  daily_start_time: string
  daily_end_time: string
  price_per_acre: number
}

// ── Handler ───────────────────────────────────────────────────────────────────

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: corsHeaders }
  
  const fieldIdsStr = event.queryStringParameters?.field_ids || ''
  const fieldIds = fieldIdsStr.split(',').map(Number).filter(id => !isNaN(id))
  const date = event.queryStringParameters?.date // YYYY-MM-DD

  if (!fieldIds.length || !date) {
    return { statusCode: 422, headers: corsHeaders, body: JSON.stringify({ detail: 'field_ids and date required' }) }
  }

  const { data: fields, error: fieldsErr } = await supabase
    .from('fields')
    .select(`
      field_id, area_acres, station_id, 
      base_stations(status, minutes_per_acre, station_refill_time_mins, base_setup_time_mins, price_per_acre, daily_start_time, daily_end_time, area_per_refill)
    `)
    .in('field_id', fieldIds)

  if (fieldsErr || !fields?.length) {
    return { statusCode: 404, headers: corsHeaders, body: JSON.stringify({ detail: 'Fields not found' }) }
  }

  const firstField = fields[0] as any
  const stationId = firstField.station_id
  const stationStatus = firstField.base_stations?.status

  if (!stationId) return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ detail: 'Fields must be unassigned' }) }
  if (stationStatus !== 'Active') return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ detail: `Base Station is ${stationStatus}` }) }

  const { data: drone, error: droneErr } = await supabase
    .from('drones')
    .select('*')
    .eq('station_id', stationId)
    .eq('status', 'Active')
    .limit(1)
    .single()

  if (droneErr || !drone) return { statusCode: 404, headers: corsHeaders, body: JSON.stringify({ detail: 'No active drone' }) }

  const station = firstField.base_stations
  const totalAcres = fields.reduce((sum, f) => sum + Number(f.area_acres), 0)

  // Fetch 2 days of bookings for multi-day support
  const dayStart = `${date}T00:00:00Z`
  const nextDay = new Date(new Date(date).getTime() + 86400000).toISOString().split('T')[0]
  const dayEnd = `${nextDay}T23:59:59Z`

  // Fetch bookings that could possibly overlap with our 2-day window
  // Filter by station_id to ensure the entire base station resource is checked
  const { data: existing } = await supabase
    .from('bookings')
    .select('scheduled_start, scheduled_end')
    .eq('station_id', stationId)
    .in('service_status', ['Pending', 'Confirmed', 'In_Progress', 'On_Hold']) // Excludes 'Cancelled', releasing those slots
    .gt('scheduled_end',   dayStart)
    .lt('scheduled_start', dayEnd)

  // Operational Params (Prefer station, fallback to drone if needed)
  const opParams = {
    minutes_per_acre:         Number(station?.minutes_per_acre ?? drone.minutes_per_acre),
    station_refill_time_mins: Number(station?.station_refill_time_mins ?? drone.station_refill_time_mins),
    base_setup_time_mins:     Number(station?.base_setup_time_mins ?? drone.base_setup_time_mins),
    price_per_acre:           Number(station?.price_per_acre ?? drone.price_per_acre),
    daily_start_time:         station?.daily_start_time ?? drone.daily_start_time,
    daily_end_time:           station?.daily_end_time ?? drone.daily_end_time,
    area_per_refill:          Number(station?.area_per_refill ?? drone.area_per_refill ?? 10),
    max_acres_per_tank:       Number(drone.max_acres_per_tank), // still from drone hardware
  }

  // 6. Calculate Duration and find Slots
  const { totalMins, nRefills, sprayTime, refillTime, setupTime } = calculateTReq(totalAcres, opParams as any)
  const slots = findAvailableSlots(date, opParams as any, existing ?? [], totalMins)

  const totalCost = Math.round(totalAcres * opParams.price_per_acre * 100) / 100
  const hours = Math.floor(totalMins / 60)
  const mins  = Math.round(totalMins % 60)

  return {
    statusCode: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      date,
      available_slots: slots,
      t_req_mins: totalMins,
      t_req_breakdown: {
        total_acres:       totalAcres,
        minutes_per_acre:  opParams.minutes_per_acre,
        spray_time_mins:   sprayTime,
        setup_time_mins:   setupTime,
        n_refills:         nRefills,
        refill_time_mins:  refillTime,
        total_mins:        totalMins,
        total_hours:       hours ? `${hours}h ${mins}m` : `${mins}m`,
        price_per_acre:    opParams.price_per_acre,
      },
      total_cost: totalCost,
      drone_id: drone.drone_id,
      station_id: stationId
    }),
  }
}
