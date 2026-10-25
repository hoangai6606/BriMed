import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { QrCode, Clock, ShieldCheck, Pill, Stethoscope, CheckCircle2, BadgeCheck, XCircle, ChevronDown, Store, Ban, Wallet, Star, UserX, AlertTriangle, Gift } from 'lucide-react'
import { api } from '../api/client'
import { SeoMeta } from '../components/common/SeoMeta'
import { TokenCheckoutMock } from '../components/domain/TokenCheckoutMock'
import { STEPS_FLOW, SEO, CUSTOMER_BENEFITS, CUSTOMER_PRICING, ELIGIBLE, NOT_ELIGIBLE, CUSTOMER_FAQ, CUSTOMER_PAIN_POINTS, HOME_STATS, CUSTOMER_TESTIMONIALS, CUSTOMER_LEAD_NOTE } from '../data/constants'

export function PublicHeader() {
  return (
    <header className="bg-white/95 backdrop-blur sticky top-0 z-40 border-b border-slate-100">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <img src="/assets/logo.png" alt="BriMed" className="w-10 h-10 rounded-full" />
          <div className="leading-tight">
            <div className="font-extrabold text-bluedark text-[17px]">BriMed</div>
            <div className="text-[10.5px] text-slate-500 hidden sm:block">Đơn thuốc an toàn cho bạn an tâm</div>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <Link to="/auth" className="btn-ghost !px-3 text-[14px]">
            Đăng nhập
          </Link>
          <Link to="/auth" className="btn-primary !px-3 text-[13px]">
            <QrCode size={17} /> <span className="hidden xs:inline sm:inline">Toa thuốc nhanh</span>
          </Link>
        </div>
      </div>
    </header>
  )
}

export function PublicFooter() {
  return (
    <footer className="bg-bluedark text-white mt-14">
      <div className="max-w-5xl mx-auto px-4 py-10 grid sm:grid-cols-3 gap-6 text-[13.5px]">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <img src="/assets/logo.png" alt="BriMed" className="w-9 h-9 rounded-full" />
            <span className="font-extrabold text-[16px]">BriMed</span>
          </div>
          <p className="text-white/70 leading-relaxed">
            Đơn thuốc an toàn cho bạn an tâm. Kết nối Bệnh nhân – Bác sĩ – Nhà thuốc với toa thuốc điện tử nhanh tại quầy (TT 26/2025).
          </p>
        </div>
        <div>
          <h3 className="font-bold mb-2.5">Dành cho nhà thuốc</h3>
          <ul className="space-y-1.5 text-white/70">
            <li><Link className="hover:text-white" to={SEO.pkg1.slug}>Gói 1 tháng – 1.200.000đ</Link></li>
            <li><Link className="hover:text-white" to={SEO.pkg3.slug}>Gói 3 tháng – 2.700.000đ</Link></li>
            <li><Link className="hover:text-white" to="/nha-thuoc-doi-tac">Đăng ký nhà thuốc đối tác</Link></li>
            <li>Hotline: 1900 2026</li>
          </ul>
        </div>
        <div>
          <h3 className="font-bold mb-2.5">Pháp lý & an toàn</h3>
          <ul className="space-y-1.5 text-white/70">
            <li>Bệnh theo danh mục TT 30/2023/TT-BYT</li>
            <li>Đơn điện tử số hóa theo TT 26/2025/TT-BYT</li>
            <li>Bác sĩ thật – đơn thật – có quyền từ chối</li>
            <li>Không dành cho cấp cứu. Khẩn cấp gọi 115.</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-[12px] text-white/60">
        © 2026 BriMed. Phòng khám đối tác có giấy phép · Giấy phép số ……………
      </div>
    </footer>
  )
}

// Icon map cho các card nỗi đau (dữ liệu mock)
export const PAIN_ICONS: Record<string, any> = {
  clock: Clock, ban: Ban, wallet: Wallet, 'user-x': UserX, alert: AlertTriangle, store: Store,
}

