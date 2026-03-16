import { useQuery } from '@tanstack/react-query'
import { operatorApi } from '@/api/operator'
import { useEffect, useState } from 'react'
import { useSocket } from '@/hooks/useSocket'
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
import L from 'leaflet'
import { format } from 'date-fns'
import { Activity, Map as MapIcon, ClipboardList } from 'lucide-react'

interface TodayJob {
  booking_id: number
  service_status: string
  scheduled_start: string
  scheduled_end: string
  total_acres: number
  field_count: number
}

interface DronePos {
  drone_id: number; station_id: number
  lat: number; lng: number; altitude: number
  speed: number; battery_percent: number; phase: string
}

const droneIcon = L.divIcon({
  className: '',
  html: `<div style="width:20px;height:20px;background:#16a34a;border-radius:50%;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,.4)"></div>`,
  iconSize: [20, 20], iconAnchor: [10, 10],
})

export default function OperatorDashboard() {
  const { data: todayJobs = [] } = useQuery({ queryKey: ['op-today'], queryFn: operatorApi.getTodayJobs })
  const { data: pendingFields = [] } = useQuery({ queryKey: ['op-pending'], queryFn: operatorApi.listPendingFields })
  const [drones, setDrones] = useState<Map<number, DronePos & { trail: [number, number][] }>>(new Map())
  const { on } = useSocket()

  useEffect(() => {
    const off = on('drone_telemetry', (data: unknown) => {
      const d = data as DronePos
      setDrones((prev) => {
        const next = new Map(prev)
        const existing = next.get(d.drone_id)
        next.set(d.drone_id, {
          ...d,
          trail: [...(existing?.trail ?? []).slice(-100), [d.lat, d.lng]],
        })
        return next
      })
    })
    return off
  }, [on])

  const activeDrones = Array.from(drones.values()).filter((d) => d.phase !== 'Idle')

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Today's Jobs",    value: todayJobs.length,    icon: ClipboardList, color: 'bg-blue-50 text-blue-600' },
          { label: 'Active Drones',   value: activeDrones.length, icon: Activity,      color: 'bg-green-50 text-green-600' },
          { label: 'Pending Verify',  value: pendingFields.length, icon: MapIcon,      color: 'bg-yellow-50 text-yellow-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color} mb-2`}>
              <Icon size={18} />
            </div>
            <div className="text-2xl font-bold">{value}</div>
            <div className="text-sm text-gray-500">{label}</div>
          </div>
        ))}
      </div>

      {/* Live map */}
      <div className="card p-0 overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Live Drone Map</h2>
          <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            {activeDrones.length} drone{activeDrones.length !== 1 ? 's' : ''} active
          </span>
        </div>
        <div style={{ height: 420 }}>
          <MapContainer center={[20.5937, 78.9629]} zoom={8} style={{ height: '100%', width: '100%' }}>
            <TileLayer url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}" attribution="Google Satellite" />
            {Array.from(drones.values()).map((d) => (
              <div key={d.drone_id}>
                {d.trail.length > 1 && <Polyline positions={d.trail} color="#22c55e" weight={2} opacity={0.6} />}
                <Marker position={[d.lat, d.lng]} icon={droneIcon}>
                  <Popup>
                    <div className="text-xs">
                      <p className="font-bold">Drone #{d.drone_id}</p>
                      <p>Phase: {d.phase}</p>
                      <p>Alt: {d.altitude?.toFixed(1)}m · {d.speed?.toFixed(1)} m/s</p>
                      <p>Battery: {d.battery_percent?.toFixed(0)}%</p>
                    </div>
                  </Popup>
                </Marker>
              </div>
            ))}
          </MapContainer>
        </div>
      </div>

      {/* Today's jobs */}
      {todayJobs.length > 0 && (
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Today's Schedule</h2>
          <div className="space-y-3">
            {todayJobs.map((job: TodayJob) => (
              <div key={job.booking_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
                <div>
                  <p className="font-medium">
                    #{job.booking_id} · {job.field_count} field{job.field_count !== 1 ? 's' : ''} · {job.total_acres.toFixed(2)} ac
                  </p>
                  <p className="text-gray-500 text-xs">
                    {format(new Date(job.scheduled_start), 'HH:mm')} – {format(new Date(job.scheduled_end), 'HH:mm')}
                  </p>
                </div>
                <span className={`badge-${job.service_status === 'In_Progress' ? 'green' : job.service_status === 'Confirmed' ? 'blue' : 'gray'}`}>
                  {job.service_status.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
