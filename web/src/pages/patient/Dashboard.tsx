import { Link } from 'react-router-dom'
import { Stethoscope, FileText, Search, ShoppingCart, UserRound, Gift, Coins, ChevronRight, Clock } from 'lucide-react'
import { SeoMeta } from '../../components/common/SeoMeta'
import { useAuth } from '../../store/auth'
import { api, timeAgo } from '../../api/client'
import { useEffect, useState } from 'react'

const SHORTCUTS = [
  { to: '/patient/consultation', label: 'Toa thuốc nhanh tại quầy', desc: 'Quét QR · bác sĩ gọi ngắn', icon: Stethoscope, color: 'bg-primary' },
  { to: '/patient/health-profile', label: 'Hồ sơ sức khỏe', desc: 'Tiền sử, dị ứng, chỉ số', icon: UserRound, color: 'bg-bluedark' },
  { to: '/patient/prescriptions', label: 'Đơn thuốc của tôi', desc: 'Mã đơn quốc gia, liều dùng', icon: FileText, color: 'bg-pink' },
  { to: '/patient/search', label: 'Tìm thuốc / Nhà thuốc', desc: 'So sánh giá, tồn kho', icon: Search, color: 'bg-mint-fg' },
  { to: '/patient/orders', label: 'Đơn hàng', desc: 'Theo dõi thời gian thực', icon: ShoppingCart, color: 'bg-skyblue' },
]

export default function PatientDashboard() {
  const user = useAuth((s) => s.user)!
  const refresh = useAuth((s) => s.refresh)
  const [recent, setRecent] = useState<any[]>([])
  const [rxs, setRxs] = useState<any[]>([])

  useEffect(() => {
    refresh()
    api('/patient/consultations/mine').then((d) => setRecent((d.consultations || []).slice(0, 3))).catch(() => {})
    api('/patient/prescriptions/mine').then((d) => setRxs((d.prescriptions || []).filter((p: any) => p.status === 'issued').slice(0, 2))).catch(() => {})
  }, [])

  return (
    <div className="space-y-4">
      <SeoMeta title="Tổng quan bệnh nhân – BriMed" />

      {/* Thẻ thành viên */}
      <section className="rounded-2xl bg-gradient-to-br from-primary to-bluedark text-white p-5 shadow-float relative overflow-hidden">
        <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-white/10" />
        <div className="absolute right-10 bottom-[-30px] w-20 h-20 rounded-full bg-pink/30" />
        <div className="relative">
          <div className="text-[12.5px] text-white/80">Thành viên BriMed</div>
          <h1 className="text-[21px] font-extrabold mt-0.5">{user.full_name}</h1>
          <div className="mt-3 flex items-center gap-2">
            <span className="badge bg-white/20 text-white !px-3 !py-1"><Coins size={14} /> {user.token_balance} token</span>
            {user.free_prescriptions > 0 && (
              <span className="badge bg-pink text-white !px-3 !py-1 pulse-ring"><Gift size={14} /> {user.free_prescriptions} toa miễn phí đầu</span>
            )}
          </div>
        </div>
      </section>

      {/* Lối tắt */}
      <section className="grid grid-cols-2 gap-3">
        {SHORTCUTS.map((s) => (
          <Link key={s.to} to={s.to} className="card p-4 flex flex-col gap-2 hover:border-primary/40 transition group">
            <span className={`w-10 h-10 rounded-xl ${s.color} text-white flex items-center justify-center`}>
              <s.icon size={20} />
            </span>
            <span className="text-[14px] font-bold text-slate-700 group-hover:text-primary leading-snug">{s.label}</span>
            <span className="text-[11.5px] text-slate-400">{s.desc}</span>
          </Link>
        ))}
      </section>

      {/* Đơn thuốc chờ mua */}
      {rxs.length > 0 && (
        <section className="card p-4 border-2 border-pink/30">
          <div className="flex items-center justify-between mb-2">
            <h2 className="section-title">Đơn thuốc chờ bạn mua</h2>
            <Link to="/patient/prescriptions" className="text-[13px] font-bold text-primary flex items-center">
              Xem tất cả <ChevronRight size={15} />
            </Link>
          </div>
          <div className="space-y-2">
            {rxs.map((rx) => (
              <Link key={rx.id} to="/patient/prescriptions" className="flex items-center justify-between bg-lightpink/40 rounded-xl px-3.5 py-3">
                <div>
                  <div className="text-[13.5px] font-bold text-bluedark">{rx.national_code}</div>
                  <div className="text-[12px] text-slate-500">{rx.items.length} loại thuốc · {timeAgo(rx.created_at)}</div>
                </div>
                <span className="btn-pink !min-h-[36px] !px-3 !text-[12.5px]">Mua ngay</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Tư vấn gần đây */}
      <section className="card p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="section-title">Phiên tư vấn gần đây</h2>
          <Link to="/patient/consultation" className="text-[13px] font-bold text-primary flex items-center">
            Tạo mới <ChevronRight size={15} />
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="text-[13.5px] text-slate-400 py-3 text-center">Chưa có phiên tư vấn nào.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {recent.map((c) => (
              <li key={c.id} className="py-2.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[13.5px] font-bold text-slate-700 truncate">{c.disease_group}</div>
                  <div className="text-[12px] text-slate-400 flex items-center gap-1"><Clock size={11} /> {timeAgo(c.created_at)} · {c.doctor_name || 'Đang chờ bác sĩ'}</div>
                </div>
                <span className={`badge ${
                  c.status === 'approved' ? 'bg-mint-bg text-mint-fg' : c.status === 'rejected' ? 'bg-redflag-bg text-redflag-fg' : c.status === 'in_call' ? 'bg-lightpink text-pink-dark' : 'bg-amber-100 text-amber-700'
                }`}>
                  {c.status === 'approved' ? 'Đã duyệt' : c.status === 'rejected' ? 'Từ chối' : c.status === 'in_call' ? 'Đang gọi' : 'Chờ bác sĩ'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
