import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '@/api/admin'
import { useForm } from 'react-hook-form'
import { Plus, Trash2, Edit2, Loader2, X, Zap, MapPin, RefreshCw, Activity } from 'lucide-react'
import toast from 'react-hot-toast'

interface Battery {
  battery_id: number; battery_serial_no: string; status: string
  station_id: number | null; min_voltage: number; total_life_cycles: number; active_date: string
}

interface BatteryDetail {
  battery_id: number; battery_serial_no: string; active_date: string
  station_id: number | null; station_serial_no: string | null
  min_voltage: number; total_life_cycles: number; used_cycles: number; status: string
  last_seen: string | null; voltage_total: number | null; current_amps: number | null
  remaining_pct: number | null; cell_voltages: number[] | null; on_drone_now: boolean
}

// ── Cell voltage bars ──────────────────────────────────────────────────────────
function CellBars({ cells, minV }: { cells: number[]; minV: number }) {
  const maxV = 4.2
  return (
    <div className="flex gap-2 flex-wrap">
      {cells.map((v, i) => {
        const pct = Math.max(0, Math.min(100, ((v - minV) / (maxV - minV)) * 100))
        const color =
          pct > 50 ? '#22c55e' : pct > 20 ? '#f59e0b' : '#ef4444'
        return (
          <div key={i} className="flex flex-col items-center gap-1">
            <div
              style={{ width: 36, height: 56, background: '#f1f5f9', borderRadius: 6,
                       border: '1px solid #e2e8f0', display: 'flex',
                       flexDirection: 'column', justifyContent: 'flex-end',
                       overflow: 'hidden', position: 'relative' }}
            >
              <div style={{ height: `${pct}%`, background: color, transition: 'height .4s' }} />
            </div>
            <span className="text-xs font-mono text-gray-500">{v.toFixed(3)}V</span>
            <span className="text-xs text-gray-400">C{i + 1}</span>
          </div>
        )
      })}
    </div>
  )
}

