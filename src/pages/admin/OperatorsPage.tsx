import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, X, Loader2, UserCheck, UserX, Eye, EyeOff, Pencil, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { supabase } from '@/api/supabase'

// ── Types ──────────────────────────────────────────────────────────────────────

interface Operator {
  account_id: string
  username: string
  is_active: boolean
  created_at: string
  full_name: string
  mobile_number: string
  email: string | null
  address: string | null
  assigned_base_station_id: number | null
}

interface Station { station_id: number; station_serial_no: string; status: string }

// ── Schemas ────────────────────────────────────────────────────────────────────

const createSchema = z.object({
  full_name:     z.string().min(2, 'Enter full name'),
  mobile_number: z.string().regex(/^[6-9]\d{9}$/, 'Enter 10-digit mobile number'),
  username:      z.string().min(3, 'Min 3 characters'),
  email:         z.string().email('Invalid email'),
  password:      z.string().min(8, 'Min 8 characters'),
  address:       z.string().optional(),
  assigned_base_station_id: z.number().nullable().optional(),
})
type CreateForm = z.infer<typeof createSchema>

const editSchema = z.object({
  full_name:     z.string().min(2, 'Enter full name'),
  mobile_number: z.string().regex(/^[6-9]\d{9}$/, 'Enter 10-digit mobile number'),
  email:         z.string().email('Invalid email').optional().or(z.literal('')),
  address:       z.string().optional(),
  assigned_base_station_id: z.number().nullable().optional(),
  password:      z.string().min(8, 'Min 8 characters').optional().or(z.literal('')),
})
type EditForm = z.infer<typeof editSchema>

import { adminApi } from '@/api/admin'

// ── Component ──────────────────────────────────────────────────────────────────

