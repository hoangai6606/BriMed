import type { ReactNode } from 'react'
import { Reveal } from './Reveal'

// Header chuẩn cho mọi section landing: kicker + H2 đồng nhất cỡ chữ/khoảng cách
export function SectionHeader({ kicker, title, sub }: { kicker?: string; title: ReactNode; sub?: string }) {
  return (
    <Reveal className="mx-auto max-w-2xl text-center mb-10 sm:mb-12">
      {kicker && (
        <span className="inline-block rounded-full border border-blue-100 bg-blue-50 px-3.5 py-1 text-[11.5px] font-extrabold uppercase tracking-wider text-blue-600">
          {kicker}
        </span>
      )}
      <h2 className="mt-3 text-[26px] sm:text-[32px] font-extrabold leading-tight text-slate-900">{title}</h2>
      {sub && <p className="mt-3 text-[15px] leading-relaxed text-slate-500">{sub}</p>}
    </Reveal>
  )
}
