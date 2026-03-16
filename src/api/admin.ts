/**
 * Admin API — uses Supabase client for reads, Netlify functions for service-role writes.
 * All mutation helpers use the same auth pattern as OperatorsPage.adminPost():
 *   fetch(url) + Authorization: Bearer <supabase session token>
 */
import { supabase } from './supabase'

// ── Auth helper ───────────────────────────────────────────────────────────────

async function authPost(endpoint: string, body: any) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token}`,
    },
    body: JSON.stringify(body),
  })
  
  const text = await res.text()
  let data: any
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    throw new Error(`Server returned invalid response: ${res.status}`)
  }

  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`)
  }
  return data
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export const adminApi = {
  getDashboard: async () => {
    const [
      { data: stations },
      { data: drones },
      { data: batteries },
      { data: farmers },
      { data: operators },
      { data: activeOps },
      { data: todayBookings },
      { data: weekBookings },
      { data: monthBookings },
    ] = await Promise.all([
      supabase.from('base_stations').select('station_id, status'),
      supabase.from('drones').select('drone_id, status'),
      supabase.from('batteries').select('battery_id'),
      supabase.from('farmers').select('farmer_id', { count: 'exact', head: false }),
      supabase.from('operators').select('operator_id', { count: 'exact', head: false }),
      supabase.from('operations').select('operation_id').eq('status', 'In_Progress'),
      supabase.from('bookings').select('booking_id, service_status, total_cost, scheduled_start')
        .gte('scheduled_start', new Date(new Date().setHours(0, 0, 0, 0)).toISOString())
        .lt('scheduled_start', new Date(new Date().setHours(23, 59, 59, 999)).toISOString()),
      supabase.from('bookings').select('booking_id, service_status, total_cost, scheduled_start')
        .gte('scheduled_start', (() => { const d = new Date(); d.setDate(d.getDate() - d.getDay()); d.setHours(0,0,0,0); return d.toISOString() })()),
      supabase.from('bookings').select('booking_id, service_status, total_cost, scheduled_start')
        .gte('scheduled_start', (() => { const d = new Date(); d.setDate(1); d.setHours(0,0,0,0); return d.toISOString() })()),
    ])

    function periodStats(rows: Array<{ service_status: string; total_cost: number }> | null) {
      const list = rows ?? []
      return {
        bookings:  list.length,
        completed: list.filter((r) => r.service_status === 'Completed').length,
        cancelled: list.filter((r) => r.service_status === 'Cancelled').length,
        revenue:   list.filter((r) => r.service_status === 'Completed').reduce((s, r) => s + Number(r.total_cost), 0),
      }
    }

    const inProgressBookings = (weekBookings ?? []).filter((b) => b.service_status === 'In_Progress').length

    return {
      total_stations:  (stations ?? []).length,
      active_stations: (stations ?? []).filter((s) => s.status === 'Active').length,
      total_drones:    (drones ?? []).length,
      active_drones:   (drones ?? []).filter((d) => d.status === 'Active').length,
      total_batteries: (batteries ?? []).length,
      total_farmers:   (farmers ?? []).length,
      total_operators: (operators ?? []).length,
      active_operations:    (activeOps ?? []).length,
      in_progress_bookings: inProgressBookings,
      today:      periodStats(todayBookings),
      this_week:  periodStats(weekBookings),
      this_month: periodStats(monthBookings),
    }
  },

  // ── Stations ──────────────────────────────────────────────────────────────

  listStations: async () => {
    const { data, error } = await supabase
      .from('base_stations')
      .select('*')
      .order('station_id', { ascending: true })
    if (error) throw new Error(error.message)
    return data ?? []
  },

  createStation: async (d: any) => {
    const { data, error } = await supabase.from('base_stations').insert({
      station_serial_no: d.station_serial_no,
      active_date: d.active_date,
      status: d.status || 'Active',
      last_known_lat: d.last_known_lat === "" ? null : Number(d.last_known_lat),
      last_known_lng: d.last_known_lng === "" ? null : Number(d.last_known_lng),
      station_live_video_url: d.station_live_video_url || null,
      minutes_per_acre: Number(d.minutes_per_acre) || 10,
      station_refill_time_mins: Number(d.station_refill_time_mins) || 5,
      base_setup_time_mins: Number(d.base_setup_time_mins) || 15,
      operation_mode: d.operation_mode || 'Spray',
      price_per_acre: Number(d.price_per_acre) || 550,
      daily_start_time: d.daily_start_time || '06:00',
      daily_end_time: d.daily_end_time || '18:00',
    }).select().single()
    if (error) {
      console.error('Supabase error creating station:', error)
      throw new Error(error.message)
    }
    return data
  },

  updateStation: async (id: number, d: any) => {
    // Clean data: empty strings to null, strings to numbers for coords
    const patch: any = {}
    if (d.station_serial_no) patch.station_serial_no = d.station_serial_no
    if (d.active_date) patch.active_date = d.active_date
    if (d.station_live_video_url !== undefined) patch.station_live_video_url = d.station_live_video_url || null
    
    // Status normalization
    if (d.status) {
      const s = d.status.charAt(0).toUpperCase() + d.status.slice(1).toLowerCase()
      patch.status = s === 'Maintenance' || s === 'Offline' ? s : 'Active'
    }

    if (d.last_known_lat !== undefined) patch.last_known_lat = d.last_known_lat === "" ? null : Number(d.last_known_lat)
    if (d.last_known_lng !== undefined) patch.last_known_lng = d.last_known_lng === "" ? null : Number(d.last_known_lng)

    // Operational params
    if (d.minutes_per_acre !== undefined) patch.minutes_per_acre = Number(d.minutes_per_acre)
    if (d.station_refill_time_mins !== undefined) patch.station_refill_time_mins = Number(d.station_refill_time_mins)
    if (d.base_setup_time_mins !== undefined) patch.base_setup_time_mins = Number(d.base_setup_time_mins)
    if (d.operation_mode !== undefined) patch.operation_mode = d.operation_mode
    if (d.price_per_acre !== undefined) patch.price_per_acre = Number(d.price_per_acre)
    if (d.daily_start_time !== undefined) patch.daily_start_time = d.daily_start_time
    if (d.daily_end_time !== undefined) patch.daily_end_time = d.daily_end_time

    const { error } = await supabase.from('base_stations').update(patch).eq('station_id', id)
    if (error) throw new Error(error.message)
  },

  deleteStation: async (id: number) => {
    const { error } = await supabase.from('base_stations').delete().eq('station_id', id)
    if (error) throw new Error(error.message)
  },

  getStationHealth: async (id: number) => {
    const { data, error } = await supabase
      .from('station_health_logs')
      .select('*')
      .eq('station_id', id)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') throw new Error(error.message)

    // Also get station basic info
    const { data: station } = await supabase
      .from('base_stations')
      .select('station_id, station_serial_no, status')
      .eq('station_id', id)
      .single()

    if (!data) {
      return {
        station_id: id,
        station_serial_no: station?.station_serial_no ?? '',
        status: station?.status ?? 'Offline',
        last_health_ts: null,
        water_tank_empty: null,
        flow_rate_per_min: null,
        cartridge_levels: null,
        charging_slots: null,
        station_online: false,
      }
    }

    const lastTs = new Date(data.timestamp).getTime()
    const stationOnline = Date.now() - lastTs < 30_000  // online if last update < 30s ago

    return {
      station_id: data.station_id,
      station_serial_no: station?.station_serial_no ?? '',
      status: station?.status ?? 'Active',
      last_health_ts: data.timestamp,
      water_tank_empty: data.water_tank_empty,
      flow_rate_per_min: data.flow_rate_per_min,
      cartridge_levels: data.cartridge_levels_json,
      charging_slots: data.charging_slots_status,
      station_online: stationOnline,
    }
  },

  // ── Drones ────────────────────────────────────────────────────────────────

  listDrones: async () => {
    const { data, error } = await supabase
      .from('drones')
      .select('*')
      .order('drone_id', { ascending: true })
    if (error) throw new Error(error.message)
    return data ?? []
  },

  createDrone: async (d: any) => {
    const { data, error } = await supabase.from('drones').insert(d).select().single()
    if (error) throw new Error(error.message)
    return data
  },

  updateDrone: async (id: number, d: any) => {
    const { error } = await supabase.from('drones').update(d).eq('drone_id', id)
    if (error) throw new Error(error.message)
  },

  deleteDrone: async (id: number) => {
    const { error } = await supabase.from('drones').delete().eq('drone_id', id)
    if (error) throw new Error(error.message)
  },

  // ── Batteries ─────────────────────────────────────────────────────────────

  listBatteries: async () => {
    const { data, error } = await supabase
      .from('batteries')
      .select('*, base_stations(station_serial_no)')
      .order('battery_id', { ascending: true })
    if (error) throw new Error(error.message)
    return data ?? []
  },

  createBattery: async (d: any) => {
    const { data, error } = await supabase.from('batteries').insert(d).select().single()
    if (error) throw new Error(error.message)
    return data
  },

  updateBattery: async (id: number, d: any) => {
    const { error } = await supabase.from('batteries').update(d).eq('battery_id', id)
    if (error) throw new Error(error.message)
  },

  deleteBattery: async (id: number) => {
    const { error } = await supabase.from('batteries').delete().eq('battery_id', id)
    if (error) throw new Error(error.message)
  },

  getBatteryDetail: async (id: number) => {
    const { data, error } = await supabase
      .from('batteries')
      .select('*, base_stations(station_serial_no, status)')
      .eq('battery_id', id)
      .single()
    if (error) throw new Error(error.message)
    return data
  },

  // ── Users ─────────────────────────────────────────────────────────────────

  listUsers: async (params?: { role?: string }): Promise<any> => {
    const role = params?.role

    if (role === 'Farmer' || !role) {
      const { data, error } = await supabase
        .from('farmers')
        .select('farmer_id, full_name, mobile_number, email, accounts(username, role, is_active, created_at)')
        .order('full_name', { ascending: true })
      if (error) throw new Error(error.message)
      const farmers = (data ?? []).map((f) => {
        const accArr = f.accounts as any
        const acc = Array.isArray(accArr) ? accArr[0] : accArr
        return { 
          account_id: f.farmer_id, 
          full_name: f.full_name, 
          mobile_number: f.mobile_number,
          email: f.email, 
          role: 'Farmer' as const, 
          username: acc?.username ?? '', 
          is_active: acc?.is_active ?? true,
          created_at: acc?.created_at ?? '' 
        }
      })
      if (role === 'Farmer') return farmers
    }

    if (role === 'Operator' || !role) {
      const { data, error } = await supabase
        .from('operators')
        .select('operator_id, full_name, mobile_number, email, assigned_base_station_id, accounts(username, role, is_active, created_at)')
        .order('full_name', { ascending: true })
      if (error) throw new Error(error.message)
      const operators = (data ?? []).map((o) => {
        const accArr = o.accounts as any
        const acc = Array.isArray(accArr) ? accArr[0] : accArr
        return { 
          account_id: o.operator_id, 
          full_name: o.full_name, 
          mobile_number: o.mobile_number,
          email: o.email, 
          role: 'Operator' as const, 
          username: acc?.username ?? '', 
          is_active: acc?.is_active ?? true,
          created_at: acc?.created_at ?? '', 
          assigned_base_station_id: o.assigned_base_station_id 
        }
      })
      if (role === 'Operator') return operators
      // For 'all' merge
      const farmerRows = await adminApi.listUsers({ role: 'Farmer' })
      return [...farmerRows, ...operators]
    }

    if (role === 'Admin') return []
    return []
  },

  deactivateUser: async (id: string) => {
    const { error } = await supabase.from('accounts').update({ is_active: false }).eq('account_id', id)
    if (error) throw new Error(error.message)
  },

  activateUser: async (id: string) => {
    const { error } = await supabase.from('accounts').update({ is_active: true }).eq('account_id', id)
    if (error) throw new Error(error.message)
  },

  createOperator: (d: unknown) =>
    authPost('/api/admin-users', { action: 'create', ...(d as Record<string, unknown>) }),

  assignOperator: (d: { operator_id: string; station_id: number | null }) =>
    authPost('/api/admin-users', { action: 'update',
      id: d.operator_id,
      assigned_base_station_id: d.station_id }),

  updateOperator: (id: string, d: {
    full_name?: string; mobile_number?: string; email?: string | null
    address?: string | null; assigned_base_station_id?: number | null
    password?: string
  }) => authPost('/api/admin-users', { action: 'update', id, ...d }),

  deleteOperator: (id: string) =>
    authPost('/api/admin-users', { action: 'delete', id }),

  // ── Bookings ──────────────────────────────────────────────────────────────

  listBookings: async (params?: { service_status?: string; from_date?: string; to_date?: string }) => {
    let query = supabase
      .from('bookings')
      .select(`
        booking_id, station_id, drone_id, service_status, scheduled_start, scheduled_end,
        actual_start, actual_end, total_cost, created_at, notes,
        farmers(full_name, mobile_number),
        drones(drone_serial_no),
        base_stations(station_id, station_serial_no),
        booking_fields(spray_order, fields(field_id, field_name, area_acres)),
        job_configurations(*)
      `)
      .order('scheduled_start', { ascending: false })

    if (params?.service_status) query = query.eq('service_status', params.service_status)
    if (params?.from_date) query = query.gte('scheduled_start', params.from_date)
    if (params?.to_date) query = query.lte('scheduled_start', params.to_date)

    const { data, error } = await query
    if (error) throw new Error(error.message)
    
    return (data ?? []).map((b: any) => ({
      ...b,
      farmers:       Array.isArray(b.farmers) ? b.farmers[0] : b.farmers,
      drones:        Array.isArray(b.drones) ? b.drones[0] : b.drones,
      base_stations: Array.isArray(b.base_stations) ? b.base_stations[0] : b.base_stations,
    }))
  },

  cancelBooking: async (id: number, reason?: string) => {
    const { error } = await supabase.from('bookings').update({
      service_status: 'Cancelled',
      notes: reason ?? null,
    }).eq('booking_id', id)
    if (error) throw new Error(error.message)
  },

  holdBooking: async (id: number, reason?: string) => {
    const { error } = await supabase.from('bookings').update({
      service_status: 'On_Hold',
      notes: reason ?? null,
    }).eq('booking_id', id)
    if (error) throw new Error(error.message)
  },

  releaseBooking: async (id: number) => {
    const { error } = await supabase.from('bookings').update({ service_status: 'Confirmed' }).eq('booking_id', id)
    if (error) throw new Error(error.message)
  },

  // ── Drone commands (companion PC — keep for future) ───────────────────────

  sendDroneCommand: async (
    _droneId: number,
    _command: string,
    _params?: { param1?: number; param2?: number; mode?: string },
  ) => {
    throw new Error('Drone command requires companion PC connection. Set drone_backend_url in settings.')
  },

  // ── Farmers ───────────────────────────────────────────────────────────────

  getFarmerDetail: async (id: string): Promise<any> => {
    const { data, error } = await supabase
      .from('farmers')
      .select(`
        farmer_id, full_name, mobile_number, email, address, wallet_balance,
        accounts(username, is_active, created_at),
        bookings(booking_id, station_id, drone_id, service_status, scheduled_start, scheduled_end, total_cost, notes, created_at),
        fields(*, base_stations(station_serial_no))
      `)
      .eq('farmer_id', id)
      .single()
    if (error) throw new Error(error.message)

    const accArr = data.accounts as any
    const acc = Array.isArray(accArr) ? accArr[0] : accArr

    return {
      farmer_id: data.farmer_id,
      full_name: data.full_name,
      mobile_number: data.mobile_number,
      email: data.email,
      address: data.address,
      wallet_balance: Number(data.wallet_balance),
      username: acc?.username ?? '',
      is_active: acc?.is_active ?? true,
      created_at: acc?.created_at ?? '',
      bookings: (data.bookings ?? []).map((b: any) => ({
        ...b,
        fields_count: 0,
      })),
      fields: (data.fields ?? []).map((f: any) => {
        const station = Array.isArray(f.base_stations) ? f.base_stations[0] : f.base_stations
        return {
          ...f,
          station_serial_no: station?.station_serial_no ?? null,
          has_missions: !!(f.base_to_field_file_path && f.field_to_base_file_path && f.mission_file_path)
        }
      })
    }
  },

  updateFarmerWallet: async (id: string, newBalance: number, reason?: string) => {
    const { data: farmer } = await supabase
      .from('farmers')
      .select('wallet_balance')
      .eq('farmer_id', id)
      .single()

    const currentBalance = Number(farmer?.wallet_balance ?? 0)
    const delta = newBalance - currentBalance

    await supabase.from('wallet_transactions').insert({
      farmer_id: id,
      type: delta >= 0 ? 'Deposit' : 'Withdrawal',
      amount: Math.abs(delta),
      reference_id: reason ?? 'Admin adjustment',
    })

    const { error } = await supabase.from('farmers').update({ wallet_balance: newBalance }).eq('farmer_id', id)
    if (error) throw new Error(error.message)
  },

  // ── Field management ──────────────────────────────────────────────────────

  updateFieldStation: async (fieldId: number, stationId: number | null) => {
    const { error } = await supabase.from('fields').update({ station_id: stationId }).eq('field_id', fieldId)
    if (error) throw new Error(error.message)
  },

  uploadFieldMissions: async (fieldId: number, fd: FormData) => {
    const patch: Record<string, string | null> = {}
    const keys = ['base_to_field', 'field_to_base', 'polygon_spray', 'exclusion']
    
    // Map of FormData keys to DB column names
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
        
        const { error: uploadErr } = await supabase.storage
          .from('missions')
          .upload(path, file, { upsert: true })
        
        if (uploadErr) throw new Error(`Upload failed for ${key}: ${uploadErr.message}`)
        patch[colMap[key]] = path
      }
    }

    if (Object.keys(patch).length > 0) {
      const { error: updateErr } = await supabase
        .from('fields')
        .update(patch)
        .eq('field_id', fieldId)
      if (updateErr) throw new Error(`DB update failed: ${updateErr.message}`)
    }
  },

  getMissionDownloadUrl: async (path: string) => {
    // Return a signed URL valid for 1 hour
    const { data, error } = await supabase.storage
      .from('missions')
      .createSignedUrl(path, 3600)
    if (error) throw new Error(error.message)
    return data.signedUrl
  },

  // ── Settings ──────────────────────────────────────────────────────────────

  getRazorpaySettings: async () => {
    const { data, error } = await supabase
      .from('system_settings')
      .select('key, value')
      .in('key', ['razorpay_key_id'])  // never expose key_secret via frontend
    if (error) throw new Error(error.message)
    const map: Record<string, string> = {}
    ;(data ?? []).forEach((row) => { map[row.key] = row.value })
    return { key_id: map['razorpay_key_id'] ?? '' }
  },

  updateRazorpaySettings: async (d: { key_id?: string; key_secret?: string }) => {
    const { data: { user } } = await supabase.auth.getUser()
    const updates: Promise<any>[] = []
    if (d.key_id !== undefined) {
      updates.push((supabase.from('system_settings').update({ value: d.key_id, updated_by: user?.id }).eq('key', 'razorpay_key_id') as any))
    }
    if (d.key_secret !== undefined) {
      updates.push((supabase.from('system_settings').update({ value: d.key_secret, updated_by: user?.id }).eq('key', 'razorpay_key_secret') as any))
    }
    await Promise.all(updates)
  },
}
