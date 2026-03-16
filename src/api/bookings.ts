/**
 * Bookings API — uses Supabase client for reads, Netlify functions for creates.
 */
import { supabase } from './supabase'

// ── Types ──────────────────────────────────────────────────────────────────────

export interface TReqBreakdown {
  total_acres:      number
  minutes_per_acre: number
  spray_time_mins:  number
  setup_time_mins:  number
  n_refills:        number
  refill_time_mins: number
  total_mins:       number
  total_hours:      string
  price_per_acre:   number
}

export interface SlotResponse {
  date:            string
  t_req_breakdown: TReqBreakdown
  available_slots: string[]
  total_cost:      number
  drone_id:        number
  station_id:      number
}

export interface CartridgeConfig {
  cartridge_1_ml_per_acre: number
  cartridge_2_ml_per_acre: number
  cartridge_3_ml_per_acre: number
  cartridge_4_ml_per_acre: number
  cartridge_5_ml_per_acre: number
}

export interface BookingCreatePayload {
  field_ids:        number[]
  cartridge_config: CartridgeConfig
  scheduled_start:  string
  drone_id:         number
  station_id:       number
}

export interface RazorpayOrder {
  razorpay_order_id: string
  razorpay_key_id:   string
  amount_paise:      number
  currency:          string
}

export interface BookingFieldItem {
  field_id:    number
  field_name:  string
  area_acres:  number
  spray_order: number
}

export interface BookingListItem {
  booking_id:      number
  service_status:  string
  scheduled_start: string
  scheduled_end:   string
  total_cost:      number
  total_acres:     number
  field_count:     number
  created_at:      string
  booking_fields:  Array<{ spray_order: number; fields: { field_id: number; field_name: string; area_acres: number } | null }>
}

export interface BookingDetail {
  booking_id:      number
  service_status:  string
  scheduled_start: string
  scheduled_end:   string
  actual_start:    string | null
  actual_end:      string | null
  total_cost:      number
  price_per_acre:  number
  total_acres:     number
  notes:           string | null
  created_at:      string
  fields:          Array<{ field_id: number; field_name: string; area_acres: number }>
  drones:          { drone_serial_no: string; price_per_acre: number } | null
  base_stations:   { station_serial_no: string } | null
  t_req_breakdown: {
    spray_time_mins:  number
    setup_time_mins:  number
    refill_time_mins: number
    n_refills:        number
    total_hours:      string
  }
  cartridges?: Array<{ label: string; ml_per_acre: number; total_ml: number }>
}

// ── API ────────────────────────────────────────────────────────────────────────

