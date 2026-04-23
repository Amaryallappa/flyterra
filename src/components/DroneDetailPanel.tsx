import { useQuery } from '@tanstack/react-query'
import { Monitor, X, WifiOff, Loader2 } from 'lucide-react'
import { supabase } from '@/api/supabase'

// ── Types ──────────────────────────────────────────────────────────────────────

export interface Drone {
  drone_id: number
  drone_serial_no: string
  status: string
  station_id: number | null
  operation_type: string
  price_per_acre: number
  minutes_per_acre?: number
  active_date?: string
  drone_companion_url: string | null
  drone_live_video_url: string | null
  base_setup_time_mins?: number
  max_acres_per_tank?: number
  station_refill_time_mins?: number
  daily_start_time?: string
  daily_end_time?: string
}

interface FlightLog {
  flight_log_id: number
  booking_id: number | null
  drone_id: number
  timestamp: string | null
  telemetry_source: string | null
  gps_lat: number | null
  gps_lng: number | null
  altitude_meters: number | null
  alt_msl: number | null
  speed_mps: number | null
  airspeed_mps: number | null
  heading_deg: number | null
  climb_mps: number | null
  roll_deg: number | null
  pitch_deg: number | null
  yaw_deg: number | null
  throttle_pct: number | null
  battery_serial_no: string | null
  voltage_total: number | null
  current_amps: number | null
  cell_voltages: unknown | null
  temperature_c: number | null
  remaining_percentage: number | null
  gps_sats: number | null
  gps_fix_type: number | null
  gps_hdop: number | null
  armed: boolean | null
  flight_mode: string | null
  rssi: number | null
  remrssi: number | null
  wp_seq: number | null
  wp_dist_m: number | null
  log_msg: string | null
}

// ── Helpers ────────────────────────────────────────────────────────────────────

export function buildGcsUrl(drone: Drone): string {
  const restUrl = drone.drone_companion_url?.replace(/\/$/, '') ?? ''
  const p = new URLSearchParams()
  if (restUrl) p.set('rest', restUrl)
  return `/drone-gcs.html?${p.toString()}`
}

function fmt(v: number | null | undefined, decimals = 1): string {
  return v != null ? v.toFixed(decimals) : '—'
}

// ── Status badge ───────────────────────────────────────────────────────────────

function statusBadge(s: string) {
  const cls =
    s === 'Active'      ? 'badge-green' :
    s === 'In_Use'      ? 'badge-blue'  :
    s === 'Maintenance' ? 'badge-yellow': 'badge-red'
  return <span className={cls}>{s}</span>
}

// ── TelBox ─────────────────────────────────────────────────────────────────────

function TelBox({
  label, value, warn, sub,
}: {
  label: string
  value: string
  warn?: boolean
  sub?: string
}) {
  return (
    <div className="bg-gray-50 rounded-lg px-3 py-2 border border-gray-100 min-w-[80px]">
      <p className="text-[10px] text-gray-400 leading-tight mb-0.5 uppercase tracking-wide">{label}</p>
      <p className={`text-sm font-bold tabular-nums leading-tight ${warn ? 'text-red-600' : 'text-gray-800'}`}>
        {value}
      </p>
      {sub && <p className="text-[10px] text-gray-400 leading-tight mt-0.5">{sub}</p>}
    </div>
  )
}

// ── Section header ─────────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mt-3 mb-1.5 col-span-full">
      {title}
    </p>
  )
}

// ── DroneDetailPanel ───────────────────────────────────────────────────────────

