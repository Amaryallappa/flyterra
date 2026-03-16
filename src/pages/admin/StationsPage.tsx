import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '@/api/admin'
import { useForm } from 'react-hook-form'
import { Plus, Trash2, Edit2, Loader2, X, Droplets, Zap, Activity,
         Wind, MapPin, Wifi, WifiOff } from 'lucide-react'
import toast from 'react-hot-toast'

interface Station {
  station_id: number; station_serial_no: string; status: string
  active_date: string; last_known_lat: number | null; last_known_lng: number | null
  minutes_per_acre: number; station_refill_time_mins: number
  base_setup_time_mins: number; operation_mode: string
  price_per_acre: number; daily_start_time: string; daily_end_time: string
}

interface StationHealth {
  station_id: number; station_serial_no: string; status: string
  last_health_ts: string | null
  water_tank_empty: boolean | null
  flow_rate_per_min: number | null
  cartridge_levels: Record<string, number> | null   // {"C1_ml": 800, ...}
  charging_slots: Record<string, {                  // {"slot_1": {...}, ...}
    occupied: boolean
    battery_serial?: string
    charge_pct?: number
  }> | null
  station_online: boolean
}

function statusBadge(s: string) {
  return (
    <span className={
      s === 'Active' ? 'badge-green'
      : s === 'Maintenance' ? 'badge-yellow'
      : 'badge-red'
    }>{s}</span>
  )
}

// ── Cartridge level bar ────────────────────────────────────────────────────────
function CartridgeBar({ label, ml, maxMl = 1000 }: { label: string; ml: number; maxMl?: number }) {
  const pct = Math.min(100, Math.round((ml / maxMl) * 100))
  const color = pct > 50 ? '#22c55e' : pct > 20 ? '#f59e0b' : '#ef4444'
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="font-medium text-gray-700">{label}</span>
        <span className="font-mono text-gray-500">{ml} mL <span className="text-gray-400 text-xs">({pct}%)</span></span>
      </div>
      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
        <div style={{ width: `${pct}%`, background: color, height: '100%',
                      borderRadius: 9999, transition: 'width .4s' }} />
      </div>
    </div>
  )
}

// ── Charging slot card ─────────────────────────────────────────────────────────
function SlotCard({ name, slot }: {
  name: string
  slot: { occupied: boolean; battery_serial?: string; charge_pct?: number }
}) {
  const pct = slot.charge_pct ?? null
  const color = pct == null ? '#94a3b8' : pct > 50 ? '#22c55e' : pct > 20 ? '#f59e0b' : '#ef4444'

  return (
    <div className={`rounded-xl border p-3 ${slot.occupied ? 'border-blue-100 bg-blue-50' : 'border-gray-100 bg-gray-50'}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{name}</span>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
          slot.occupied ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'
        }`}>
          {slot.occupied ? 'Occupied' : 'Empty'}
        </span>
      </div>
      {slot.occupied ? (
        <>
          {slot.battery_serial && (
            <p className="text-xs font-mono text-gray-600 mb-2 truncate">{slot.battery_serial}</p>
          )}
          {pct != null ? (
            <>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-400">Charge</span>
                <span className="font-bold" style={{ color }}>{pct}%</span>
              </div>
              <div className="h-2 bg-white rounded-full overflow-hidden border border-gray-100">
                <div style={{ width: `${pct}%`, background: color,
                              height: '100%', borderRadius: 9999, transition: 'width .4s' }} />
              </div>
            </>
          ) : (
            <p className="text-xs text-gray-400">Charge level unknown</p>
          )}
        </>
      ) : (
        <p className="text-xs text-gray-400 mt-1">No battery</p>
      )}
    </div>
  )
}

