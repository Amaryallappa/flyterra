import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { operatorApi } from '@/api/operator'
import { useSocket } from '@/hooks/useSocket'
import { format } from 'date-fns'
import {
  CalendarDays, Loader2, Rocket, ChevronDown, ChevronRight,
  CheckCircle2, XCircle, Clock, Plane, Droplets, RefreshCw,
  Warehouse, Flag, AlertCircle, RotateCcw,
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

const PHASE_CFG: Record<string, { label: string; color: string; bg: string; Icon: React.FC<{size?:number}> }> = {
  Idle:          { label: 'Idle',           color: '#94a3b8', bg: '#f8fafc', Icon: Clock       },
  Base_To_Field: { label: 'To Field',       color: '#3b82f6', bg: '#eff6ff', Icon: Plane       },
  Spraying:      { label: 'Spraying',       color: '#22c55e', bg: '#f0fdf4', Icon: Droplets    },
  Field_To_Base: { label: 'Returning',      color: '#f97316', bg: '#fff7ed', Icon: RotateCcw   },
  Refilling:     { label: 'Refilling',      color: '#eab308', bg: '#fefce8', Icon: RefreshCw   },
  Complete:      { label: 'Complete',       color: '#22c55e', bg: '#f0fdf4', Icon: CheckCircle2 },
}

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  Pending:       { label: 'Pending',        cls: 'badge-gray'   },
  Queued:        { label: 'Queued',         cls: 'badge-blue'   },
  In_Progress:   { label: 'In Progress',   cls: 'badge-green'  },
  Paused_Refill: { label: 'Paused Refill', cls: 'badge-yellow' },
  Completed:     { label: 'Completed',     cls: 'badge-green'  },
  Failed:        { label: 'Failed',        cls: 'badge-red'    },
}

