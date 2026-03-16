import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { operatorApi } from '@/api/operator'
import { useSocket } from '@/hooks/useSocket'
import { useAuth } from '@/contexts/AuthContext'
import Hls from 'hls.js'
import {
  Cpu, Battery, MapPin, Gauge, Navigation, Video, VideoOff,
  Maximize2, X, AlertTriangle, Loader2, WifiOff, RotateCcw,
  PlaneLanding, ShieldAlert, CheckCircle2, Radio,
  type LucideIcon,
} from 'lucide-react'
import toast from 'react-hot-toast'

// ── Types ──────────────────────────────────────────────────────────────────────

interface Drone {
  drone_id: number
  drone_serial_no: string
  station_id: number | null
  drone_companion_url: string | null
  drone_live_video_url: string | null
  status: string
  operation_type: string
  price_per_acre: number
  minutes_per_acre: number
  daily_start_time: string
  daily_end_time: string
}

interface TelemetryFrame {
  drone_id: number
  lat?: number
  lng?: number
  alt_rel?: number
  alt_msl?: number
  groundspeed?: number
  heading?: number
  battery_remaining?: number
  battery_voltage?: number
  flight_mode?: string
  armed?: boolean
  gps_sats?: number
  gps_fix?: number
  timestamp?: string
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function resolveVideoUrl(drone: Drone): string | null {
  if (drone.drone_live_video_url) return drone.drone_live_video_url
  if (drone.drone_companion_url)
    return drone.drone_companion_url.replace(/\/$/, '') + '/drone/index.m3u8'
  return null
}

function streamType(url: string | null): 'hls' | 'mjpeg' | 'native' | null {
  if (!url) return null
  if (/mjpe?g|action=stream|stream\.cgi/i.test(url)) return 'mjpeg'
  if (url.includes('.m3u8')) return 'hls'
  return 'native'
}

const STATUS_DOT: Record<string, string> = {
  Active:      'bg-green-500',
  Maintenance: 'bg-yellow-400',
  Offline:     'bg-gray-400',
}

// ── Live Video Modal ───────────────────────────────────────────────────────────

function VideoModal({ drone, onClose }: { drone: Drone; onClose: () => void }) {
  const videoRef  = useRef<HTMLVideoElement>(null)
  const panelRef  = useRef<HTMLDivElement>(null)
  const [err, setErr] = useState(false)
  const url  = resolveVideoUrl(drone)
  const type = streamType(url)

  useEffect(() => {
    if (type !== 'hls' || !url || !videoRef.current) return
    if (Hls.isSupported()) {
      const hls = new Hls({ lowLatencyMode: true, backBufferLength: 4 })
      hls.loadSource(url)
      hls.attachMedia(videoRef.current)
      hls.on(Hls.Events.ERROR, (_, d) => { if (d.fatal) setErr(true) })
      return () => hls.destroy()
    } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
      videoRef.current.src = url
    }
  }, [url, type])

  return (
    <div className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div ref={panelRef} className="bg-gray-900 rounded-xl overflow-hidden w-full max-w-3xl shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Video size={16} className="text-blue-400" />
            <span className="text-white font-semibold text-sm">
              Drone #{drone.drone_id} — {drone.drone_serial_no}
            </span>
            {!err && url && (
              <span className="flex items-center gap-1 text-xs text-green-400 font-medium">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" /> LIVE
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => panelRef.current?.requestFullscreen?.()}
              className="text-gray-400 hover:text-white p-1"><Maximize2 size={16} /></button>
            <button onClick={onClose} className="text-gray-400 hover:text-white p-1"><X size={16} /></button>
          </div>
        </div>

        <div className="relative bg-black aspect-video">
          {!url ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-500">
              <VideoOff size={32} />
              <p className="text-sm">No video URL configured for this drone</p>
              <p className="text-xs text-gray-600">Set Companion PC URL or Video URL Override in admin settings</p>
            </div>
          ) : err ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-500">
              <WifiOff size={32} />
              <p className="text-sm">Stream unavailable</p>
              <button onClick={() => setErr(false)} className="text-xs text-blue-400 underline mt-1">Retry</button>
            </div>
          ) : type === 'mjpeg' ? (
            <img src={url} alt="Live feed" className="w-full h-full object-contain"
              onError={() => setErr(true)} />
          ) : (
            <video ref={videoRef} autoPlay muted playsInline
              className="w-full h-full object-contain"
              onError={() => setErr(true)} />
          )}
        </div>

