import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '@/api/admin'
import { useForm } from 'react-hook-form'
import { Plus, Trash2, Edit2, Loader2, X, Monitor } from 'lucide-react'
import toast from 'react-hot-toast'
import DroneDetailPanel, { buildGcsUrl } from '@/components/DroneDetailPanel'

interface Drone {
  drone_id: number; drone_serial_no: string; status: string
  station_id: number | null; operation_type: string
  price_per_acre: number; minutes_per_acre: number; active_date: string
  drone_companion_url: string | null
  drone_live_video_url: string | null
  base_setup_time_mins: number
  max_acres_per_tank: number
  station_refill_time_mins: number
  daily_start_time: string
  daily_end_time: string
}

// ── Status badge ───────────────────────────────────────────────────────────────
function statusBadge(s: string) {
  return (
    <span className={
      s === 'Active' ? 'badge-green' : s === 'In_Use' ? 'badge-blue' :
      s === 'Maintenance' ? 'badge-yellow' : 'badge-red'
    }>{s}</span>
  )
}


// ── Main page ─────────────────────────────────────────────────────────────────
export default function DronesPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm]       = useState(false)
  const [editing, setEditing]         = useState<Drone | null>(null)
  const [selectedDrone, setSelectedDrone] = useState<Drone | null>(null)

  const { data: drones = [],   isLoading } = useQuery({ queryKey: ['admin-drones'],   queryFn: adminApi.listDrones })
  const { data: stations = [] }            = useQuery({ queryKey: ['admin-stations'], queryFn: adminApi.listStations })
  const { register, handleSubmit, reset }  = useForm()

  const save = useMutation({
    mutationFn: (d: Record<string, unknown>) => {
      // Coerce empty strings to null for optional fields Pydantic expects int|None or str|None
      const cleaned = { ...d }
      if (cleaned.station_id === '' || cleaned.station_id === undefined) cleaned.station_id = null
      else cleaned.station_id = Number(cleaned.station_id)

      if (cleaned.drone_companion_url === '') cleaned.drone_companion_url = null
      if (cleaned.drone_live_video_url === '') cleaned.drone_live_video_url = null

      // Coerce numeric fields
      if (cleaned.minutes_per_acre !== undefined) cleaned.minutes_per_acre = Number(cleaned.minutes_per_acre)
      if (cleaned.price_per_acre !== undefined) cleaned.price_per_acre = Number(cleaned.price_per_acre)
      if (cleaned.base_setup_time_mins !== undefined) cleaned.base_setup_time_mins = Number(cleaned.base_setup_time_mins)
      if (cleaned.station_refill_time_mins !== undefined) cleaned.station_refill_time_mins = Number(cleaned.station_refill_time_mins)
      if (cleaned.max_acres_per_tank !== undefined) cleaned.max_acres_per_tank = Number(cleaned.max_acres_per_tank)

      return editing ? adminApi.updateDrone(editing.drone_id, cleaned) : adminApi.createDrone(cleaned)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-drones'] })
      toast.success('Saved'); reset(); setShowForm(false); setEditing(null)
    },
    onError: () => toast.error('Failed'),
  })
  const del = useMutation({
    mutationFn: (id: number) => adminApi.deleteDrone(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-drones'] }); toast.success('Deleted') },
    onError: () => toast.error('Delete failed'),
  })

  if (isLoading) return (
    <div className="flex justify-center py-20">
      <Loader2 size={24} className="animate-spin text-brand-500" />
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Drones ({drones.length})</h1>
        <button onClick={() => { setShowForm(true); setEditing(null); reset() }}
          className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add Drone
        </button>
      </div>

      {/* Add/Edit form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-screen overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-bold text-lg">{editing ? 'Edit Drone' : 'Add Drone'}</h2>
              <button onClick={() => { setShowForm(false); setEditing(null) }}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit((d) => save.mutate(d))} className="space-y-4">
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Serial No</label>
                    <input {...register('drone_serial_no', { required: true })} className="input" placeholder="DRN-001" disabled={!!editing} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Active Date</label>
                    <input {...register('active_date', { required: true })} type="date" className="input" disabled={!!editing} />
                  </div>
                </>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Station</label>
                <select {...register('station_id')} className="input">
                  <option value="">Unassigned</option>
                  {stations.map((s: { station_id: number; station_serial_no: string }) => (
                    <option key={s.station_id} value={s.station_id}>{s.station_serial_no}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min/Acre</label>
                  <input {...register('minutes_per_acre')} type="number" className="input" defaultValue={8} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price/Acre (₹)</label>
                  <input {...register('price_per_acre')} type="number" step="0.01" className="input" defaultValue={250} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-xs">Setup Buffer (mins)</label>
                  <input {...register('base_setup_time_mins')} type="number" className="input" defaultValue={15} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-xs">Refill Time (mins)</label>
                  <input {...register('station_refill_time_mins')} type="number" className="input" defaultValue={5} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-xs">Max Acres/Tank</label>
                  <input {...register('max_acres_per_tank')} type="number" step="0.1" className="input" defaultValue={2.5} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-xs">Operation Mode</label>
                  <select {...register('operation_type')} className="input">
                    <option>Spray</option><option>Spread</option><option>Both</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-xs">Daily Start</label>
                  <input {...register('daily_start_time')} type="time" className="input" defaultValue="06:00" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-xs">Daily End</label>
                  <input {...register('daily_end_time')} type="time" className="input" defaultValue="18:00" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Companion PC URL
                  <span className="ml-1 text-xs text-gray-400 font-normal">(Cloudflare Tunnel — for this drone)</span>
                </label>
                <input {...register('drone_companion_url')} className="input"
                  placeholder="https://xxxx.trycloudflare.com" />
                <p className="text-xs text-gray-400 mt-1">
                  Paste the Cloudflare Tunnel URL. Video auto-derives from this.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Video URL Override
                  <span className="ml-1 text-xs text-gray-400 font-normal">(optional — leave blank to auto-derive)</span>
                </label>
                <input {...register('drone_live_video_url')} className="input"
                  placeholder="https://xxxx.trycloudflare.com/custom/stream/index.m3u8" />
                <p className="text-xs text-gray-400 mt-1">
                  Only set this if the HLS path differs from the default. Supports HLS, MJPEG, or native video.
                </p>
              </div>
              {editing && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select {...register('status')} className="input">
                    <option>Active</option><option>In_Use</option>
                    <option>Maintenance</option><option>Retired</option>
                  </select>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowForm(false); setEditing(null) }}
                  className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={save.isPending} className="btn-primary flex-1">
                  {save.isPending ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Drones table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm bg-white rounded-xl border border-gray-100 overflow-hidden">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              {['ID', 'Serial No', 'Station', 'Type', 'Price/Acre', 'Status', ''].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium text-xs uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {drones.map((d: Drone) => (
              <tr
                key={d.drone_id}
                className={`hover:bg-gray-50 cursor-pointer ${selectedDrone?.drone_id === d.drone_id ? 'bg-blue-50' : ''}`}
                onClick={(e) => { if ((e.target as HTMLElement).closest('button')) return; setSelectedDrone(prev => prev?.drone_id === d.drone_id ? null : d) }}
              >
                <td className="px-4 py-3 font-mono text-gray-500">#{d.drone_id}</td>
                <td className="px-4 py-3 font-medium">{d.drone_serial_no}</td>
                <td className="px-4 py-3 text-gray-500">{d.station_id ? `#${d.station_id}` : '—'}</td>
                <td className="px-4 py-3 text-gray-500">{d.operation_type}</td>
                <td className="px-4 py-3">₹{d.price_per_acre}</td>
                <td className="px-4 py-3">{statusBadge(d.status)}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2 items-center">
                    <button
                      onClick={(e) => { e.stopPropagation(); window.open(buildGcsUrl(d), '_blank') }}
                      className="text-gray-400 hover:text-purple-600 p-1"
                      title="Open Ground Control Station"
                    >
                      <Monitor size={14} />
                    </button>
                    <button onClick={() => {
                      setEditing(d); setShowForm(true)
                      reset({
                        drone_serial_no: d.drone_serial_no,
                        active_date: d.active_date,
                        station_id: d.station_id ?? '',
                        drone_companion_url: d.drone_companion_url ?? '',
                        drone_live_video_url: d.drone_live_video_url ?? '',
                        minutes_per_acre: d.minutes_per_acre,
                        price_per_acre: d.price_per_acre,
                        operation_type: d.operation_type,
                        base_setup_time_mins: d.base_setup_time_mins,
                        max_acres_per_tank: d.max_acres_per_tank,
                        station_refill_time_mins: d.station_refill_time_mins,
                        daily_start_time: d.daily_start_time,
                        daily_end_time: d.daily_end_time,
                        status: d.status,
                      })
                    }}
                      className="text-gray-400 hover:text-blue-600 p-1"><Edit2 size={14} /></button>
                    <button onClick={() => { if (confirm('Delete?')) del.mutate(d.drone_id) }}
                      className="text-gray-400 hover:text-red-600 p-1"><Trash2 size={14} /></button>
                  </div>
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
    </div>
  )
}
