import { useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth, homeByRole } from './store/auth'
import { Toasts } from './components/common/Toasts'
import { PageLoading } from './components/common/Misc'
import AppShell from './components/layout/AppShell'
import Home from './pages/Home'
import PackagePage from './pages/PackagePage'
import Partner from './pages/Partner'
import Auth from './pages/Auth'
import AdminDashboard from './pages/admin/Dashboard'

function RequireRole({ role, children }: { role: string | string[]; children: any }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <PageLoading />
  if (!user) return <Navigate to="/auth" state={{ from: location.pathname }} replace />
  const roles = Array.isArray(role) ? role : [role]
  if (!roles.includes(user.role)) return <Navigate to={homeByRole[user.role] || '/'} replace />
  return children
}

export default function App() {
  const refresh = useAuth((s) => s.refresh)
  useEffect(() => {
    refresh()
  }, [refresh])

  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/nha-thuoc-doi-tac" element={<Partner />} />
        <Route path="/goi-1-thang-brimed-nha-thuoc" element={<PackagePage pkg="1" />} />
        <Route path="/goi-3-thang-brimed-nha-thuoc" element={<PackagePage pkg="3" />} />
        <Route path="/auth" element={<Auth />} />
        <Route element={<RequireRole role="admin"><AppShell /></RequireRole>}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toasts />
    </>
  )
}
