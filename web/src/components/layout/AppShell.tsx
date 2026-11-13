import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { Video } from 'lucide-react'
import { api } from '../../api/client'
import {
  Home, UserRound, FileText, Pill, ShoppingCart, BellRing, LogOut, Stethoscope,
  ClipboardList, Package, QrCode, ShieldCheck, Repeat, Search as SearchIcon,
} from 'lucide-react'
import { useAuth } from '../../store/auth'
import { ROLE_LABELS } from '../../data/constants'

interface Tab {
  to: string
  label: string
  icon: any
}

const NAV_BY_ROLE: Record<string, Tab[]> = {
  patient: [
    { to: '/patient/dashboard', label: 'Tổng quan', icon: Home },
    { to: '/patient/consultation', label: 'Toa nhanh', icon: Stethoscope },
    { to: '/patient/prescriptions', label: 'Đơn thuốc', icon: FileText },
    { to: '/patient/search', label: 'Tìm thuốc', icon: SearchIcon },
    { to: '/patient/orders', label: 'Đơn hàng', icon: ShoppingCart },
  ],
  doctor: [
    { to: '/doctor/dashboard', label: 'Hàng đợi', icon: ClipboardList },
    { to: '/doctor/prescriptions', label: 'Đơn thuốc', icon: FileText },
    { to: '/doctor/patient-record', label: 'Hồ sơ BN', icon: UserRound },
  ],
  pharmacy: [
    { to: '/pharmacy/dashboard', label: 'Tổng quan', icon: Home },
    { to: '/pharmacy/receive-prescription', label: 'Tiếp nhận', icon: QrCode },
    { to: '/pharmacy/inventory', label: 'Tồn kho', icon: Package },
    { to: '/pharmacy/orders', label: 'Đơn hàng', icon: Repeat },
  ],
  admin: [
    { to: '/admin/dashboard', label: 'Tổng quan', icon: ShieldCheck },
    { to: '/admin/dashboard?tab=leads', label: 'Khách hàng', icon: UserRound },
    { to: '/admin/dashboard?tab=users', label: 'Tài khoản', icon: UserRound },
    { to: '/admin/dashboard?tab=medicines', label: 'Danh mục', icon: Pill },
  ],
}