// ── Station Health Modal ───────────────────────────────────────────────────────
function StationHealthModal({ station, onClose }: { station: Station; onClose: () => void }) {
  const { data: health, isLoading } = useQuery<StationHealth>({
    queryKey: ['station-health', station.station_id],
    queryFn: () => adminApi.getStationHealth(station.station_id),
    refetchInterval: 5_000,   // matches the 5s health broadcast rate
  })

  const cartridges = health?.cartridge_levels
    ? Object.entries(health.cartridge_levels)
    : []

  const slots = health?.charging_slots
    ? Object.entries(health.charging_slots)
    : []

  // Infer max cartridge volume from the largest value seen (default 1000 mL)
  const maxCartridgeMl = cartridges.length
    ? Math.max(...cartridges.map(([, v]) => v), 1000)
    : 1000

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Activity size={18} className="text-blue-500" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">{station.station_serial_no}</h2>
              <p className="text-xs text-gray-400">Station #{station.station_id} — Health</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {health && (
              health.station_online ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium
                                 text-green-700 bg-green-50 px-2.5 py-1 rounded-full">
                  <Wifi size={11} />
                  Online
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium
                                 text-red-600 bg-red-50 px-2.5 py-1 rounded-full">
                  <WifiOff size={11} />
                  Offline
                </span>
              )
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
              <X size={20} />
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={24} className="animate-spin text-brand-500" />
          </div>
        ) : health ? (
          <div className="p-6 space-y-6">

            {/* Status row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-400 mb-1">Status</p>
                {statusBadge(health.status)}
              </div>

              {/* Water tank */}
              <div className={`rounded-xl p-3 text-center ${
                health.water_tank_empty == null
                  ? 'bg-gray-50'
                  : health.water_tank_empty
                    ? 'bg-red-50 border border-red-100'
                    : 'bg-blue-50 border border-blue-100'
              }`}>
                <Droplets size={16} className={`mx-auto mb-1 ${
                  health.water_tank_empty ? 'text-red-400' : 'text-blue-400'
                }`} />
                <p className="text-xs font-semibold">
                  {health.water_tank_empty == null
                    ? '—'
                    : health.water_tank_empty
                      ? 'Tank Empty'
                      : 'Tank OK'}
                </p>
              </div>

              {/* Flow rate */}
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <Wind size={16} className="mx-auto mb-1 text-gray-400" />
                <p className="text-xs text-gray-400 mb-0.5">Flow Rate</p>
                <p className="text-sm font-bold font-mono text-gray-700">
                  {health.flow_rate_per_min != null
                    ? `${health.flow_rate_per_min.toFixed(1)} L/min`
                    : '—'}
                </p>
              </div>
            </div>

            {/* Cartridge levels */}
            {cartridges.length > 0 ? (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Droplets size={15} className="text-gray-400" />
                  <p className="text-sm font-semibold text-gray-700">
                    Cartridge Levels
                    <span className="ml-2 text-xs font-normal text-gray-400">
                      ({cartridges.length} cartridge{cartridges.length > 1 ? 's' : ''})
                    </span>
                  </p>
                </div>
                <div className="space-y-3">
                  {cartridges.map(([key, ml]) => (
                    <CartridgeBar
                      key={key}
                      label={key.replace('_ml', '').replace('_', ' ')}
                      ml={ml}
                      maxMl={maxCartridgeMl}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-5 text-gray-400 bg-gray-50 rounded-xl">
                <Droplets size={22} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">No cartridge data</p>
              </div>
            )}

            {/* Charging slots */}
            {slots.length > 0 ? (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Zap size={15} className="text-gray-400" />
                  <p className="text-sm font-semibold text-gray-700">
                    Charging Slots
                    <span className="ml-2 text-xs font-normal text-gray-400">
                      {slots.filter(([, s]) => s.occupied).length}/{slots.length} occupied
                    </span>
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {slots.map(([name, slot]) => (
                    <SlotCard key={name} name={name.replace('_', ' ')} slot={slot} />
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-5 text-gray-400 bg-gray-50 rounded-xl">
                <Zap size={22} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">No charging slot data</p>
              </div>
            )}

            {/* Footer */}
            <div className="border-t border-gray-100 pt-4 flex items-center justify-between text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <MapPin size={11} />
                {health.last_health_ts
                  ? `Last update: ${new Date(health.last_health_ts).toLocaleTimeString()}`
                  : 'No health data received yet'}
              </span>
              <span className="text-gray-300">Auto-refreshes every 5 s</span>
            </div>

          </div>
        ) : (
          <div className="p-8 text-center text-gray-400">Failed to load station health.</div>
        )}
      </div>
    </div>
  )
}


import { MapContainer, TileLayer, Marker, useMapEvents, LayersControl } from 'react-leaflet'
import L from 'leaflet'

// Fix default marker icon
// @ts-expect-error icon fix
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
})

function MapPicker({ lat, lng, onChange }: { lat: number; lng: number; onChange: (lat: number, lng: number) => void }) {
  const MapEvents = () => {
    useMapEvents({
      click(e) { onChange(e.latlng.lat, e.latlng.lng) }
    })
    return null
  }
  return (
    <div className="h-64 w-full rounded-xl overflow-hidden border border-gray-200 mt-2">
      <MapContainer center={[lat || 20.5937, lng || 78.9629]} zoom={15} style={{ height: '100%', width: '100%' }}>
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="Satellite">
            <TileLayer url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}" attribution="Google Satellite" maxZoom={22} />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Hybrid">
            <TileLayer url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}" attribution="Google Hybrid" maxZoom={22} />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Terrain">
            <TileLayer url="https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}" attribution="Google Terrain" maxZoom={22} />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Streets">
            <TileLayer url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}" attribution="Google Streets" maxZoom={22} />
          </LayersControl.BaseLayer>
        </LayersControl>
        <Marker position={[lat || 20.5937, lng || 78.9629]} />
        <MapEvents />
      </MapContainer>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function StationsPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm]       = useState(false)
  const [editing, setEditing]         = useState<Station | null>(null)
  const [healthStation, setHealth]    = useState<Station | null>(null)

  const { data: stations = [], isLoading } = useQuery({
    queryKey: ['admin-stations'],
    queryFn: adminApi.listStations,
  })

  const { register, handleSubmit, reset, setValue, watch, formState: { isSubmitting } } = useForm()

  const lat = watch('last_known_lat')
  const lng = watch('last_known_lng')
  const opMode = watch('operation_mode') || 'Spray'

  const [mapOpen, setMapOpen] = useState(false)

  const create = useMutation({
    mutationFn: (d: any) => {
      // Coerce numeric fields from form strings to numbers
      const payload = {
        ...d,
        minutes_per_acre: Number(d.minutes_per_acre),
        station_refill_time_mins: Number(d.station_refill_time_mins),
        base_setup_time_mins: Number(d.base_setup_time_mins),
        price_per_acre: Number(d.price_per_acre),
        last_known_lat: d.last_known_lat === "" ? null : Number(d.last_known_lat),
        last_known_lng: d.last_known_lng === "" ? null : Number(d.last_known_lng),
      }
      return editing ? adminApi.updateStation(editing.station_id, payload) : adminApi.createStation(payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-stations'] })
      toast.success(editing ? 'Station updated' : 'Station created')
      setShowForm(false); setEditing(null); reset()
    },
    onError: (err: any) => toast.error(err.message || 'Save failed'),
  })

  const del = useMutation({
    mutationFn: (id: number) => adminApi.deleteStation(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-stations'] }); toast.success('Deleted') },
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
        <h1 className="text-2xl font-bold text-gray-900">Base Stations ({stations.length})</h1>
        <button onClick={() => { 
          setShowForm(true); 
          setEditing(null); 
          reset({
            status: 'Active',
            minutes_per_acre: 10,
            station_refill_time_mins: 5,
            base_setup_time_mins: 15,
            operation_mode: 'Spray',
            price_per_acre: 550,
            daily_start_time: '06:00',
            daily_end_time: '18:00',
            last_known_lat: 20.5937,
            last_known_lng: 78.9629
          }) 
        }}
          className="btn-primary flex items-center gap-2"><Plus size={16} /> Add Station</button>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 my-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-bold text-lg">{editing ? 'Edit Station' : 'Add Station'}</h2>
              <button onClick={() => { setShowForm(false); setEditing(null) }}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit((d) => create.mutate(d))} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Serial No</label>
                  <input {...register('station_serial_no', { required: true })} className="input" placeholder="STA-001" disabled={!!editing} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Active Date</label>
                  <input {...register('active_date', { required: true })} type="date" className="input" disabled={!!editing} />
                </div>
              </div>

              {editing && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select {...register('status')} className="input">
                    <option>Active</option><option>Maintenance</option><option>Offline</option>
                  </select>
                </div>
              )}

              <div className="border-t border-gray-100 pt-4 space-y-4">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Operational Parameters</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Spray Speed (min/acre)</label>
                    <input {...register('minutes_per_acre')} type="number" step="0.1" className="input" placeholder="10" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Refill Time (mins)</label>
                    <input {...register('station_refill_time_mins')} type="number" className="input" placeholder="5" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Setup Buffer (mins)</label>
                    <input {...register('base_setup_time_mins')} type="number" className="input" placeholder="15" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Price Per Acre (₹)</label>
                    <input {...register('price_per_acre')} type="number" className="input" placeholder="550" />
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Operation Mode</p>
                      <p className="text-xs text-gray-500">Determines visual indicators & nozzle flow</p>
                    </div>
                    <div className="flex bg-white rounded-lg p-1 border border-gray-200">
                      {['Spray', 'Spread'].map(mode => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setValue('operation_mode', mode)}
                          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                            opMode === mode ? 'bg-brand-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          {mode}
                        </button>
                      ))}
                      <input type="hidden" {...register('operation_mode')} />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Daily Start</label>
                    <input {...register('daily_start_time')} type="time" className="input" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Daily End</label>
                    <input {...register('daily_end_time')} type="time" className="input" />
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Location</p>
                  <button type="button" onClick={() => setMapOpen(!mapOpen)} className="text-brand-600 text-xs font-medium hover:underline">
                    {mapOpen ? 'Hide Map' : 'Select on Map'}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <input {...register('last_known_lat')} type="number" step="any" className="input" placeholder="Lat" />
                  <input {...register('last_known_lng')} type="number" step="any" className="input" placeholder="Lng" />
                </div>
                {mapOpen && (
                  <MapPicker lat={parseFloat(lat)} lng={parseFloat(lng)} onChange={(lt, lg) => {
                    setValue('last_known_lat', lt)
                    setValue('last_known_lng', lg)
                  }} />
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => { setShowForm(false); setEditing(null) }}
                  className="btn-secondary flex-1 py-3">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="btn-primary flex-1 py-3 text-base">
                  {create.isPending ? 'Saving…' : 'Save Station'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm bg-white rounded-xl border border-gray-100 overflow-hidden">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              {['ID', 'Serial No', 'Status', 'Location', 'Active Date', ''].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {stations.map((s: Station) => (
              <tr key={s.station_id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-gray-500">#{s.station_id}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => setHealth(s)}
                    className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {s.station_serial_no}
                  </button>
                </td>
                <td className="px-4 py-3">{statusBadge(s.status)}</td>
                <td className="px-4 py-3 text-gray-500">
                  {s.last_known_lat
                    ? `${s.last_known_lat.toFixed(4)}, ${s.last_known_lng?.toFixed(4)}`
                    : '—'}
                </td>
                <td className="px-4 py-3 text-gray-500">{s.active_date}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => setHealth(s)}
                      className="text-xs font-medium px-2 py-1 rounded bg-blue-50 text-blue-700
                                 hover:bg-blue-100 flex items-center gap-1">
                      <Activity size={11} /> Health
                    </button>
                     <button onClick={() => { setEditing(s); reset(s); setShowForm(true) }}
                      className="text-gray-400 hover:text-blue-600 p-1"><Edit2 size={14} /></button>
                    <button onClick={() => { if (confirm('Delete?')) del.mutate(s.station_id) }}
                      className="text-gray-400 hover:text-red-600 p-1"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Health modal */}
      {healthStation && (
        <StationHealthModal station={healthStation} onClose={() => setHealth(null)} />
      )}
    </div>
  )
}
