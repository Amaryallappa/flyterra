import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { operatorApi } from '@/api/operator'
import { useSocket } from '@/hooks/useSocket'
import { format } from 'date-fns'
import {
  CalendarDays, Loader2, Rocket, ChevronDown, ChevronRight,
  CheckCircle2, XCircle, Clock, Plane, Droplets, RefreshCw,
  Warehouse, Flag, RotateCcw, Monitor, CheckCheck, PauseCircle, PlayCircle,
  type LucideIcon,
} from 'lucide-react'
import toast from 'react-hot-toast'

// ── Types ──────────────────────────────────────────────────────────────────────

interface BookingListItem {
  booking_id: number
  service_status: string
  scheduled_start: string
  scheduled_end: string
  total_cost: number
  total_acres: number
  field_count: number
  created_at: string
  drone_id: number | null
  drone_serial_no: string | null
  drone_companion_url: string | null
  station_id: number | null
  station_serial_no: string | null
  station_status: string | null
}

interface OperationItem {
  operation_id: number
  field_id: number
  field_name: string
  area_acres: number
  spray_order: number
  status: string
  current_phase: string
  spray_progress_percent: number
  refill_cycle: number
  started_at: string | null
  completed_at: string | null
  updated_at: string
  notes: string | null
}

interface BookingOperations {
  booking_id: number
  service_status: string
  actual_start: string | null
  actual_end: string | null
  operations: OperationItem[]
  all_done: boolean
}

// ── Phase config ───────────────────────────────────────────────────────────────

const PHASE_CFG: Record<string, { label: string; color: string; bg: string; Icon: LucideIcon }> = {
  Idle:          { label: 'Idle',      color: '#94a3b8', bg: '#f8fafc', Icon: Clock       },
  Base_To_Field: { label: 'To Field',  color: '#3b82f6', bg: '#eff6ff', Icon: Plane       },
  Spraying:      { label: 'Spraying',  color: '#22c55e', bg: '#f0fdf4', Icon: Droplets    },
  Field_To_Base: { label: 'Returning', color: '#f97316', bg: '#fff7ed', Icon: RotateCcw   },
  Refilling:     { label: 'Refilling', color: '#eab308', bg: '#fefce8', Icon: RefreshCw   },
  Complete:      { label: 'Complete',  color: '#22c55e', bg: '#f0fdf4', Icon: CheckCircle2 },
}

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  Pending:       { label: 'Pending',       cls: 'badge-gray'   },
  Queued:        { label: 'Queued',        cls: 'badge-blue'   },
  In_Progress:   { label: 'In Progress',  cls: 'badge-green'  },
  Paused_Refill: { label: 'Paused Refill',cls: 'badge-yellow' },
  Completed:     { label: 'Completed',    cls: 'badge-green'  },
  Failed:        { label: 'Failed',       cls: 'badge-red'    },
}

const BOOKING_STATUS_CFG: Record<string, string> = {
  Pending:     'badge-gray',
  Confirmed:   'badge-blue',
  In_Progress: 'badge-green',
  On_Hold:     'badge-yellow',
  Completed:   'badge-green',
  Cancelled:   'badge-red',
}

// ── Station popover ────────────────────────────────────────────────────────────

function StationPopover({ booking }: { booking: BookingListItem }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  if (!booking.station_serial_no) return null

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg
                   bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100"
        title="Station details"
      >
        <Warehouse size={12} />
        {booking.station_serial_no}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-30 w-52 bg-white rounded-xl
                        shadow-xl border border-gray-100 p-3 text-xs">
          <p className="font-semibold text-gray-500 uppercase tracking-wide text-[10px] mb-2">
            Station Info
          </p>
          <dl className="space-y-1.5">
            <div className="flex justify-between">
              <dt className="text-gray-400">Serial No</dt>
              <dd className="font-mono font-semibold text-gray-700">{booking.station_serial_no}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-400">Status</dt>
              <dd>{booking.station_status ?? '—'}</dd>
            </div>
            {booking.drone_serial_no && (
              <div className="flex justify-between">
                <dt className="text-gray-400">Drone</dt>
                <dd className="font-mono font-semibold text-gray-700">{booking.drone_serial_no}</dd>
              </div>
            )}
            {!booking.drone_serial_no && (
              <div className="flex justify-between">
                <dt className="text-gray-400">Drone</dt>
                <dd className="text-gray-300">Unassigned</dd>
              </div>
            )}
          </dl>
        </div>
      )}
    </div>
  )
}

// ── Operation row ──────────────────────────────────────────────────────────────

