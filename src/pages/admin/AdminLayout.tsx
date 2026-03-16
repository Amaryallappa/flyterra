import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Radio, Cpu, Battery, Users, HardHat, LogOut, Menu, X, Settings2, BookOpen, Tractor, Wifi, WifiOff } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'

const LS_KEY = 'drone_backend_url'

function ConnectionModal({ onClose }: { onClose: () => void }) {
  const [url, setUrl] = useState(localStorage.getItem(LS_KEY) || '')
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => { inputRef.current?.focus() }, [])

  function save() {
    const trimmed = url.trim()
    if (trimmed) {
      localStorage.setItem(LS_KEY, trimmed)
    } else {
      localStorage.removeItem(LS_KEY)
    }
    window.location.reload()
  }

  function clear() {
    localStorage.removeItem(LS_KEY)
    window.location.reload()
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-gray-900 border border-white/10 rounded-xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Wifi size={18} className="text-brand-400" />
            <h2 className="font-bold text-white text-base">Connection Settings</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={18} /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
              Backend URL (Cloudflare Tunnel)
            </label>
            <input
              ref={inputRef}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && save()}
              placeholder="https://xxxx.trycloudflare.com"
              className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-500"
            />
            <p className="text-xs text-gray-500 mt-1.5">
              Used for both REST API and Socket.IO telemetry. Leave blank to use same-origin (local dev only).
            </p>
          </div>

          <div className="bg-gray-800 rounded-lg p-3 text-xs text-gray-400 space-y-1 font-mono">
            <div className="text-gray-500 text-[10px] uppercase tracking-wider mb-1">Cloudflare Tunnel setup</div>
            <div><span className="text-yellow-400">1.</span> cloudflared tunnel --url http://localhost:8000</div>
            <div><span className="text-yellow-400">2.</span> Copy the https://xxxx.trycloudflare.com URL</div>
            <div><span className="text-yellow-400">3.</span> Paste above → Save → page reloads</div>
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          {localStorage.getItem(LS_KEY) && (
            <button onClick={clear}
              className="px-4 py-2 text-sm text-red-400 border border-red-900/40 rounded-lg hover:bg-red-900/20">
              Clear (use local)
            </button>
          )}
          <button onClick={onClose}
            className="px-4 py-2 text-sm text-gray-400 border border-white/10 rounded-lg hover:bg-white/5 ml-auto">
            Cancel
          </button>
          <button onClick={save}
            className="px-4 py-2 text-sm font-semibold bg-brand-500 text-white rounded-lg hover:bg-brand-600">
            Save & Reconnect
          </button>
        </div>
      </div>
    </div>
  )
}

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
  const [connModal, setConnModal] = useState(false)

  const backendUrl = localStorage.getItem(LS_KEY)
  const isRemote = !!backendUrl
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'

  // Auto-open when hosted but no backend URL configured
  useEffect(() => {
    if (!isLocalhost && !backendUrl) {
      const t = setTimeout(() => setConnModal(true), 800)
      return () => clearTimeout(t)
    }
  }, [])

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 flex flex-col
        transform transition-transform duration-200
        ${open ? 'translate-x-0' : '-translate-x-full'}
        lg:relative lg:translate-x-0
      `}>
        <div className="h-16 flex items-center gap-2 px-6 border-b border-white/10">
          <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">AD</span>
          </div>
          <span className="font-bold text-white">Admin</span>
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
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setConnModal(true)}
              title={isRemote ? `Connected to: ${backendUrl}` : 'Configure backend URL'}
              className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                isRemote
                  ? 'text-green-700 bg-green-50 border-green-200 hover:bg-green-100'
                  : 'text-gray-500 bg-gray-50 border-gray-200 hover:bg-gray-100'
              }`}>
              {isRemote ? <Wifi size={14} /> : <WifiOff size={14} />}
              {isRemote ? 'Tunnel' : 'Local'}
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 page-enter"><Outlet /></main>
      </div>
      {connModal && <ConnectionModal onClose={() => setConnModal(false)} />}
    </div>
  )
}
