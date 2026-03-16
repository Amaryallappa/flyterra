import { useQuery } from '@tanstack/react-query'
import { adminApi } from '@/api/admin'
import { Radio, Cpu, Battery, Users, TrendingUp, Activity, Loader2 } from 'lucide-react'

interface PeriodStats { bookings: number; completed: number; cancelled: number; revenue: number }

function StatCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: number | string; sub?: string; icon: React.ElementType; color: string
}) {
  return (
    <div className="card">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color} mb-3`}>
        <Icon size={18} />
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-sm text-gray-500">{label}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  )
}

function PeriodCard({ title, stats }: { title: string; stats: PeriodStats }) {
  return (
    <div className="card">
      <h3 className="font-semibold text-gray-700 mb-4">{title}</h3>
      <div className="grid grid-cols-2 gap-3">
        {[
          ['Bookings',  stats.bookings,  'bg-blue-50 text-blue-600'],
          ['Completed', stats.completed, 'bg-green-50 text-green-600'],
          ['Cancelled', stats.cancelled, 'bg-red-50 text-red-600'],
          ['Revenue',   `₹${(stats.revenue ?? 0).toFixed(0)}`, 'bg-purple-50 text-purple-600'],
        ].map(([label, value, color]) => (
          <div key={label as string} className={`rounded-lg px-3 py-2.5 ${color as string}`}>
            <p className="text-lg font-bold">{value}</p>
            <p className="text-xs font-medium opacity-70">{label as string}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  const { data, isLoading } = useQuery({ queryKey: ['admin-dashboard'], queryFn: adminApi.getDashboard })

  if (isLoading) return (
    <div className="flex items-center justify-center h-48">
      <Loader2 size={24} className="animate-spin text-brand-500" />
    </div>
  )
  if (!data) return null

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      {/* Asset counts */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Stations"        value={`${data.active_stations}/${data.total_stations}`}  sub="active/total" icon={Radio}    color="bg-blue-50 text-blue-600" />
        <StatCard label="Drones"          value={`${data.active_drones}/${data.total_drones}`}      sub="active/total" icon={Cpu}      color="bg-green-50 text-green-600" />
        <StatCard label="Batteries"       value={data.total_batteries}                              icon={Battery}     color="bg-yellow-50 text-yellow-600" />
        <StatCard label="Users"           value={`${data.total_farmers}F / ${data.total_operators}O`} icon={Users}    color="bg-purple-50 text-purple-600" />
      </div>

      {/* Live */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card bg-green-900 text-white">
          <div className="flex items-center gap-2 mb-2">
            <Activity size={16} className="text-green-400" />
            <span className="text-sm font-medium">Active Operations</span>
          </div>
          <p className="text-4xl font-extrabold">{data.active_operations}</p>
          <p className="text-green-300 text-xs mt-1">Drones in flight right now</p>
        </div>
        <div className="card bg-blue-900 text-white">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={16} className="text-blue-300" />
            <span className="text-sm font-medium">In-Progress Bookings</span>
          </div>
          <p className="text-4xl font-extrabold">{data.in_progress_bookings}</p>
          <p className="text-blue-300 text-xs mt-1">Currently being executed</p>
        </div>
      </div>

      {/* Period stats */}
      <div className="grid md:grid-cols-3 gap-4">
        <PeriodCard title="Today"      stats={data.today} />
        <PeriodCard title="This Week"  stats={data.this_week} />
        <PeriodCard title="This Month" stats={data.this_month} />
      </div>
    </div>
  )
}
