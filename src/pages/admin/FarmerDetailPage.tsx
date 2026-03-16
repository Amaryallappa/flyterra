import { useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '@/api/admin'
import {
  Loader2, ArrowLeft, Wallet, CheckCircle2, Clock, Upload,
  MapPin, Edit2, Check, X, Download
} from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { apiErrorMsg } from '@/api/client'

// ── Types ─────────────────────────────────────────────────────────────────────

interface FarmerBooking {
  booking_id: number; station_id: number | null; drone_id: number | null
  service_status: string; scheduled_start: string; scheduled_end: string
  total_cost: number; fields_count: number; notes: string | null; created_at: string
}

interface AdminField {
  field_id: number; field_name: string; crop_type: string | null
  area_acres: number; is_verified: boolean; station_id: number | null
  station_serial_no: string | null; created_at: string
  verification_date: string | null; has_missions: boolean
  base_to_field_file_path: string | null
  field_to_base_file_path: string | null
  mission_file_path: string | null
  exclusion_file_path: string | null
}

interface FarmerDetail {
  farmer_id: string; full_name: string; mobile_number: string
  email: string | null; address: string | null; wallet_balance: number
  username: string; is_active: boolean; created_at: string
  bookings: FarmerBooking[]; fields: AdminField[]
}

interface Station { station_id: number; station_serial_no: string }

// ── Status badge helpers ───────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  Pending:     'badge-yellow',
  Confirmed:   'badge-blue',
  In_Progress: 'badge-blue',
  On_Hold:     'bg-orange-100 text-orange-700 text-xs font-medium px-2 py-0.5 rounded-full',
  Completed:   'badge-green',
  Cancelled:   'badge-gray',
}

// ── Sub-components ────────────────────────────────────────────────────────────