function OperationRow({ op }: { op: OperationItem }) {
  const phase  = PHASE_CFG[op.current_phase] ?? PHASE_CFG.Idle
  const status = STATUS_CFG[op.status]       ?? { label: op.status, cls: 'badge-gray' }
  const PhaseIcon = phase.Icon

  const isActive   = op.status === 'In_Progress'
  const isComplete = op.status === 'Completed'
  const isFailed   = op.status === 'Failed'

  return (
    <div className={`rounded-xl border p-4 transition-colors ${
      isActive   ? 'border-green-200 bg-green-50' :
      isComplete ? 'border-gray-100 bg-gray-50'   :
      isFailed   ? 'border-red-100 bg-red-50'     :
                   'border-gray-100 bg-white'
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
            isActive ? 'bg-green-500 text-white' : isComplete ? 'bg-gray-300 text-white' : 'bg-gray-100 text-gray-500'
          }`}>
            {op.spray_order}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-800 truncate">{op.field_name}</p>
            <p className="text-xs text-gray-400">{op.area_acres.toFixed(2)} ac</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {isActive && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                 style={{ background: phase.bg, color: phase.color }}>
              <PhaseIcon size={11} />
              {phase.label}
            </div>
          )}
          <span className={status.cls}>{status.label}</span>
        </div>
      </div>

      {(isActive || isComplete) && op.spray_progress_percent > 0 && (
        <div className="mt-3">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Spray progress</span>
            <span>{op.spray_progress_percent.toFixed(0)}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${op.spray_progress_percent}%`, background: isComplete ? '#22c55e' : '#3b82f6' }}
            />
          </div>
        </div>
      )}

      {op.refill_cycle > 0 && (
        <div className="mt-2 flex items-center gap-1 text-xs text-amber-600">
          <RefreshCw size={10} />
          {op.refill_cycle} refill{op.refill_cycle > 1 ? 's' : ''}
        </div>
      )}

      {(op.started_at || op.completed_at) && (
        <div className="mt-2 flex gap-4 text-xs text-gray-400">
          {op.started_at && <span>Started: {format(new Date(op.started_at), 'HH:mm:ss')}</span>}
          {op.completed_at && <span>Done: {format(new Date(op.completed_at), 'HH:mm:ss')}</span>}
        </div>
      )}

      {op.notes && <p className="mt-2 text-xs text-gray-400 italic">{op.notes}</p>}
    </div>
  )
}

// ── Operations panel ───────────────────────────────────────────────────────────

function OperationsPanel({ bookingId, onCompleted }: { bookingId: number; onCompleted: () => void }) {
  const qc = useQueryClient()
  const { on } = useSocket()

  const { data, isLoading, refetch } = useQuery<BookingOperations>({
    queryKey: ['ops', bookingId],
    queryFn: () => operatorApi.getBookingOperations(bookingId),
    refetchInterval: 10_000,
  })

  useEffect(() => {
    const off = on('operation_update', (payload: unknown) => {
      const p = payload as { booking_id?: number }
      if (p?.booking_id === bookingId) refetch()
    })
    return off
  }, [on, bookingId, refetch])

  const complete = useMutation({
    mutationFn: () => operatorApi.completeBooking(bookingId),
    onSuccess: () => {
      toast.success('Booking marked as Completed')
      qc.invalidateQueries({ queryKey: ['op-today'] })
      qc.invalidateQueries({ queryKey: ['op-upcoming'] })
      qc.invalidateQueries({ queryKey: ['op-all'] })
      qc.invalidateQueries({ queryKey: ['ops', bookingId] })
      onCompleted()
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Failed to complete'
      toast.error(msg)
    },
  })

  if (isLoading) return <div className="flex justify-center py-6"><Loader2 size={18} className="animate-spin text-blue-500" /></div>
  if (!data) return null

  const inProgress = data.operations.filter((o) => o.status === 'In_Progress').length
  const completed  = data.operations.filter((o) => o.status === 'Completed').length
  const failed     = data.operations.filter((o) => o.status === 'Failed').length

  return (
    <div className="space-y-3 pt-1">
      <div className="flex items-center gap-4 text-xs font-medium text-gray-500 px-1">
        {inProgress > 0 && (
          <span className="flex items-center gap-1 text-green-600">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            {inProgress} active
          </span>
        )}
        {completed > 0 && (
          <span className="flex items-center gap-1 text-gray-400">
            <CheckCircle2 size={11} /> {completed} done
          </span>
        )}
        {failed > 0 && (
          <span className="flex items-center gap-1 text-red-400">
            <XCircle size={11} /> {failed} failed
          </span>
        )}
        <span className="ml-auto">
          {data.actual_start && `Started ${format(new Date(data.actual_start), 'HH:mm')}`}
        </span>
      </div>

      <div className="space-y-2">
        {data.operations.map((op) => <OperationRow key={op.operation_id} op={op} />)}
      </div>

      {data.all_done && data.service_status === 'In_Progress' && (
        <button
          onClick={() => complete.mutate()}
          disabled={complete.isPending}
          className="w-full btn-primary flex items-center justify-center gap-2 mt-2"
        >
          {complete.isPending ? <Loader2 size={15} className="animate-spin" /> : <Flag size={15} />}
          Mark Booking as Completed
        </button>
      )}
    </div>
  )
}

// ── Booking card ───────────────────────────────────────────────────────────────

function BookingCard({ booking }: { booking: BookingListItem }) {
  const qc = useQueryClient()
  const [expanded, setExpanded] = useState(booking.service_status === 'In_Progress')

  const isPending    = booking.service_status === 'Pending'
  const isConfirmed  = booking.service_status === 'Confirmed'
  const isInProgress = booking.service_status === 'In_Progress'
  const isOnHold     = booking.service_status === 'On_Hold'
  const isTerminal   = ['Completed', 'Cancelled', 'On_Hold'].includes(booking.service_status)

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['op-today'] })
    qc.invalidateQueries({ queryKey: ['op-upcoming'] })
    qc.invalidateQueries({ queryKey: ['op-all'] })
  }

  const confirm_ = useMutation({
    mutationFn: () => operatorApi.confirmBooking(booking.booking_id),
    onSuccess: () => {
      toast.success(`Booking #${booking.booking_id} confirmed`)
      invalidateAll()
    },
    onError: (err: unknown) => {
      const msg = (err as { message?: string })?.message ?? 'Confirm failed'
      toast.error(msg)
    },
  })

  const releaseHold = useMutation({
    mutationFn: () => operatorApi.releaseHold(booking.booking_id),
    onSuccess: () => {
      toast.success(`Booking #${booking.booking_id} released from hold → Confirmed`)
      invalidateAll()
    },
    onError: (err: unknown) => {
      const msg = (err as { message?: string })?.message ?? 'Release failed'
      toast.error(msg)
    },
  })

  const launch = useMutation({
    mutationFn: () => operatorApi.launchBooking(booking.booking_id),
    onSuccess: () => {
      toast.success(`Booking #${booking.booking_id} launched!`)
      invalidateAll()
      setExpanded(true)
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Launch failed'
      toast.error(msg)
    },
  })

  // Build GCS URL from companion URL
  const gcsUrl = booking.drone_companion_url
    ? `/drone-gcs.html?rest=${encodeURIComponent(booking.drone_companion_url)}`
    : null

  const statusCls = BOOKING_STATUS_CFG[booking.service_status] ?? 'badge-gray'

  return (
    <div className={`card ${isOnHold ? 'border-l-4 border-l-yellow-400 bg-yellow-50/40' : ''}`}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        {/* Left: booking info */}
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-gray-900">Booking #{booking.booking_id}</span>
            <span className={statusCls}>{booking.service_status.replace(/_/g, ' ')}</span>
            {isInProgress && (
              <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                Live
              </span>
            )}
            {isOnHold && (
              <span className="inline-flex items-center gap-1 text-xs text-yellow-600 font-medium">
                <PauseCircle size={12} /> On Hold
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {format(new Date(booking.scheduled_start), 'MMM d, yyyy')}
            {' · '}
            {format(new Date(booking.scheduled_start), 'HH:mm')}
            {' – '}
            {format(new Date(booking.scheduled_end), 'HH:mm')}
          </p>
          <div className="flex gap-4 text-xs text-gray-400 mt-1">
            <span>{booking.field_count} field{booking.field_count !== 1 ? 's' : ''}</span>
            <span>{booking.total_acres.toFixed(2)} ac total</span>
            <span className="font-semibold text-gray-600">₹{booking.total_cost.toFixed(0)}</span>
          </div>
        </div>

        {/* Right: action buttons */}
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">

          {/* Station details popover */}
          <StationPopover booking={booking} />

          {/* GCS Live button */}
          {gcsUrl && (
            <button
              onClick={() => window.open(gcsUrl, '_blank')}
              className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg
                         bg-purple-50 border border-purple-200 text-purple-700 hover:bg-purple-100"
              title="Open Ground Control Station"
            >
              <Monitor size={12} /> GCS Live
            </button>
          )}

          {/* Release from hold — for On_Hold bookings */}
          {isOnHold && (
            <button
              onClick={() => releaseHold.mutate()}
              disabled={releaseHold.isPending}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg
                         bg-yellow-50 border border-yellow-300 text-yellow-700 hover:bg-yellow-100"
            >
              {releaseHold.isPending
                ? <Loader2 size={13} className="animate-spin" />
                : <PlayCircle size={13} />}
              Release Hold
            </button>
          )}

          {/* Confirm button — for Pending bookings */}
          {isPending && (
            <button
              onClick={() => confirm_.mutate()}
              disabled={confirm_.isPending}
              className="btn-primary flex items-center gap-1.5 text-sm"
            >
              {confirm_.isPending
                ? <Loader2 size={13} className="animate-spin" />
                : <CheckCheck size={13} />}
              Confirm
            </button>
          )}

          {/* Launch button — for Confirmed bookings */}
          {isConfirmed && (
            <button
              onClick={() => launch.mutate()}
              disabled={launch.isPending}
              className="btn-primary flex items-center gap-1.5 text-sm"
            >
              {launch.isPending
                ? <Loader2 size={13} className="animate-spin" />
                : <Rocket size={13} />}
              Launch
            </button>
          )}

          {/* Expand operations — In Progress or terminal */}
          {(isInProgress || isTerminal) && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="flex items-center gap-1 text-sm font-medium text-gray-500
                         hover:text-gray-800 px-2 py-1 rounded-lg hover:bg-gray-100"
            >
              {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              {isInProgress ? 'Operations' : 'Details'}
            </button>
          )}
        </div>
      </div>

      {/* Operations panel */}
      {expanded && (isInProgress || isTerminal) && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <OperationsPanel
            bookingId={booking.booking_id}
            onCompleted={() => setExpanded(false)}
          />
        </div>
      )}
    </div>
  )
}

