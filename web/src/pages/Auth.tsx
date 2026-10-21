import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { HeartPulse, ScanLine, Smartphone, Users, UserRound, Stethoscope, Pill, ShieldCheck } from 'lucide-react'
import { SeoMeta } from '../components/common/SeoMeta'
import { useAuth, homeByRole } from '../store/auth'
import { useUi } from '../store/ui'
import { ROLE_LABELS } from '../data/constants'

const ROLES = [
  { key: 'patient', label: 'Bệnh nhân', icon: UserRound },
  { key: 'doctor', label: 'Bác sĩ', icon: Stethoscope },
  { key: 'pharmacy', label: 'Nhà thuốc', icon: Pill },
  { key: 'admin', label: 'Quản trị viên', icon: ShieldCheck },
]

export default function Auth() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [role, setRole] = useState('patient')
  const [form, setForm] = useState({ full_name: '', phone: '', password: '', cccd: '' })
  const [busy, setBusy] = useState(false)
  const { login, register, quickLogin } = useAuth()
  const toast = useUi((s) => s.toast)
  const navigate = useNavigate()
  const location = useLocation() as any
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const afterAuth = (r: string) => {
    toast('Đăng nhập thành công. Chào mừng trở lại BriMed!', 'success')
    navigate(location.state?.from || homeByRole[r] || '/')
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      if (mode === 'login') {
        await login(form.phone, form.password, role)
        afterAuth(role)
      } else {
        await register({ ...form, role })
        afterAuth(role)
      }
    } catch (err: any) {
      toast(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const demo = async (persona: string) => {
    setBusy(true)
    try {
      await quickLogin(persona)
      afterAuth(persona)
    } catch (err: any) {
      toast(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-lightblue/50 to-slate-50 flex flex-col">
      <SeoMeta title="Đăng nhập / Đăng ký – BriMed" description="Đăng nhập BriMed bằng số điện thoại/Zalo. Hỗ trợ bệnh nhân, bác sĩ, nhà thuốc và quản trị viên." />
      <header className="px-4 h-16 flex items-center">
        <Link to="/" className="flex items-center gap-2.5">
          <img src="/assets/logo.png" alt="BriMed" className="w-10 h-10 rounded-full" />
          <span className="font-extrabold text-bluedark text-[17px]">BriMed</span>
        </Link>
      </header>

      <main className="flex-1 w-full max-w-md mx-auto px-4 pb-10">
        <div className="card p-6 mt-2">
          <h1 className="text-[22px] font-extrabold text-bluedark">
            {mode === 'login' ? 'Đăng nhập' : 'Đăng ký tài khoản'}
          </h1>
          <p className="text-[13.5px] text-slate-500 mt-1">
            Đơn thuốc an toàn cho bạn an tâm — truy cập theo đúng vai trò của bạn.
          </p>

          {/* Chọn vai trò */}
          <div className="mt-4">
            <span className="label">Bạn là *</span>
            <div className="grid grid-cols-2 gap-2">
              {ROLES.map((r) => (
                <button
                  type="button"
                  key={r.key}
                  onClick={() => setRole(r.key)}
                  className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2.5 text-[13.5px] font-bold transition ${
                    role === r.key ? 'border-primary bg-lightblue/40 text-bluedark' : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  <r.icon size={17} /> {r.label}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={submit} className="mt-4 space-y-3.5">
            {mode === 'register' && (
              <>
                <div>
                  <label className="label" htmlFor="au-name">Họ và tên *</label>
                  <input id="au-name" className="input" required value={form.full_name} onChange={(e) => set('full_name', e.target.value)} />
                </div>
                <div>
                  <label className="label" htmlFor="au-cccd">CCCD / Số định danh (nhập tay được)</label>
                  <input id="au-cccd" className="input" inputMode="numeric" value={form.cccd} onChange={(e) => set('cccd', e.target.value)} placeholder="030xxxxxxxx" />
                </div>
              </>
            )}
            <div>
              <label className="label" htmlFor="au-phone">Số điện thoại / Zalo *</label>
              <input id="au-phone" className="input" required inputMode="tel" pattern="0[0-9]{9}" title="10 chữ số, bắt đầu bằng 0" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="0901 234 567" />
            </div>
            <div>
              <label className="label" htmlFor="au-pass">Mật khẩu *</label>
              <input id="au-pass" type="password" className="input" required minLength={6} value={form.password} onChange={(e) => set('password', e.target.value)} />
            </div>
            <button disabled={busy} className="btn-primary w-full">
              <Smartphone size={17} /> {busy ? 'Đang xử lý…' : mode === 'login' ? 'Đăng nhập' : 'Đăng ký'}
            </button>
          </form>

          <p className="text-center text-[13.5px] text-slate-500 mt-3">
            {mode === 'login' ? 'Chưa có tài khoản?' : 'Đã có tài khoản?'}{' '}
            <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="font-bold text-primary hover:underline">
              {mode === 'login' ? 'Đăng ký ngay' : 'Đăng nhập'}
            </button>
          </p>

          <div className="mt-4 flex items-center gap-2 text-[12px] text-slate-400">
            <hr className="flex-1 border-slate-200" /> hoặc <hr className="flex-1 border-slate-200" />
          </div>

          {/* Đăng nhập nhanh theo vai trò */}
          <div className="mt-3">
            <div className="text-[12px] font-bold text-slate-500 mb-2 flex items-center gap-1.5">
              <Users size={14} /> Đăng nhập nhanh theo vai trò
            </div>
            <div className="grid grid-cols-2 gap-2">
              {ROLES.map((r) => (
                <button key={r.key} disabled={busy} onClick={() => demo(r.key)} className="btn-outline !text-[13px] !px-2">
                  <r.icon size={15} /> {ROLE_LABELS[r.key]}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="card p-4 mt-4 bg-lightblue/25 flex gap-3">
          <ScanLine size={22} className="text-primary shrink-0 mt-0.5" />
          <p className="text-[13px] text-slate-600 leading-relaxed">
            <strong>Tại quầy nhà thuốc:</strong> dược sĩ có thể thao tác hộ khách lớn tuổi — quét CCCD/VNeID hoặc nhập số điện thoại,
            không cần cài app. Hỏi bác sĩ trước khi mua thuốc.
          </p>
        </div>

        <p className="text-center text-[12px] text-slate-400 mt-4 flex items-center justify-center gap-1">
          <HeartPulse size={13} className="text-pink" /> BriMed không dành cho cấp cứu · Khẩn cấp hãy gọi 115
        </p>
      </main>
    </div>
  )
}
