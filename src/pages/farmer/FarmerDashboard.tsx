import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { fieldsApi } from '@/api/fields'
import { bookingsApi, type BookingListItem } from '@/api/bookings'
import { Map, CalendarPlus, Clock, CheckCircle2, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'

function statusBadge(status: string) {
  const map: Record<string, string> = {
    Pending: 'badge-yellow', Confirmed: 'badge-blue', In_Progress: 'badge-green',
    Completed: 'badge-green', Cancelled: 'badge-red',
  }
  return <span className={map[status] ?? 'badge-gray'}>{status.replace('_', ' ')}</span>
}

export default function FarmerDashboard() {
  const { data: fields = [] }   = useQuery({ queryKey: ['fields'],   queryFn: fieldsApi.list })
  const { data: bookings = [] } = useQuery({ queryKey: ['bookings'], queryFn: () => bookingsApi.list() })

  const verifiedFields  = fields.filter((f) => f.is_verified).length
  const activeBookings  = bookings.filter((b) => ['Confirmed', 'In_Progress'].includes(b.service_status))
  const recentBookings  = [...bookings].sort((a, b) => b.booking_id - a.booking_id).slice(0, 5)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Overview of your fields and upcoming sprays.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'My Fields',        value: fields.length,         icon: Map,          color: 'bg-blue-50 text-blue-600' },
          { label: 'Verified Fields',  value: verifiedFields,        icon: CheckCircle2, color: 'bg-green-50 text-green-600' },
          { label: 'Active Bookings',  value: activeBookings.length, icon: Clock,        color: 'bg-yellow-50 text-yellow-600' },
          { label: 'Total Bookings',   value: bookings.length,       icon: CalendarPlus, color: 'bg-purple-50 text-purple-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color} mb-3`}>
              <Icon size={20} />
            </div>
            <div className="text-2xl font-bold text-gray-900">{value}</div>
            <div className="text-sm text-gray-500 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid md:grid-cols-2 gap-4">
        <Link to="/farmer/fields/new"
          className="card hover:shadow-md transition-shadow border-dashed border-2 border-brand-200 hover:border-brand-400 flex items-center gap-4 cursor-pointer">
          <div className="w-12 h-12 bg-brand-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <Map size={22} className="text-brand-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">Add New Field</p>
            <p className="text-sm text-gray-500">Draw field boundary on map</p>
          </div>
          <ChevronRight size={18} className="text-gray-400 ml-auto" />
        </Link>

        <Link to="/farmer/book"
          className="card hover:shadow-md transition-shadow bg-brand-600 text-white flex items-center gap-4 cursor-pointer">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <CalendarPlus size={22} className="text-white" />
          </div>
          <div>
            <p className="font-semibold">Book a Spray</p>
            <p className="text-sm text-brand-200">Pick date, time & chemicals</p>
          </div>
          <ChevronRight size={18} className="text-white/70 ml-auto" />
        </Link>
      </div>

      {/* Active sprays */}
      {activeBookings.length > 0 && (
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Active Sprays</h2>
          <div className="space-y-3">
            {activeBookings.map((b: BookingListItem) => {
              const fieldNames = b.booking_fields
                ?.map((bf) => bf.fields?.field_name)
                .filter(Boolean)
                .join(', ') ?? ''
              return (
                <Link key={b.booking_id} to={`/farmer/bookings/${b.booking_id}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-green-50 hover:bg-green-100 transition-colors">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">
                      Booking #{b.booking_id} — {format(new Date(b.scheduled_start), 'MMM d, yyyy')}
                    </p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(b.scheduled_start), 'HH:mm')}
                      {fieldNames ? ` · ${fieldNames}` : ''}
                    </p>
                  </div>
                  {statusBadge(b.service_status)}
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Recent bookings */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Recent Bookings</h2>
          <Link to="/farmer/bookings" className="text-sm text-brand-600 hover:underline">View all</Link>
        </div>

        {recentBookings.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <CalendarPlus size={40} className="mx-auto mb-3 opacity-40" />
            <p>No bookings yet</p>
            <Link to="/farmer/book" className="btn-primary text-sm mt-4 inline-block">Book Your First Spray</Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-gray-100">
                  <th className="pb-2 font-medium text-gray-500">Date</th>
                  <th className="pb-2 font-medium text-gray-500">Fields</th>
                  <th className="pb-2 font-medium text-gray-500">Cost</th>
                  <th className="pb-2 font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentBookings.map((b: BookingListItem) => {
                  const fieldNames = b.booking_fields
                    ?.map((bf) => bf.fields?.field_name)
                    .filter(Boolean)
                    .join(', ') ?? '—'
                  return (
                    <tr key={b.booking_id} className="hover:bg-gray-50">
                      <td className="py-3 text-gray-900">
                        {format(new Date(b.scheduled_start), 'MMM d')}
                      </td>
                      <td className="py-3 text-gray-600 truncate max-w-[140px]">{fieldNames}</td>
                      <td className="py-3 font-medium">₹{Number(b.total_cost).toFixed(0)}</td>
                      <td className="py-3">{statusBadge(b.service_status)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