        <div className="px-4 py-2 border-t border-white/10 flex items-center gap-4 text-xs text-gray-400">
          <span className="font-mono">{url ?? 'No stream URL'}</span>
          {type && <span className="ml-auto uppercase tracking-wider text-gray-600">{type}</span>}
        </div>
      </div>
    </div>
  )
}

// ── Abort confirm dialog ───────────────────────────────────────────────────────

function AbortDialog({
  bookingId,
  onConfirm,
  onCancel,
  loading,
}: {
  bookingId: number
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}) {
  return (
    <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}>
      <div className="bg-white rounded-xl w-full max-w-sm p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={20} className="text-red-600" />
          </div>
          <div>
            <p className="font-bold text-gray-900">Abort Mission?</p>
            <p className="text-sm text-gray-500">Booking #{bookingId}</p>
          </div>
        </div>
        <p className="text-sm text-gray-600 mb-6">
          This will send <strong>RTL</strong> to the drone, cancel all queued operations,
          and mark the booking as Cancelled. This cannot be undone.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} disabled={loading}
            className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 px-4 py-2 text-sm font-semibold bg-red-600 text-white rounded-lg
                       hover:bg-red-700 flex items-center justify-center gap-2">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <ShieldAlert size={14} />}
            Abort Mission
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Telemetry badge helpers ────────────────────────────────────────────────────

function TelBadge({ icon: Icon, label, value, dim }: {
  icon: LucideIcon
  label: string
  value: string
  dim?: boolean
}) {
  return (
    <div className={`flex items-center gap-1.5 text-xs ${dim ? 'text-gray-400' : 'text-gray-700'}`}>
      <Icon size={12} className={dim ? 'text-gray-300' : 'text-blue-500'} />
      <span className="text-gray-400">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  )
}

// ── Drone card ─────────────────────────────────────────────────────────────────

