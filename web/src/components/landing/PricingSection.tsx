import { BadgeCheck } from 'lucide-react'
import { SectionHeader } from './SectionHeader'
import { Reveal } from './Reveal'
import { TokenCheckoutMock } from '../domain/TokenCheckoutMock'
import { CUSTOMER_PRICING } from '../../data/constants'

// Giữ nguyên dữ liệu giá + luồng nạp token, chỉ làm mới phong cách glass/new-brand
export default function PricingSection() {
  return (
    <section id="gia" className="scroll-mt-28 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4">
        <SectionHeader
          kicker="Giá minh bạch"
          title={<>Rẻ hơn đi khám <span className="text-blue-600">cả chục lần</span></>}
          sub="Phí tư vấn được hiển thị rõ trước khi bạn xác nhận — không phí ẩn, không phụ thu."
        />

        <div className="grid items-start gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <Reveal>
            <div className="overflow-hidden rounded-3xl border border-blue-100/80 bg-white/80 shadow-[0_20px_50px_rgba(37,99,235,0.08)] backdrop-blur-xl">
              {CUSTOMER_PRICING.map((row) => (
                <div
                  key={row.label}
                  className={`flex items-center justify-between gap-3 px-5 py-4 sm:px-6 ${row.highlight ? 'bg-emerald-50/70' : ''}`}
                >
                  <div>
                    <div className={`text-[15.5px] font-bold ${row.highlight ? 'text-emerald-700' : 'text-slate-700'}`}>{row.label}</div>
                    <div className={`mt-0.5 text-[12.5px] ${row.highlight ? 'text-emerald-600/80' : 'text-slate-400'}`}>{row.note}</div>
                  </div>
                  <div className={`whitespace-nowrap text-[19px] font-extrabold ${row.highlight ? 'text-emerald-600' : 'text-blue-700'}`}>
                    {row.price}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3.5 text-[14px] text-slate-600">
              <BadgeCheck size={18} className="mt-0.5 shrink-0 text-emerald-500" />
              <span>
                Tự đi khám lấy đơn tốn khoảng <strong>450.000đ</strong> và mất nửa ngày. Dùng BriMed, bạn tiết kiệm tới{' '}
                <strong className="text-emerald-700">435.000đ</strong> mỗi lần cần toa.
              </span>
            </div>
          </Reveal>

          <Reveal delay={100}>
            <TokenCheckoutMock />
          </Reveal>
        </div>
      </div>
    </section>
  )
}
