import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { bookingsApi, BookingDetail } from '@/api/bookings'
import { useEffect, useState } from 'react'
import { useSocket } from '@/hooks/useSocket'
import { format } from 'date-fns'
import { ArrowLeft, Loader2, MapPin, Activity, Calendar } from 'lucide-react'
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
import L from 'leaflet'

interface TelemetryPoint {
  lat: number; lng: number; altitude: number
  speed: number; battery_percent: number; phase: string
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    Pending: 'badge-yellow', Confirmed: 'badge-blue', In_Progress: 'badge-green',
    Completed: 'badge-green', Cancelled: 'badge-gray',
  }
  return <span className={`${map[status] ?? 'badge-gray'} text-sm`}>{status.replace('_', ' ')}</span>
}

const droneIcon = L.divIcon({
  className: '',
  html: `<div class="w-6 h-6 bg-brand-600 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
  </div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
})

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { on } = useSocket()
  const [telemetry, setTelemetry] = useState<TelemetryPoint | null>(null)
  const [trail, setTrail] = useState<[number, number][]>([])
  const bookingId = parseInt(id ?? '0')

  const { data: booking, isLoading } = useQuery<BookingDetail>({
    queryKey: ['booking', bookingId],
    queryFn: () => bookingsApi.get(bookingId),
    refetchInterval: (query) =>
      query.state.data?.service_status === 'In_Progress' ? 10000 : false,
  })

  useEffect(() => {
    const off = on('drone_telemetry', (data: unknown) => {
      const d = data as TelemetryPoint & { booking_id: number }
      if (d.booking_id !== bookingId) return
      setTelemetry(d)
      setTrail((t) => [...t.slice(-200), [d.lat, d.lng]])
    })
    return off
  }, [on, bookingId])

  if (isLoading) return (
    <div className="flex items-center justify-center h-48">
      <Loader2 size={24} className="animate-spin text-brand-500" />
    </div>
  )

  if (!booking) return <div className="card text-center py-20 text-gray-400">Booking not found</div>

  const isLive = booking.service_status === 'In_Progress'
  const totalAcres = booking.total_acres

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Booking #{booking.booking_id}</h1>
            {statusBadge(booking.service_status)}
            {isLive && (
              <span className="flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full font-medium">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" /> Live
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-700">
            <Calendar size={13} className="text-gray-400" />
            <span>{format(new Date(booking.scheduled_start), 'd MMM yyyy, hh:mm a').toLowerCase()}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-400 ml-5">
            <span>→ {format(new Date(booking.scheduled_end), 'd MMM yyyy, hh:mm a').toLowerCase()}</span>
          </div>
        </div>
      </div>

      {/* Live telemetry bar */}
      {isLive && telemetry && (
        <div className="bg-green-900 text-white rounded-xl p-4 grid grid-cols-4 gap-4">
          {[
            ['Phase', telemetry.phase],
            ['Altitude', `${telemetry.altitude?.toFixed(1)}m`],
            ['Speed', `${telemetry.speed?.toFixed(1)} m/s`],
            ['Battery', `${telemetry.battery_percent?.toFixed(0)}%`],
          ].map(([label, value]) => (
            <div key={label} className="text-center">
              <p className="text-green-400 text-xs">{label}</p>
              <p className="font-bold text-lg mt-0.5">{value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-6">
          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-4">Booking Details</h2>
            <div className="space-y-3 text-sm">
              {[
                ['Fields', booking.fields.map((f) => f.field_name).join(', ')],
                ['Total Area', `${totalAcres.toFixed(2)} acres`],
                ['Date', format(new Date(booking.scheduled_start), 'MMMM d, yyyy')],
                ['Time', `${format(new Date(booking.scheduled_start), 'HH:mm')} – ${format(new Date(booking.scheduled_end), 'HH:mm')}`],
                ['Amount Paid', `₹${booking.total_cost.toFixed(0)}`],
                ['Price/Acre', `₹${booking.price_per_acre.toFixed(0)}`],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between border-b border-gray-50 pb-2 last:border-0 last:pb-0">
                  <span className="text-gray-500">{label}</span>
                  <span className="font-medium text-gray-900 text-right max-w-xs">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Cartridge Usage */}
          {booking.cartridges && booking.cartridges.length > 0 && (
            <div className="card">
              <h2 className="font-semibold text-gray-900 mb-4 text-sm">Cartridge Usage</h2>
              <div className="grid gap-2">
                {booking.cartridges.map((c) => (
                  <div key={c.label} className="bg-gray-50 rounded-lg p-3 flex justify-between items-center text-sm">
                    <div>
                      <p className="font-medium text-gray-700">{c.label}</p>
                      <p className="text-[10px] text-gray-400">{c.ml_per_acre} ml/acre</p>
                    </div>
                    <p className="font-bold text-gray-900">
                      {c.total_ml >= 1000 ? `${(c.total_ml / 1000).toFixed(2)} L` : `${c.total_ml.toFixed(0)} ml`}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Time breakdown */}
          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-3 text-sm">Time Breakdown</h2>
            <div className="space-y-2 text-xs text-gray-500">
              {[
                ['Spray time', `${booking.t_req_breakdown.spray_time_mins.toFixed(0)} min`],
                ['Setup', `${booking.t_req_breakdown.setup_time_mins.toFixed(0)} min`],
                ['Refills', `${booking.t_req_breakdown.n_refills} cycles`],
                ['Est. Total', booking.t_req_breakdown.total_hours],
              ].map(([l, v]) => (
                <div key={l} className="flex justify-between">
                  <span>{l}</span>
                  <span className="font-medium text-gray-700">{v}</span>
                </div>
              ))}
            </div>
          </div>

          {!isLive && booking.service_status === 'Confirmed' && (
            <div className="bg-blue-50 text-blue-700 text-sm rounded-xl p-4">
              <p className="font-medium">Booking Confirmed</p>
              <p className="text-blue-600 mt-1">The drone will start at your scheduled time. Stay tuned for live updates.</p>
            </div>
          )}

          {booking.service_status === 'Completed' && (
            <div className="bg-green-50 text-green-700 text-sm rounded-xl p-4">
              <p className="font-medium flex items-center gap-1.5"><Activity size={14} /> Spray Complete!</p>
              <p className="text-green-600 mt-1">Your field has been fully sprayed.</p>
            </div>
          )}
      </div>
    </div>
  )
}
