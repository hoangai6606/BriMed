import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, CheckCircle2, Pill, HeartPulse, ShieldCheck, Sparkles, ArrowRight, Store } from 'lucide-react'
import { SectionHeader } from './SectionHeader'
import { Reveal } from './Reveal'
import { CUSTOMER_LEAD_NOTE } from '../../data/constants'
import { api } from '../../api/client'

// FAQ gộp câu hiện có + 3 câu Gen Z theo spec
const FAQS = [
  {
    q: 'Đổi hoạt chất có làm giảm tác dụng thuốc không?',
    a: 'Không. Thuốc thay thế có cùng hoạt chất và cùng hàm lượng — chỉ khác hãng sản xuất. Bác sĩ duyệt và ký số lại đơn trước khi đổi, nên tác dụng điều trị giữ nguyên 100%.',
  },
  {
    q: 'Thông tin bệnh án của mình có bị lộ không?',
    a: 'Hồ sơ sức khỏe chỉ bạn xem được. Bác sĩ chỉ thấy khi bạn bật công tắc chia sẻ trong phiên tư vấn, và mọi lượt truy cập đều được ghi log — bảo mật 2 lớp theo đúng cam kết.',
  },
  {
    q: 'Ví Token dùng để làm gì?',
    a: 'Token là điểm dùng cho phí tư vấn trên BriMed: tài khoản mới tặng 20 token và 2 toa miễn phí, sau đó mỗi toa mua tại quầy chỉ tốn ~15.000đ (3 token). Nạp thêm mọi lúc, không thời hạn.',
  },
  {
    q: 'Tôi có phải cài app không?',
    a: 'Không cần. Bạn chỉ dùng điện thoại quét mã QR dán tại quầy thuốc, trả lời vài câu hỏi đơn giản là xong.',
  },
  {
    q: 'Khám kiểu gì? Có phải bác sĩ thật không?',
    a: 'Bác sĩ thật đang trực sẽ xem thông tin bạn điền, gọi điện hỏi thêm 1–2 phút rồi ký đơn thuốc điện tử hợp lệ. Đơn có mã tra cứu và được kết nối với hệ thống đơn thuốc quốc gia.',
  },
  {
    q: 'Nếu bác sĩ thấy không nên kê đơn thì sao?',
    a: 'Bác sĩ sẽ hướng dẫn bạn đến cơ sở y tế gần nhất để khám trực tiếp. Trường hợp này bạn không mất phí tư vấn.',
  },
]

// Form nhận danh sách nhà thuốc — lưu về server (patient_leads) cho bảng điều khiển quản trị
function LeadForm() {
  const [form, setForm] = useState({ full_name: '', phone: '' })
  const [done, setDone] = useState<string | null>(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setErr('')
    try {
      const d = await api('/catalog/patient-leads', { method: 'POST', body: JSON.stringify(form) })
      setDone(d.message)
      setForm({ full_name: '', phone: '' })
    } catch (e: any) {
      setErr(e.message)
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <div className="rounded-3xl border border-emerald-200 bg-white p-6 text-center">
        <CheckCircle2 size={40} className="mx-auto mb-3 text-emerald-500" />
        <h3 className="text-[17px] font-extrabold text-slate-800">Đã nhận thông tin!</h3>
        <p className="mt-1.5 text-[14px] leading-relaxed text-slate-500">{done}</p>
      </div>
    )
  }

  return (
    <div className="rounded-3xl border border-cyan-100 bg-white p-6 sm:p-7">
      <h3 className="text-[18px] font-extrabold text-slate-900">{CUSTOMER_LEAD_NOTE.title}</h3>
      <p className="mt-1.5 text-[13.5px] leading-relaxed text-slate-500">{CUSTOMER_LEAD_NOTE.desc}</p>
      <form className="mt-4 grid gap-2.5 sm:grid-cols-[1fr_1fr_auto]" onSubmit={submit}>
        <input className="input !rounded-full" required placeholder="Họ tên của bạn" aria-label="Họ tên" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        <input className="input !rounded-full" required placeholder="Số điện thoại / Zalo" inputMode="tel" aria-label="Số điện thoại hoặc Zalo" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <button
          className="inline-flex items-center justify-center gap-1.5 rounded-full bg-blue-600 px-6 font-bold text-white shadow-[0_10px_24px_rgba(37,99,235,0.3)] transition-all hover:-translate-y-0.5 hover:bg-blue-700 disabled:opacity-60"
          type="submit"
          disabled={busy}
        >
          {busy ? 'Đang gửi…' : <>Nhận danh sách <ArrowRight size={15} /></>}
        </button>
      </form>
      {err && <p className="mt-2 text-[12.5px] font-semibold text-rose-600">{err}</p>}
      <p className="mt-2.5 text-[11.5px] text-slate-400">Thông tin chỉ dùng để gửi danh sách nhà thuốc — không quảng cáo spam.</p>
    </div>
  )
}