export default function DroneDetailPanel({
  drone,
  onClose,
  onOpenGCS,
}: {
  drone: Drone
  onClose: () => void
  onOpenGCS: () => void
}) {
  const { data: log, isLoading, isError, dataUpdatedAt } = useQuery({
    queryKey: ['drone-flight-log-latest', drone.drone_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('drone_flight_logs')
        .select('*')
        .eq('drone_id', drone.drone_id)
        .order('timestamp', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return data as FlightLog | null
    },
    refetchInterval: 3_000,
  })

  const updatedAt = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString('en-US', { hour12: false })
    : null

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden mt-4">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-bold text-gray-900">{drone.drone_serial_no}</span>
          {statusBadge(drone.status)}
          {isLoading && (
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Loader2 size={11} className="animate-spin" /> Loading…
            </span>
          )}
          {!isLoading && log && updatedAt && (
            <span className="text-xs text-gray-400">Updated {updatedAt}</span>
          )}
          {!isLoading && !log && !isError && (
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <WifiOff size={11} /> No data
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenGCS}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg
                       bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200"
          >
            <Monitor size={13} /> Open GCS
          </button>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <X size={18} />
          </button>
        </div>
      </div>

      {/* ── Drone info ── */}
      <div className="px-4 py-4 border-b border-gray-100">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-3">Drone Info</p>
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2 text-sm">
          <dt className="text-gray-500">Serial No</dt>
          <dd className="font-mono font-medium">{drone.drone_serial_no}</dd>

          <dt className="text-gray-500">Station</dt>
          <dd>{drone.station_id ? `#${drone.station_id}` : '—'}</dd>

          <dt className="text-gray-500">Type</dt>
          <dd>{drone.operation_type}</dd>

          <dt className="text-gray-500">Price / Acre</dt>
          <dd>₹{drone.price_per_acre}</dd>

          <dt className="text-gray-500">Status</dt>
          <dd>{statusBadge(drone.status)}</dd>

          {drone.active_date && (
            <>
              <dt className="text-gray-500">Active Date</dt>
              <dd>{drone.active_date}</dd>
            </>
          )}

          {drone.drone_companion_url && (
            <>
              <dt className="text-gray-500">Companion URL</dt>
              <dd className="truncate font-mono text-xs text-gray-500 col-span-3">
                {drone.drone_companion_url}
              </dd>
            </>
          )}
        </dl>
      </div>

      {/* ── Telemetry boxes ── */}
      <div className="px-4 py-4">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-3">
          Live Telemetry
          <span className="ml-2 font-normal normal-case text-gray-300">· from drone_flight_logs · auto-refresh 3s</span>
        </p>

        {isError ? (
          <div className="flex items-center gap-2 text-sm text-red-500 py-2">
            <WifiOff size={14} /> Failed to load telemetry
          </div>
        ) : !log && !isLoading ? (
          <div className="text-sm text-gray-400 py-2">No flight log data for this drone yet.</div>
        ) : (
          <div className="flex flex-wrap gap-2">

            {/* Flight info */}
            <SectionHeader title="Flight" />
            <TelBox label="Mode"      value={log?.flight_mode ?? '—'} />
            <TelBox label="Armed"     value={log?.armed ? 'ARMED' : log?.armed === false ? 'Disarmed' : '—'} warn={log?.armed === true} />
            <TelBox label="Source"    value={log?.telemetry_source ?? '—'} />
            <TelBox label="Booking"   value={log?.booking_id != null ? `#${log.booking_id}` : '—'} />
            <TelBox label="Timestamp" value={log?.timestamp ? new Date(log.timestamp).toLocaleTimeString('en-US', { hour12: false }) : '—'} />
            {log?.log_msg && (
              <div className="w-full bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                <p className="text-[10px] text-blue-400 uppercase tracking-wide mb-0.5">Log Msg</p>
                <p className="text-sm text-blue-800">{log.log_msg}</p>
              </div>
            )}

            {/* Position */}
            <SectionHeader title="Position" />
            <TelBox label="GPS Lat"   value={fmt(log?.gps_lat, 6)} />
            <TelBox label="GPS Lng"   value={fmt(log?.gps_lng, 6)} />
            <TelBox label="Alt (m)"   value={fmt(log?.altitude_meters)} />
            <TelBox label="Alt MSL"   value={fmt(log?.alt_msl)} />
            <TelBox label="GPS Sats"  value={log?.gps_sats != null ? String(log.gps_sats) : '—'} />
            <TelBox label="GPS Fix"   value={log?.gps_fix_type != null ? String(log.gps_fix_type) : '—'} />
            <TelBox label="HDOP"      value={fmt(log?.gps_hdop, 2)} />

            {/* Movement */}
            <SectionHeader title="Movement" />
            <TelBox label="Speed"     value={fmt(log?.speed_mps)} sub="m/s" />
            <TelBox label="Airspeed"  value={fmt(log?.airspeed_mps)} sub="m/s" />
            <TelBox label="Heading"   value={log?.heading_deg != null ? `${Math.round(log.heading_deg)}°` : '—'} />
            <TelBox label="Climb"     value={fmt(log?.climb_mps)} sub="m/s" />
            <TelBox label="Throttle"  value={log?.throttle_pct != null ? `${log.throttle_pct}%` : '—'} />

            {/* Attitude */}
            <SectionHeader title="Attitude" />
            <TelBox label="Roll"      value={fmt(log?.roll_deg)} sub="°" />
            <TelBox label="Pitch"     value={fmt(log?.pitch_deg)} sub="°" />
            <TelBox label="Yaw"       value={fmt(log?.yaw_deg)} sub="°" />

            {/* Battery */}
            <SectionHeader title="Battery" />
            <TelBox label="Voltage"   value={fmt(log?.voltage_total, 2)} sub="V" />
            <TelBox label="Current"   value={fmt(log?.current_amps, 2)} sub="A" />
            <TelBox label="Remaining" value={log?.remaining_percentage != null ? `${log.remaining_percentage}%` : '—'} warn={(log?.remaining_percentage ?? 100) < 20} />
            <TelBox label="Temp"      value={fmt(log?.temperature_c)} sub="°C" />
            <TelBox label="Batt S/N"  value={log?.battery_serial_no ?? '—'} />

            {/* Link */}
            <SectionHeader title="Link" />
            <TelBox label="RSSI"      value={log?.rssi != null ? String(log.rssi) : '—'} />
            <TelBox label="RemRSSI"   value={log?.remrssi != null ? String(log.remrssi) : '—'} />

            {/* Mission */}
            <SectionHeader title="Mission" />
            <TelBox label="WP Seq"    value={log?.wp_seq != null ? String(log.wp_seq) : '—'} />
            <TelBox label="WP Dist"   value={fmt(log?.wp_dist_m)} sub="m" />

          </div>
        )}
      </div>
    </div>
  )
}
