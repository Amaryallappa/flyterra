import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { bookingsApi, BookingListItem } from '@/api/bookings'
import { format } from 'date-fns'
import { Calendar, CalendarPlus, ChevronRight, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { apiErrorMsg } from '@/api/client'

const STATUS_TABS = ['All', 'Pending', 'Confirmed', 'In_Progress', 'Completed', 'Cancelled']

function statusBadge(status: string) {
  const map: Record<string, string> = {
    Pending: 'badge-yellow', Confirmed: 'badge-blue', In_Progress: 'badge-green',
    Completed: 'badge-green', Cancelled: 'badge-gray',
  }
  return <span className={map[status] ?? 'badge-gray'}>{status.replace('_', ' ')}</span>
}

export default function BookingsPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState('All')

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['bookings'],
    queryFn: () => bookingsApi.list(),
  })

  const cancel = useMutation({
    mutationFn: (id: number) => bookingsApi.cancel(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bookings'] }); toast.success('Booking cancelled') },
    onError: (err: unknown) => toast.error(apiErrorMsg(err, 'Could not cancel')),
  })

  const filtered = tab === 'All'
    ? bookings
    : bookings.filter((b: BookingListItem) => b.service_status === tab)

  if (isLoading) return (
    <div className="flex items-center justify-center h-48">
      <div className="animate-spin h-8 w-8 border-4 border-brand-500 border-t-transparent rounded-full" />
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">My Bookings</h1>
        <Link to="/farmer/book" className="btn-primary flex items-center gap-2">
          <CalendarPlus size={16} /> New Booking
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {STATUS_TABS.map((s) => (
          <button key={s} onClick={() => setTab(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              tab === s ? 'bg-brand-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-brand-300'
            }`}>
            {s.replace('_', ' ')}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card text-center py-20">
          <CalendarPlus size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No {tab !== 'All' ? tab.replace('_', ' ').toLowerCase() : ''} bookings</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((b: BookingListItem) => (
            <div key={b.booking_id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900">Booking #{b.booking_id}</span>
                    {statusBadge(b.service_status)}
                  </div>
                  <div className="mt-2 space-y-1">
                    <p className="text-[10px] uppercase tracking-wider font-bold text-brand-500/60">Scheduled</p>
                    <div className="flex items-center gap-1.5 text-xs text-gray-700">
                      <Calendar size={13} className="text-gray-400" />
                      <span>{format(new Date(b.scheduled_start), 'd MMM yyyy, hh:mm a').toLowerCase()}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-400 ml-5">
                      <span>→ {format(new Date(b.scheduled_end), 'd MMM yyyy, hh:mm a').toLowerCase()}</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500">
                    {b.field_count} field{b.field_count !== 1 ? 's' : ''} · {b.total_acres.toFixed(2)} acres
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-gray-900">₹{b.total_cost.toFixed(0)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{b.total_acres.toFixed(2)} acres</p>
                </div>
              </div>

              <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-50">
                {['Pending', 'Confirmed'].includes(b.service_status) && (
                  <button
                    onClick={() => {
                      if (confirm('Cancel this booking?')) cancel.mutate(b.booking_id)
                    }}
                    className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700">
                    <XCircle size={14} /> Cancel
                  </button>
                )}
                <div className="flex-1" />
                <Link to={`/farmer/bookings/${b.booking_id}`}
                  className="flex items-center gap-1 text-xs text-brand-600 font-medium hover:underline">
                  View Details <ChevronRight size={14} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