function WalletCard({ farmerId, balance }: { farmerId: string; balance: number }) {
  const qc = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(balance.toFixed(2))

  const save = useMutation({
    mutationFn: () => adminApi.updateFarmerWallet(farmerId, parseFloat(val)),
    onSuccess: () => {
      toast.success('Wallet updated')
      qc.invalidateQueries({ queryKey: ['admin-farmer', farmerId] })
      setEditing(false)
    },
    onError: (e: unknown) => toast.error(apiErrorMsg(e, 'Failed to update wallet')),
  })

  return (
    <div className="card flex items-center gap-4">
      <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
        <Wallet size={20} className="text-green-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 mb-1">Wallet Balance</p>
        {editing ? (
          <div className="flex items-center gap-2">
            <span className="text-gray-500">₹</span>
            <input
              type="number"
              step="0.01"
              value={val}
              onChange={(e) => setVal(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-brand-500"
              autoFocus
            />
            <button onClick={() => save.mutate()} disabled={save.isPending}
              className="p-1 text-green-600 hover:bg-green-50 rounded">
              {save.isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            </button>
            <button onClick={() => setEditing(false)} className="p-1 text-gray-400 hover:bg-gray-100 rounded">
              <X size={14} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <p className="text-xl font-bold text-gray-900">₹{balance.toFixed(2)}</p>
            <button onClick={() => { setVal(balance.toFixed(2)); setEditing(true) }}
              className="p-1 text-gray-400 hover:text-brand-600 hover:bg-gray-100 rounded">
              <Edit2 size={13} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function BookingsTab({ farmerId, bookings }: { farmerId: string; bookings: FarmerBooking[] }) {
  const qc = useQueryClient()
  const [filter, setFilter] = useState('')

  const hold = useMutation({
    mutationFn: (id: number) => adminApi.holdBooking(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-farmer', farmerId] }); toast.success('Booking placed On Hold') },
    onError: (e: unknown) => toast.error(apiErrorMsg(e, 'Failed')),
  })
  const release = useMutation({
    mutationFn: (id: number) => adminApi.releaseBooking(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-farmer', farmerId] }); toast.success('Booking released') },
    onError: (e: unknown) => toast.error(apiErrorMsg(e, 'Failed')),
  })

  const statuses = ['', 'Pending', 'Confirmed', 'In_Progress', 'On_Hold', 'Completed', 'Cancelled']
  const visible = filter ? bookings.filter((b) => b.service_status === filter) : bookings

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {statuses.map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1 rounded-lg text-xs font-medium ${
              filter === s ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-400'
            }`}>
            {s || 'All'}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="card text-center py-10 text-gray-400">No bookings</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm bg-white rounded-xl border border-gray-100 overflow-hidden">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                {['Booking', 'Station', 'Scheduled', 'Status', 'Cost', 'Fields', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-medium text-xs uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {visible.map((b) => (
                <tr key={b.booking_id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-gray-400">#{b.booking_id}</td>
                  <td className="px-4 py-3 text-gray-600">{b.station_id ? `Station #${b.station_id}` : '—'}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {format(new Date(b.scheduled_start), 'MMM d, HH:mm')}
                  </td>
                  <td className="px-4 py-3">
                    <span className={STATUS_COLORS[b.service_status] ?? 'badge-gray'}>{b.service_status}</span>
                  </td>
                  <td className="px-4 py-3 font-medium">₹{b.total_cost.toFixed(2)}</td>
                  <td className="px-4 py-3 text-gray-500">{b.fields_count}</td>
                  <td className="px-4 py-3">
                    {b.service_status === 'On_Hold' ? (
                      <button onClick={() => release.mutate(b.booking_id)}
                        disabled={release.isPending}
                        className="text-xs px-2 py-1 bg-green-50 text-green-700 hover:bg-green-100 rounded font-medium">
                        Release
                      </button>
                    ) : !['Completed', 'Cancelled'].includes(b.service_status) ? (
                      <button onClick={() => hold.mutate(b.booking_id)}
                        disabled={hold.isPending}
                        className="text-xs px-2 py-1 bg-orange-50 text-orange-700 hover:bg-orange-100 rounded font-medium">
                        Hold
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function FileLink({ label, path }: { label: string, path: string | null }) {
  if (!path) return null
  
  const download = async () => {
    try {
      const url = await adminApi.getMissionDownloadUrl(path)
      const a = document.createElement('a')
      a.href = url
      a.download = path.split('/').pop() || 'file'
      a.click()
    } catch (e) {
      toast.error('Failed to get download link')
    }
  }

  return (
    <button onClick={download} className="flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-700 font-medium bg-brand-50 px-2 py-1 rounded">
      <Download size={12} />
      {label}
    </button>
  )
}

function FieldCard({ field, farmerId, stations }: { field: AdminField; farmerId: string; stations: Station[] }) {
  const qc = useQueryClient()
  const [changingStation, setChangingStation] = useState(false)
  const [selectedStation, setSelectedStation] = useState<string>(field.station_id?.toString() ?? '')
  const [uploadOpen, setUploadOpen] = useState(false)
  const b2fRef  = useRef<HTMLInputElement>(null)
  const f2bRef  = useRef<HTMLInputElement>(null)
  const sprayRef = useRef<HTMLInputElement>(null)
  const excRef  = useRef<HTMLInputElement>(null)

  const updateStation = useMutation({
    mutationFn: () => adminApi.updateFieldStation(
      field.field_id,
      selectedStation ? parseInt(selectedStation) : null,
    ),
    onSuccess: () => {
      toast.success('Station updated')
      qc.invalidateQueries({ queryKey: ['admin-farmer', farmerId] })
      setChangingStation(false)
    },
    onError: (e: unknown) => toast.error(apiErrorMsg(e, 'Failed')),
  })

  const uploadMissions = useMutation({
    mutationFn: () => {
      const fd = new FormData()
      if (b2fRef.current?.files?.[0])   fd.append('base_to_field', b2fRef.current.files[0])
      if (f2bRef.current?.files?.[0])   fd.append('field_to_base', f2bRef.current.files[0])
      if (sprayRef.current?.files?.[0]) fd.append('polygon_spray', sprayRef.current.files[0])
      if (excRef.current?.files?.[0])   fd.append('exclusion',     excRef.current.files[0])
      return adminApi.uploadFieldMissions(field.field_id, fd)
    },
    onSuccess: () => {
      toast.success('Mission files uploaded')
      qc.invalidateQueries({ queryKey: ['admin-farmer', farmerId] })
      setUploadOpen(false)
    },
    onError: (e: unknown) => toast.error(apiErrorMsg(e, 'Upload failed')),
  })

  return (
    <div className="card space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-gray-900">{field.field_name}</p>
            {field.is_verified
              ? <span className="badge-green flex items-center gap-1"><CheckCircle2 size={11} /> Verified</span>
              : <span className="badge-yellow flex items-center gap-1"><Clock size={11} /> Pending</span>}
            {field.has_missions && (
              <span className="badge-blue flex items-center gap-1"><CheckCircle2 size={11} /> Missions Ready</span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            {field.crop_type ?? 'Unknown crop'} · {field.area_acres.toFixed(2)} acres ·
            Created {format(new Date(field.created_at), 'MMM d, yyyy')}
          </p>
        </div>
      </div>

      {/* Mission Files row */}
      {(field.base_to_field_file_path || field.field_to_base_file_path || field.mission_file_path || field.exclusion_file_path) && (
        <div className="flex flex-wrap gap-2 py-1">
          <FileLink label="Base → Field" path={field.base_to_field_file_path} />
          <FileLink label="Field → Base" path={field.field_to_base_file_path} />
          <FileLink label="Polygon Mission" path={field.mission_file_path} />
          <FileLink label="Exclusion" path={field.exclusion_file_path} />
        </div>
      )}

      {/* Station row */}
      <div className="flex items-center gap-2 flex-wrap">
        <MapPin size={14} className="text-gray-400" />
        {changingStation ? (
          <>
            <select
              value={selectedStation}
              onChange={(e) => setSelectedStation(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
              <option value="">Unassigned</option>
              {stations.map((s) => (
                <option key={s.station_id} value={s.station_id}>{s.station_serial_no}</option>
              ))}
            </select>
            <button onClick={() => updateStation.mutate()} disabled={updateStation.isPending}
              className="text-xs px-2 py-1 bg-brand-600 text-white hover:bg-brand-700 rounded font-medium flex items-center gap-1">
              {updateStation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
              Save
            </button>
            <button onClick={() => setChangingStation(false)} className="text-xs text-gray-400 hover:text-gray-600">
              Cancel
            </button>
          </>
        ) : (
          <>
            <span className="text-sm text-gray-600">
              {field.station_serial_no ? `Station: ${field.station_serial_no}` : 'No station assigned'}
            </span>
            <button onClick={() => { setSelectedStation(field.station_id?.toString() ?? ''); setChangingStation(true) }}
              className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded font-medium">
              Change Station
            </button>
          </>
        )}
      </div>

      {/* Re-upload missions */}
      <div>
        <button onClick={() => setUploadOpen(!uploadOpen)}
          className="text-xs px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded font-medium flex items-center gap-1">
          <Upload size={12} /> {uploadOpen ? 'Cancel Upload' : 'Re-upload Missions'}
        </button>

        {uploadOpen && (
          <div className="mt-3 space-y-2 p-3 bg-gray-50 rounded-lg">
            {[
              { ref: b2fRef,   label: 'Base → Field Mission (required)',  },
              { ref: f2bRef,   label: 'Field → Base Mission (required)',  },
              { ref: sprayRef, label: 'Spray Polygon Mission (required)', },
              { ref: excRef,   label: 'Exclusion / Geofence (optional)',  },
            ].map(({ ref, label }) => (
              <div key={label}>
                <label className="block text-xs text-gray-500 mb-1">{label}</label>
                <input type="file" ref={ref} accept=".plan,.mission,.waypoints" className="text-xs w-full" />
              </div>
            ))}
            <button onClick={() => uploadMissions.mutate()} disabled={uploadMissions.isPending}
              className="btn-primary w-full flex items-center justify-center gap-2 text-sm mt-2">
              {uploadMissions.isPending
                ? <><Loader2 size={14} className="animate-spin" /> Uploading…</>
                : <><Upload size={14} /> Upload Mission Files</>}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function FarmerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [tab, setTab] = useState<'bookings' | 'fields'>('bookings')

  const { data: farmer, isLoading } = useQuery<FarmerDetail>({
    queryKey: ['admin-farmer', id],
    queryFn: () => adminApi.getFarmerDetail(id!),
    enabled: !!id,
  })

  const { data: stations = [] } = useQuery<Station[]>({
    queryKey: ['admin-stations'],
    queryFn: adminApi.listStations,
  })

  if (isLoading) return (
    <div className="flex justify-center py-20"><Loader2 size={24} className="animate-spin text-brand-500" /></div>
  )
  if (!farmer) return (
    <div className="card text-center py-16 text-gray-400">Farmer not found</div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/admin/farmers')}
          className="p-1 text-gray-400 hover:text-gray-700 rounded">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{farmer.full_name}</h1>
          <p className="text-gray-500 text-sm">@{farmer.username} · #{farmer.farmer_id}</p>
        </div>
        <span className={`ml-auto ${farmer.is_active ? 'badge-green' : 'badge-gray'}`}>
          {farmer.is_active ? 'Active' : 'Inactive'}
        </span>
      </div>

      {/* Profile + Wallet row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card space-y-1">
          <p className="text-xs text-gray-500 uppercase font-medium mb-2">Profile</p>
          <p className="text-sm"><span className="text-gray-500">Mobile:</span> {farmer.mobile_number}</p>
          {farmer.email && <p className="text-sm"><span className="text-gray-500">Email:</span> {farmer.email}</p>}
          {farmer.address && <p className="text-sm"><span className="text-gray-500">Address:</span> {farmer.address}</p>}
          <p className="text-sm"><span className="text-gray-500">Joined:</span> {format(new Date(farmer.created_at), 'MMM d, yyyy')}</p>
        </div>
        <WalletCard farmerId={farmer.farmer_id} balance={farmer.wallet_balance} />
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(['bookings', 'fields'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize ${
              tab === t ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300'
            }`}>
            {t} ({t === 'bookings' ? farmer.bookings.length : farmer.fields.length})
          </button>
        ))}
      </div>

      {tab === 'bookings' ? (
        <BookingsTab farmerId={farmer.farmer_id} bookings={farmer.bookings} />
      ) : (
        <div className="space-y-3">
          {farmer.fields.length === 0
            ? <div className="card text-center py-10 text-gray-400">No fields</div>
            : farmer.fields.map((f) => (
                <FieldCard key={f.field_id} field={f} farmerId={farmer.farmer_id} stations={stations} />
              ))
          }
        </div>
      )}
    </div>
  )
}
