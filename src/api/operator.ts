/**
 * Operator API — uses Supabase client for reads, Netlify functions for service-role writes.
 */
import { supabase } from './supabase'

// ── Auth helper ───────────────────────────────────────────────────────────────

async function authPost(url: string, body: Record<string, unknown>) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token ?? ''}`,
    },
    body: JSON.stringify(body),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || json.detail || 'Request failed')
  return json
}

export const operatorApi = {
  // ── Fields ──────────────────────────────────────────────────────────────

  listPendingFields: async () => {
    const { data, error } = await supabase
      .from('fields')
      .select(`
        field_id, farmer_id, field_name, crop_type, area_acres, boundary_coordinates,
        is_verified, verification_date, created_at, station_id,
        farmers(full_name, mobile_number, email)
      `)
      .eq('is_verified', false)
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    return data ?? []
  },

  listVerifiedFields: async () => {
    const { data, error } = await supabase
      .from('fields')
      .select(`
        field_id, farmer_id, field_name, crop_type, area_acres, boundary_coordinates,
        is_verified, verification_date, created_at, station_id,
        farmers(full_name, mobile_number, email)
      `)
      .eq('is_verified', true)
      .order('verification_date', { ascending: false })
    if (error) throw new Error(error.message)
    return data ?? []
  },

  downloadBoundaryPlan: async (fieldId: number) => {
    // Return the boundary coordinates as a JSON blob download
    const { data, error } = await supabase
      .from('fields')
      .select('field_name, boundary_coordinates, area_acres')
      .eq('field_id', fieldId)
      .single()
    if (error) throw new Error(error.message)
    return data
  },

  listStations: async () => {
    const { data, error } = await supabase
      .from('base_stations')
      .select('station_id, station_serial_no, status')
      .order('station_serial_no', { ascending: true })
    if (error) throw new Error(error.message)
    return data ?? []
  },

  verifyField: async (fieldId: number, stationId: number, fd: FormData) => {
    // 1. Upload files to Supabase Storage
    const patch: any = {}
    const keys = ['base_to_field', 'field_to_base', 'polygon_spray', 'exclusion']
    const colMap: Record<string, string> = {
      'base_to_field': 'base_to_field_file_path',
      'field_to_base': 'field_to_base_file_path',
      'polygon_spray': 'mission_file_path',
      'exclusion':     'exclusion_file_path'
    }

    for (const key of keys) {
      const file = fd.get(key) as File | null
      if (file && file.size > 0) {
        const ext = file.name.split('.').pop() || 'waypoints'
        const path = `field_${fieldId}/${key}_${Date.now()}.${ext}`
        console.log(`Uploading mission file to path: ${path}`, file)
        
        // Convert File to Blob explicitly for better compatibility
        const arrayBuffer = await file.arrayBuffer()
        const blob = new Blob([arrayBuffer], { type: file.type || 'application/octet-stream' })

        const { error: uploadErr } = await supabase.storage
          .from('missions')
          .upload(path, blob, {
            contentType: file.type || 'application/octet-stream',
            cacheControl: '3600',
            upsert: false
          })
        
        if (uploadErr) {
          console.error(`Upload error details for ${key}:`, JSON.stringify(uploadErr, null, 2))
          throw new Error(`Upload failed for ${key}: ${uploadErr.message}`)
        }
        patch[colMap[key]] = path
      }
    }

    // 2. Call Netlify function with the paths and station_id
    return authPost('/api/operator-actions', { 
      action: 'verify_field', 
      field_id: fieldId, 
      station_id: stationId,
      ...patch
    })
  },

  // ── Bookings / Jobs ──────────────────────────────────────────────────────

  getTodayJobs: async () => {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date()
    todayEnd.setHours(23, 59, 59, 999)

    const { data, error } = await supabase
      .from('bookings')
      .select(`
        booking_id, service_status, scheduled_start, scheduled_end,
        total_cost, created_at,
        booking_fields(spray_order, fields(field_id, field_name, area_acres))
      `)
      .gte('scheduled_start', todayStart.toISOString())
      .lte('scheduled_start', todayEnd.toISOString())
      .order('scheduled_start', { ascending: true })

    if (error) throw new Error(error.message)

    return (data ?? []).map((b) => {
      const fields = (b.booking_fields as unknown as Array<{ spray_order: number; fields: { field_id: number; field_name: string; area_acres: number } }>) ?? []
      const totalAcres = fields.reduce((s, f) => s + Number(f.fields?.area_acres ?? 0), 0)
      return {
        booking_id: b.booking_id,
        service_status: b.service_status,
        scheduled_start: b.scheduled_start,
        scheduled_end: b.scheduled_end,
        total_cost: b.total_cost,
        total_acres: totalAcres,
        field_count: fields.length,
        created_at: b.created_at,
      }
    })
  },

  getUpcomingJobs: async () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)

    const nextWeek = new Date()
    nextWeek.setDate(nextWeek.getDate() + 7)
    nextWeek.setHours(23, 59, 59, 999)

    const { data, error } = await supabase
      .from('bookings')
      .select(`
        booking_id, service_status, scheduled_start, scheduled_end,
        total_cost, created_at,
        booking_fields(spray_order, fields(field_id, field_name, area_acres))
      `)
      .gte('scheduled_start', tomorrow.toISOString())
      .lte('scheduled_start', nextWeek.toISOString())
      .in('service_status', ['Pending', 'Confirmed'])
      .order('scheduled_start', { ascending: true })

    if (error) throw new Error(error.message)

    return (data ?? []).map((b) => {
      const fields = (b.booking_fields as unknown as Array<{ spray_order: number; fields: { field_id: number; field_name: string; area_acres: number } }>) ?? []
      const totalAcres = fields.reduce((s, f) => s + Number(f.fields?.area_acres ?? 0), 0)
      return {
        booking_id: b.booking_id,
        service_status: b.service_status,
        scheduled_start: b.scheduled_start,
        scheduled_end: b.scheduled_end,
        total_cost: b.total_cost,
        total_acres: totalAcres,
        field_count: fields.length,
        created_at: b.created_at,
      }
    })
  },

  getJobDetail: async (bookingId: number) => {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        booking_id, service_status, scheduled_start, scheduled_end,
        actual_start, actual_end, total_cost, notes, created_at,
        drones(drone_serial_no, operation_type),
        base_stations(station_serial_no),
        booking_fields(spray_order, fields(field_id, field_name, area_acres, is_verified))
      `)
      .eq('booking_id', bookingId)
      .single()
    if (error) throw new Error(error.message)
    return data
  },

  launchBooking: (bookingId: number) =>
    authPost('/api/operations-launch', { booking_id: bookingId }),

  getBookingOperations: async (bookingId: number) => {
    const { data: booking, error: bErr } = await supabase
      .from('bookings')
      .select('booking_id, service_status, actual_start, actual_end')
      .eq('booking_id', bookingId)
      .single()
    if (bErr) throw new Error(bErr.message)

    const { data: ops, error: oErr } = await supabase
      .from('operations')
      .select(`
        operation_id, field_id, spray_order, status, current_phase,
        spray_progress_percent, refill_cycle, started_at, completed_at, updated_at, notes,
        fields(field_name, area_acres)
      `)
      .eq('booking_id', bookingId)
      .order('spray_order', { ascending: true })
    if (oErr) throw new Error(oErr.message)

    const operations = (ops ?? []).map((op) => {
      const field = op.fields as unknown as ({ field_name: string; area_acres: number } | null)
      return {
        operation_id: op.operation_id,
        field_id: op.field_id,
        field_name: field?.field_name ?? '',
        area_acres: Number(field?.area_acres ?? 0),
        spray_order: op.spray_order,
        status: op.status,
        current_phase: op.current_phase,
        spray_progress_percent: op.spray_progress_percent,
        refill_cycle: op.refill_cycle,
        started_at: op.started_at,
        completed_at: op.completed_at,
        updated_at: op.updated_at,
        notes: op.notes,
      }
    })

    const allDone = operations.length > 0 &&
      operations.every((o) => ['Completed', 'Failed'].includes(o.status))

    return {
      booking_id: booking.booking_id,
      service_status: booking.service_status,
      actual_start: booking.actual_start,
      actual_end: booking.actual_end,
      operations,
      all_done: allDone,
    }
  },

  completeBooking: (bookingId: number) =>
    authPost('/api/operator-actions', { action: 'complete_booking', booking_id: bookingId }),

  abortBooking: (bookingId: number) =>
    authPost('/api/operator-actions', { action: 'abort_booking', booking_id: bookingId }),

  // ── Drones ───────────────────────────────────────────────────────────────

  getDrones: async () => {
    const { data, error } = await supabase
      .from('drones')
      .select('*, base_stations(station_serial_no, status)')
      .order('drone_id', { ascending: true })
    if (error) throw new Error(error.message)
    return data ?? []
  },

  sendDroneCommand: async (
    _droneId: number,
    _command: string,
    _params?: { param1?: number; param2?: number; mode?: string },
  ) => {
    throw new Error('Drone command requires companion PC connection. Set drone_backend_url in settings.')
  },
}