// ── Battery Detail Modal ───────────────────────────────────────────────────────
function BatteryDetailModal({ battery, onClose }: { battery: Battery; onClose: () => void }) {
  const { data: detail, isLoading } = useQuery<BatteryDetail>({
    queryKey: ['battery-detail', battery.battery_id],
    queryFn: () => adminApi.getBatteryDetail(battery.battery_id),
    refetchInterval: 15_000,   // refresh every 15s to track live voltage
  })

  const usedPct = detail
    ? Math.min(100, Math.round((detail.used_cycles / detail.total_life_cycles) * 100))
    : 0
  const healthColor =
    usedPct < 60 ? 'text-green-600' : usedPct < 85 ? 'text-amber-500' : 'text-red-500'
  const healthBarColor =
    usedPct < 60 ? '#22c55e' : usedPct < 85 ? '#f59e0b' : '#ef4444'

  const batPct = detail?.remaining_pct ?? null
  const batColor =
    batPct == null ? '#94a3b8'
    : batPct > 50 ? '#22c55e' : batPct > 20 ? '#f59e0b' : '#ef4444'

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-50 rounded-lg">
              <Zap size={18} className="text-yellow-500" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">{battery.battery_serial_no}</h2>
              <p className="text-xs text-gray-400">Battery #{battery.battery_id}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <X size={20} />
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={24} className="animate-spin text-brand-500" />
          </div>
        ) : detail ? (
          <div className="p-6 space-y-6">

            {/* Status + Location row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Status</p>
                <div className="flex items-center gap-2">
                  <span className={
                    detail.status === 'Active' ? 'badge-green'
                    : detail.status === 'Charging' ? 'badge-blue'
                    : detail.status === 'In_Use' ? 'badge-yellow' : 'badge-gray'
                  }>{detail.status}</span>
                  {detail.on_drone_now && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium
                                     text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                      On Drone
                    </span>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Location</p>
                <div className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                  <MapPin size={14} className="text-gray-400" />
                  {detail.station_serial_no
                    ? `Station ${detail.station_serial_no}`
                    : 'Unassigned'}
                </div>
                {detail.last_seen && (
                  <p className="text-xs text-gray-400 mt-1">
                    Last seen: {new Date(detail.last_seen).toLocaleString()}
                  </p>
                )}
              </div>
            </div>

            {/* Lifecycle progress */}
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <RefreshCw size={15} className="text-gray-400" />
                  <p className="text-sm font-semibold text-gray-700">Lifecycle Usage</p>
                </div>
                <span className={`text-sm font-bold ${healthColor}`}>
                  {detail.used_cycles} / {detail.total_life_cycles} cycles
                </span>
              </div>
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  style={{ width: `${usedPct}%`, background: healthBarColor,
                           height: '100%', borderRadius: 9999, transition: 'width .5s' }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1.5">
                <span>{usedPct}% of rated life used</span>
                <span>{detail.total_life_cycles - detail.used_cycles} cycles remaining</span>
              </div>
            </div>

            {/* Live voltage stats */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Activity size={15} className="text-gray-400" />
                <p className="text-sm font-semibold text-gray-700">Voltage & Current</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Pack Voltage', value: detail.voltage_total != null ? `${detail.voltage_total.toFixed(2)} V` : '—' },
                  { label: 'Current Draw', value: detail.current_amps  != null ? `${detail.current_amps.toFixed(1)} A`  : '—' },
                  { label: 'Remaining',    value: batPct               != null ? `${batPct}%`                            : '—' },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-400 mb-1">{label}</p>
                    <p className="text-lg font-bold font-mono text-gray-800">{value}</p>
                  </div>
                ))}
              </div>
              {/* Remaining % bar */}
              {batPct != null && (
                <div className="mt-3 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div style={{ width: `${batPct}%`, background: batColor,
                                height: '100%', borderRadius: 9999, transition: 'width .5s' }} />
                </div>
              )}
            </div>

            {/* Cell voltages */}
            {detail.cell_voltages && detail.cell_voltages.length > 0 ? (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Zap size={15} className="text-gray-400" />
                  <p className="text-sm font-semibold text-gray-700">
                    Cell Voltages
                    <span className="ml-2 text-xs font-normal text-gray-400">
                      ({detail.cell_voltages.length} cells)
                    </span>
                  </p>
                </div>
                <CellBars cells={detail.cell_voltages} minV={detail.min_voltage / detail.cell_voltages.length} />
                <div className="flex justify-between text-xs text-gray-400 mt-3">
                  <span>
                    Min cell: {Math.min(...detail.cell_voltages).toFixed(3)} V
                  </span>
                  <span>
                    Max cell: {Math.max(...detail.cell_voltages).toFixed(3)} V
                  </span>
                  <span>
                    Δ: {(Math.max(...detail.cell_voltages) - Math.min(...detail.cell_voltages)).toFixed(3)} V
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-gray-400 bg-gray-50 rounded-xl">
                <Zap size={24} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">No cell voltage data yet</p>
                <p className="text-xs mt-1">Cell data appears when battery is active on a drone</p>
              </div>
            )}

            {/* Specs footer */}
            <div className="border-t border-gray-100 pt-4 grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
              {[
                ['Min Voltage',    `${detail.min_voltage} V`],
                ['Total Cycles',   String(detail.total_life_cycles)],
                ['Active Since',   new Date(detail.active_date).toLocaleDateString()],
                ['Station ID',     detail.station_id ? `#${detail.station_id}` : '—'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-gray-400">{k}</span>
                  <span className="font-medium text-gray-700">{v}</span>
                </div>
              ))}
            </div>

          </div>
        ) : (
          <div className="p-8 text-center text-gray-400">Failed to load battery details.</div>
        )}
      </div>
    </div>
  )
}


