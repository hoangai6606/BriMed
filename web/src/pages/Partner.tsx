import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { CheckCircle2, ArrowRight, Phone, MapPin, Store, ShieldCheck, BadgeCheck, ChevronDown, Gift, UserX, AlertTriangle } from 'lucide-react'
import { SeoMeta } from '../components/common/SeoMeta'
import { SEO, PARTNER_PAIN_POINTS, PARTNER_STATS, PARTNER_TESTIMONIALS, PARTNER_URGENCY, PARTNER_FAQ } from '../data/constants'
import { api } from '../api/client'
import { useUi } from '../store/ui'
import { PublicHeader, PublicFooter, PAIN_ICONS, TestimonialCard } from './Home'

const PARTNER_BENEFITS = [
  'Standee và mã QR đặt tại quầy',
  'Bác sĩ từ xa kê đơn điện tử ký số, mã tra cứu quốc gia trên từng đơn',
  'Bán thuốc theo mã đơn; khách giữ quyền mang toa đi nơi khác',
  'Không kho, không giao hàng: thuốc có sẵn tại nhà thuốc',
  'Giảm rủi ro bị phạt 10–20 triệu đồng khi bán thuốc kê đơn không có đơn (Nghị định 90/2026)',
]

const emptyForm = {
  pharmacy_name: '', address: '', ward: '', owner_name: '', phone: '',
  license_number: '', pharmacist_name: '', software: '', csdl_synced: 'no', plan: '1_month', agreed: false,
}

