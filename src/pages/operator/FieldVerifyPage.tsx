import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { operatorApi } from '@/api/operator'
import { MapContainer, TileLayer, Polygon, Popup } from 'react-leaflet'
import { Download, Upload, CheckCircle2, Clock, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'
import { apiErrorMsg } from '@/api/client'

type RawCoord = [number, number] | { lat: number; lng: number }

interface Field {
  field_id: number; farmer_id: number; field_name: string; crop_type?: string
  area_acres: number; boundary_coordinates: RawCoord[]; created_at: string
  farmer_name?: string; farmer_mobile?: string
}

/** Normalise whatever the backend sends into Leaflet [lat, lng] tuples */
function toLatLng(c: RawCoord): [number, number] {
  return Array.isArray(c) ? c : [c.lat, c.lng]
}

function FieldCard({ field, verified, stations }: { field: Field; verified?: boolean; stations: any[] }) {
  const qc = useQueryClient()
  const [expanded, setExpanded] = useState(false)
  const [stationId, setStationId] = useState<string>('')
  const baseToFieldRef  = useRef<HTMLInputElement>(null)
  const fieldToBaseRef  = useRef<HTMLInputElement>(null)
  const polygonSprayRef = useRef<HTMLInputElement>(null)
  const exclusionRef    = useRef<HTMLInputElement>(null)

  const downloadWaypoints = () => {
    const coords = (field.boundary_coordinates ?? []).map(toLatLng)
    if (coords.length === 0) return

    const dateStr = new Date(field.created_at).toISOString().slice(0, 10).replace(/-/g, '')
    const filename = `${field.farmer_id}_${dateStr}.waypoints`

    // QGroundControl plain-text waypoints format (QGC WPL 110)
    const lines: string[] = ['QGC WPL 110']
    // Home point at first coordinate
    const [homeLat, homeLng] = coords[0]
    lines.push(`0\t1\t0\t16\t0\t0\t0\t0\t${homeLat}\t${homeLng}\t30\t1`)
    // Boundary waypoints
    coords.forEach(([lat, lng], i) => {
      lines.push(`${i + 1}\t0\t3\t16\t0\t0\t0\t0\t${lat}\t${lng}\t30\t1`)
    })

    const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }

  const verify = useMutation({
    mutationFn: async () => {
      if (!stationId) throw new Error('Please select a Base Station')
      
      const b2f = baseToFieldRef.current?.files?.[0]
      const f2b = fieldToBaseRef.current?.files?.[0]
      const ps  = polygonSprayRef.current?.files?.[0]
      const ex  = exclusionRef.current?.files?.[0]

      if (!b2f || !f2b || !ps) {
        throw new Error('Please upload all required mission files')
      }

      const fd = new FormData()
      fd.append('base_to_field', b2f)
      fd.append('field_to_base', f2b)
      fd.append('polygon_spray', ps)
      if (ex) fd.append('exclusion', ex)
      
      return operatorApi.verifyField(field.field_id, Number(stationId), fd)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['op-pending'] })
      qc.invalidateQueries({ queryKey: ['op-verified'] })
      toast.success(`Field "${field.field_name}" verified!`)
    },
    onError: (err: unknown) => {
      toast.error(apiErrorMsg(err, 'Verification failed'))
    },
  })

  const coords = (field.boundary_coordinates ?? []).map(toLatLng)
  const center: [number, number] = coords.length > 0
    ? [
        coords.reduce((s, c) => s + c[0], 0) / coords.length,
        coords.reduce((s, c) => s + c[1], 0) / coords.length,
      ]
    : [20.5937, 78.9629]

  return (
    <div className="card transition-all duration-200">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-gray-900">{field.field_name}</p>
            {verified
              ? <span className="badge-green flex items-center gap-1"><CheckCircle2 size={11} /> Verified</span>
              : <span className="badge-yellow flex items-center gap-1"><Clock size={11} /> Pending Verification</span>
            }
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            {field.crop_type ?? 'Unknown crop'} · {field.area_acres.toFixed(2)} acres · Farmer: {field.farmer_name ?? '—'}
          </p>
        </div>
        <button onClick={() => setExpanded(!expanded)} className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors">
          {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
      </div>

      {expanded && (
        <div className="mt-6 space-y-6">
          {/* Mini map */}
          {coords.length > 2 && (
            <div className="relative h-60 w-full overflow-hidden rounded-xl border border-gray-100">
              <MapContainer center={center} zoom={15} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                <TileLayer url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}" attribution="Google Satellite" />
                <Polygon positions={coords} color="#22c55e" weight={3} fillOpacity={0.2}>
                  <Popup>{field.field_name}</Popup>
                </Polygon>
              </MapContainer>
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={downloadWaypoints} className="btn-secondary flex items-center gap-2 text-sm flex-1">
              <Download size={14} /> Download Boundary (.waypoints)
            </button>
          </div>

          {!verified && (
            <div className="space-y-4 pt-2 border-t border-gray-100">
              <p className="text-sm font-bold text-gray-800 uppercase tracking-tight">Field Verification Requirements</p>
              
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">1. Assign Base Station</label>
                <select 
                  value={stationId} 
                  onChange={(e) => setStationId(e.target.value)}
                  className="input w-full"
                >
                  <option value="">Select a Base Station...</option>
                  {stations.map((s) => (
                    <option key={s.station_id} value={s.station_id}>
                      {s.station_serial_no} ({s.status})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">2. Upload Mission Files</label>
                <div className="grid sm:grid-cols-2 gap-4">
                  {[
                    { ref: baseToFieldRef,  label: 'Base → Field Mission',  required: true },
                    { ref: fieldToBaseRef,  label: 'Field → Base Mission',  required: true },
                    { ref: polygonSprayRef, label: 'Spray Polygon Mission', required: true },
                    { ref: exclusionRef,    label: 'Exclusion / Geofence',  required: false },
                  ].map(({ ref, label, required }) => (
                    <div key={label} className="p-3 rounded-lg border border-gray-100 bg-gray-50/50">
                      <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase">
                        {label} {required && <span className="text-red-500">*</span>}
                      </label>
                      <input type="file" ref={ref} accept=".plan,.mission,.waypoints" className="text-xs file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => verify.mutate()}
                disabled={verify.isPending}
                className="btn-primary w-full py-3 flex items-center justify-center gap-2 text-base shadow-sm">
                {verify.isPending
                  ? <><Loader2 size={18} className="animate-spin" /> Processing…</>
                  : <><CheckCircle2 size={18} /> Complete Verification</>}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function FieldVerifyPage() {
  const [tab, setTab] = useState<'pending' | 'verified'>('pending')
  const { data: pending = [],  isLoading: lP } = useQuery({ queryKey: ['op-pending'],  queryFn: operatorApi.listPendingFields })
  const { data: verified = [], isLoading: lV } = useQuery({ queryKey: ['op-verified'], queryFn: operatorApi.listVerifiedFields })
  const { data: stations = [] } = useQuery({ queryKey: ['op-stations'], queryFn: operatorApi.listStations })

  const fields = tab === 'pending' ? pending : verified
  const loading = tab === 'pending' ? lP : lV

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Field Verification</h1>
        <p className="text-gray-500 text-sm">Review farmer-submitted fields, download boundary plan, upload mission files.</p>
      </div>

      <div className="flex gap-2">
        {(['pending', 'verified'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize border transition-all ${
              tab === t ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white border-gray-200 text-gray-600 hover:border-blue-300'
            }`}>
            {t} ({t === 'pending' ? pending.length : verified.length})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-blue-500" /></div>
      ) : fields.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">No {tab} fields found</div>
      ) : (
        <div className="space-y-4">
          {fields.map((f: any) => (
            <FieldCard 
              key={f.field_id} 
              field={f} 
              verified={tab === 'verified'} 
              stations={stations}
            />
          ))}
        </div>
      )}
    </div>
  )
}