// Card lời kèm dùng chung cho trang khách hàng & nhà thuốc (dữ liệu mock minh họa)
export function TestimonialCard({ name, meta, quote }: { name: string; meta: string; quote: string }) {
  const initials = name.replace('DS. ', '').split(' ').slice(-2).map((w) => w[0]).join('')
  return (
    <figure className="card p-4 flex flex-col">
      <div className="flex gap-0.5 text-amber-400" aria-label="Đánh giá 5/5 sao">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} size={16} fill="currentColor" />
        ))}
      </div>
      <blockquote className="mt-2.5 text-[14px] text-slate-600 leading-relaxed flex-1">“{quote}”</blockquote>
      <figcaption className="mt-3 flex items-center gap-2.5">
        <span className="w-9 h-9 rounded-full bg-lightblue text-bluedark font-bold flex items-center justify-center text-[13px] shrink-0">
          {initials}
        </span>
        <div>
          <div className="text-[13.5px] font-bold text-slate-700">{name}</div>
          <div className="text-[12px] text-slate-400">{meta}</div>
        </div>
      </figcaption>
    </figure>
  )
}

// Form nhận danh sách nhà thuốc — thông tin chuyển về Bảng điều khiển quản trị
function LeadFormMock() {
  const [form, setForm] = useState({ name: '', phone: '' })
  const [done, setDone] = useState<string | null>(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setErr('')
    try {
      const d = await api('/catalog/patient-leads', { method: 'POST', body: JSON.stringify({ full_name: form.name, phone: form.phone }) })
      setDone(d.message)
      setForm({ name: '', phone: '' })
    } catch (e: any) {
      setErr(e.message)
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <div className="card p-6 text-center border-2 border-mint-fg/40">
        <CheckCircle2 size={40} className="mx-auto text-mint-fg mb-3" />
        <h3 className="font-bold text-[17px] text-bluedark">Đã nhận thông tin!</h3>
        <p className="text-[14px] text-slate-600 mt-1.5 leading-relaxed">{done}</p>
        <Link to="/auth" className="btn-primary mt-4">Tạo tài khoản ngay</Link>
      </div>
    )
  }

  return (
    <div className="card p-5 border-2 border-primary/25">
      <h2 className="font-extrabold text-[19px] text-bluedark">{CUSTOMER_LEAD_NOTE.title}</h2>
      <p className="text-[14px] text-slate-600 mt-1.5 leading-relaxed">{CUSTOMER_LEAD_NOTE.desc}</p>
      <form className="mt-4 grid sm:grid-cols-[1fr_1fr_auto] gap-2.5" onSubmit={submit}>
        <input className="input" required placeholder="Họ tên của bạn" aria-label="Họ tên" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className="input" required placeholder="Số điện thoại / Zalo" inputMode="tel" aria-label="Số điện thoại hoặc Zalo" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <button className="btn-primary" type="submit" disabled={busy}>{busy ? 'Đang gửi…' : 'Nhận danh sách'}</button>
      </form>
      {err && <p className="mt-2 text-[12.5px] text-redflag-fg">{err}</p>}
      <p className="mt-2 text-[12px] text-slate-400">Thông tin chỉ dùng để gửi danh sách nhà thuốc — không quảng cáo spam.</p>
    </div>
  )
}