function PartnerForm() {
  const [form, setForm] = useState(emptyForm)
  const [done, setDone] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const toast = useUi((s) => s.toast)
  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      const d = await api('/catalog/partner-registrations', {
        method: 'POST',
        body: JSON.stringify({ ...form, csdl_synced: form.csdl_synced === 'yes' }),
      })
      setDone(d.message)
      setForm(emptyForm)
    } catch (err: any) {
      toast(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <div className="card p-6 text-center">
        <CheckCircle2 size={44} className="mx-auto text-mint-fg mb-3" />
        <h3 className="font-bold text-lg text-bluedark mb-1.5">Đã nhận yêu cầu đăng ký</h3>
        <p className="text-[14px] text-slate-600 leading-relaxed">{done}</p>
        <button onClick={() => setDone(null)} className="btn-outline mt-4">Gửi đăng ký khác</button>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="card p-5 space-y-3.5">
      <div className="grid sm:grid-cols-2 gap-3.5">
        <div>
          <label className="label" htmlFor="pf-name">Tên nhà thuốc *</label>
          <input id="pf-name" className="input" required value={form.pharmacy_name} onChange={(e) => set('pharmacy_name', e.target.value)} placeholder="VD: Nhà thuốc Minh Châu" />
        </div>
        <div>
          <label className="label" htmlFor="pf-owner">Họ tên chủ nhà thuốc *</label>
          <input id="pf-owner" className="input" required value={form.owner_name} onChange={(e) => set('owner_name', e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="pf-addr">Địa chỉ (số đường, phường, quận) *</label>
          <div className="flex gap-2">
            <input id="pf-addr" className="input" required value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="VD: 128 Nguyễn Oanh" />
            <input className="input !w-28" value={form.ward} onChange={(e) => set('ward', e.target.value)} placeholder="P.17" aria-label="Phường" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="pf-phone">Số điện thoại / Zalo *</label>
          <input id="pf-phone" className="input" required inputMode="tel" pattern="0[0-9]{9}" title="10 chữ số, bắt đầu 0" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="pf-license">Số giấy phép KD dược *</label>
          <input id="pf-license" className="input" required value={form.license_number} onChange={(e) => set('license_number', e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="pf-pharma">Dược sĩ phụ trách *</label>
          <input id="pf-pharma" className="input" required value={form.pharmacist_name} onChange={(e) => set('pharmacist_name', e.target.value)} placeholder="VD: DS. Nguyễn Minh Châu" />
        </div>
        <div>
          <label className="label" htmlFor="pf-sw">Phần mềm bán thuốc đang dùng</label>
          <input id="pf-sw" className="input" value={form.software} onChange={(e) => set('software', e.target.value)} placeholder="VD: MShop, Giải pháp Việt…" />
        </div>
        <div>
          <label className="label" htmlFor="pf-csdl">Đã liên thông CSDL Dược quốc gia? *</label>
          <select id="pf-csdl" className="input" value={form.csdl_synced} onChange={(e) => set('csdl_synced', e.target.value)}>
            <option value="no">Chưa liên thông</option>
            <option value="yes">Đã liên thông</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="pf-plan">Gói quan tâm *</label>
          <select id="pf-plan" className="input" value={form.plan} onChange={(e) => set('plan', e.target.value)}>
            <option value="1_month">6 tháng đầu – 500.000đ/tháng (tháng đầu miễn phí)</option>
            <option value="3_months">Giai đoạn ổn định – 900.000đ/tháng (từ tháng thứ 7)</option>
          </select>
        </div>
      </div>
      <label className="flex items-start gap-2.5 text-[13.5px] text-slate-600">
        <input type="checkbox" className="mt-1 w-[18px] h-[18px] accent-[#0d71e2]" checked={form.agreed} onChange={(e) => set('agreed', e.target.checked)} />
        Tôi đồng ý để BriMed liên hệ và hẹn lắp standee, mã QR tại nhà thuốc.
      </label>
      <button disabled={busy} className="btn-pink w-full">
        {busy ? 'Đang gửi…' : 'Gửi đăng ký hợp tác'} <ArrowRight size={17} />
      </button>
    </form>
  )
}

export default function Partner() {
  const location = useLocation()
  useEffect(() => {
    if (location.hash === '#dang-ky') {
      document.getElementById('dang-ky')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } else {
      window.scrollTo(0, 0)
    }
  }, [location.hash])

  return (
    <div className="min-h-screen bg-slate-50">
      <SeoMeta
        title="Nhà thuốc đối tác BriMed Gò Vấp – Tháng đầu miễn phí, 500.000đ/tháng"
        description="Đăng ký nhà thuốc đối tác BriMed: standee + mã QR tại quầy, bác sĩ từ xa kê đơn điện tử ký số. Tháng đầu miễn phí, 500.000đ/tháng trong 6 tháng đầu, sau đó 900.000đ/tháng. Không hoa hồng tiền thuốc."
      />
      <PublicHeader />

      <main>
        {/* Hero */}
        <section className="bg-gradient-to-b from-lightblue/60 to-slate-50">
          <div className="max-w-5xl mx-auto px-4 py-10 text-center">
            <span className="badge bg-pink text-white mb-3">
              <Store size={14} /> Dành cho nhà thuốc
            </span>
            <h1 className="text-[26px] sm:text-4xl font-extrabold text-bluedark leading-tight">
              BriMed cho nhà thuốc Gò Vấp: đừng từ chối khách thiếu toa
            </h1>
            <p className="mt-3 text-[16px] text-slate-600 leading-relaxed max-w-3xl mx-auto">
              Khách đến quầy mua thuốc cảm cúm, viêm họng nhưng không có đơn? Khách quét mã QR, bác sĩ từ xa kê đơn
              điện tử hợp lệ trong vài phút — bạn bán thuốc ngay tại quầy, khách chờ khoảng 7 phút, không cần cài app.
            </p>
            <div className="mt-5 flex flex-wrap gap-3 justify-center">
              <a href="#dang-ky" className="btn-pink">
                Đăng ký đối tác ngay <ArrowRight size={17} />
              </a>
              <Link to="/" className="btn-outline">Tôi là người mua thuốc</Link>
            </div>
          </div>
        </section>

        {/* Problem & Agitate — nỗi đau nhà thuốc */}
        <section className="max-w-5xl mx-auto px-4 py-10">
          <h2 className="text-center font-extrabold text-[22px] text-bluedark">Mỗi ngày vẫn có khách cầm tiền bỏ về vì thiếu toa</h2>
          <p className="text-center text-slate-500 text-[14.5px] mt-1.5 mb-6">Ba áp lực mà nhà thuốc nhỏ đang phải gánh:</p>
          <div className="grid sm:grid-cols-3 gap-3">
            {PARTNER_PAIN_POINTS.map((x) => {
              const Icon = PAIN_ICONS[x.icon] ?? Store
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
        </section>

        {/* Quyền lợi */}
        <section className="max-w-5xl mx-auto px-4 py-10">
          <h2 className="text-center font-extrabold text-[22px] text-bluedark">Nhà thuốc nhận được gì?</h2>
          <p className="text-center text-slate-500 text-[14.5px] mt-1.5 mb-6">
            Giống như có "bác sĩ trực" tại quầy — mà không phải trả lương cố định.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {PARTNER_BENEFITS.map((b) => (
              <div key={b} className="card p-4 flex gap-2.5 text-[14.5px] text-slate-700 leading-snug">
                <ShieldCheck size={19} className="text-primary shrink-0 mt-0.5" /> {b}
              </div>
            ))}
          </div>
        </section>

        {/* Social Proof — số liệu & lời khen chủ nhà thuốc (mock) */}
        <section className="max-w-5xl mx-auto px-4 pb-10">
          <h2 className="text-center font-extrabold text-[22px] text-bluedark">Nhà thuốc Gò Vấp đã tin dùng</h2>
          <div className="mt-5 grid grid-cols-3 gap-3">
            {PARTNER_STATS.map((s) => (
              <div key={s.label} className="card p-4 text-center">
                <div className="text-[24px] font-extrabold text-pink leading-none">{s.value}</div>
                <div className="text-[12px] text-slate-500 mt-1.5 leading-snug">{s.label}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 grid md:grid-cols-3 gap-3">
            {PARTNER_TESTIMONIALS.map((t) => (
              <TestimonialCard key={t.name} name={t.name} meta={t.meta} quote={t.quote} />
            ))}
          </div>
        </section>

        {/* Urgency — ưu đãi khai trương (mock) */}
        <section className="max-w-5xl mx-auto px-4 pb-10">
          <div className="card p-5 border-2 border-pink/50 bg-lightpink/20">
            <span className="badge bg-pink text-white">
              <Gift size={14} /> {PARTNER_URGENCY.badge}
            </span>
            <h2 className="mt-2.5 font-extrabold text-[19px] text-bluedark">{PARTNER_URGENCY.title}</h2>
            <p className="text-[14px] text-slate-600 mt-1.5 leading-relaxed">{PARTNER_URGENCY.desc}</p>
            <div className="mt-3.5">
              <div className="flex justify-between text-[12.5px] font-bold text-pink-dark">
                <span>Đã đăng ký {PARTNER_URGENCY.taken}/{PARTNER_URGENCY.total} nhà thuốc</span>
                <span>Còn {PARTNER_URGENCY.total - PARTNER_URGENCY.taken} suất</span>
              </div>
              <div className="mt-1.5 h-3 rounded-full bg-white overflow-hidden border border-pink/30" role="progressbar" aria-valuenow={PARTNER_URGENCY.taken} aria-valuemin={0} aria-valuemax={PARTNER_URGENCY.total} aria-label="Số suất ưu đãi đã đăng ký">
                <div className="h-full bg-pink rounded-full" style={{ width: `${(PARTNER_URGENCY.taken / PARTNER_URGENCY.total) * 100}%` }} />
              </div>
            </div>
            <a href="#dang-ky" className="btn-pink mt-4 w-full sm:w-auto">
              {PARTNER_URGENCY.cta} <ArrowRight size={16} />
            </a>
          </div>
        </section>

        {/* Hai gói */}
        <section className="bg-white border-y border-slate-100 py-10">
          <div className="max-w-5xl mx-auto px-4">
            <h2 className="text-center font-extrabold text-[22px] text-bluedark">Hai gói thuê bao cho nhà thuốc</h2>
            <p className="text-center text-slate-500 text-[14px] mt-1.5 mb-6">
              Tháng đầu miễn phí — 500.000đ/tháng trong 6 tháng đầu, sau đó 900.000đ/tháng. BriMed không thu hoa hồng tiền thuốc.
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="card p-5 border-2 border-primary/30">
                <div className="flex items-baseline justify-between">
                  <h3 className="font-extrabold text-[17px] text-bluedark">6 tháng đầu</h3>
                  <span className="badge bg-lightblue text-bluedark">Tháng đầu miễn phí</span>
                </div>
                <div className="mt-2 text-[24px] font-extrabold text-primary">500.000đ<span className="text-[13px] text-slate-400 font-semibold">/tháng</span></div>
                <ul className="mt-3 space-y-1.5 text-[13.5px] text-slate-600">
                  <li className="flex gap-2"><CheckCircle2 size={16} className="text-mint-fg shrink-0 mt-0.5" /> Standee + mã QR đặt tại quầy</li>
                  <li className="flex gap-2"><CheckCircle2 size={16} className="text-mint-fg shrink-0 mt-0.5" /> Bác sĩ từ xa kê đơn điện tử ký số</li>
                  <li className="flex gap-2"><CheckCircle2 size={16} className="text-mint-fg shrink-0 mt-0.5" /> Bán thuốc theo mã đơn, khách chờ ~7 phút</li>
                </ul>
                <Link to={SEO.pkg1.slug} className="btn-outline w-full mt-4">Xem chi tiết phí 6 tháng đầu</Link>
              </div>
              <div className="card p-5 border-2 border-pink/40 relative overflow-hidden">
                <span className="absolute top-3 right-3 badge bg-pink text-white">Giá ổn định</span>
                <h3 className="font-extrabold text-[17px] text-bluedark">Từ tháng thứ 7</h3>
                <div className="mt-2 text-[24px] font-extrabold text-pink">900.000đ<span className="text-[13px] text-slate-400 font-semibold">/tháng</span></div>
                <div className="text-[12.5px] text-slate-500">Không đổi giá, không hoa hồng tiền thuốc</div>
                <ul className="mt-3 space-y-1.5 text-[13.5px] text-slate-600">
                  <li className="flex gap-2"><BadgeCheck size={16} className="text-pink shrink-0 mt-0.5" /> Toàn bộ quyền lợi 6 tháng đầu</li>
                  <li className="flex gap-2"><BadgeCheck size={16} className="text-pink shrink-0 mt-0.5" /> Lợi ích được đo bằng số liệu thật, không khoán chỉ tiêu</li>
                  <li className="flex gap-2"><BadgeCheck size={16} className="text-pink shrink-0 mt-0.5" /> Bác sĩ "trực tại quầy" như chuỗi lớn</li>
                </ul>
                <Link to={SEO.pkg3.slug} className="btn-pink w-full mt-4">Xem chi tiết phí ổn định</Link>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ nhà thuốc */}
        <section className="max-w-3xl mx-auto px-4 py-10">
          <h2 className="text-center font-extrabold text-[22px] text-bluedark">Câu hỏi thường gặp của nhà thuốc</h2>
          <p className="text-center text-[15.5px] text-slate-500 mt-1.5 mb-5">Chạm vào câu hỏi để xem câu trả lời.</p>
          <div className="space-y-2.5">
            {PARTNER_FAQ.map((f) => (
              <details key={f.q} className="group card px-4 py-3.5 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex items-center justify-between gap-3 cursor-pointer list-none">
                  <span className="text-[16px] font-bold text-slate-700 group-open:text-pink-dark">{f.q}</span>
                  <ChevronDown size={20} className="text-slate-400 shrink-0 transition-transform group-open:rotate-180" />
                </summary>
                <p className="mt-2.5 text-[15px] text-slate-600 leading-relaxed border-t border-slate-100 pt-2.5">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Form 2 – đăng ký đối tác */}
        <section id="dang-ky" className="max-w-5xl mx-auto px-4 py-11">
          <div className="grid lg:grid-cols-5 gap-6 items-start">
            <div className="lg:col-span-2">
              <h2 className="font-extrabold text-[19px] text-bluedark">Đăng ký nhà thuốc đối tác</h2>
              <p className="text-[14.5px] text-slate-600 mt-2 leading-relaxed">
                Điền form bên cạnh — BriMed sẽ liên hệ và hẹn lắp standee, mã QR tại quầy của bạn trong 24 giờ làm việc.
              </p>
              <div className="mt-4 space-y-2 text-[14px] text-slate-600">
                <div className="flex items-center gap-2"><Phone size={15} className="text-primary" /> Hotline: 1900 2026</div>
                <div className="flex items-center gap-2"><MapPin size={15} className="text-primary" /> Triển khai năm 1: 60 nhà thuốc Quận Gò Vấp, TP.HCM</div>
                <div className="flex items-center gap-2"><BadgeCheck size={15} className="text-primary" /> Xác nhận qua SMS/Zalo sau khi nhận yêu cầu</div>
              </div>
            </div>
            <div className="lg:col-span-3">
              <PartnerForm />
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  )
}