const BOOKING_STATUS_CFG: Record<string, string> = {
  Pending:     'badge-gray',
  Confirmed:   'badge-blue',
  In_Progress: 'badge-green',
  On_Hold:     'badge-yellow',
  Completed:   'badge-green',
  Cancelled:   'badge-red',
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
        {/* Order badge + field name */}
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

        {/* Status + Phase */}
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

      {/* Progress bar (only when active or done) */}
      {(isActive || isComplete) && op.spray_progress_percent > 0 && (
        <div className="mt-3">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Spray progress</span>
            <span>{op.spray_progress_percent.toFixed(0)}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${op.spray_progress_percent}%`,
                background: isComplete ? '#22c55e' : '#3b82f6',
              }}
            />
          </div>
        </div>
      )}

      {/* Refill indicator */}
      {op.refill_cycle > 0 && (
        <div className="mt-2 flex items-center gap-1 text-xs text-amber-600">
          <RefreshCw size={10} />
          {op.refill_cycle} refill{op.refill_cycle > 1 ? 's' : ''}
        </div>
      )}

      {/* Timestamps */}
      {(op.started_at || op.completed_at) && (
        <div className="mt-2 flex gap-4 text-xs text-gray-400">
          {op.started_at && <span>Started: {format(new Date(op.started_at), 'HH:mm:ss')}</span>}
          {op.completed_at && <span>Done: {format(new Date(op.completed_at), 'HH:mm:ss')}</span>}
        </div>
      )}

      {op.notes && (
        <p className="mt-2 text-xs text-gray-400 italic">{op.notes}</p>
      )}
    </div>
  )
}

// ── Operations panel (lazy-loaded per booking) ─────────────────────────────────

function OperationsPanel({
  bookingId,
  onCompleted,
}: {
  bookingId: number
  onCompleted: () => void
}) {
  const qc = useQueryClient()
  const { on } = useSocket()

  const { data, isLoading, refetch } = useQuery<BookingOperations>({
    queryKey: ['ops', bookingId],
    queryFn: () => operatorApi.getBookingOperations(bookingId),
    refetchInterval: 10_000,
  })

  // Refresh when socket fires an operation_update for this booking
  useEffect(() => {
    const off = on('operation_update', (payload: unknown) => {
      const p = payload as { booking_id?: number }
      if (p?.booking_id === bookingId) {
        refetch()
      }
    })
    return off
  }, [on, bookingId, refetch])

  const complete = useMutation({
    mutationFn: () => operatorApi.completeBooking(bookingId),
    onSuccess: () => {
      toast.success('Booking marked as Completed')
      qc.invalidateQueries({ queryKey: ['op-today'] })
      qc.invalidateQueries({ queryKey: ['ops', bookingId] })
      onCompleted()
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })
        ?.response?.data?.detail ?? 'Failed to complete'
      toast.error(msg)
    },
  })

  if (isLoading) return (
    <div className="flex justify-center py-6">
      <Loader2 size={18} className="animate-spin text-blue-500" />
    </div>
  )
  if (!data) return null

  const inProgress = data.operations.filter((o) => o.status === 'In_Progress').length
  const completed  = data.operations.filter((o) => o.status === 'Completed').length
  const failed     = data.operations.filter((o) => o.status === 'Failed').length

  return (
    <div className="space-y-3 pt-1">
      {/* Summary bar */}
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

      {/* Operation rows */}
      <div className="space-y-2">
        {data.operations.map((op) => (
          <OperationRow key={op.operation_id} op={op} />
        ))}
      </div>

      {/* Close-out button */}
      {data.all_done && data.service_status === 'In_Progress' && (
        <button
          onClick={() => complete.mutate()}
          disabled={complete.isPending}
          className="w-full btn-primary flex items-center justify-center gap-2 mt-2"
        >
          {complete.isPending
            ? <Loader2 size={15} className="animate-spin" />
            : <Flag size={15} />}
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

  const isConfirmed   = booking.service_status === 'Confirmed'
  const isInProgress  = booking.service_status === 'In_Progress'
  const isTerminal    = ['Completed', 'Cancelled', 'On_Hold'].includes(booking.service_status)

  const launch = useMutation({
    mutationFn: () => operatorApi.launchBooking(booking.booking_id),
    onSuccess: () => {
      toast.success(`Booking #${booking.booking_id} launched!`)
      qc.invalidateQueries({ queryKey: ['op-today'] })
      qc.invalidateQueries({ queryKey: ['op-upcoming'] })
      setExpanded(true)
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })
        ?.response?.data?.detail ?? 'Launch failed'
      toast.error(msg)
    },
  })

  const statusCls = BOOKING_STATUS_CFG[booking.service_status] ?? 'badge-gray'

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-gray-900">Booking #{booking.booking_id}</span>
            <span className={statusCls}>{booking.service_status.replace('_', ' ')}</span>
            {isInProgress && (
              <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                Live
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

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
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

// ── Main page ──────────────────────────────────────────────────────────────────

export default function OperatorJobsPage() {
  const [tab, setTab] = useState<'today' | 'upcoming'>('today')

  const { data: today    = [], isLoading: lT, refetch: refetchToday } =
    useQuery<BookingListItem[]>({ queryKey: ['op-today'],    queryFn: operatorApi.getTodayJobs,    refetchInterval: 30_000 })
  const { data: upcoming = [], isLoading: lU } =
    useQuery<BookingListItem[]>({ queryKey: ['op-upcoming'], queryFn: operatorApi.getUpcomingJobs, refetchInterval: 60_000 })

  const { on } = useSocket()

  // Refresh today's list when any booking event fires
  useEffect(() => {
    const off = on('operation_update', () => refetchToday())
    return off
  }, [on, refetchToday])

  const active = today.filter((b) => b.service_status === 'In_Progress')
  const todayList = today.filter((b) => b.service_status !== 'Completed' && b.service_status !== 'Cancelled')

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
        {([
          { key: 'today',    label: 'Today',        count: todayList.length },
          { key: 'upcoming', label: 'Next 7 Days',  count: upcoming.length  },
        ] as const).map(({ key, label, count }) => (
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
          {lT ? (
            <div className="flex justify-center py-10">
              <Loader2 size={22} className="animate-spin text-blue-500" />
            </div>
          ) : todayList.length === 0 ? (
            <div className="card text-center py-12">
              <CalendarDays size={28} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-400 font-medium">No active jobs today</p>
              <p className="text-gray-300 text-sm mt-1">Confirmed bookings will appear here to launch</p>
            </div>
          ) : (
            todayList.map((b) => <BookingCard key={b.booking_id} booking={b} />)
          )}
        </section>
      )}

      {/* Upcoming */}
      {tab === 'upcoming' && (
        <section className="space-y-3">
          {lU ? (
            <div className="flex justify-center py-10">
              <Loader2 size={22} className="animate-spin text-blue-500" />
            </div>
          ) : upcoming.length === 0 ? (
            <div className="card text-center py-12">
              <CalendarDays size={28} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-400 font-medium">No upcoming jobs</p>
            </div>
          ) : (
            upcoming.map((b) => <BookingCard key={b.booking_id} booking={b} />)
          )}
        </section>
      )}
    </div>
  )
}
