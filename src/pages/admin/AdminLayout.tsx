import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Radio, Cpu, Battery, Users, HardHat, LogOut, Menu, X, Settings2, BookOpen, Tractor } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'

const nav = [
  { to: '/admin',              icon: LayoutDashboard, label: 'Dashboard',  end: true },
  { to: '/admin/stations',     icon: Radio,           label: 'Stations' },
  { to: '/admin/drones',       icon: Cpu,             label: 'Drones' },
  { to: '/admin/batteries',    icon: Battery,         label: 'Batteries' },
  { to: '/admin/operators',    icon: HardHat,         label: 'Operators' },
  { to: '/admin/farmers',      icon: Tractor,         label: 'Farmers' },
  { to: '/admin/users',        icon: Users,           label: 'Users' },
  { to: '/admin/bookings',     icon: BookOpen,        label: 'Bookings' },
  { to: '/admin/settings',     icon: Settings2,       label: 'Settings' },
]

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 flex flex-col
        transform transition-transform duration-200
        ${open ? 'translate-x-0' : '-translate-x-full'}
        lg:relative lg:translate-x-0
      `}>
        <div className="h-16 flex items-center gap-2 px-6 border-b border-white/10">
          <img src="/drone-icon.svg" alt="FLYTERRA" className="w-8 h-8 object-contain brightness-200" />
          <span className="font-bold text-white tracking-wider">FLYTERRA</span>
          <button onClick={() => setOpen(false)} className="ml-auto lg:hidden text-gray-400"><X size={18} /></button>
        </div>
        <div className="px-4 py-3 mx-3 mt-3 bg-white/5 rounded-lg">
          <p className="text-xs text-gray-400">Admin Account</p>
          <p className="text-sm font-semibold text-white truncate">{user?.username}</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {nav.map(({ to, icon: Icon, label, end }) => (
            <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}>
              <Icon size={18} /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-white/10">
          <button onClick={() => { logout(); navigate('/') }}
            className="flex items-center gap-3 px-3 py-2.5 w-full text-sm text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg">
            <LogOut size={18} /> Sign Out
          </button>
        </div>
      </aside>
      {open && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setOpen(false)} />}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b flex items-center px-4 lg:px-6">
          <button onClick={() => setOpen(true)} className="lg:hidden text-gray-500 mr-4"><Menu size={22} /></button>
          <span className="font-semibold text-gray-700">Admin Dashboard</span>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 page-enter"><Outlet /></main>
      </div>
    </div>
  )
}
