import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { adminApi } from '@/api/admin'
import { Loader2, ChevronRight, Wallet } from 'lucide-react'
import { format } from 'date-fns'

interface FarmerUser {
  account_id: number
  full_name?: string
  mobile_number?: string
  is_active: boolean
  created_at: string
}

export default function FarmersPage() {
  const navigate = useNavigate()
  const { data: farmers = [], isLoading } = useQuery<FarmerUser[]>({
    queryKey: ['admin-farmers'],
    queryFn: () => adminApi.listUsers({ role: 'Farmer' }),
  })

  if (isLoading) return (
    <div className="flex justify-center py-20">
      <Loader2 size={24} className="animate-spin text-brand-500" />
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Farmers ({farmers.length})</h1>
        <p className="text-gray-500 text-sm">Select a farmer to view bookings, wallet, and fields.</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm bg-white rounded-xl border border-gray-100 overflow-hidden">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              {['ID', 'Name', 'Mobile', 'Joined', 'Status', ''].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium text-xs uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {farmers.map((f: FarmerUser) => (
              <tr
                key={f.account_id}
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => navigate(`/admin/farmers/${f.account_id}`)}
              >
                <td className="px-4 py-3 font-mono text-gray-400">#{f.account_id}</td>
                <td className="px-4 py-3 font-medium">{f.full_name ?? '—'}</td>
                <td className="px-4 py-3 text-gray-500">{f.mobile_number ?? '—'}</td>
                <td className="px-4 py-3 text-gray-500">{format(new Date(f.created_at), 'MMM d, yyyy')}</td>
                <td className="px-4 py-3">
                  <span className={f.is_active ? 'badge-green' : 'badge-gray'}>
                    {f.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-400">
                  <ChevronRight size={16} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {farmers.length === 0 && (
          <div className="card text-center py-16 text-gray-400 mt-4">No farmers registered yet</div>
        )}
      </div>
    </div>
  )
}
