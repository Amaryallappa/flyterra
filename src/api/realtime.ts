/**
 * Supabase Realtime helpers
 *
 * Drone telemetry (100ms) still comes via Socket.IO from the companion PC.
 * Supabase Realtime is used for:
 *   - station_health_logs  → live station condition (operator & admin)
 *   - operations           → base station phase changes, mission status
 *   - bookings             → status transitions (confirmed, in_progress, etc.)
 */
import { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from './supabase'

// ── Types ─────────────────────────────────────────────────────────────────────

export type StationHealthRow = {
  station_log_id: number
  station_id: number
  booking_id: number | null
  timestamp: string
  water_tank_empty: boolean | null
  flow_rate_per_min: number | null
  cartridge_levels_json: {
    c1_ml: number; c2_ml: number; c3_ml: number; c4_ml: number; c5_ml: number
  } | null
  charging_slots_status: Array<{
    slot: number; drone_id: number | null; status: string; voltage: number | null
  }> | null
}

export type OperationRow = {
  operation_id: number
  booking_id: number
  field_id: number
  drone_id: number | null
  station_id: number | null
  status: string
  current_phase: string
  spray_progress_percent: number
  updated_at: string
}

// ── Station health — live subscription ───────────────────────────────────────

/**
 * Subscribe to new station_health_logs rows for a specific station.
 * Used by: Operator (live view) + Admin (live tail)
 *
 * @returns cleanup function — call on component unmount
 */
export function subscribeStationHealth(
  stationId: number,
  onRow: (row: StationHealthRow) => void,
): () => void {
  const channel: RealtimeChannel = supabase
    .channel(`station-health-${stationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'station_health_logs',
        filter: `station_id=eq.${stationId}`,
      },
      (payload) => onRow(payload.new as StationHealthRow),
    )
    .subscribe()

  return () => { supabase.removeChannel(channel) }
}

// ── Station health — fetch history (Admin page) ───────────────────────────────

/**
 * Fetch last N rows of station health history.
 * Admin station detail page uses this to show historical charts.
 */
export async function fetchStationHealthHistory(
  stationId: number,
  limit = 1000,
): Promise<StationHealthRow[]> {
  const { data, error } = await supabase
    .from('station_health_logs')
    .select('*')
    .eq('station_id', stationId)
    .order('timestamp', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []) as StationHealthRow[]
}

// ── Operations — live subscription ───────────────────────────────────────────

/**
 * Subscribe to operation changes for a specific booking or station.
 * Used by operator mission control page.
 */
export function subscribeOperations(
  filter: { stationId?: number; bookingId?: number },
  onUpdate: (op: OperationRow) => void,
): () => void {
  const filterStr = filter.stationId
    ? `station_id=eq.${filter.stationId}`
    : `booking_id=eq.${filter.bookingId}`

  const channel: RealtimeChannel = supabase
    .channel(`operations-${filterStr}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'operations', filter: filterStr },
      (payload) => onUpdate(payload.new as OperationRow),
    )
    .subscribe()

  return () => { supabase.removeChannel(channel) }
}

// ── Bookings — live status updates ───────────────────────────────────────────

export function subscribeBookingStatus(
  bookingId: number,
  onUpdate: (row: { booking_id: number; service_status: string }) => void,
): () => void {
  const channel: RealtimeChannel = supabase
    .channel(`booking-${bookingId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'bookings',
        filter: `booking_id=eq.${bookingId}`,
      },
      (payload) => onUpdate(payload.new as { booking_id: number; service_status: string }),
    )
    .subscribe()

  return () => { supabase.removeChannel(channel) }
}