export default function AppShell() {
  const { user, logout, refresh } = useAuth()
  const navigate = useNavigate()

  // Thông báo toàn cục (poll 15s theo vai trò) — không phụ thuộc trang đang mở
  const [incomingCall, setIncomingCall] = useState<any | null>(null)
  const [badges, setBadges] = useState<Record<string, number>>({})

  useEffect(() => {
    if (!user) return
    const poll = async () => {
      try {
        if (user.role === 'patient') {
          const d = await api('/patient/consultations/mine')
          const call = (d.consultations || []).find((c: any) => c.status === 'in_call' && c.payment_status === 'paid')
          setIncomingCall(call || null)
        } else if (user.role === 'doctor') {
          const d = await api('/doctor/queue')
          setBadges({ '/doctor/dashboard': (d.queue || []).length })
        } else if (user.role === 'pharmacy') {
          const d = await api('/pharmacy/dashboard')
          setBadges({ '/pharmacy/orders': d.stats?.new_orders || 0 })
        }
      } catch { /* im lặng — poll nền */ }
    }
    poll()
    const t = window.setInterval(poll, 15000)
    return () => window.clearInterval(t)
  }, [user?.id])

  const tabs = useMemo(() => (user ? NAV_BY_ROLE[user.role] || [] : []), [user])
  if (!user) return null

  const roleColor =
    user.role === 'doctor' ? 'bg-mint-fg' : user.role === 'pharmacy' ? 'bg-pink' : user.role === 'admin' ? 'bg-slate-700' : 'bg-primary'

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Banner cuộc gọi đến — hiện ở mọi trang khi bác sĩ bắt đầu gọi */}
      {incomingCall && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md">
          <button
            onClick={() => navigate('/patient/dashboard')}
            className="w-full flex items-center gap-3 rounded-2xl bg-gradient-to-r from-primary to-bluedark text-white px-4 py-3 shadow-float animate-pulse"
          >
            <span className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0"><Video size={20} /></span>
            <span className="text-left flex-1 min-w-0">
              <span className="block text-[14px] font-extrabold">Bác sĩ đang gọi bạn…</span>
              <span className="block text-[11.5px] text-white/75 truncate">{incomingCall.preferred_doctor?.full_name || 'Bác sĩ'} · chạm để vào phòng gọi video</span>
            </span>
            <span className="badge bg-white text-primary shrink-0 !px-3 !py-1.5">Vào gọi</span>
          </button>
        </div>
      )}
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-60 flex-col bg-white border-r border-slate-200 z-40">
        <div className="flex items-center gap-2 px-4 h-16 border-b border-slate-100">
          <img src="/assets/logo.png" alt="Logo BriMed" className="w-9 h-9 rounded-full" />
          <div>
            <div className="font-extrabold text-bluedark leading-tight">BriMed</div>
            <div className="text-[10px] text-slate-500">Since 2026</div>
          </div>
        </div>
        <nav className="flex-1 py-3 space-y-1 px-2">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-semibold ${
                  isActive ? 'bg-primary text-white' : 'text-slate-600 hover:bg-lightblue/30'
                }`
              }
            >
              <t.icon size={19} />
              {t.label}
              {badges[t.to] > 0 && (
                <span className="ml-auto bg-pink text-white text-[10.5px] font-extrabold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1">{badges[t.to]}</span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <span className={`w-9 h-9 rounded-full ${roleColor} text-white flex items-center justify-center font-bold text-sm`}>
              {user.full_name.split(' ').pop()?.[0]}
            </span>
            <div className="min-w-0">
              <div className="text-[13px] font-bold text-slate-700 truncate">{user.full_name}</div>
              <div className="text-[11px] text-slate-500">{ROLE_LABELS[user.role]}</div>
            </div>
          </div>
          <button
            onClick={() => {
              logout()
              navigate('/')
            }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[13px] font-semibold text-slate-500 hover:bg-slate-100"
          >
            <LogOut size={16} /> Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="lg:pl-60">
        {/* Top header */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-100">
          <div className="flex items-center justify-between px-4 h-14">
            <div className="flex items-center gap-2 lg:hidden">
              <img src="/assets/logo.png" alt="Logo BriMed" className="w-8 h-8 rounded-full" />
              <span className="font-extrabold text-bluedark">BriMed</span>
            </div>
            <div className="hidden lg:block text-[15px] font-bold text-bluedark">
              Xin chào, {user.full_name} · {ROLE_LABELS[user.role]}
            </div>
            <div className="flex items-center gap-2">
              {user.role === 'patient' && (
                <>
                  <span className="badge bg-lightblue text-bluedark font-bold">Phí khám 25.000đ/lượt · VietQR</span>
                </>
              )}
              {user.role === 'doctor' && (
                <span className={`badge ${user.doctor_online ? 'bg-mint-bg text-mint-fg' : 'bg-slate-100 text-slate-500'}`}>
                  ● {user.doctor_online ? 'Đang trực' : 'Ngoại tuyến'}
                </span>
              )}
              <button
                onClick={() => refresh()}
                className="lg:hidden text-slate-400 hover:text-primary p-1.5"
                aria-label="Làm mới"
              >
                <Repeat size={17} />
              </button>
            </div>
          </div>
        </header>

        <main className="px-4 pt-4 pb-28 lg:pb-10 lg:px-8 max-w-5xl mx-auto">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-5 max-w-md mx-auto">
          {tabs.slice(0, 5).map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center py-2 min-h-[56px] text-[10.5px] font-semibold ${
                  isActive ? 'text-primary' : 'text-slate-400'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={`mb-0.5 rounded-full p-1.5 ${isActive ? 'bg-lightblue/60' : ''}`}>
                    <t.icon size={21} strokeWidth={isActive ? 2.4 : 2} />
                  </span>
                  {t.label}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
