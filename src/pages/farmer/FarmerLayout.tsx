import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Map, CalendarPlus, ClipboardList, User, LogOut, Menu, X
} from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'

const nav = [
  { to: '/farmer',          icon: LayoutDashboard, label: 'Dashboard',  end: true },
  { to: '/farmer/fields',   icon: Map,             label: 'My Fields' },
  { to: '/farmer/book',     icon: CalendarPlus,    label: 'Book Service' },
  { to: '/farmer/bookings', icon: ClipboardList,   label: 'Bookings' },
  { to: '/farmer/profile',  icon: User,            label: 'Profile' },
]

export default function FarmerLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = () => { logout(); navigate('/') }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-100 flex flex-col
        transform transition-transform duration-200 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:relative lg:translate-x-0
      `}>
        {/* Logo */}
        <div className="h-16 flex items-center gap-2 px-6 border-b border-gray-100">
          <img src="/drone-icon.svg" alt="FLYTERRA" className="w-8 h-8 object-contain" />
          <span className="font-bold text-gray-900 tracking-wider">FLYTERRA</span>
          <button onClick={() => setSidebarOpen(false)} className="ml-auto lg:hidden text-gray-400">
            <X size={18} />
          </button>
        </div>

        {/* User badge */}
        <div className="px-4 py-3 mx-3 mt-3 bg-brand-50 rounded-lg">
          <p className="text-xs text-brand-600 font-medium">Farmer Account</p>
          <p className="text-sm font-semibold text-gray-900 truncate">{user?.full_name ?? user?.username}</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {nav.map(({ to, icon: Icon, label, end }) => (
            <NavLink key={to} to={to} end={end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }>
              <Icon size={18} /> {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-100">
          <button onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 w-full text-sm font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
            <LogOut size={18} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-gray-100 flex items-center gap-4 px-4 lg:px-6 flex-shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-500 hover:text-gray-700">
            <Menu size={22} />
          </button>
          <div className="flex-1" />
          <div className="text-sm text-gray-500">
            Welcome, <span className="font-medium text-gray-900">{user?.full_name ?? user?.username}</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6 page-enter">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
