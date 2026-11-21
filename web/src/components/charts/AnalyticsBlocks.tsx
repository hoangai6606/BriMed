// Blocks phân tích dùng chung cho 2 trang admin (Tổng quan + Data Center):
// NorthStarCards, AuStrip, KpiCard — tránh nhân bản code giữa 2 trang.
import { Radar, Gauge, TrendingUp, TrendingDown } from 'lucide-react'
import { Sparkline, DeltaPill, fmtInt } from './index'

export function NorthStarCards({ ns }: { ns: any }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-bluedark p-5 text-white shadow-float">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
        <div className="absolute -bottom-10 -left-6 h-28 w-28 rounded-full bg-white/5" />
        <div className="relative">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-white/70">
            <Radar size={14} /> North Star · Toa cấp thành công
          </div>
          <div className="mt-2 flex items-end gap-2.5">
            <span className="text-[38px] font-extrabold leading-none">{ns.dispensed_week.current}</span>
            <span className="pb-1 text-[12px] font-semibold text-white/70">toa/tuần này</span>
            <span className="ml-auto pb-0.5"><DeltaPill value={ns.dispensed_week.delta} /></span>
          </div>
          <div className="mt-1 text-[11.5px] text-white/60">Tuần trước: {ns.dispensed_week.previous} toa · Chuẩn 12 tuần:</div>
          <div className="mt-2 [&_path]:!stroke-white/90">
            <Sparkline values={ns.dispensed_trend.map((x: any) => x.value)} color="#ffffff" height={40} width={230} />
          </div>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-pink to-pink-dark p-5 text-white shadow-float">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
        <div className="relative">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-white/70">
            <Gauge size={14} /> North Star · Tốc độ QR → nhận thuốc
          </div>
          <div className="mt-2 flex items-end gap-2.5">
            <span className="text-[38px] font-extrabold leading-none">{ns.qr_to_medicine.avg_minutes || '—'}</span>
            <span className="pb-1 text-[12px] font-semibold text-white/70">phút trung bình</span>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2 text-center">
            {[
              ['p50', ns.qr_to_medicine.p50, 'median'],
              ['p90', ns.qr_to_medicine.p90, '90% ca'],
              ['Mẫu', ns.qr_to_medicine.samples, 'đơn hoàn tất'],
            ].map(([l, v]) => (
              <div key={l as string} className="rounded-xl bg-white/15 px-2 py-1.5">
                <div className="text-[16px] font-extrabold leading-none">{v ?? '—'}</div>
                <div className="mt-0.5 text-[9.5px] font-semibold uppercase tracking-wide text-white/60">{l}</div>
              </div>
            ))}
          </div>
          <div className="mt-2 text-[11px] text-white/60">Từ lúc bệnh nhân gửi yêu cầu đến khi nhận thuốc tại quầy</div>
        </div>
      </div>
    </div>
  )
}

export function AuStrip({ active, series, days }: { active: any; series: any[]; days: number }) {
  const sparkColors = ['#0d71e2', '#1E8E3E', '#e8408a', '#64748b']
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {([
        ['DAU', active.dau, active.dau_delta, 'Trong ngày'],
        ['WAU', active.wau, active.wau_delta, 'Trong tuần'],
        ['MAU', active.mau, active.mau_delta, 'Trong tháng'],
        ['YAU', active.yau, active.yau_delta, 'Trong 12 tháng'],
      ] as [string, number, number | null, string][]).map(([l, v, d, s], i) => (
        <div key={l} className="rounded-2xl border border-slate-100 bg-gradient-to-b from-slate-50/80 to-white p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wide text-slate-400">{l}</span>
            <DeltaPill value={d} />
          </div>
          <div className="mt-1 text-[26px] font-extrabold leading-none text-bluedark">{fmtInt(v)}</div>
          <div className="mt-0.5 text-[10.5px] text-slate-400">{s} · so với kỳ trước</div>
          <div className="mt-1.5 opacity-80">
            <Sparkline
              values={series.slice(-Math.min(series.length, days <= 30 ? 30 : days <= 90 ? 24 : 12)).map((x: any) => x.active_users)}
              color={sparkColors[i]} height={30} width={150}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

export function KpiCard({ label, value, sub, tone, icon, spark, color }: {
  label: string; value: string; sub?: string
  tone: 'blue' | 'green' | 'red' | 'amber' | 'pink'
  icon: any; spark?: number[]; color?: string
}) {
  const toneCls = { blue: 'bg-primary', green: 'bg-mint-fg', red: 'bg-redflag-fg', amber: 'bg-amber-500', pink: 'bg-pink' }[tone]
  return (
    <div className="card p-3.5">
      <div className="flex items-center justify-between">
        <span className={`w-8 h-8 rounded-xl ${toneCls} text-white flex items-center justify-center`}>{icon}</span>
        {spark && spark.length > 0 && color ? <Sparkline values={spark} color={color} height={30} width={110} /> : null}
      </div>
      <div className="text-[21px] font-extrabold text-bluedark mt-1.5 leading-none">{value}</div>
      <div className="text-[12px] text-slate-500 mt-1">{label}</div>
      {sub && <div className="text-[11px] text-slate-400 mt-0.5">{sub}</div>}
    </div>
  )
}

export const TrendIcon = { TrendingUp, TrendingDown }