function DroneCard({
  drone,
  telemetry,
  activeBookingId,
}: {
  drone: Drone
  telemetry: TelemetryFrame | null
  activeBookingId: number | null
}) {
  const qc = useQueryClient()
  const [showVideo, setShowVideo] = useState(false)
  const [abortTarget, setAbortTarget] = useState<number | null>(null)

  const cmdMutation = useMutation({
    mutationFn: ({ cmd }: { cmd: string }) =>
      operatorApi.sendDroneCommand(drone.drone_id, cmd),
    onSuccess: (_, { cmd }) => toast.success(`Command "${cmd}" sent`),
    onError: () => toast.error('Command failed'),
  })

  const abortMutation = useMutation({
    mutationFn: (bookingId: number) => operatorApi.abortBooking(bookingId),
    onSuccess: () => {
      toast.success('Mission aborted — RTL issued')
      setAbortTarget(null)
      qc.invalidateQueries({ queryKey: ['op-today'] })
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })
        ?.response?.data?.detail ?? 'Abort failed'
      toast.error(msg)
    },
  })

  const hasTelemetry = !!telemetry
  const isArmed      = telemetry?.armed ?? false
  const bat          = telemetry?.battery_remaining
  const batColor     = bat == null ? 'text-gray-400'
                     : bat > 50    ? 'text-green-600'
                     : bat > 20    ? 'text-yellow-500'
                     :               'text-red-500'

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <Cpu size={18} className="text-blue-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-bold text-gray-900 text-sm">{drone.drone_serial_no}</p>
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[drone.status] ?? 'bg-gray-400'}`} />
                <span className="text-xs text-gray-400">{drone.status}</span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">{drone.operation_type} · #{drone.drone_id}</p>
            </div>
          </div>

          {/* Live indicator */}
          {hasTelemetry && (
            <span className="flex items-center gap-1 text-xs text-green-600 font-medium flex-shrink-0">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              Live
            </span>
          )}
        </div>

        {/* Telemetry grid */}
        {hasTelemetry ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 bg-gray-50 rounded-lg p-3">
            {telemetry.lat != null && telemetry.lng != null && (
              <TelBadge icon={MapPin} label="GPS"
                value={`${telemetry.lat.toFixed(5)}, ${telemetry.lng.toFixed(5)}`} />
            )}
            {telemetry.alt_rel != null && (
              <TelBadge icon={Gauge} label="Alt"
                value={`${telemetry.alt_rel.toFixed(1)} m`} />
            )}
            {telemetry.groundspeed != null && (
              <TelBadge icon={Navigation} label="Speed"
                value={`${telemetry.groundspeed.toFixed(1)} m/s`} />
            )}
            {telemetry.heading != null && (
              <TelBadge icon={Navigation} label="Hdg"
                value={`${telemetry.heading}°`} />
            )}
            {bat != null && (
              <div className={`flex items-center gap-1.5 text-xs ${batColor}`}>
                <Battery size={12} />
                <span className="text-gray-400">Bat</span>
                <span className="font-semibold tabular-nums">{bat}%</span>
                {telemetry.battery_voltage != null && (
                  <span className="text-gray-300">({telemetry.battery_voltage.toFixed(2)}V)</span>
                )}
              </div>
            )}
            {telemetry.flight_mode && (
              <TelBadge icon={Radio} label="Mode" value={telemetry.flight_mode} />
            )}
            {telemetry.gps_sats != null && (
              <TelBadge icon={MapPin} label="Sats" value={String(telemetry.gps_sats)} />
            )}
            <div className={`flex items-center gap-1.5 text-xs ${isArmed ? 'text-red-600' : 'text-gray-400'}`}>
              <CheckCircle2 size={12} />
              <span className="font-semibold">{isArmed ? 'ARMED' : 'Disarmed'}</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-3 text-xs text-gray-400">
            <WifiOff size={14} />
            No live telemetry — companion PC may be offline
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          {/* Video */}
          <button
            onClick={() => setShowVideo(true)}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg
                       bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-100"
          >
            <Video size={13} /> Live Video
          </button>

          {/* RTL — only when there's an active booking */}
          {activeBookingId && (
            <>
              <button
                onClick={() => cmdMutation.mutate({ cmd: 'RTL' })}
                disabled={cmdMutation.isPending}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg
                           bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border border-yellow-200"
              >
                {cmdMutation.isPending
                  ? <Loader2 size={12} className="animate-spin" />
                  : <RotateCcw size={12} />}
                RTL
              </button>

              <button
                onClick={() => cmdMutation.mutate({ cmd: 'LAND' })}
                disabled={cmdMutation.isPending}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg
                           bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200"
              >
                <PlaneLanding size={12} /> Land
              </button>

              <button
                onClick={() => setAbortTarget(activeBookingId)}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg
                           bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 ml-auto"
              >
                <ShieldAlert size={12} /> Abort Mission
              </button>
            </>
          )}
        </div>
      </div>

      {showVideo && <VideoModal drone={drone} onClose={() => setShowVideo(false)} />}

      {abortTarget != null && (
        <AbortDialog
          bookingId={abortTarget}
          loading={abortMutation.isPending}
          onConfirm={() => abortMutation.mutate(abortTarget)}
          onCancel={() => setAbortTarget(null)}
        />
      )}
    </>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function OperatorDronePage() {
  const { user } = useAuth()
  const { on, emit } = useSocket()
  const stationId = user?.assigned_base_station_id

  // Map of drone_id → latest telemetry frame
  const [telemetry, setTelemetry] = useState<Record<number, TelemetryFrame>>({})

  // Map of drone_id → active booking_id (in-progress booking using this drone)
  const [activeBookings, setActiveBookings] = useState<Record<number, number>>({})

  const { data: drones = [], isLoading } = useQuery<Drone[]>({
    queryKey: ['operator-drones'],
    queryFn: operatorApi.getDrones,
    refetchInterval: 30_000,
  })

  // Join/leave station Socket.IO room for telemetry
  useEffect(() => {
    if (!stationId) return
    emit('join_station', { station_id: stationId })
    return () => { emit('leave_station', { station_id: stationId }) }
  }, [stationId, emit])

  // Listen for drone_telemetry events
  useEffect(() => {
    const off = on('drone_telemetry', (payload: unknown) => {
      const frame = payload as TelemetryFrame
      if (!frame?.drone_id) return
      setTelemetry((prev) => ({ ...prev, [frame.drone_id]: frame }))
    })
    return off
  }, [on])

  // Listen for operation_update to track which drone has an active booking
  useEffect(() => {
    const off = on('operation_update', () => {
      // Re-check today's jobs to update active booking map
      // We piggyback on the drones query refetch to keep it simple
    })
    return off
  }, [on])

  // Build drone_id → booking_id map from today's jobs
  // We fetch today's jobs here to know which drone is currently in use
  const { data: todayJobs = [] } = useQuery<{
    booking_id: number; service_status: string; drone_id?: number
  }[]>({
    queryKey: ['operator-drones-jobs'],
    queryFn: () =>
      operatorApi.getTodayJobs().then((jobs: { booking_id: number; service_status: string }[]) => jobs),
    refetchInterval: 15_000,
    select: useCallback((jobs: { booking_id: number; service_status: string }[]) => jobs, []),
  })

  // Build active booking map by fetching operations for in-progress bookings
  useEffect(() => {
    const inProgressJobs = (todayJobs as { booking_id: number; service_status: string }[])
      .filter((j) => j.service_status === 'In_Progress')

    if (inProgressJobs.length === 0) {
      setActiveBookings({})
      return
    }

    // Fetch operations for each in-progress booking to get the drone_id
    Promise.all(
      inProgressJobs.map((j) =>
        operatorApi.getBookingOperations(j.booking_id).then(
          (result: any) => ({ bookingId: j.booking_id, droneId: result?.drone_id })
        )
      )
    ).then((results) => {
      const map: Record<number, number> = {}
      for (const r of results) {
        if (r.droneId) map[r.droneId] = r.bookingId
      }
      setActiveBookings(map)
    }).catch(() => {})
  }, [todayJobs])

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 size={24} className="animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Drone Control</h1>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Radio size={14} />
          Station #{stationId ?? '—'}
          {drones.length > 0 && (
            <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
              {drones.length} drone{drones.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {!stationId ? (
        <div className="card text-center py-12">
          <AlertTriangle size={28} className="mx-auto text-yellow-400 mb-3" />
          <p className="font-medium text-gray-700">No station assigned</p>
          <p className="text-sm text-gray-400 mt-1">Ask an admin to assign you to a base station</p>
        </div>
      ) : drones.length === 0 ? (
        <div className="card text-center py-12">
          <Cpu size={28} className="mx-auto text-gray-300 mb-3" />
          <p className="font-medium text-gray-500">No drones at your station</p>
          <p className="text-sm text-gray-400 mt-1">Drones appear here when assigned to your station by admin</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {drones.map((drone) => (
            <DroneCard
              key={drone.drone_id}
              drone={drone}
              telemetry={telemetry[drone.drone_id] ?? null}
              activeBookingId={activeBookings[drone.drone_id] ?? null}
            />
          ))}
        </div>
      )}

      {/* Legend */}
      {drones.length > 0 && (
        <p className="text-xs text-gray-400 text-center">
          Telemetry updates every ~100 ms via Socket.IO · RTL/Land/Abort only visible during active missions
        </p>
      )}
    </div>
  )
}
