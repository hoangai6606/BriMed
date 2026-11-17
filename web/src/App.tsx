import { useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth, homeByRole } from './store/auth'
import { Toasts } from './components/common/Toasts'
import { PageLoading } from './components/common/Misc'
import AppShell from './components/layout/AppShell'

import Home from './pages/Home'
import PackagePage from './pages/PackagePage'
import Partner from './pages/Partner'
import PharmacyLanding from './pages/PharmacyLanding'
import DoctorLanding from './pages/DoctorLanding'
import Auth from './pages/Auth'
import PatientDashboard from './pages/patient/Dashboard'
import HealthProfile from './pages/patient/HealthProfile'
import Consultation from './pages/patient/Consultation'
import MyPrescriptions from './pages/patient/Prescriptions'
import SearchPage from './pages/patient/Search'
import MyOrders from './pages/patient/Orders'
import HistoryReminders from './pages/patient/HistoryReminders'
import DoctorDashboard from './pages/doctor/Dashboard'
import PatientRecord from './pages/doctor/PatientRecord'
import DoctorConsultation from './pages/doctor/Consultation'
import DoctorPrescriptions from './pages/doctor/Prescriptions'
import PharmacyDashboard from './pages/pharmacy/Dashboard'
import PharmacyInventory from './pages/pharmacy/Inventory'
import ReceivePrescription from './pages/pharmacy/ReceivePrescription'
import QuoteConfirm from './pages/pharmacy/QuoteConfirm'
import PharmacyOrders from './pages/pharmacy/Orders'
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
        {/* Công khai */}
        <Route path="/" element={<Home />} />
        <Route path="/cho-nha-thuoc" element={<PharmacyLanding />} />
        <Route path="/cho-bac-si" element={<DoctorLanding />} />
        <Route path="/nha-thuoc-doi-tac" element={<Partner />} />
        <Route path="/goi-1-thang-brimed-nha-thuoc" element={<PackagePage pkg="1" />} />
        <Route path="/goi-3-thang-brimed-nha-thuoc" element={<PackagePage pkg="3" />} />
        <Route path="/auth" element={<Auth />} />

        {/* Bệnh nhân */}
        <Route element={<RequireRole role="patient"><AppShell /></RequireRole>}>
          <Route path="/patient/dashboard" element={<PatientDashboard />} />
          <Route path="/patient/health-profile" element={<HealthProfile />} />
          <Route path="/patient/consultation" element={<Consultation />} />
          <Route path="/patient/prescriptions" element={<MyPrescriptions />} />
          <Route path="/patient/search" element={<SearchPage />} />
          <Route path="/patient/orders" element={<MyOrders />} />
          <Route path="/patient/history-reminders" element={<HistoryReminders />} />
        </Route>

        {/* Bác sĩ */}
        <Route element={<RequireRole role="doctor"><AppShell /></RequireRole>}>
          <Route path="/doctor/dashboard" element={<DoctorDashboard />} />
          <Route path="/doctor/patient-record" element={<PatientRecord />} />
          <Route path="/doctor/consultation/:id" element={<DoctorConsultation />} />
          <Route path="/doctor/prescriptions" element={<DoctorPrescriptions />} />
        </Route>

        {/* Nhà thuốc */}
        <Route element={<RequireRole role="pharmacy"><AppShell /></RequireRole>}>
          <Route path="/pharmacy/dashboard" element={<PharmacyDashboard />} />
          <Route path="/pharmacy/inventory" element={<PharmacyInventory />} />
          <Route path="/pharmacy/receive-prescription" element={<ReceivePrescription />} />
          <Route path="/pharmacy/quote-confirm/:id" element={<QuoteConfirm />} />
          <Route path="/pharmacy/orders" element={<PharmacyOrders />} />
        </Route>

        {/* Quản trị viên */}
        <Route element={<RequireRole role="admin"><AppShell /></RequireRole>}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toasts />
    </>
  )
}