// ── Empty state ────────────────────────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <div className="card text-center py-12">
      <CalendarDays size={28} className="mx-auto text-gray-300 mb-3" />
      <p className="text-gray-400 font-medium">{message}</p>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function OperatorJobsPage() {
  const [tab, setTab] = useState<'today' | 'upcoming' | 'all'>('today')

  const { data: today    = [], isLoading: lT, refetch: refetchToday } =
    useQuery<BookingListItem[]>({ queryKey: ['op-today'],    queryFn: operatorApi.getTodayJobs,    refetchInterval: 30_000 })
  const { data: upcoming = [], isLoading: lU } =
    useQuery<BookingListItem[]>({ queryKey: ['op-upcoming'], queryFn: operatorApi.getUpcomingJobs, refetchInterval: 60_000 })
  const { data: allJobs  = [], isLoading: lA } =
    useQuery<BookingListItem[]>({ queryKey: ['op-all'],      queryFn: operatorApi.getAllJobs,      refetchInterval: 60_000 })

  const { on } = useSocket()

  useEffect(() => {
    const off = on('operation_update', () => refetchToday())
    return off
  }, [on, refetchToday])

  const active    = today.filter((b) => b.service_status === 'In_Progress')
  const todayList = today.filter((b) =>
    ['Pending', 'Confirmed', 'In_Progress', 'On_Hold'].includes(b.service_status)
  )

  const TABS = [
    { key: 'today'    as const, label: 'Today',       count: todayList.length },
    { key: 'upcoming' as const, label: 'Next 7 Days', count: upcoming.length  },
    { key: 'all'      as const, label: 'All Bookings', count: allJobs.length   },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Jobs</h1>
        {active.length > 0 && (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium
                           text-green-700 bg-green-50 px-3 py-1.5 rounded-full">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            {active.length} active job{active.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {TABS.map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === key
                ? 'border-brand-500 text-brand-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
            {count > 0 && (
              <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
                tab === key ? 'bg-brand-100 text-brand-700' : 'bg-gray-100 text-gray-500'
              }`}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Today */}
      {tab === 'today' && (
        <section className="space-y-3">
          {lT
            ? <div className="flex justify-center py-10"><Loader2 size={22} className="animate-spin text-blue-500" /></div>
            : todayList.length === 0
            ? <EmptyState message="No active jobs today" />
            : todayList.map((b) => <BookingCard key={b.booking_id} booking={b} />)
          }
        </section>
      )}

      {/* Upcoming */}
      {tab === 'upcoming' && (
        <section className="space-y-3">
          {lU
            ? <div className="flex justify-center py-10"><Loader2 size={22} className="animate-spin text-blue-500" /></div>
            : upcoming.length === 0
            ? <EmptyState message="No upcoming jobs in the next 7 days" />
            : upcoming.map((b) => <BookingCard key={b.booking_id} booking={b} />)
          }
        </section>
      )}

      {/* All bookings */}
      {tab === 'all' && (
        <section className="space-y-3">
          {lA
            ? <div className="flex justify-center py-10"><Loader2 size={22} className="animate-spin text-blue-500" /></div>
            : allJobs.length === 0
            ? <EmptyState message="No bookings found" />
            : allJobs.map((b) => <BookingCard key={b.booking_id} booking={b} />)
          }
        </section>
      )}
    </div>
  )
}
