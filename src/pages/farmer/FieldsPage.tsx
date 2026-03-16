import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { fieldsApi, Field } from '@/api/fields'
import { Plus, Trash2, MapPin, CheckCircle2, Clock, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'

function VerificationBadge({ isVerified }: { isVerified: boolean }) {
  if (isVerified)  return <span className="badge-green flex items-center gap-1"><CheckCircle2 size={12} /> Verified</span>
  return <span className="badge-yellow flex items-center gap-1"><Clock size={12} /> Pending Verification</span>
}

export default function FieldsPage() {
  const qc = useQueryClient()
  const { data: fields = [], isLoading } = useQuery({ queryKey: ['fields'], queryFn: fieldsApi.list })

  const del = useMutation({
    mutationFn: (id: number) => fieldsApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['fields'] }); toast.success('Field deleted') },
    onError:   () => toast.error('Failed to delete field'),
  })

  if (isLoading) return <div className="flex items-center justify-center h-48"><div className="animate-spin h-8 w-8 border-4 border-brand-500 border-t-transparent rounded-full" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Fields</h1>
          <p className="text-gray-500 text-sm mt-1">{fields.length} field{fields.length !== 1 ? 's' : ''} registered</p>
        </div>
        <Link to="/farmer/fields/new" className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add Field
        </Link>
      </div>

      {fields.length === 0 ? (
        <div className="card text-center py-20">
          <MapPin size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 font-medium">No fields yet</p>
          <p className="text-gray-400 text-sm mt-1">Draw your first field boundary to get started</p>
          <Link to="/farmer/fields/new" className="btn-primary mt-6 inline-flex items-center gap-2">
            <Plus size={16} /> Add First Field
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {fields.map((f) => (
            <div key={f.field_id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <MapPin size={18} className="text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{f.field_name}</p>
                    <p className="text-xs text-gray-500">{f.crop_type}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (confirm('Delete this field?')) del.mutate(f.field_id)
                  }}
                  className="text-gray-300 hover:text-red-500 transition-colors p-1">
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-gray-900">{f.area_acres.toFixed(2)}</p>
                  <p className="text-xs text-gray-500">acres</p>
                </div>
                <VerificationBadge isVerified={f.is_verified} />
              </div>

              {f.is_verified && (
                <Link to="/farmer/book" className="mt-4 btn-primary text-xs py-1.5 w-full block text-center">
                  Book Spray
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