export const bookingsApi = {
  getSlots: async (params: { field_ids: number[]; date: string }): Promise<SlotResponse> => {
    const res = await fetch(
      `/api/booking-slots?field_ids=${params.field_ids.join(',')}&date=${params.date}`,
    )
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      throw new Error(json.detail || 'Failed to fetch slots')
    }
    return res.json()
  },

  create: async (payload: BookingCreatePayload): Promise<{ 
    booking_id: number; 
    scheduled_start: string; 
    scheduled_end: string; 
    total_cost: number;
    razorpay?: RazorpayOrder 
  }> => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Not authenticated')

    const res = await fetch('/api/booking-create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        farmer_id: session.user.id,
        ...payload,
        cartridge_config: {
          c1_ml_per_acre: payload.cartridge_config.cartridge_1_ml_per_acre,
          c2_ml_per_acre: payload.cartridge_config.cartridge_2_ml_per_acre,
          c3_ml_per_acre: payload.cartridge_config.cartridge_3_ml_per_acre,
          c4_ml_per_acre: payload.cartridge_config.cartridge_4_ml_per_acre,
          c5_ml_per_acre: payload.cartridge_config.cartridge_5_ml_per_acre,
        },
      }),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.detail || 'Failed to create booking')
    return json
  },

  verifyPayment: async (
    bookingId: number,
    data: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string },
  ) => {
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/booking-verify-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ booking_id: bookingId, ...data }),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.detail || 'Payment verification failed')
    return json
  },

  list: async (): Promise<BookingListItem[]> => {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        booking_id, service_status, scheduled_start, scheduled_end,
        total_cost, created_at,
        booking_fields(spray_order, fields(field_id, field_name, area_acres))
      `)
      .order('scheduled_start', { ascending: false })
    if (error) throw error
    return (data ?? []).map((b) => {
      const bfs = (b.booking_fields ?? []) as unknown as Array<{
        spray_order: number
        fields: { field_id: number; field_name: string; area_acres: number } | null
      }>
      return {
        ...b,
        booking_fields: bfs,
        field_count: bfs.length,
        total_acres: bfs.reduce((s, bf) => s + Number(bf.fields?.area_acres ?? 0), 0),
      }
    }) as BookingListItem[]
  },

  get: async (id: number): Promise<BookingDetail> => {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        booking_id, service_status, scheduled_start, scheduled_end,
        actual_start, actual_end, total_cost, notes, created_at,
        booking_fields(spray_order, fields(field_id, field_name, area_acres)),
        drones(drone_serial_no, price_per_acre, minutes_per_acre, base_setup_time_mins, station_refill_time_mins),
        base_stations(station_serial_no, price_per_acre, minutes_per_acre, base_setup_time_mins, station_refill_time_mins),
        job_configurations(*)
      `)
      .eq('booking_id', id)
      .single()
    if (error) throw error

    const bfs = (data.booking_fields as unknown as any[]) || []
    const fields = bfs.map(bf => ({
      field_id: bf.fields?.field_id,
      field_name: bf.fields?.field_name,
      area_acres: Number(bf.fields?.area_acres || 0),
    }))
    const totalAcres = fields.reduce((s, f) => s + f.area_acres, 0)
    const drone = data.drones as any
    const station = data.base_stations as any

    const mpa = Number(drone?.minutes_per_acre ?? station?.minutes_per_acre ?? 10)
    const setupNum = Math.ceil(totalAcres / mpa)
    const sprayTime = totalAcres * mpa
    const setupTimePerRefill = Number(drone?.base_setup_time_mins ?? station?.base_setup_time_mins ?? 15)
    const refillTimePerRefill = Number(drone?.station_refill_time_mins ?? station?.station_refill_time_mins ?? 5)
    
    const setupTime = setupTimePerRefill * setupNum
    const refillTime = refillTimePerRefill * setupNum
    const totalMins = sprayTime + setupTime + refillTime

    const config = data.job_configurations?.[0] as any
    const cartridges = config ? [
      { label: 'Cartridge 1', ml_per_acre: config.cartridge_1_ml_per_acre },
      { label: 'Cartridge 2', ml_per_acre: config.cartridge_2_ml_per_acre },
      { label: 'Cartridge 3', ml_per_acre: config.cartridge_3_ml_per_acre },
      { label: 'Cartridge 4', ml_per_acre: config.cartridge_4_ml_per_acre },
      { label: 'Cartridge 5', ml_per_acre: config.cartridge_5_ml_per_acre },
    ].filter(c => c.ml_per_acre > 0).map(c => ({
      ...c,
      total_ml: c.ml_per_acre * totalAcres
    })) : []

    return {
      ...data,
      fields,
      total_acres: totalAcres,
      price_per_acre: Number(drone?.price_per_acre ?? station?.price_per_acre ?? 0),
      t_req_breakdown: {
        spray_time_mins:  Number((data as any).total_spray_time_mins ?? sprayTime),
        setup_time_mins:  setupTime,
        refill_time_mins: refillTime,
        n_refills:        Number((data as any).refills_required ?? setupNum),
        total_hours:      `${Math.floor(totalMins/60)}h ${Math.round(totalMins%60)}m`
      },
      cartridges
    } as any
  },

  cancel: async (id: number) => {
    const { error } = await supabase
      .from('bookings')
      .update({ service_status: 'Cancelled' })
      .eq('booking_id', id)
    if (error) throw error
  },
}