export default function Home() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-slate-50">
      <SeoMeta
        title="BriMed – Toa thuốc điện tử nhanh tại quầy | Đơn thuốc an toàn cho bạn an tâm"
        description="BriMed – gặp bác sĩ ngay tại quầy thuốc: quét mã QR, bác sĩ gọi điện khám và ký đơn thuốc điện tử hợp lệ. 2 toa đầu miễn phí, không cần cài app."
      />
      <PublicHeader />

      <main>
        {/* Hero */}
        <section className="bg-gradient-to-b from-lightblue/60 to-slate-50">
          <div className="max-w-5xl mx-auto px-4 pt-8 pb-10 grid lg:grid-cols-2 gap-8 items-center">
            <div>
              <span className="badge bg-lightpink text-pink-dark mb-3">
                <ShieldCheck size={14} /> Bác sĩ thật · Đơn thuốc hợp lệ · Không cần cài app
              </span>
              <h1 className="text-[26px] sm:text-4xl font-extrabold text-bluedark leading-tight">
                Không có đơn? Gặp bác sĩ ngay tại quầy
              </h1>
              <p className="mt-3 text-[15.5px] text-slate-600 leading-relaxed">
                <strong className="text-primary">10 phút tại quầy</strong> thay vì nửa ngày ở bệnh viện. Khách quét mã QR tại nhà thuốc,
                trả lời vài câu hỏi, bác sĩ từ xa gọi ngắn và kê đơn điện tử hợp lệ — mua thuốc ngay tại chỗ.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <button onClick={() => navigate('/auth')} className="btn-primary">
                  <QrCode size={18} /> Quét QR – Toa thuốc nhanh
                </button>
                <Link to="/nha-thuoc-doi-tac" className="btn-outline">
                  Dành cho nhà thuốc
                </Link>
              </div>
              <div className="mt-5 flex items-center gap-4 text-[13px] text-slate-500 font-medium">
                <span className="flex items-center gap-1.5"><Clock size={15} className="text-primary" /> Chờ ~6,5 phút</span>
                <span className="flex items-center gap-1.5"><Pill size={15} className="text-pink" /> Không cần cài app</span>
                <span className="flex items-center gap-1.5"><Stethoscope size={15} className="text-mint-fg" /> Bác sĩ có quyền từ chối</span>
              </div>
            </div>
            <div className="relative">
              <img src="/assets/banner.png" alt="BriMed – Đơn thuốc an toàn cho bạn an tâm" className="w-full rounded-2xl shadow-card border-4 border-white" />
            </div>
          </div>
        </section>

        {/* Problem & Agitate — nỗi đau quen thuộc */}
        <section className="max-w-5xl mx-auto px-4 py-10">
          <h2 className="text-center font-extrabold text-[22px] text-bluedark">Mỗi lần cần toa thuốc là một lần khó khăn?</h2>
          <p className="text-center text-slate-500 text-[14.5px] mt-1.5 mb-6">Ba tình huống quen thuộc của rất nhiều người:</p>
          <div className="grid sm:grid-cols-3 gap-3">
            {CUSTOMER_PAIN_POINTS.map((x) => {
              const Icon = PAIN_ICONS[x.icon] ?? Clock
              return (
                <div key={x.title} className="card p-4">
                  <span className="w-11 h-11 rounded-xl bg-redflag-bg text-redflag-fg flex items-center justify-center">
                    <Icon size={22} />
                  </span>
                  <h3 className="mt-2.5 font-bold text-[15.5px] text-bluedark leading-snug">{x.title}</h3>
                  <p className="mt-1.5 text-[13.5px] text-slate-600 leading-relaxed">{x.desc}</p>
                </div>
              )
            })}
          </div>
          <p className="mt-5 text-center text-[15px] font-semibold text-primary">
            BriMed sinh ra để kết thúc cả ba vấn đề trên — chỉ với một mã QR tại quầy thuốc.
          </p>
        </section>

        {/* BriMed là gì? — giới thiệu cho khách hàng */}
        <section className="max-w-5xl mx-auto px-4 py-10">
          <div className="text-center">
            <span className="badge bg-lightblue text-bluedark mb-2">Dành cho bạn — người mua thuốc</span>
            <h2 className="font-extrabold text-[22px] text-bluedark">BriMed là gì?</h2>
            <p className="mt-2 text-[16px] text-slate-600 leading-relaxed max-w-2xl mx-auto">
              BriMed biến quầy thuốc gần nhà thành nơi bạn có thể gặp bác sĩ. Khi cần thuốc kê đơn cho bệnh thông thường
              mà chưa có toa, bạn chỉ cần quét mã QR tại quầy — bác sĩ gọi điện khám và cấp đơn hợp lệ, bạn mua thuốc ngay tại chỗ.
            </p>
          </div>
          <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {CUSTOMER_BENEFITS.map((b) => (
              <div key={b.title} className="card p-4">
                <span className={`w-12 h-12 rounded-2xl ${b.color} flex items-center justify-center`}>
                  <b.icon size={26} />
                </span>
                <h3 className="mt-2.5 font-bold text-[17px] text-bluedark">{b.title}</h3>
                <p className="mt-1 text-[15px] text-slate-600 leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Quy trình 5 bước */}
        <section className="max-w-5xl mx-auto px-4 py-10">
          <h2 className="text-center font-extrabold text-[22px] text-bluedark">Quy trình 5 bước tại quầy — tổng ~6,5 phút</h2>
          <p className="text-center text-slate-500 text-[14px] mt-1.5 mb-7">Giảm tối đa bước thao tác: từ không có toa đến cầm thuốc trên tay</p>
          <div className="grid sm:grid-cols-5 gap-3">
            {STEPS_FLOW.map((s, i) => (
              <div key={s.title} className="card p-4 relative">
                <span className="absolute -top-3 left-4 w-7 h-7 rounded-full bg-primary text-white text-[13px] font-bold flex items-center justify-center shadow-float">
                  {i + 1}
                </span>
                <h3 className="font-bold text-[14.5px] text-bluedark mt-2">{s.title}</h3>
                <p className="text-[12.5px] text-slate-500 mt-1 leading-snug">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Social Proof — số liệu & lời khen (mock) */}
        <section className="bg-white border-y border-slate-100 py-10">
          <div className="max-w-5xl mx-auto px-4">
            <h2 className="text-center font-extrabold text-[22px] text-bluedark">Hàng trăm người đã dùng và hài lòng</h2>
            <p className="text-center text-slate-500 text-[14.5px] mt-1.5 mb-5">Nhanh, hợp lệ, tiết kiệm — đó là điều khách nói về BriMed.</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {HOME_STATS.map((s) => (
                <div key={s.label} className="card p-4 text-center">
                  <div className="text-[26px] font-extrabold text-primary leading-none">{s.value}</div>
                  <div className="text-[12.5px] text-slate-500 mt-1.5 leading-snug">{s.label}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 grid md:grid-cols-3 gap-3">
              {CUSTOMER_TESTIMONIALS.map((t) => (
                <TestimonialCard key={t.name} name={t.name} meta={t.meta} quote={t.quote} />
              ))}
            </div>
          </div>
        </section>

        {/* Giá minh bạch + checkout nạp token (mock) */}
        <section className="bg-white border-y border-slate-100 py-10">
          <div className="max-w-5xl mx-auto px-4">
            <h2 className="text-center font-extrabold text-[22px] text-bluedark">Giá minh bạch, không phí ẩn</h2>
            <p className="text-center text-[15.5px] text-slate-500 mt-1.5">Phí tư vấn được hiển thị rõ trước khi bạn xác nhận.</p>
            <div className="mt-6 grid lg:grid-cols-[1.15fr_0.85fr] gap-5 items-start">
              <div>
                <div className="card overflow-hidden divide-y divide-slate-100">
                  {CUSTOMER_PRICING.map((row) => (
                    <div key={row.label} className={`flex items-center justify-between gap-3 px-4 py-3.5 ${row.highlight ? 'bg-mint-bg' : ''}`}>
                      <div>
                        <div className={`text-[15.5px] font-bold ${row.highlight ? 'text-mint-fg' : 'text-slate-700'}`}>{row.label}</div>
                        <div className={`text-[13px] mt-0.5 ${row.highlight ? 'text-mint-fg/80' : 'text-slate-500'}`}>{row.note}</div>
                      </div>
                      <div className={`text-[20px] font-extrabold whitespace-nowrap ${row.highlight ? 'text-mint-fg' : 'text-bluedark'}`}>{row.price}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 rounded-xl bg-lightblue/40 px-4 py-3 text-[14.5px] text-bluedark flex items-start gap-2">
                  <BadgeCheck size={18} className="shrink-0 mt-0.5" />
                  <span>
                    Tự đi khám lấy đơn tốn khoảng <strong>450.000đ</strong> và mất nửa ngày. Dùng BriMed, bạn tiết kiệm tới{' '}
                    <strong>435.000đ</strong> mỗi lần cần toa.
                  </span>
                </div>
                <p className="mt-3 text-[12.5px] text-slate-400 leading-relaxed">
                  Bạn có thể dùng 2 toa miễn phí trước rồi mới nạp token — hoặc nạp sẵn để dùng dần, không có thời hạn.
                </p>
              </div>
              <TokenCheckoutMock />
            </div>
          </div>
        </section>

        {/* Ai nên dùng */}
        <section className="max-w-5xl mx-auto px-4 py-10">
          <h2 className="text-center font-extrabold text-[22px] text-bluedark">Ai nên dùng BriMed?</h2>
          <p className="text-center text-[15.5px] text-slate-500 mt-1.5 mb-6">
            BriMed phù hợp với bệnh nhẹ, thông thường — và luôn đặt an toàn của bạn lên trước.
          </p>
          <div className="grid md:grid-cols-2 gap-3">
            <div className="card p-4 border-2 border-mint-fg/30">
              <h3 className="flex items-center gap-2 font-bold text-[17px] text-mint-fg">
                <CheckCircle2 size={20} /> Nên dùng khi bạn bị
              </h3>
              <ul className="mt-3 space-y-2">
                {ELIGIBLE.map((x) => (
                  <li key={x} className="flex gap-2 text-[15px] text-slate-700 leading-snug">
                    <CheckCircle2 size={17} className="text-mint-fg shrink-0 mt-0.5" /> {x}
                  </li>
                ))}
              </ul>
            </div>
            <div className="card p-4 border-2 border-redflag-fg/30">
              <h3 className="flex items-center gap-2 font-bold text-[17px] text-redflag-fg">
                <XCircle size={20} /> Hãy đi khám trực tiếp nếu
              </h3>
              <ul className="mt-3 space-y-2">
                {NOT_ELIGIBLE.map((x) => (
                  <li key={x} className="flex gap-2 text-[15px] text-slate-700 leading-snug">
                    <XCircle size={17} className="text-redflag-fg shrink-0 mt-0.5" /> {x}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="bg-white border-y border-slate-100 py-10">
          <div className="max-w-3xl mx-auto px-4">
            <h2 className="text-center font-extrabold text-[22px] text-bluedark">Câu hỏi thường gặp</h2>
            <p className="text-center text-[15.5px] text-slate-500 mt-1.5 mb-5">Chạm vào câu hỏi để xem câu trả lời.</p>
            <div className="space-y-2.5">
              {CUSTOMER_FAQ.map((f) => (
                <details key={f.q} className="group card px-4 py-3.5 [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex items-center justify-between gap-3 cursor-pointer list-none">
                    <span className="text-[16px] font-bold text-slate-700 group-open:text-primary">{f.q}</span>
                    <ChevronDown size={20} className="text-slate-400 shrink-0 transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="mt-2.5 text-[15px] text-slate-600 leading-relaxed border-t border-slate-100 pt-2.5">{f.a}</p>
                </details>
              ))}
            </div>
            <p className="mt-4 text-center text-[14px] text-slate-400">
              Còn thắc mắc? Gọi hotline <strong className="text-primary">1900 2026</strong> để được hỗ trợ.
            </p>
          </div>
        </section>

        {/* Action — form mock nhận danh sách nhà thuốc */}
        <section className="max-w-3xl mx-auto px-4 py-10">
          <LeadFormMock />
        </section>

        {/* CTA cuối trang */}
        <section className="max-w-5xl mx-auto px-4 pb-12 pt-2">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-pink via-pink to-pink-dark text-white shadow-float">
            {/* Hoạ tiết trang trí */}
            <div className="absolute -right-20 -top-24 w-64 h-64 rounded-full bg-white/10" aria-hidden="true" />
            <div className="absolute -left-14 -bottom-24 w-56 h-56 rounded-full bg-white/10" aria-hidden="true" />
            <div className="absolute right-28 bottom-8 w-14 h-14 rounded-full bg-bluedark/25" aria-hidden="true" />
            <div className="absolute right-6 top-6 w-3 h-3 rounded-full bg-white/40" aria-hidden="true" />

            <div className="relative px-5 sm:px-9 py-8 sm:py-10 grid md:grid-cols-[1fr_auto] gap-6 md:gap-10 items-center">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-[12.5px] font-bold tracking-wide">
                  <Gift size={14} /> Tặng 2 toa miễn phí cho tài khoản mới
                </span>
                <h2 className="mt-3 text-[23px] sm:text-[28px] font-extrabold leading-tight">
                  Bắt đầu miễn phí ngay hôm nay
                </h2>
                <p className="mt-2 text-[14.5px] text-white/85 leading-relaxed max-w-lg">
                  Tạo tài khoản trong 30 giây — không cần thẻ, không phí duy trì. Đến nhà thuốc gần nhất có mã QR BriMed và bắt đầu.
                </p>
                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-[12.5px] text-white/85 font-medium">
                  <span className="flex items-center gap-1.5"><CheckCircle2 size={14} /> Không cần thẻ</span>
                  <span className="flex items-center gap-1.5"><CheckCircle2 size={14} /> 2 toa miễn phí</span>
                  <span className="flex items-center gap-1.5"><CheckCircle2 size={14} /> Bác sĩ thật khám</span>
                </div>
              </div>
              <div className="flex flex-col gap-2.5 w-full md:w-auto md:min-w-[230px]">
                <Link
                  to="/auth"
                  className="btn bg-white text-pink-dark hover:bg-lightpink active:bg-lightpink font-extrabold !min-h-[52px] !px-7 shadow-lg shadow-pink-dark/30"
                >
                  <QrCode size={18} /> Bắt đầu miễn phí
                </Link>
                <Link
                  to="/nha-thuoc-doi-tac"
                  className="btn border-2 border-white/70 text-white hover:bg-white/10 font-bold !min-h-[46px] !px-7"
                >
                  <Store size={16} /> Tôi là chủ nhà thuốc
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  )
}
