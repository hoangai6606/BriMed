import { useState } from 'react'
import { MessagesSquare, Stethoscope, PackageCheck, CheckCircle2 } from 'lucide-react'
import { SectionHeader } from './SectionHeader'
import { Reveal } from './Reveal'

const STEPS = [
  {
    icon: MessagesSquare,
    title: 'Chia sẻ triệu chứng',
    desc: 'Chọn nhanh biểu hiện sức khỏe — không xếp hàng, không chờ đợi mệt mỏi.',
  },
  {
    icon: Stethoscope,
    title: 'Bác sĩ tư vấn & kê đơn số',
    desc: 'Gọi ngắn 1-1, kiểm duyệt kháng sinh và gợi ý hoạt chất tối ưu cho bạn.',
  },
  {
    icon: PackageCheck,
    title: 'Nhận thuốc chuẩn từ nhà thuốc',
    desc: 'Đối soát đơn tự động — nhận tại quầy hoặc giao tận tay, giá minh bạch.',
  },
]

function Step1Preview() {
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <span className="rounded-full border border-cyan-400 bg-blue-50 px-4 py-2 text-[13px] font-bold text-blue-700">🤧 Cảm sốt &amp; Ho</span>
        <span className="rounded-full border border-slate-200 bg-white px-4 py-2 text-[13px] font-bold text-slate-500">🥵 Đau họng</span>
        <span className="rounded-full border border-slate-200 bg-white px-4 py-2 text-[13px] font-bold text-slate-500">😷 Sổ mũi</span>
      </div>
      <div className="mt-4 flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
        <span className="text-[13px] font-semibold text-slate-600">Đang gửi tới bác sĩ trực…</span>
        <span className="text-[12px] font-extrabold text-cyan-600">SLA &lt; 5 phút</span>
      </div>
    </div>
  )
}

function Step2Preview() {
  return (
    <div className="flex items-center gap-4">
      <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-[14px] font-extrabold text-white">
        HA
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[14px] font-extrabold text-slate-800">BS. Phạm Ngọc Anh</div>
        <div className="text-[12px] font-semibold text-emerald-600">Đang tư vấn · 01:24</div>
        <div className="mt-2 flex h-6 items-end gap-1" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className="eq-bar w-1.5 rounded-full bg-cyan-500"
              style={{ height: `${12 + (i % 3) * 7}px`, animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-700">
        Không kê kháng sinh tràn lan
      </span>
    </div>
  )
}

function Step3Preview() {
  const states = ['Xác nhận', 'Chuẩn bị', 'Sẵn sàng', 'Hoàn tất']
  return (
    <div>
      <div className="flex items-center">
        {states.map((s, i) => (
          <div key={s} className="flex flex-1 flex-col items-center">
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-extrabold ${
                i < 2 ? 'bg-emerald-500 text-white' : i === 2 ? 'relative bg-cyan-500 text-white' : 'bg-slate-200 text-slate-400'
              }`}
            >
              {i < 2 ? <CheckCircle2 size={14} /> : i === 2 ? (
                <>
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-60" />
                  3
                </>
              ) : (
                4
              )}
            </span>
            <span className={`mt-1.5 text-[10.5px] font-bold ${i <= 2 ? 'text-blue-700' : 'text-slate-400'}`}>{s}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
        <span className="text-[13px] font-semibold text-slate-600">Nhà thuốc Minh Châu · Gò Vấp</span>
        <span className="font-mono text-[12px] font-bold text-blue-700">VN-Rx-2026-00012</span>
      </div>
    </div>
  )
}

const PREVIEWS = [<Step1Preview key="1" />, <Step2Preview key="2" />, <Step3Preview key="3" />]

export default function HowItWorks() {
  const [active, setActive] = useState(1)

  return (
    <section id="3-buoc" className="scroll-mt-28 bg-blue-50/50 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4">
        <SectionHeader
          kicker="Cách hoạt động"
          title={<>3 bước <span className="text-blue-600">khỏe nhanh</span> — gọn lẹ như nhắn tin</>}
          sub="Chạm vào từng bước để xem trước trải nghiệm tương ứng."
        />

        <Reveal>
          <div className="relative grid gap-8 sm:grid-cols-3 sm:gap-6">
            {/* Đường nối các bước (desktop) */}
            <div className="absolute left-[16%] right-[16%] top-7 hidden h-0.5 rounded-full bg-cyan-200 sm:block" aria-hidden="true" />

            {STEPS.map((s, i) => {
              const isActive = active === i
              return (
                <button
                  key={s.title}
                  type="button"
                  onClick={() => setActive(i)}
                  onMouseEnter={() => setActive(i)}
                  aria-pressed={isActive}
                  className="group relative z-10 flex flex-col items-center text-center"
                >
                  <span
                    className={`flex h-14 w-14 items-center justify-center rounded-2xl text-white transition-all duration-300 ${
                      isActive
                        ? 'scale-110 bg-blue-600 shadow-[0_14px_30px_rgba(37,99,235,0.35)]'
                        : 'border border-blue-100 bg-white text-blue-500 shadow-[0_8px_20px_rgba(37,99,235,0.10)] group-hover:scale-105'
                    }`}
                  >
                    <s.icon size={24} />
                  </span>
                  <span className={`mt-3 text-[15.5px] font-extrabold transition-colors ${isActive ? 'text-blue-700' : 'text-slate-700'}`}>
                    Bước {i + 1}: {s.title}
                  </span>
                  <span className="mt-1.5 max-w-[260px] text-[13px] leading-relaxed text-slate-500">{s.desc}</span>
                </button>
              )
            })}
          </div>
        </Reveal>

        <Reveal delay={120}>
          <div className="mx-auto mt-10 max-w-3xl rounded-3xl border border-blue-100/80 bg-white/80 p-5 shadow-[0_20px_50px_rgba(37,99,235,0.08)] backdrop-blur-xl sm:p-6">
            <div className="mb-3 flex items-center gap-2 text-[12px] font-extrabold uppercase tracking-wider text-cyan-600">
              Xem trước · Bước {active + 1}
            </div>
            <div key={active} className="preview-enter">
              {PREVIEWS[active]}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
