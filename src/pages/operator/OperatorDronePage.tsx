import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { operatorApi } from '@/api/operator'
import { useAuth } from '@/contexts/AuthContext'
import { Loader2, Monitor } from 'lucide-react'
import DroneDetailPanel, { buildGcsUrl, type Drone } from '@/components/DroneDetailPanel'

// ── Status badge ───────────────────────────────────────────────────────────────

function statusBadge(s: string) {
  const cls =
    s === 'Active'      ? 'badge-green' :
    s === 'In_Use'      ? 'badge-blue'  :
    s === 'Maintenance' ? 'badge-yellow': 'badge-red'
  return <span className={cls}>{s}</span>
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function OperatorDronePage() {
  const { user } = useAuth()
  const stationId = (user as any)?.assigned_base_station_id ?? null

  const { data: allDrones = [], isLoading } = useQuery<Drone[]>({
    queryKey: ['operator-drones'],
    queryFn: operatorApi.getDrones,
    refetchInterval: 30_000,
  })

  // Show only drones assigned to this operator's station
  const drones = stationId
    ? allDrones.filter((d) => d.station_id === stationId)
    : allDrones

  const [selectedDrone, setSelectedDrone] = useState<Drone | null>(null)

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 size={24} className="animate-spin text-brand-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          My Drones ({drones.length})
        </h1>
        {stationId && (
          <span className="text-sm text-gray-400">Station #{stationId}</span>
        )}
      </div>

      {drones.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-400">
          <p className="font-medium">No drones assigned to your station</p>
          <p className="text-sm mt-1">Contact admin to assign drones to station #{stationId ?? '–'}</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm bg-white rounded-xl border border-gray-100 overflow-hidden">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  {['ID', 'Serial No', 'Type', 'Status', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-medium text-xs uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {drones.map((d) => (
                  <tr
                    key={d.drone_id}
                    className={`hover:bg-gray-50 cursor-pointer ${selectedDrone?.drone_id === d.drone_id ? 'bg-blue-50' : ''}`}
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest('button')) return
                      setSelectedDrone(prev => prev?.drone_id === d.drone_id ? null : d)
                    }}
                  >
                    <td className="px-4 py-3 font-mono text-gray-500">#{d.drone_id}</td>
                    <td className="px-4 py-3 font-medium">{d.drone_serial_no}</td>
                    <td className="px-4 py-3 text-gray-500">{d.operation_type}</td>
                    <td className="px-4 py-3">{statusBadge(d.status)}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); window.open(buildGcsUrl(d), '_blank') }}
                        className="text-gray-400 hover:text-purple-600 p-1"
                        title="Open Ground Control Station"
                      >
                        <Monitor size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {selectedDrone && (
            <DroneDetailPanel
              drone={selectedDrone}
              onClose={() => setSelectedDrone(null)}
              onOpenGCS={() => window.open(buildGcsUrl(selectedDrone), '_blank')}
            />
          )}
        </>
      )}
    </div>
  )
}
