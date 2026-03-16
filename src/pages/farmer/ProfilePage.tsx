import { useAuth } from '@/contexts/AuthContext'
import { User, Phone, Calendar } from 'lucide-react'

export default function ProfilePage() {
  const { user } = useAuth()

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-2xl font-bold text-gray-900">Profile</h1>

      <div className="card">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center">
            <User size={28} className="text-brand-600" />
          </div>
          <div>
            <p className="font-bold text-xl text-gray-900">{user?.full_name ?? user?.username}</p>
            <span className="badge-green">Farmer</span>
          </div>
        </div>

        <div className="space-y-4 text-sm">
          {[
            { icon: User,     label: 'Username',    value: user?.username },
            { icon: Phone,    label: 'Mobile',      value: user?.mobile_number ?? '—' },
            { icon: Calendar, label: 'Account ID',  value: `#${user?.account_id}` },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <Icon size={14} className="text-gray-500" />
              </div>
              <div>
                <p className="text-gray-400 text-xs">{label}</p>
                <p className="font-medium text-gray-900">{value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