export default function OperatorsPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm]       = useState(false)
  const [showPwd, setShowPwd]         = useState(false)
  const [editTarget, setEditTarget]   = useState<Operator | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Operator | null>(null)

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: operators = [], isLoading } = useQuery<Operator[]>({
    queryKey: ['admin-operators'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('operators')
        .select(`
          operator_id, full_name, mobile_number, email, address, assigned_base_station_id,
          accounts ( username, is_active, created_at )
        `)
      if (error) throw new Error(error.message)
      return (data ?? []).map((op) => {
        const acc = op.accounts as { username: string; is_active: boolean; created_at: string } | null
        return {
          account_id:               op.operator_id,
          username:                 acc?.username ?? '',
          is_active:                acc?.is_active ?? true,
          created_at:               acc?.created_at ?? '',
          full_name:                op.full_name,
          mobile_number:            op.mobile_number,
          email:                    op.email,
          address:                  op.address,
          assigned_base_station_id: op.assigned_base_station_id,
        }
      })
    },
  })

  const { data: stations = [] } = useQuery<Station[]>({
    queryKey: ['admin-stations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('base_stations')
        .select('station_id, station_serial_no, status')
      if (error) throw new Error(error.message)
      return data ?? []
    },
  })

  // ── Forms ──────────────────────────────────────────────────────────────────

  const createForm = useForm<CreateForm>({ resolver: zodResolver(createSchema) })
  const editForm   = useForm<EditForm>({ resolver: zodResolver(editSchema) })

  // ── Mutations ──────────────────────────────────────────────────────────────

  const create = useMutation({
    mutationFn: (d: CreateForm) => adminApi.createOperator({
      email: d.email, password: d.password, username: d.username,
      full_name: d.full_name, mobile_number: d.mobile_number,
      address: d.address || null,
      assigned_base_station_id: d.assigned_base_station_id ?? null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-operators'] })
      toast.success('Operator account created!')
      createForm.reset(); setShowForm(false)
    },
    onError: (err: Error) => {
      if (err.message.includes('Unexpected end of JSON input') || err.message.includes('404')) {
        toast.error('Local API not running. Use "npx netlify dev" to create operators.')
      } else {
        toast.error(err.message)
      }
    },
  })

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: EditForm }) => adminApi.updateOperator(id, {
      full_name: data.full_name, mobile_number: data.mobile_number,
      email: data.email || null, address: data.address || null,
      assigned_base_station_id: data.assigned_base_station_id ?? null,
      password: data.password || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-operators'] })
      toast.success('Operator updated')
      setEditTarget(null)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const toggle = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      is_active ? adminApi.deactivateUser(id) : adminApi.activateUser(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-operators'] }); toast.success('Updated') },
    onError: (err: Error) => toast.error(err.message),
  })

  const remove = useMutation({
    mutationFn: (id: string) => adminApi.deleteUser(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-operators'] })
      toast.success('Operator deleted')
      setDeleteTarget(null)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const openEdit = (op: Operator) => {
    editForm.reset({
      full_name: op.full_name, mobile_number: op.mobile_number,
      email: op.email ?? '', address: op.address ?? '',
      assigned_base_station_id: op.assigned_base_station_id,
    })
    setEditTarget(op)
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (isLoading) return (
    <div className="flex justify-center py-20">
      <Loader2 size={24} className="animate-spin text-brand-500" />
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Operators ({operators.length})</h1>
        <button onClick={() => { setShowForm(true); createForm.reset() }}
          className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add Operator
        </button>
      </div>

      {/* ── Add Operator modal ─────────────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-bold text-lg text-gray-900">Add Operator Account</h2>
                <p className="text-sm text-gray-500 mt-0.5">Operator logs in with email & password you set</p>
              </div>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>

            <form onSubmit={createForm.handleSubmit((d) => create.mutate(d))} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name <span className="text-red-500">*</span></label>
                  <input {...createForm.register('full_name')} className="input" placeholder="Rajesh Kumar" />
                  {createForm.formState.errors.full_name && <p className="text-red-500 text-xs mt-1">{createForm.formState.errors.full_name.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mobile <span className="text-red-500">*</span></label>
                  <input {...createForm.register('mobile_number')} className="input" placeholder="9876543210" />
                  {createForm.formState.errors.mobile_number && <p className="text-red-500 text-xs mt-1">{createForm.formState.errors.mobile_number.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
                  <input {...createForm.register('email')} type="email" className="input" placeholder="rajesh@example.com" />
                  {createForm.formState.errors.email && <p className="text-red-500 text-xs mt-1">{createForm.formState.errors.email.message}</p>}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address (optional)</label>
                <textarea {...createForm.register('address')} className="input resize-none" rows={2} placeholder="Door No, Street, City" />
              </div>
              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Login Credentials</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Username <span className="text-red-500">*</span></label>
                    <input {...createForm.register('username')} className="input" placeholder="rajesh_op" autoComplete="off" />
                    {createForm.formState.errors.username && <p className="text-red-500 text-xs mt-1">{createForm.formState.errors.username.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <input {...createForm.register('password')} type={showPwd ? 'text' : 'password'}
                        className="input pr-10" placeholder="Min 8 chars" autoComplete="new-password" />
                      <button type="button" onClick={() => setShowPwd(!showPwd)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    {createForm.formState.errors.password && <p className="text-red-500 text-xs mt-1">{createForm.formState.errors.password.message}</p>}
                  </div>
                </div>
              </div>
              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Station Assignment</p>
                <select
                  {...createForm.register('assigned_base_station_id', { setValueAs: (v) => v === '' ? null : Number(v) })}
                  className="input">
                  <option value="">— Not assigned yet —</option>
                  {stations.filter((s) => s.status !== 'Offline').map((s) => (
                    <option key={s.station_id} value={s.station_id}>
                      Station #{s.station_id} — {s.station_serial_no} ({s.status})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={create.isPending} className="btn-primary flex-1">
                  {create.isPending ? 'Creating…' : 'Create Operator'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit modal ─────────────────────────────────────────────────────── */}
      {editTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-bold text-lg text-gray-900">Edit Operator</h2>
                <p className="text-sm text-gray-500 mt-0.5">@{editTarget.username}</p>
              </div>
              <button onClick={() => setEditTarget(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>

            <form onSubmit={editForm.handleSubmit((d) => update.mutate({ id: editTarget.account_id, data: d }))} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name <span className="text-red-500">*</span></label>
                  <input {...editForm.register('full_name')} className="input" />
                  {editForm.formState.errors.full_name && <p className="text-red-500 text-xs mt-1">{editForm.formState.errors.full_name.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mobile <span className="text-red-500">*</span></label>
                  <input {...editForm.register('mobile_number')} className="input" />
                  {editForm.formState.errors.mobile_number && <p className="text-red-500 text-xs mt-1">{editForm.formState.errors.mobile_number.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input {...editForm.register('email')} type="email" className="input" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea {...editForm.register('address')} className="input resize-none" rows={2} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password (leave blank to keep current)</label>
                <div className="relative">
                  <input {...editForm.register('password')} type={showPwd ? 'text' : 'password'}
                    className="input pr-10" placeholder="New password (min 8 chars)" autoComplete="new-password" />
                  <button type="button" onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {editForm.formState.errors.password && <p className="text-red-500 text-xs mt-1">{editForm.formState.errors.password.message}</p>}
              </div>

              <div className="border-t border-gray-100 pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Assign to Station</label>
                <select
                  {...editForm.register('assigned_base_station_id', { setValueAs: (v) => v === '' ? null : Number(v) })}
                  className="input">
                  <option value="">— Unassigned —</option>
                  {stations.map((s) => (
                    <option key={s.station_id} value={s.station_id}>
                      Station #{s.station_id} — {s.station_serial_no} ({s.status})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditTarget(null)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={update.isPending} className="btn-primary flex-1">
                  {update.isPending ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete confirm ─────────────────────────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="font-bold text-lg text-gray-900 mb-2">Delete Operator?</h2>
            <p className="text-sm text-gray-500 mb-6">
              This will permanently delete <span className="font-medium text-gray-800">{deleteTarget.full_name}</span> (@{deleteTarget.username}).
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="btn-secondary flex-1">Cancel</button>
              <button
                onClick={() => remove.mutate(deleteTarget.account_id)}
                disabled={remove.isPending}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-60">
                {remove.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      {operators.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-gray-400 text-sm">No operators yet. Click "Add Operator" to create the first one.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm bg-white rounded-xl border border-gray-100 overflow-hidden">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                {['Name', 'Username', 'Mobile', 'Email', 'Station', 'Joined', 'Status', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {operators.map((op) => (
                <tr key={op.account_id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{op.full_name}</td>
                  <td className="px-4 py-3 text-gray-600">@{op.username}</td>
                  <td className="px-4 py-3 text-gray-500">{op.mobile_number}</td>
                  <td className="px-4 py-3 text-gray-500">{op.email ?? '—'}</td>
                  <td className="px-4 py-3">
                    {op.assigned_base_station_id
                      ? <span className="badge-blue">Station #{op.assigned_base_station_id}</span>
                      : <span className="badge-gray">Unassigned</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {op.created_at ? format(new Date(op.created_at), 'MMM d, yyyy') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={op.is_active ? 'badge-green' : 'badge-gray'}>
                      {op.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(op)}
                        className="p-1 rounded text-gray-400 hover:text-brand-600 transition-colors" title="Edit">
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => toggle.mutate({ id: op.account_id, is_active: op.is_active })}
                        className={`p-1 rounded transition-colors ${op.is_active ? 'text-gray-400 hover:text-red-500' : 'text-gray-400 hover:text-green-600'}`}
                        title={op.is_active ? 'Deactivate' : 'Activate'}>
                        {op.is_active ? <UserX size={14} /> : <UserCheck size={14} />}
                      </button>
                      <button onClick={() => setDeleteTarget(op)}
                        className="p-1 rounded text-gray-400 hover:text-red-600 transition-colors" title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
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
