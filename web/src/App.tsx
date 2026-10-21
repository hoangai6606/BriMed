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
import PatientDashboard from './pages/patient/Dashboard'
import HealthProfile from './pages/patient/HealthProfile'
import Consultation from './pages/patient/Consultation'
import DoctorDashboard from './pages/doctor/Dashboard'
import PatientRecord from './pages/doctor/PatientRecord'
import DoctorConsultation from './pages/doctor/Consultation'
import DoctorPrescriptions from './pages/doctor/Prescriptions'

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

        <Route element={<RequireRole role="patient"><AppShell /></RequireRole>}>
          <Route path="/patient/dashboard" element={<PatientDashboard />} />
          <Route path="/patient/health-profile" element={<HealthProfile />} />
          <Route path="/patient/consultation" element={<Consultation />} />
        </Route>

        <Route element={<RequireRole role="doctor"><AppShell /></RequireRole>}>
          <Route path="/doctor/dashboard" element={<DoctorDashboard />} />
          <Route path="/doctor/patient-record" element={<PatientRecord />} />
          <Route path="/doctor/consultation/:id" element={<DoctorConsultation />} />
          <Route path="/doctor/prescriptions" element={<DoctorPrescriptions />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toasts />
    </>
  )
}
