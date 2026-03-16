import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '@/api/admin'
import { Loader2, PauseCircle, XCircle, PlayCircle, X, CalendarDays, Filter, Calendar, ExternalLink, Info, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { apiErrorMsg } from '@/api/client'
import { format } from 'date-fns'

interface Booking {
  booking_id: number
  service_status: string
  scheduled_start: string
  scheduled_end: string
  total_cost: number
  notes: string | null
  created_at: string
  farmers: { full_name: string; mobile_number: string } | null
  drones: { drone_serial_no: string } | null
  base_stations: { station_id: number; station_serial_no: string } | null
  booking_fields: Array<{
    spray_order: number
    fields: { field_id: number; field_name: string; area_acres: number }
  }>
  job_configurations?: any[]
}

const STATUS_COLORS: Record<string, string> = {
  Pending:     'badge-yellow',
  Confirmed:   'badge-blue',
  In_Progress: 'badge-green',
  On_Hold:     'badge-orange',
  Completed:   'badge-green',
  Cancelled:   'badge-red',
}

const ALL_STATUSES = ['Pending', 'Confirmed', 'In_Progress', 'On_Hold', 'Completed', 'Cancelled']

function fmt(iso: string) {
  try {
    return format(new Date(iso), 'd MMM yyyy, hh:mm a').toLowerCase()
  } catch {
    return '—'
  }
}

function ActionModal({
  title, label, onConfirm, onClose, withReason,
}: {
  title: string; label: string; onConfirm: (reason: string) => void
  onClose: () => void; withReason?: boolean
}) {
  const [reason, setReason] = useState('')
  return (
    <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="font-bold text-gray-900">{title}</h2>
          <button onClick={onClose}><X size={18} className="text-gray-400 hover:text-gray-600" /></button>
        </div>
        {withReason && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason (optional)</label>
            <textarea
              className="input w-full h-24 resize-none text-sm"
              placeholder="Enter reason for farmer notification…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        )}
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="btn-secondary text-sm">Cancel</button>
          <button onClick={() => onConfirm(reason)} className="btn-primary text-sm">{label}</button>
        </div>
      </div>
    </div>
  )
}

function BookingDetailsDrawer({ booking, onClose }: { booking: Booking; onClose: () => void }) {
  const bf = booking.booking_fields || []
  const config = booking.job_configurations?.[0]
  const rzp = booking.notes ? (() => { 
    try { 
      const n = JSON.parse(booking.notes); 
      return n?.razorpay_order_id ? n : null 
    } catch { return null } 
  })() : null

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-[60] flex flex-col animate-in slide-in-from-right duration-300">
      <div className="p-4 border-b flex justify-between items-center bg-gray-50">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Booking Details</h2>
          <p className="text-xs text-gray-500 font-mono">ID: #{booking.booking_id}</p>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
          <X size={20} className="text-gray-500" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* Status & Timing */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <span className={`badge ${STATUS_COLORS[booking.service_status] ?? 'badge-yellow'}`}>
              {booking.service_status.replace('_', ' ')}
            </span>
            <p className="text-xs text-gray-400">Created: {fmt(booking.created_at)}</p>
          </div>

          <div className="bg-brand-50 rounded-xl p-4 border border-brand-100">
            <p className="text-[10px] uppercase tracking-wider font-bold text-brand-600 mb-2">Schedule</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                <Calendar size={14} className="text-brand-500" />
                <span>{fmt(booking.scheduled_start)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500 ml-6">
                <span>→ {fmt(booking.scheduled_end)}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Farmer & Station */}
        <section className="grid grid-cols-2 gap-4">
          <div className="card bg-gray-50 border-0 p-4">
            <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-2">Farmer</p>
            <p className="font-semibold text-gray-900">{booking.farmers?.full_name ?? '—'}</p>
            <p className="text-xs text-gray-500">{booking.farmers?.mobile_number ?? '—'}</p>
          </div>
          <div className="card bg-gray-50 border-0 p-4 relative group">
            <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-2">Base Station</p>
            <p className="font-semibold text-gray-900">{booking.base_stations?.station_serial_no ?? '—'}</p>
            {booking.base_stations?.station_id && (
              <Link 
                to="/admin/stations"
                className="absolute top-4 right-4 text-brand-500 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink size={14} />
              </Link>
            )}
          </div>
        </section>

        {/* Fields */}
        <section>
          <div className="flex justify-between items-end mb-3">
            <h3 className="text-sm font-bold text-gray-900">Fields</h3>
            <span className="text-xs text-brand-600 font-medium">{bf.length} Total</span>
          </div>
          <div className="space-y-2">
            {bf.map((f: any, i: number) => (
              <div key={i} className="flex justify-between items-center p-3 border rounded-lg hover:border-brand-200 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded bg-brand-50 text-brand-600 flex items-center justify-center text-[10px] font-bold">
                    {f.spray_order}
                  </span>
                  <p className="text-sm font-medium text-gray-700">{f.fields?.field_name}</p>
                </div>
                <p className="text-sm text-gray-500">{f.fields?.area_acres} ac</p>
              </div>
            ))}
          </div>
        </section>

        {/* Cartridges */}
        {config && (
          <section>
            <h3 className="text-sm font-bold text-gray-900 mb-3">Cartridge Configurations</h3>
            <div className="grid grid-cols-1 gap-2">
              {[1,2,3,4,5].map(n => {
                const val = (config as any)[`cartridge_${n}_ml_per_acre`]
                if (!val) return null
                return (
                  <div key={n} className="flex justify-between text-sm py-2 border-b border-gray-50">
                    <span className="text-gray-500">Cartridge {n}</span>
                    <span className="font-medium">{val} ml/acre</span>
                  </div>
                )
              }).filter(Boolean)}
            </div>
          </section>
        )}

        {/* Payment */}
        <section className="bg-blue-50/50 rounded-xl p-4 border border-blue-100">
          <h3 className="text-sm font-bold text-blue-900 mb-3">Payment & Transaction</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-blue-600/70 text-xs">Total Amount</span>
              <span className="font-bold text-blue-900">₹{booking.total_cost.toFixed(2)}</span>
            </div>
            {rzp && (
              <div className="flex justify-between">
                <span className="text-blue-600/70 text-xs">Razorpay Order</span>
                <span className="font-mono text-[10px] text-blue-800">{rzp.razorpay_order_id}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-2 border-t border-blue-100/50">
               <span className="text-blue-600/70 text-xs">Payment Method</span>
               <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Digital</span>
            </div>
          </div>
        </section>
      </div>

      <div className="p-6 border-t bg-gray-50">
         <div className="flex gap-3">
            {booking.base_stations?.station_id && (
              <Link 
                to="/admin/stations"
                className="flex-1 btn-primary text-xs py-3 flex items-center justify-center gap-2"
              >
                Go to Station <ChevronRight size={14} />
              </Link>
            )}
         </div>
      </div>
    </div>
  )
}

export default function AdminBookingsPage() {
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('')
  const [fromDate, setFromDate]   = useState('')
  const [toDate, setToDate]       = useState('')
  const [modal, setModal] = useState<{ type: 'cancel' | 'hold'; booking: Booking } | null>(null)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)

  const { data: bookings = [] as Booking[], isLoading } = useQuery<Booking[]>({
    queryKey: ['admin-bookings', statusFilter, fromDate, toDate],
    queryFn: () => adminApi.listBookings({
      ...(statusFilter && { service_status: statusFilter }),
      ...(fromDate && { from_date: fromDate }),
      ...(toDate   && { to_date: toDate }),
    }) as Promise<Booking[]>,
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin-bookings'] })

  const cancel = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      adminApi.cancelBooking(id, reason),
    onSuccess: () => { invalidate(); setModal(null); toast.success('Booking cancelled') },
    onError: (e: unknown) => toast.error(apiErrorMsg(e, 'Cancel failed')),
  })

  const hold = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      adminApi.holdBooking(id, reason),
    onSuccess: () => { invalidate(); setModal(null); toast.success('Booking placed On Hold') },
    onError: (e: unknown) => toast.error(apiErrorMsg(e, 'Hold failed')),
  })

  const release = useMutation({
    mutationFn: (id: number) => adminApi.releaseBooking(id),
    onSuccess: () => { invalidate(); toast.success('Booking released') },
    onError: (e: unknown) => toast.error(apiErrorMsg(e, 'Release failed')),
  })

  const canAct = (s: string) => !['Completed', 'Cancelled'].includes(s)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
          <p className="text-sm text-gray-500">View, hold, or cancel farmer bookings.</p>
        </div>
        <span className="text-sm text-gray-500">{bookings.length} bookings</span>
      </div>

      {/* Filters */}
      <div className="card flex flex-wrap gap-3 items-end">
        <Filter size={15} className="text-gray-400 self-center" />
        <div>
          <label className="block text-xs text-gray-500 mb-1">Status</label>
          <select
            className="input text-sm py-1.5"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All statuses</option>
            {ALL_STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">From date</label>
          <input type="date" className="input text-sm py-1.5" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">To date</label>
          <input type="date" className="input text-sm py-1.5" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>
        {(statusFilter || fromDate || toDate) && (
          <button
            onClick={() => { setStatusFilter(''); setFromDate(''); setToDate('') }}
            className="text-xs text-gray-500 hover:text-red-500 self-end pb-1.5"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={24} className="animate-spin text-blue-500" />
        </div>
      ) : bookings.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">No bookings found</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm bg-white rounded-xl border border-gray-100 overflow-hidden">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                {['ID', 'Farmer', 'Station', 'Scheduled', 'Fields', 'Cost', 'Status', 'Notes', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {bookings.map((b: Booking) => (
                <tr 
                  key={b.booking_id} 
                  className="hover:bg-brand-50/30 cursor-pointer group transition-colors"
                  onClick={() => setSelectedBooking(b)}
                >
                  <td className="px-4 py-3 font-mono text-gray-500">#{b.booking_id}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{b.farmers?.full_name ?? '—'}</p>
                    <p className="text-xs text-gray-400">{b.farmers?.mobile_number ?? ''}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                       <span className="text-gray-900 font-medium">{b.base_stations?.station_serial_no ?? '—'}</span>
                       <Info size={12} className="text-brand-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-xs text-gray-700">
                      <CalendarDays size={11} className="text-gray-400" />
                      <span>{fmt(b.scheduled_start)}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 ml-4">→ {fmt(b.scheduled_end)}</p>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-700 font-medium">
                    {b.booking_fields?.length ?? 0}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">₹{b.total_cost.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${STATUS_COLORS[b.service_status] ?? 'badge-yellow'}`}>
                      {b.service_status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 max-w-[160px]">
                    {b.notes && (
                       <p className="text-xs text-gray-400 truncate" title={b.notes}>{b.notes}</p>
                    )}
                  </td>
                  <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                    {canAct(b.service_status) && (
                      <div className="flex gap-1.5 items-center">
                        {b.service_status === 'On_Hold' ? (
                          <button
                            onClick={() => release.mutate(b.booking_id)}
                            disabled={release.isPending}
                            className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded bg-green-50 text-green-700 hover:bg-green-100"
                          >
                            <PlayCircle size={12} /> Release
                          </button>
                        ) : (
                          <button
                            onClick={() => setModal({ type: 'hold', booking: b })}
                            className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded bg-yellow-50 text-yellow-700 hover:bg-yellow-100"
                          >
                            <PauseCircle size={12} /> Hold
                          </button>
                        )}
                        <button
                          onClick={() => setModal({ type: 'cancel', booking: b })}
                          className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100"
                        >
                          <XCircle size={12} /> Cancel
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal?.type === 'cancel' && (
        <ActionModal
          title={`Cancel Booking #${modal.booking.booking_id}`}
          label="Yes, Cancel"
          withReason
          onClose={() => setModal(null)}
          onConfirm={(reason) => cancel.mutate({ id: modal.booking.booking_id, reason })}
        />
      )}
      {modal?.type === 'hold' && (
        <ActionModal
          title={`Place Booking #${modal.booking.booking_id} On Hold`}
          label="Place On Hold"
          withReason
          onClose={() => setModal(null)}
          onConfirm={(reason) => hold.mutate({ id: modal.booking.booking_id, reason })}
        />
      )}

      {selectedBooking && (
        <>
          <div 
            className="fixed inset-0 bg-black/20 z-[55] backdrop-blur-[1px]" 
            onClick={() => setSelectedBooking(null)} 
          />
          <BookingDetailsDrawer 
            booking={selectedBooking} 
            onClose={() => setSelectedBooking(null)} 
          />
        </>
      )}
    </div>
  )
}
