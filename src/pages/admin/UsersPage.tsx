import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '@/api/admin'
import { Loader2, UserCheck, UserX } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

interface User {
  account_id: number; username: string; role: string; is_active: boolean
  full_name?: string; mobile_number?: string; created_at: string
}

export default function UsersPage() {
  const qc = useQueryClient()
  const [roleFilter, setRoleFilter] = useState('')
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users', roleFilter],
    queryFn: () => adminApi.listUsers(roleFilter ? { role: roleFilter } : undefined),
  })

  const toggle = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      active ? adminApi.deactivateUser(id) : adminApi.activateUser(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); toast.success('Updated') },
    onError: () => toast.error('Failed'),
  })

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 size={24} className="animate-spin text-brand-500" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Users ({users.length})</h1>
        <div className="flex gap-2">
          {['', 'Farmer', 'Operator', 'Admin'].map((r) => (
            <button key={r} onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                roleFilter === r ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-400'
              }`}>
              {r || 'All'}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm bg-white rounded-xl border border-gray-100 overflow-hidden">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              {['ID', 'Name', 'Username', 'Role', 'Mobile', 'Joined', 'Status', ''].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium text-xs uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {users.map((u: User) => (
              <tr key={u.account_id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-gray-400">#{u.account_id}</td>
                <td className="px-4 py-3 font-medium">{u.full_name ?? '—'}</td>
                <td className="px-4 py-3 text-gray-600">@{u.username}</td>
                <td className="px-4 py-3">
                  <span className={u.role === 'Admin' ? 'badge-red' : u.role === 'Operator' ? 'badge-blue' : 'badge-green'}>
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">{u.mobile_number ?? '—'}</td>
                <td className="px-4 py-3 text-gray-500">{format(new Date(u.created_at), 'MMM d, yyyy')}</td>
                <td className="px-4 py-3">
                  <span className={u.is_active ? 'badge-green' : 'badge-gray'}>{u.is_active ? 'Active' : 'Inactive'}</span>
                </td>
                <td className="px-4 py-3">
                  {u.role !== 'Admin' && (
                    <button
                      onClick={() => toggle.mutate({ id: u.account_id, active: u.is_active })}
                      className={`p-1 rounded transition-colors ${
                        u.is_active ? 'text-gray-400 hover:text-red-500' : 'text-gray-400 hover:text-green-600'
                      }`}
                      title={u.is_active ? 'Deactivate' : 'Activate'}>
                      {u.is_active ? <UserX size={16} /> : <UserCheck size={16} />}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
