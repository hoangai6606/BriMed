import { Link } from 'react-router-dom'
import { Stethoscope, FileText, Search, ShoppingCart, UserRound, ChevronRight, Clock, BadgeCheck, Video } from 'lucide-react'
import { SeoMeta } from '../../components/common/SeoMeta'
import { useAuth } from '../../store/auth'
import { useUi } from '../../store/ui'
import { api, timeAgo } from '../../api/client'
import { useEffect, useState } from 'react'
import { VietQRPay } from '../../components/domain/VietQRPay'
import { VideoCallRoom } from '../../components/domain/VideoCallRoom'
import { Modal } from '../../components/common/Misc'

const SHORTCUTS = [
  { to: '/patient/consultation', label: 'Toa thuốc nhanh tại quầy', desc: 'Quét QR · phí khám 25.000đ/lượt', icon: Stethoscope, color: 'bg-primary' },
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
  const [unpaid, setUnpaid] = useState<any[]>([])
  const [paying, setPaying] = useState<any | null>(null)
  const [videoCall, setVideoCall] = useState<any | null>(null)
  const [appointments, setAppointments] = useState<any[]>([])
  const toast = useUi((s) => s.toast)
  const [doctors, setDoctors] = useState<any[]>([])
  const [avgWait, setAvgWait] = useState<number | null>(null)

  const loadUnpaid = () =>
    api('/patient/consultations/mine').then((d) => {
      const all = d.consultations || []
      setRecent(all.slice(0, 3))
      setUnpaid(all.filter((c: any) => c.payment_status === 'unpaid' && c.status === 'pending'))
      setAppointments(all.filter((c: any) => c.slot && c.status === 'pending'))
      return all
    }).catch(() => [])

  const loadDoctors = () =>
    api('/auth/doctors').then((d) => {
      setDoctors(d.doctors || [])
      setAvgWait(d.avg_wait_minutes ?? null)
    }).catch(() => {})

  const cancelConsult = async (c: any) => {
    if (!window.confirm('Huỷ yêu cầu tư vấn này? Phí khám 25.000đ sẽ được hoàn nếu bạn đã thanh toán.')) return
    try {
      const d = await api(`/patient/consultations/${c.id}`, { method: 'DELETE' })
      toast(d.message || 'Đã huỷ.', 'success')
      loadUnpaid()
    } catch (e: any) { toast(e.message, 'error') }
  }

  useEffect(() => {
    refresh()
    loadUnpaid()
    loadDoctors()
    api('/patient/prescriptions/mine').then((d) => setRxs((d.prescriptions || []).filter((p: any) => p.status === 'issued').slice(0, 2))).catch(() => {})
    // Tự làm mới mỗi 15 giây để bắt trạng thái bác sĩ bắt đầu gọi video + trạng thái trực tuyến thật
    const t = window.setInterval(() => { loadUnpaid(); loadDoctors() }, 15000)
    return () => window.clearInterval(t)
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
            <span className="badge bg-white/20 text-white !px-3 !py-1"><BadgeCheck size={14} /> Phí khám 25.000đ/lượt · VietQR</span>
          </div>
        </div>
      </section>

      {/* Bác sĩ đang trực tuyến */}
      <section className="card p-4">
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="section-title flex items-center gap-1.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
            </span>
            Bác sĩ đang trực tuyến ({doctors.filter((d: any) => d.doctor_online).length})
          </h2>
          <Link to="/patient/consultation" className="btn-pink !min-h-[38px] !px-3.5 !text-[13px]">Tư vấn ngay</Link>
        </div>
        {doctors.filter((d: any) => d.doctor_online).length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {doctors.filter((d: any) => d.doctor_online).slice(0, 3).map((d: any) => (
              <Link key={d.id} to="/patient/consultation" className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5 hover:border-primary/40 transition">
                {d.avatar_url
                  ? <img src={d.avatar_url} alt={d.full_name} className="w-10 h-10 rounded-full object-cover shrink-0" />
                  : <span className="w-10 h-10 rounded-full bg-lightblue text-bluedark font-bold flex items-center justify-center text-[13px] shrink-0">{d.full_name.replace('BS. ', '').split(' ').map((w: string) => w[0]).slice(0, 2).join('')}</span>}
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-bold text-slate-700 truncate">{d.full_name}</div>
                  <div className="text-[11.5px] text-slate-500 truncate">{d.doctor_specialty}</div>
                  <div className="mt-0.5 inline-flex items-center gap-1 text-[10.5px] font-bold text-primary">
                    <BadgeCheck size={11} /> Đã xác minh · Sẵn sàng
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-xl bg-slate-50 px-3.5 py-3 text-[13px] text-slate-600">
            <strong>Hiện không có bác sĩ nào trực tuyến.</strong>
            {avgWait != null && <> Thời gian phản hồi trung bình gần đây: <strong>{avgWait} phút</strong>.</>}{' '}
            Bạn vẫn có thể đặt lịch khung giờ với bác sĩ ở mục Tư vấn ngay, hoặc quay lại sau ít phút.
          </div>
        )}
      </section>

      {/* Lịch hẹn sắp tới (đã đặt khung giờ) */}
      {appointments.length > 0 && (
        <section className="card p-4 border-2 border-pink/30 bg-lightpink/10">
          <h2 className="section-title !text-[15.5px] flex items-center gap-1.5"><Clock size={16} className="text-pink" /> Lịch hẹn sắp tới</h2>
          {appointments.map((c: any) => (
            <div key={c.id} className="mt-2 flex items-center gap-3 rounded-xl bg-white px-3.5 py-3">
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px] font-bold text-slate-700">{c.disease_group} · {c.preferred_doctor?.full_name || '—'}</div>
                <div className="text-[12px] text-slate-500">
                  Hẹn {new Date(c.slot.starts_at).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                  {c.estimated_turn_at && <> · dự kiến tới lượt ~<strong className="text-bluedark">{new Date(c.estimated_turn_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</strong></>}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {c.payment_status === 'unpaid'
                  ? <button onClick={() => setPaying(c)} className="btn-pink !text-[12.5px] !px-3">Thanh toán</button>
                  : <span className="badge bg-mint-bg text-mint-fg">Đã thanh toán</span>}
                <button onClick={() => cancelConsult(c)} className="btn-outline !min-h-[32px] !px-2.5 !text-[11.5px]">Huỷ</button>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Tư vấn chờ thanh toán */}
      {unpaid.length > 0 && (
        <section className="card p-4 border-2 border-pink/40 bg-lightpink/20">
          <h2 className="section-title !text-[15.5px]">Yêu cầu tư vấn chờ thanh toán</h2>
          {unpaid.map((c) => (
            <div key={c.id} className="mt-2.5 flex items-center gap-3 rounded-xl bg-white px-3.5 py-3">
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px] font-bold text-slate-700 truncate">{c.disease_group} · {timeAgo(c.created_at)}</div>
                <div className="text-[12px] text-slate-500">Phí khám 25.000đ — bác sĩ tiếp nhận ngay sau khi thanh toán</div>
              </div>
              <button onClick={() => setPaying(c)} className="btn-pink !text-[12.5px] !px-3 shrink-0">Thanh toán</button>
            </div>
          ))}
        </section>
      )}

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
                <span className="btn-pink !min-h-[36px] !px-3 !text-[12.5px]">Gửi đến quầy</span>
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
                <div className="flex items-center gap-2 shrink-0">
                  {c.slot?.ack && c.status === 'pending' && <span className="badge bg-lightblue text-bluedark">BS đã xác nhận lịch</span>}
                  {c.status === 'pending' && <button onClick={() => cancelConsult(c)} className="btn-outline !min-h-[32px] !px-2.5 !text-[11.5px]">Huỷ</button>}
                  {c.status === 'in_call' && (
                    <button onClick={() => setVideoCall(c)} className="btn-pink !min-h-[34px] !px-3 !text-[12.5px] pulse-ring">
                      <Video size={14} /> Vào phòng gọi
                    </button>
                  )}
                  <span className={`badge ${
                    c.status === 'approved' ? 'bg-mint-bg text-mint-fg' : c.status === 'rejected' ? 'bg-redflag-bg text-redflag-fg' : c.status === 'in_call' ? 'bg-lightpink text-pink-dark' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {c.status === 'approved' ? 'Đã duyệt' : c.status === 'rejected' ? 'Từ chối' : c.status === 'in_call' ? 'Đang gọi' : 'Chờ bác sĩ'}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Modal thanh toán VietQR */}
      <Modal open={!!paying} onClose={() => setPaying(null)} title="Thanh toán phí khám">
        {paying && (
          <VietQRPay
            consultation={paying}
            payment={{ consultation_id: paying.id, amount_vnd: 25000, content: `BRIMED ${paying.id}` }}
            onPaid={() => {
              setPaying(null)
              loadUnpaid()
            }}
          />
        )}
      </Modal>

      {/* Phòng gọi video với bác sĩ */}
      <Modal open={!!videoCall} onClose={() => setVideoCall(null)} title="Cuộc gọi video với bác sĩ">
        {videoCall && (
          <VideoCallRoom
            consultationId={videoCall.id}
            role="patient"
            peerName={videoCall.doctor_name || videoCall.preferred_doctor?.full_name}
            onEnded={() => {
              setVideoCall(null)
              loadUnpaid()
            }}
          />
        )}
      </Modal>
    </div>
  )
}