// ── Main page ──────────────────────────────────────────────────────────────────
export default function BatteriesPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm]       = useState(false)
  const [editing, setEditing]         = useState<Battery | null>(null)
  const [detailBat, setDetailBat]     = useState<Battery | null>(null)
  const { data: batteries = [], isLoading } = useQuery({ queryKey: ['admin-batteries'], queryFn: adminApi.listBatteries })
  const { data: stations = [] }             = useQuery({ queryKey: ['admin-stations'],  queryFn: adminApi.listStations })
  const { register, handleSubmit, reset }   = useForm()

  const save = useMutation({
    mutationFn: (d: unknown) => editing ? adminApi.updateBattery(editing.battery_id, d) : adminApi.createBattery(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-batteries'] }); toast.success('Saved'); reset(); setShowForm(false); setEditing(null) },
    onError: () => toast.error('Failed'),
  })
  const del = useMutation({
    mutationFn: (id: number) => adminApi.deleteBattery(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-batteries'] }); toast.success('Deleted') },
    onError: () => toast.error('Delete failed'),
  })

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 size={24} className="animate-spin text-brand-500" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Batteries ({batteries.length})</h1>
        <button onClick={() => { setShowForm(true); setEditing(null); reset() }}
          className="btn-primary flex items-center gap-2"><Plus size={16} /> Add Battery</button>
      </div>

      {/* Add / Edit form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-bold text-lg">{editing ? 'Edit Battery' : 'Add Battery'}</h2>
              <button onClick={() => { setShowForm(false); setEditing(null) }}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit((d) => save.mutate(d))} className="space-y-4">
              {!editing && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Serial No</label>
                    <input {...register('battery_serial_no', { required: true })} className="input" placeholder="BAT-001" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Active Date</label>
                    <input {...register('active_date', { required: true })} type="date" className="input" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Min Voltage</label>
                      <input {...register('min_voltage', { required: true })} type="number" step="0.1" className="input" placeholder="22.2" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Life Cycles</label>
                      <input {...register('total_life_cycles', { required: true })} type="number" className="input" placeholder="500" />
                    </div>
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Station</label>
                <select {...register('station_id')} className="input">
                  <option value="">Unassigned</option>
                  {stations.map((s: { station_id: number; station_serial_no: string }) => (
                    <option key={s.station_id} value={s.station_id}>{s.station_serial_no}</option>
                  ))}
                </select>
              </div>
              {editing && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select {...register('status')} className="input">
                    <option>Active</option><option>Charging</option><option>In_Use</option><option>Retired</option>
                  </select>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowForm(false); setEditing(null) }} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={save.isPending} className="btn-primary flex-1">
                  {save.isPending ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Batteries table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm bg-white rounded-xl border border-gray-100 overflow-hidden">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              {['ID', 'Serial No', 'Station', 'Min Voltage', 'Life Cycles', 'Status', ''].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium text-xs uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {batteries.map((b: Battery) => (
              <tr key={b.battery_id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-gray-500">#{b.battery_id}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => setDetailBat(b)}
                    className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {b.battery_serial_no}
                  </button>
                </td>
                <td className="px-4 py-3 text-gray-500">{b.station_id ? `#${b.station_id}` : '—'}</td>
                <td className="px-4 py-3">{b.min_voltage}V</td>
                <td className="px-4 py-3">{b.total_life_cycles}</td>
                <td className="px-4 py-3">
                  <span className={
                    b.status === 'Active' ? 'badge-green'
                    : b.status === 'Charging' ? 'badge-blue'
                    : b.status === 'In_Use' ? 'badge-yellow' : 'badge-gray'
                  }>{b.status}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => setDetailBat(b)}
                      className="text-xs font-medium px-2 py-1 rounded bg-yellow-50 text-yellow-700
                                 hover:bg-yellow-100 flex items-center gap-1">
                      <Zap size={11} /> Detail
                    </button>
                    <button onClick={() => { setEditing(b); setShowForm(true) }}
                      className="text-gray-400 hover:text-blue-600 p-1"><Edit2 size={14} /></button>
                    <button onClick={() => { if (confirm('Delete?')) del.mutate(b.battery_id) }}
                      className="text-gray-400 hover:text-red-600 p-1"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Battery detail modal */}
      {detailBat && (
        <BatteryDetailModal battery={detailBat} onClose={() => setDetailBat(null)} />
      )}
    </div>
  )
}
