import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Sparkles, Stethoscope, Pill, ShieldCheck, Timer, Lock, Gift, ArrowRight } from 'lucide-react'

const SYMPTOM_TAGS = [
  {
    icon: '🤧',
    label: 'Cảm sốt & Ho',
    hint: 'Bác sĩ gọi ngắn 1–2 phút, xem sàng lọc và kê đơn giảm triệu chứng an toàn — mua thuốc ngay tại quầy.',
  },
  {
    icon: '🌙',
    label: 'Mất ngủ / Stress',
    hint: 'Chia sẻ tình trạng giấc ngủ hoàn toàn riêng tư — chỉ bạn và bác sĩ biết, không ai nghe được.',
  },
  {
    icon: '🧴',
    label: 'Da liễu',
    hint: 'Mô tả tổn thương da, nhận phác đồ dị ứng — nấm chuẩn y khoa kèm nhắc bôi thuốc mỗi ngày.',
  },
  {
    icon: '💊',
    label: 'Tra cứu & Đổi hoạt chất',
    hint: 'So sánh giá thuốc cùng hoạt chất giữa các nhà thuốc và đổi thuốc tương đương an toàn, tiết kiệm.',
  },
]

// Hero mới: 1/3 trái là thông điệp + chọn nhanh triệu chứng, 2/3 phải là hình minh họa đồng bộ màu
export default function Hero() {
  const [active, setActive] = useState(0)
  const tag = SYMPTOM_TAGS[active]

  return (
    <section className="relative overflow-hidden bg-white pb-14 pt-10 sm:pb-20 sm:pt-14">
      {/* Nền trang trí màu phẳng */}
      <div className="pointer-events-none absolute -right-36 top-16 h-96 w-96 rounded-full bg-blue-50" aria-hidden="true" />
      <div className="pointer-events-none absolute -left-40 bottom-0 h-[420px] w-[420px] rounded-full bg-cyan-50/60" aria-hidden="true" />

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14 lg:px-8">
        {/* ===== Cột trái (≈1/3): thông điệp & chọn nhanh ===== */}
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-4 py-1.5 text-[12.5px] font-bold text-violet-600">
            <Sparkles size={14} className="text-violet-500" /> Nền tảng Y tế Số &amp; Thuốc An Toàn Thế Hệ Mới
          </span>

          <h1 className="mt-5 text-[29px] font-extrabold leading-[1.16] tracking-tight text-slate-900 sm:text-[36px]">
            Chăm sóc sức khỏe <span className="text-blue-600">chuẩn Y khoa</span> –{' '}
            <span className="text-cyan-600">Nhanh, Minh bạch</span> &amp; Không ngại ngùng.
          </h1>

          <p className="mt-4 text-[15px] leading-relaxed text-slate-500">
            Quét mã QR tại quầy thuốc — bác sĩ thật gọi ngắn, ký đơn điện tử hợp lệ, nhận thuốc sau khoảng 10 phút.
            2 toa đầu miễn phí, không cần cài app.
          </p>

          {/* Interactive Symptom Tag Picker */}
          <div className="mt-6">
            <p className="mb-2.5 text-[13px] font-semibold text-slate-500">Đang gặp vấn đề gì? Chọn nhanh nhé 👇</p>
            <div className="flex flex-wrap gap-2">
              {SYMPTOM_TAGS.map((t, i) => (
                <button
                  key={t.label}
                  type="button"
                  onClick={() => setActive(i)}
                  aria-pressed={active === i}
                  className={`rounded-full border px-4 py-2.5 text-[13.5px] font-bold transition-all duration-300 ${
                    active === i
                      ? 'border-cyan-400 bg-blue-50 text-blue-700 shadow-[0_6px_16px_rgba(6,182,212,0.16)]'
                      : 'border-slate-200 bg-white text-slate-500 hover:-translate-y-0.5 hover:border-blue-200 hover:text-blue-600'
                  }`}
                >
                  <span className="mr-1.5">{t.icon}</span>
                  {t.label}
                </button>
              ))}
            </div>

            <div key={active} className="preview-enter mt-3 flex items-start gap-2.5 rounded-2xl border border-cyan-200/80 bg-white px-4 py-3 shadow-[0_6px_18px_rgba(6,182,212,0.08)]">
              <Sparkles size={17} className="mt-0.5 shrink-0 text-cyan-500" />
              <p className="flex-1 text-[13.5px] font-medium leading-relaxed text-slate-700">
                {tag.hint}{' '}
                <Link to="/auth" className="whitespace-nowrap font-extrabold text-blue-600 hover:text-blue-700">
                  Bắt đầu ngay <ArrowRight size={13} className="inline" />
                </Link>
              </p>
            </div>
          </div>

          {/* CTA chính */}
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-7 py-3.5 text-[15px] font-extrabold text-white shadow-[0_14px_34px_rgba(37,99,235,0.35)] transition-all hover:-translate-y-0.5 hover:bg-blue-700"
            >
              <Stethoscope size={18} /> Kết nối Bác sĩ ngay
            </Link>
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-6 py-3.5 text-[14.5px] font-bold text-blue-700 shadow-[0_8px_24px_rgba(37,99,235,0.08)] transition-all hover:-translate-y-0.5 hover:border-cyan-300"
            >
              <Pill size={17} /> Mua thuốc theo đơn
            </Link>
          </div>

          {/* Trust indicators */}
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] font-semibold text-slate-500">
            <span className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
              </span>
              Bác sĩ sẵn sàng tư vấn
            </span>
            <span className="flex items-center gap-1.5 text-amber-600">
              <Gift size={15} /> 2 toa đầu miễn phí
            </span>
            <span className="flex items-center gap-1.5">
              <Lock size={14} className="text-emerald-500" /> Hồ sơ bảo mật 2 lớp
            </span>
          </div>
        </div>

        {/* ===== Cột phải (≈2/3): hình minh họa đồng bộ màu ===== */}
        <div className="relative">
          <div className="rounded-[2rem] border border-blue-100 bg-white p-5 shadow-[0_24px_60px_rgba(37,99,235,0.10)] sm:p-8">
            <img
              src="/images/hero-doctor.png"
              alt="Bác sĩ thật gọi tư vấn qua điện thoại và kê đơn thuốc điện tử an toàn"
              className="mx-auto h-auto max-h-[520px] w-full max-w-[540px] object-contain"
              width={540}
              height={540}
              loading="eager"
            />
          </div>

          {/* Chip nổi màu phẳng */}
          <div className="absolute -top-4 left-5 flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-4 py-2 shadow-[0_10px_24px_rgba(16,185,129,0.16)] sm:left-7">
            <ShieldCheck size={15} className="shrink-0 text-emerald-500" />
            <span className="text-[12px] font-bold text-emerald-700">Đơn điện tử · chữ ký số hợp lệ</span>
          </div>
          <div className="absolute -bottom-4 right-5 flex items-center gap-2 rounded-full border border-cyan-200 bg-white px-4 py-2 shadow-[0_10px_24px_rgba(6,182,212,0.16)] sm:right-7">
            <Timer size={15} className="shrink-0 text-cyan-600" />
            <span className="text-[12px] font-bold text-cyan-700">Bác sĩ gọi ngắn · SLA &lt; 5 phút</span>
          </div>
        </div>
      </div>
    </section>
  )
}
