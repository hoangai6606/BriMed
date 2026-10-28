import { Star } from 'lucide-react'
import { SectionHeader } from './SectionHeader'
import { Reveal } from './Reveal'
import { HOME_STATS, CUSTOMER_TESTIMONIALS } from '../../data/constants'

const AVATAR_TINTS = ['bg-violet-500', 'bg-cyan-600', 'bg-amber-500']

export default function SocialProof() {
  return (
    <section className="border-y border-blue-100/60 bg-blue-50/50 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4">
        <SectionHeader
          kicker="Cộng đồng BriMed"
          title={<>Hàng trăm bạn đã dùng <span className="text-blue-600">và hài lòng</span></>}
          sub="Nhanh, hợp lệ, tiết kiệm — đó là điều khách nói về BriMed."
        />

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {HOME_STATS.map((s, i) => (
            <Reveal key={s.label} delay={i * 70}>
              <div className="flex h-full flex-col items-center justify-center rounded-3xl border border-blue-100/70 bg-white/80 px-4 py-6 text-center shadow-[0_20px_50px_rgba(37,99,235,0.06)] backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-cyan-200">
                <div className="text-[27px] font-extrabold leading-none text-blue-600">{s.value}</div>
                <div className="mt-2 text-[12.5px] font-semibold leading-snug text-slate-500">{s.label}</div>
              </div>
            </Reveal>
          ))}
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-3">
          {CUSTOMER_TESTIMONIALS.map((t, i) => {
            const initials = t.name.replace('DS. ', '').split(' ').slice(-2).map((w) => w[0]).join('')
            return (
              <Reveal key={t.name} delay={i * 90}>
                <figure className="flex h-full flex-col rounded-3xl border border-blue-100/70 bg-white/80 p-6 shadow-[0_20px_50px_rgba(37,99,235,0.06)] backdrop-blur transition-all duration-300 hover:-translate-y-1.5 hover:scale-[1.01] hover:border-cyan-200">
                  <div className="flex gap-0.5 text-amber-400" aria-label="Đánh giá 5/5 sao">
                    {Array.from({ length: 5 }).map((_, s) => (
                      <Star key={s} size={15} fill="currentColor" />
                    ))}
                  </div>
                  <blockquote className="mt-3 flex-1 text-[14px] leading-relaxed text-slate-600">“{t.quote}”</blockquote>
                  <figcaption className="mt-4 flex items-center gap-3">
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[13px] font-extrabold text-white ${AVATAR_TINTS[i % AVATAR_TINTS.length]}`}>
                      {initials}
                    </span>
                    <div>
                      <div className="text-[13.5px] font-bold text-slate-700">{t.name}</div>
                      <div className="text-[12px] text-slate-400">{t.meta}</div>
                    </div>
                  </figcaption>
                </figure>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}
