import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'

// Public pages
import LandingPage    from '@/pages/public/LandingPage'
import LoginPage      from '@/pages/public/LoginPage'
import OperatorLoginPage from '@/pages/public/OperatorLoginPage'
import AdminLoginPage from '@/pages/public/AdminLoginPage'
import RegisterPage   from '@/pages/public/RegisterPage'

// ... (farmer imports)

// ... (operator imports)

// ... (admin imports)

function RoleGuard({ roles, children, loginPath = "/login" }: { roles: string[]; children: React.ReactNode, loginPath?: string }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin h-8 w-8 border-4 border-brand-500 border-t-transparent rounded-full" /></div>
  if (!user) return <Navigate to={loginPath} replace />
  if (!roles.includes(user.role)) {
    // If logged in but wrong role for this specific area, redirect to the correct dashboard
    if (user.role === 'Farmer') return <Navigate to="/farmer" replace />
    if (user.role === 'Operator') return <Navigate to="/operator" replace />
    if (user.role === 'Admin') return <Navigate to="/admin" replace />
    return <Navigate to="/" replace />
  }
  return <>{children}</>
}

function AuthRedirect() {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  if (user.role === 'Farmer')   return <Navigate to="/farmer" replace />
  if (user.role === 'Operator') return <Navigate to="/operator" replace />
  if (user.role === 'Admin')    return <Navigate to="/admin" replace />
  return <Navigate to="/" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          {/* Public */}
          <Route path="/"         element={<LandingPage />} />
          <Route path="/login"    element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/dashboard" element={<AuthRedirect />} />

          {/* Role-specific login pages outside protected areas for convenience */}
          <Route path="/operator/login" element={<OperatorLoginPage />} />
          <Route path="/admin/login"    element={<AdminLoginPage />} />

          {/* Farmer */}
          <Route path="/farmer" element={<RoleGuard roles={['Farmer']} loginPath="/login"><FarmerLayout /></RoleGuard>}>
            <Route index                    element={<FarmerDashboard />} />
            <Route path="fields"            element={<FieldsPage />} />
            <Route path="fields/new"        element={<AddFieldPage />} />
            <Route path="book"              element={<BookServicePage />} />
            <Route path="bookings"          element={<BookingsPage />} />
            <Route path="bookings/:id"      element={<BookingDetailPage />} />
            <Route path="profile"           element={<ProfilePage />} />
          </Route>

          {/* Operator */}
          <Route path="/operator" element={<RoleGuard roles={['Operator']} loginPath="/operator/login"><OperatorLayout /></RoleGuard>}>
            <Route index                    element={<OperatorDashboard />} />
            <Route path="fields"            element={<FieldVerifyPage />} />
            <Route path="jobs"              element={<OperatorJobsPage />} />
            <Route path="drones"            element={<OperatorDronePage />} />
          </Route>

          {/* Admin */}
          <Route path="/admin" element={<RoleGuard roles={['Admin']} loginPath="/admin/login"><AdminLayout /></RoleGuard>}>
            <Route index                    element={<AdminDashboard />} />
            <Route path="stations"          element={<StationsPage />} />
            <Route path="drones"            element={<DronesPage />} />
            <Route path="batteries"         element={<BatteriesPage />} />
            <Route path="operators"         element={<OperatorsPage />} />
            <Route path="users"             element={<UsersPage />} />
            <Route path="bookings"          element={<AdminBookingsPage />} />
            <Route path="farmers"           element={<FarmersPage />} />
            <Route path="farmers/:id"       element={<FarmerDetailPage />} />
            <Route path="settings"          element={<SettingsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