export default function FaqCta() {
  return (
    <section id="faq" className="scroll-mt-28 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4">
        <SectionHeader
          kicker="Hỏi đáp nhanh"
          title={<>Thắc mắc của bạn — <span className="text-blue-600">giải đáp thẳng</span></>}
          sub="Chạm vào câu hỏi để xem câu trả lời."
        />

        <div className="mx-auto max-w-3xl space-y-2.5">
          {FAQS.map((f, i) => (
            <Reveal key={f.q} delay={i * 60}>
              <details className="group rounded-2xl border border-blue-100/80 bg-white/80 px-5 py-4 backdrop-blur transition-colors hover:border-cyan-200 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                  <span className="text-[15px] font-bold text-slate-800 transition-colors group-open:text-blue-700">{f.q}</span>
                  <ChevronDown size={19} className="shrink-0 text-slate-400 transition-transform duration-300 group-open:rotate-180 group-open:text-cyan-500" />
                </summary>
                <p className="mt-2.5 border-t border-dashed border-blue-100 pt-2.5 text-[14px] leading-relaxed text-slate-600">{f.a}</p>
              </details>
            </Reveal>
          ))}
        </div>

        {/* Form nhận danh sách nhà thuốc — anchor cho nút "Nhận danh sách" ở màn hình checkout */}
        <Reveal delay={100} className="mx-auto mt-10 max-w-3xl">
          <div id="nhan-danh-sach" className="scroll-mt-28">
            <LeadForm />
          </div>
        </Reveal>

        {/* CTA banner cuối trang */}
        <Reveal delay={60} className="mt-12">
          <div className="relative overflow-hidden rounded-3xl bg-blue-600 px-6 py-12 text-center text-white shadow-[0_30px_70px_rgba(37,99,235,0.35)] sm:px-12 sm:py-16">
            {/* Viên nang & y tế lơ lửng */}
            <Pill className="animate-float absolute left-[8%] top-8 h-12 w-12 -rotate-12 text-white/15" aria-hidden="true" />
            <HeartPulse className="animate-float-slow absolute right-[10%] top-12 h-10 w-10 text-white/15" aria-hidden="true" />
            <ShieldCheck className="animate-float absolute bottom-8 left-[16%] h-9 w-9 text-white/15" style={{ animationDelay: '1.2s' }} aria-hidden="true" />
            <Pill className="animate-float-slow absolute bottom-10 right-[18%] h-8 w-8 rotate-45 text-white/10" style={{ animationDelay: '2s' }} aria-hidden="true" />
            <Sparkles className="animate-float absolute right-[30%] top-6 h-6 w-6 text-white/20" aria-hidden="true" />
            <div className="absolute -top-24 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-white/10 blur-2xl" aria-hidden="true" />

            <div className="relative">
              <h3 className="text-[26px] font-extrabold leading-tight sm:text-[32px]">Sẵn sàng chăm sóc sức khỏe chuẩn gu bạn?</h3>
              <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-white/85">
                Bắt đầu ngay hôm nay — 2 toa đầu tiên hoàn toàn miễn phí, không cần cài app, bác sĩ thật chờ bạn tại quầy thuốc.
              </p>
              <div className="mt-7 flex flex-wrap justify-center gap-3">
                <Link
                  to="/auth"
                  className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-[15px] font-extrabold text-blue-600 shadow-[0_14px_30px_rgba(2,49,90,0.25)] transition-transform hover:-translate-y-0.5"
                >
                  Trải nghiệm BriMed ngay <ArrowRight size={17} />
                </Link>
                <Link
                  to="/nha-thuoc-doi-tac"
                  className="inline-flex items-center gap-2 rounded-full border-2 border-white/60 px-6 py-3.5 text-[14px] font-bold text-white transition-colors hover:bg-white/10"
                >
                  <Store size={16} /> Dành cho nhà thuốc
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
