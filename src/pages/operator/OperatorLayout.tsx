import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Map, ClipboardList, Cpu, LogOut, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'

const nav = [
  { to: '/operator',        icon: LayoutDashboard, label: 'Dashboard',      end: true },
  { to: '/operator/fields', icon: Map,             label: 'Field Verify' },
  { to: '/operator/jobs',   icon: ClipboardList,   label: 'Jobs' },
  { to: '/operator/drones', icon: Cpu,             label: 'Drone Control' },
]

export default function OperatorLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-100 flex flex-col
        transform transition-transform duration-200
        ${open ? 'translate-x-0' : '-translate-x-full'}
        lg:relative lg:translate-x-0
      `}>
        <div className="h-16 flex items-center gap-2 px-6 border-b border-gray-100">
          <img src="/drone-icon.svg" alt="FLYTERRA" className="w-8 h-8 object-contain" />
          <span className="font-bold text-gray-900 tracking-wider">FLYTERRA</span>
          <button onClick={() => setOpen(false)} className="ml-auto lg:hidden"><X size={18} /></button>
        </div>
        <div className="px-4 py-3 mx-3 mt-3 bg-brand-50 rounded-lg">
          <p className="text-xs text-brand-600 font-medium">Operator</p>
          <p className="text-sm font-semibold text-gray-900 truncate">{user?.full_name ?? user?.username}</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {nav.map(({ to, icon: Icon, label, end }) => (
            <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:bg-gray-50'
                }`}>
              <Icon size={18} /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t">
          <button onClick={() => { logout(); navigate('/') }}
            className="flex items-center gap-3 px-3 py-2.5 w-full text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg">
            <LogOut size={18} /> Sign Out
          </button>
        </div>
      </aside>
      {open && <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={() => setOpen(false)} />}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b flex items-center px-4 lg:px-6">
          <button onClick={() => setOpen(true)} className="lg:hidden text-gray-500 mr-4"><Menu size={22} /></button>
          <span className="font-semibold text-gray-700">Operator Dashboard</span>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 page-enter"><Outlet /></main>
      </div>
    </div>
  )
}
