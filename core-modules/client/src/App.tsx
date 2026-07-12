import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/auth'
import { Layout } from './components/Layout'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { Assets } from './pages/Assets'
import { Allocations } from './pages/Allocations'
import { Bookings } from './pages/Bookings'
import { Maintenance } from './pages/Maintenance'
import { Audits } from './pages/Audits'
import { Reports } from './pages/Reports'
import { ActivityLogs } from './pages/ActivityLogs'
import { OrganizationSetup } from './pages/OrganizationSetup'
import type { Role } from './lib/types'

function Protected({ children, roles }: { children: React.ReactNode; roles?: Role[] }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center h-screen text-slate-400">Loading…</div>
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />
  return <Layout>{children}</Layout>
}

function PublicOnly({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center h-screen text-slate-400">Loading…</div>
  if (user) return <Navigate to="/" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
          <Route path="/" element={<Protected><Dashboard /></Protected>} />
          <Route path="/assets" element={<Protected><Assets /></Protected>} />
          <Route path="/allocations" element={<Protected roles={['admin', 'asset_manager', 'department_head', 'employee']}><Allocations /></Protected>} />
          <Route path="/bookings" element={<Protected><Bookings /></Protected>} />
          <Route path="/maintenance" element={<Protected><Maintenance /></Protected>} />
          <Route path="/audits" element={<Protected><Audits /></Protected>} />
          <Route path="/reports" element={<Protected roles={['admin', 'asset_manager', 'department_head']}><Reports /></Protected>} />
          <Route path="/activity" element={<Protected><ActivityLogs /></Protected>} />
          <Route path="/organization" element={<Protected roles={['admin']}><OrganizationSetup /></Protected>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
