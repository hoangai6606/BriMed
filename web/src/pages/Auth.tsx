import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ShieldCheck, Smartphone, ScanLine, HeartPulse } from 'lucide-react'
import { SeoMeta } from '../components/common/SeoMeta'
import { useAuth } from '../store/auth'
import { useUi } from '../store/ui'

// Giai đoạn 1: chỉ có tài khoản quản trị viên truy cập
export default function Auth() {
  const [form, setForm] = useState({ phone: '', password: '' })
  const [busy, setBusy] = useState(false)
  const { login } = useAuth()
  const toast = useUi((s) => s.toast)
  const navigate = useNavigate()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      await login(form.phone, form.password)
      toast('Đăng nhập thành công. Chào mừng trở lại!', 'success')
      navigate('/admin/dashboard')
    } catch (err: any) {
      toast(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-lightblue/50 to-slate-50 flex flex-col">
      <SeoMeta title="Đăng nhập quản trị – BriMed" description="Đăng nhập bảng điều khiển quản trị BriMed." />
      <header className="px-4 h-16 flex items-center">
        <Link to="/" className="flex items-center gap-2.5">
          <img src="/assets/logo.png" alt="BriMed" className="w-10 h-10 rounded-full" />
          <span className="font-extrabold text-bluedark text-[17px]">BriMed</span>
        </Link>
      </header>

      <main className="flex-1 w-full max-w-md mx-auto px-4 pb-10">
        <div className="card p-6 mt-2">
          <div className="flex items-center gap-3 mb-1">
            <span className="w-11 h-11 rounded-xl bg-primary text-white flex items-center justify-center">
              <ShieldCheck size={22} />
            </span>
            <div>
              <h1 className="text-[22px] font-extrabold text-bluedark leading-tight">Đăng nhập quản trị</h1>
              <p className="text-[13px] text-slate-500">Bảng điều khiển dành cho quản trị viên BriMed</p>
            </div>
          </div>

          <form onSubmit={submit} className="mt-5 space-y-3.5">
            <div>
              <label className="label" htmlFor="au-phone">Số điện thoại</label>
              <input id="au-phone" className="input" required inputMode="tel" pattern="0[0-9]{9}" title="10 chữ số, bắt đầu bằng 0" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="0901 234 567" autoComplete="username" />
            </div>
            <div>
              <label className="label" htmlFor="au-pass">Mật khẩu</label>
              <input id="au-pass" type="password" className="input" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="current-password" />
            </div>
            <button disabled={busy} className="btn-primary w-full">
              <Smartphone size={17} /> {busy ? 'Đang xử lý…' : 'Đăng nhập'}
            </button>
          </form>

          <p className="text-center text-[13px] text-slate-400 mt-4">
            Quên mật khẩu? Liên hệ hotline <strong className="text-primary">1900 2026</strong>.
          </p>
        </div>

        <div className="card p-4 mt-4 bg-lightblue/25 flex gap-3">
          <ScanLine size={22} className="text-primary shrink-0 mt-0.5" />
          <p className="text-[13px] text-slate-600 leading-relaxed">
            Bạn là khách hàng hoặc nhà thuốc? Không cần tài khoản — trực tiếp điền form đăng ký trên
            <Link to="/" className="font-bold text-primary"> trang chủ </Link>hoặc
            <Link to="/nha-thuoc-doi-tac" className="font-bold text-primary"> trang dành cho nhà thuốc</Link>, BriMed sẽ liên hệ bạn.
          </p>
        </div>

        <p className="text-center text-[12px] text-slate-400 mt-4 flex items-center justify-center gap-1">
          <HeartPulse size={13} className="text-pink" /> BriMed không dành cho cấp cứu · Khẩn cấp hãy gọi 115
        </p>
      </main>
    </div>
  )
}
