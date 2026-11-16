import { useEffect, useMemo, useState } from 'react'
import {
  BarChart3, FileCheck2, Users, Activity, Globe2, TrendingUp, ShieldCheck,
  Coins, Store, Boxes, Clock3, UserPlus, Repeat, HeartPulse, Radar, Gauge,
} from 'lucide-react'
import { SeoMeta } from '../../components/common/SeoMeta'
import { api, fmtVnd } from '../../api/client'
import { PageLoading } from '../../components/common/Misc'
import { ROLE_LABELS } from '../../data/constants'
import {
  ROLE_COLORS, Sparkline, LineChart, StackedBarChart, Donut, Heatmap, HBars, Funnel,
  RingStat, DeltaPill, ChartCard, ChartEmpty, fmtInt, fmtCompact,
} from '../../components/charts'

// =====================================================================
// Trang "Phân tích & Theo dõi" — 8 trụ chỉ số vận hành & tăng trưởng:
// North Star kép · Acquisition · Activation (phễu) · Engagement (AU)
// Retention · Revenue · Operations · Compliance · Supply nhà thuốc.
// =====================================================================

const RANGES: { days: number; label: string }[] = [
  { days: 7, label: '7 ngày' },
  { days: 30, label: '30 ngày' },
  { days: 90, label: '90 ngày' },
  { days: 365, label: '12 tháng' },
]

const ROLE_VI: Record<string, string> = { ...ROLE_LABELS, guest: 'Khách vãng lai' }

const fmtVndCompact = (n: number) =>
  n >= 1e9 ? `${(n / 1e9).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tỷ`
    : n >= 1e6 ? `${(n / 1e6).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tr`
      : fmtInt(n)

function bucketLabel(key: string, bucket: string) {
  if (bucket === 'month') return `T${Number(key.split('-')[1])}`
  const [, m, d] = key.split('-')
  return `${Number(d)}/${Number(m)}`
}

export default function AdminAnalytics() {
  const [days, setDays] = useState(30)
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    setData(null)
    setError('')
    api(`/admin/analytics?days=${days}`)
      .then((d) => setData(d))
      .catch((e) => setError(e.message))
  }, [days])

  const buckets = useMemo(
    () => (data ? data.series.map((s: any) => ({ key: s.key, label: bucketLabel(s.key, data.range.bucket) })) : []),
    [data],
  )
  const hasTraffic = useMemo(
    () => data ? data.series.some((s: any) => s.visits > 0) : false,
    [data],
  )

  if (error) {
    return (
      <div className="max-w-5xl space-y-4">
        <SeoMeta title="Phân tích & Theo dõi – BriMed" />
        <div className="card border-redflag-fg/30 bg-redflag-bg/40 p-5 text-[14px] text-redflag-fg">{error}</div>
      </div>
    )
  }
  if (!data) return <><SeoMeta title="Phân tích & Theo dõi – BriMed" /><PageLoading /></>

  const { north_star: ns, active, series, funnel, roles, heatmap, top_paths: topPaths, ops, compliance, revenue, supply, retention } = data
  const since = data.tracking_since ? new Date(data.tracking_since) : null
  const sinceVi = since ? since.toLocaleDateString('vi-VN') : ''

  return (
    <div className="max-w-5xl space-y-4">
      <SeoMeta title="Phân tích & Theo dõi – BriMed" />

      {/* ===== Header + chọn khoảng thời gian ===== */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-[20px] font-extrabold text-bluedark">
            <BarChart3 size={22} className="text-primary" /> Phân tích &amp; Theo dõi
          </h1>
          <p className="mt-0.5 text-[12px] text-slate-400">
            Vận hành &amp; tăng trưởng toàn nền tảng · Cập nhật {new Date(data.generated_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
            {sinceVi && ` · Theo dõi lượt truy cập từ ${sinceVi}`}
          </p>
        </div>
        <div className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1">
          {RANGES.map((r) => (
            <button
              key={r.days}
              onClick={() => setDays(r.days)}
              className={`whitespace-nowrap rounded-lg px-3.5 py-2 text-[12.5px] font-bold transition ${days === r.days ? 'bg-primary text-white shadow-float' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* ===== North Star kép ===== */}
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
            <div className="mt-1 text-[11.5px] text-white/60">
              Tuần trước: {ns.dispensed_week.previous} toa · Chuẩn 12 tuần:
            </div>
            <div className="mt-2 [&_circle]:!stroke-white [&_path]:!stroke-white/90">
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

      {/* ===== Engagement: DAU/WAU/MAU/YAU ===== */}
      <ChartCard
        title="Người dùng hoạt động theo vai trò"
        sub="DAU/WAU/MAU/YAU — khách đã đăng nhập có lượt truy cập trong 1 ngày / 7 ngày / 30 ngày / 12 tháng"
        icon={<Activity size={18} />}
        right={
          <span className="badge shrink-0 bg-lightblue text-bluedark">Độ bám dính DAU/MAU: <b className="ml-1">{active.stickiness}%</b></span>
        }
      >
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
                  color={['#0d71e2', '#1E8E3E', '#e8408a', '#64748b'][i]}
                  height={30}
                  width={150}
                />
              </div>
            </div>
          ))}
        </div>
      </ChartCard>

      {/* ===== Acquisition: truy cập theo vai trò ===== */}
      <ChartCard
        title="Lượt truy cập theo vai trò"
        sub="Mỗi cột là tổng lượt xem trang trong kỳ, chia màu theo vai trò của người truy cập"
        icon={<Globe2 size={18} />}
        right={<span className="badge shrink-0 bg-slate-100 text-slate-600">Tổng {fmtInt(series.reduce((s: number, x: any) => s + x.visits, 0))} lượt</span>}
        className="relative"
      >
        <StackedBarChart
          buckets={buckets}
          series={(['guest', 'patient', 'doctor', 'pharmacy', 'admin'] as const).map((role) => ({
            name: ROLE_VI[role], color: ROLE_COLORS[role], values: series.map((s: any) => s.by_role[role] || 0),
          }))}
        />
        {!hasTraffic && <ChartEmpty note={`Chưa ghi nhận lượt truy cập — bắt đầu theo dõi từ ${sinceVi || 'hôm nay'}, dữ liệu sẽ đầy dần theo usage thật`} />}
      </ChartCard>

      {/* ===== Vai trò: donut + bảng ===== */}
      <div className="grid gap-3 lg:grid-cols-5">
        <ChartCard title="Phân bổ truy cập" sub="Tỷ trọng lượt truy cập theo vai trò" icon={<Users size={18} />} className="lg:col-span-2">
          <Donut
            slices={roles.map((r: any) => ({ label: ROLE_VI[r.role], value: r.visits, color: ROLE_COLORS[r.role] }))}
            center={{ value: fmtCompact(series.reduce((s: number, x: any) => s + x.visits, 0)), label: 'lượt truy cập' }}
          />
        </ChartCard>
        <ChartCard title="Hoạt động theo vai trò" sub={days === 365 ? 'Trong 12 tháng' : `Trong ${days} ngày`} icon={<Users size={18} />} className="lg:col-span-3">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[440px] text-[12.5px]">
              <thead>
                <tr className="bg-slate-50 text-left text-[10.5px] uppercase text-slate-400">
                  <th className="rounded-l-lg px-3 py-2">Vai trò</th>
                  <th className="px-2 py-2 text-right">Tài khoản</th>
                  <th className="px-2 py-2 text-right">Hoạt động</th>
                  <th className="px-2 py-2 text-right">Truy cập</th>
                  <th className="px-2 py-2 text-right">Đăng nhập</th>
                  <th className="rounded-r-lg px-3 py-2 text-right">Mới</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {roles.map((r: any) => (
                  <tr key={r.role}>
                    <td className="px-3 py-2.5 font-bold text-slate-700">
                      <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ background: ROLE_COLORS[r.role] }} />
                      {ROLE_VI[r.role]}
                    </td>
                    <td className="px-2 py-2.5 text-right text-slate-500">{r.role === 'guest' ? '—' : fmtInt(r.accounts)}</td>
                    <td className="px-2 py-2.5 text-right">
                      {r.role === 'guest' ? <span className="text-slate-300">—</span> : (
                        <span className={`font-bold ${r.active_pct != null && r.active_pct >= 50 ? 'text-mint-fg' : r.active_pct != null && r.active_pct > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                          {fmtInt(r.active)} {r.active_pct != null && <span className="text-[10.5px] font-semibold text-slate-400">({r.active_pct}%)</span>}
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-2.5 text-right font-semibold text-slate-600">{fmtInt(r.visits)}</td>
                    <td className="px-2 py-2.5 text-right text-slate-500">{fmtInt(r.logins)}</td>
                    <td className="px-3 py-2.5 text-right">{r.new_accounts ? <span className="badge bg-mint-bg text-mint-fg">+{r.new_accounts}</span> : <span className="text-slate-300">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>
      </div>

      {/* ===== Activation: phễu + giữ chân ===== */}
      <div className="grid gap-3 lg:grid-cols-5">
        <ChartCard title="Phễu hành trình bệnh nhân" sub="Số lượng trong kỳ — từ truy cập đến mua thuốc tại quầy" icon={<TrendingUp size={18} />} className="lg:col-span-3">
          <Funnel
            steps={[
              { label: 'Truy cập (khách riêng)', value: funnel.visitors, color: '#a6d3fd' },
              { label: 'Đăng ký tài khoản', value: funnel.signups, color: '#7cb6f5' },
              { label: 'Gửi Form 1 khám', value: funnel.forms, color: '#0d71e2' },
              { label: 'Thanh toán phí 25k', value: funnel.paid, color: '#f59e0b' },
              { label: 'Được bác sĩ gọi', value: funnel.called, color: '#e8408a' },
              { label: 'Có toa điện tử', value: funnel.prescribed, color: '#B92A69' },
              { label: 'Mua tại quầy', value: funnel.purchased, color: '#0756AF' },
            ]}
          />
          {!hasTraffic && <p className="mt-2 text-center text-[11px] text-slate-400">Bước truy cập cần dữ liệu activity tracking tích lũy dần</p>}
        </ChartCard>
        <ChartCard title="Giữ chân" sub="Retention — khách quay lại" icon={<Repeat size={18} />} className="lg:col-span-2">
          <div className="space-y-3.5">
            <RingStat pct={retention.overall_pct} color="#0d71e2" label="Bệnh nhân khám ≥ 2 lần" sub="Toàn bộ lịch sử — tỷ lệ quay lại cốt lõi" />
            <RingStat pct={retention.repeat_in_range_pct} color="#1E8E3E" label="Khám lại trong kỳ này" sub="Bệnh nhân có ≥ 2 lượt khám trong kỳ" />
            <div className="rounded-xl bg-slate-50 p-3">
              <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">Khách truy cập trong kỳ</div>
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-slate-500">Mới</span>
                <b className="text-primary">{fmtInt(retention.new_visitors)}</b>
              </div>
              <div className="mt-1 flex items-center justify-between text-[13px]">
                <span className="text-slate-500">Quay lại</span>
                <b className="text-pink">{fmtInt(retention.returning_visitors)}</b>
              </div>
            </div>
          </div>
        </ChartCard>
      </div>

      {/* ===== Operations: SLA + kpi vận hành ===== */}
      <ChartCard
        title="Vận hành — SLA thời gian chờ khám"
        sub={`Trung bình ${ops.wait.avg_minutes || '—'} phút · p50 ${ops.wait.p50 || '—'} · p90 ${ops.wait.p90 || '—'} · mục tiêu ≤ ${ops.wait.target} phút`}
        icon={<Clock3 size={18} />}
        right={<span className={`badge shrink-0 ${ops.wait.within_target_pct >= 80 ? 'bg-mint-bg text-mint-fg' : 'bg-redflag-bg text-redflag-fg'}`}>{ops.wait.within_target_pct}% ca đạt SLA</span>}
      >
        <LineChart
          buckets={buckets}
          series={[{ name: 'Chờ TB (phút)', color: '#0d71e2', values: series.map((s: any) => s.wait_avg), area: true }]}
          threshold={{ value: ops.wait.target, label: `mục tiêu ${ops.wait.target}'` }}
          yFmt={(n) => `${n}'`}
        />
        <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <MiniStat label="Ca chờ >15' đã trả phí" value={`${ops.wait.stuck15}`} tone={ops.wait.stuck15 > 0 ? 'red' : 'green'} />
          <MiniStat label="Gọi TB / ca" value={`${ops.calls.avg_minutes || 0} phút`} tone="blue" />
          <MiniStat label="Video tháng này" value={`${fmtInt(ops.calls.video_minutes_month)} / 10.000 phút`} tone="blue" />
          <MiniStat label="Đơn chốt TB" value={`${ops.fulfillment.avg_minutes || 0} phút`} tone="blue" />
          <MiniStat label="Đổi hoạt chất" value={`${ops.substitution.total} yêu cầu${ops.substitution.pending ? ` · ${ops.substitution.pending} chờ duyệt` : ''}`} tone={ops.substitution.pending ? 'amber' : 'blue'} />
          <MiniStat label="Hết hàng tồn kho" value={`${ops.stock.stockout_pct}% (${ops.stock.out}/${ops.stock.total})`} tone={ops.stock.stockout_pct > 5 ? 'red' : 'green'} />
          <MiniStat label="BS trực / tổng" value={`${ops.doctors.online}/${ops.doctors.total}`} tone={ops.doctors.online > 0 ? 'green' : 'amber'} />
          <MiniStat label="Slot trực được đặt" value={`${ops.doctors.slot_utilization_pct}%`} tone="blue" />
        </div>
      </ChartCard>

      {/* ===== Compliance ===== */}
      <div className="grid gap-3 lg:grid-cols-5">
        <ChartCard
          title="Kiểm soát kháng sinh"
          sub={`Tỷ lệ toa có kháng sinh ${compliance.antibiotic_pct}% · ngưỡng an toàn ${compliance.threshold}% (TT 26/2025)`}
          icon={<ShieldCheck size={18} />}
          className="lg:col-span-3"
          right={<span className={`badge shrink-0 ${compliance.antibiotic_pct > compliance.threshold ? 'bg-redflag-bg text-redflag-fg' : 'bg-mint-bg text-mint-fg'}`}>{compliance.antibiotic_pct}%</span>}
        >
          <LineChart
            buckets={buckets}
            series={[{ name: 'Tỷ lệ toa kháng sinh (%)', color: '#e8408a', values: compliance.antibiotic_trend.map((x: any) => x.rate), area: true }]}
            threshold={{ value: compliance.threshold, label: `ngưỡng ${compliance.threshold}%` }}
            yFmt={(n) => `${n}%`}
          />
          <div className="mt-3">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">Theo bác sĩ (toa trong kỳ)</div>
            <HBars
              items={compliance.per_doctor.map((d: any) => ({
                label: d.name.replace('BS. ', ''), value: d.rate, hint: `${d.total} toa`,
                color: d.rate > compliance.threshold ? '#D93025' : '#1E8E3E',
              }))}
              fmt={(n) => `${n}%`}
              threshold={{ value: compliance.threshold, label: 'Ngưỡng' }}
            />
            {!compliance.per_doctor.length && <p className="text-[12px] text-slate-400">Chưa có toa phát hành trong kỳ.</p>}
          </div>
        </ChartCard>
        <ChartCard title="Tuân thủ quy định" sub="Đóng vòng tròn an toàn dữ liệu – đơn thuốc" icon={<FileCheck2 size={18} />} className="lg:col-span-2">
          <div className="space-y-4">
            <RingStat pct={compliance.digital_signature_pct} color="#0d71e2" label="Toa có chữ ký số" sub="Phát hành đúng TT 26/2025/TT-BYT" />
            <RingStat pct={compliance.dispensed_pct} color="#1E8E3E" label="Toa đã cấp phát" sub="Đóng vòng tròn truy vết đến tay bệnh nhân" />
            <RingStat pct={compliance.csdl_pct} color="#e8408a" label="Nhà thuốc liên thông CSDL" sub="Đồng bộ dược quốc gia" />
          </div>
        </ChartCard>
      </div>

      {/* ===== Revenue ===== */}
      <div className="grid gap-3 lg:grid-cols-5">
        <ChartCard
          title="Doanh thu"
          sub="Phí khám 25.000đ/lượt (B2C) + thuê bao nhà thuốc (B2B)"
          icon={<Coins size={18} />}
          className="lg:col-span-3"
          right={<span className="badge shrink-0 bg-lightblue text-bluedark">Tổng {fmtVnd(revenue.total_vnd)}</span>}
        >
          <StackedBarChart
            buckets={buckets}
            series={[
              { name: 'Phí khám B2C', color: '#0d71e2', values: series.map((s: any) => s.revenue.consult) },
              { name: 'Thuê bao B2B', color: '#e8408a', values: series.map((s: any) => s.revenue.b2b) },
            ]}
            yFmt={fmtVndCompact}
          />
          <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <MiniStat label="ARPU (phí khám/BN trả phí)" value={fmtVnd(revenue.arpu_vnd)} tone="blue" />
            <MiniStat label="Giá trị TB đơn thuốc" value={revenue.aov_vnd ? fmtVnd(revenue.aov_vnd) : '—'} tone="pink" />
            <MiniStat label="Thù lao bác sĩ (chi)" value={fmtVnd(revenue.doctor_fee_vnd)} tone="amber" />
            <MiniStat label="Hoàn phí" value={fmtVnd(revenue.refund_vnd)} tone={revenue.refund_vnd > 0 ? 'red' : 'green'} />
          </div>
        </ChartCard>
        <ChartCard title="Hình thức nhận thuốc" sub="Tại quầy so với giao tận nơi" icon={<Store size={18} />} className="lg:col-span-2">
          <Donut
            slices={[
              { label: 'Nhận tại quầy', value: revenue.pickup, color: '#0d71e2' },
              { label: 'Giao tận nơi', value: revenue.delivery, color: '#e8408a' },
            ]}
            center={{ value: `${revenue.pickup + revenue.delivery ? Math.round((revenue.pickup / (revenue.pickup + revenue.delivery)) * 100) : 0}%`, label: 'tại quầy' }}
          />
        </ChartCard>
      </div>

      {/* ===== Growth: đăng ký + khám + toa ===== */}
      <ChartCard
        title="Tăng trưởng nền tảng"
        sub="Tài khoản mới · lượt gửi Form khám · toa phát hành — nhịp tăng của cả hai phía cung–cầu"
        icon={<TrendingUp size={18} />}
        right={<span className="badge shrink-0 bg-mint-bg text-mint-fg"><UserPlus size={12} className="mr-1" />{fmtInt(series.reduce((s: number, x: any) => s + x.new_users, 0))} đăng ký mới</span>}
      >
        <LineChart
          buckets={buckets}
          series={[
            { name: 'Toa phát hành', color: '#0756AF', values: series.map((s: any) => s.issued) },
            { name: 'Lượt gửi Form khám', color: '#0d71e2', values: series.map((s: any) => s.consults), area: true },
            { name: 'Đăng ký mới', color: '#e8408a', values: series.map((s: any) => s.new_users) },
          ]}
        />
      </ChartCard>

      {/* ===== Supply: pipeline nhà thuốc ===== */}
      <div className="grid gap-3 lg:grid-cols-5">
        <ChartCard title="Pipeline nhà thuốc đối tác" sub="Đăng ký từ Form 2 đến khi vận hành thật" icon={<Store size={18} />} className="lg:col-span-3">
          <Funnel
            steps={[
              { label: 'Đăng ký mới', value: supply.pipeline.new, color: '#a6d3fd' },
              { label: 'Đã liên hệ', value: supply.pipeline.contacted, color: '#0d71e2' },
              { label: 'Đã ký gói', value: supply.pipeline.signed, color: '#f59e0b' },
              { label: 'Đã tạo tài khoản', value: supply.pipeline.converted, color: '#1E8E3E' },
            ]}
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {supply.plan_mix.map((p: any) => (
              <span key={p.plan} className="badge bg-lightpink text-pink-dark">
                {p.plan === '3_months' ? 'Gói 3 tháng' : 'Gói 1 tháng'}: <b className="ml-1">{p.count} nhà thuốc</b>
              </span>
            ))}
          </div>
        </ChartCard>
        <ChartCard title="Nhà thuốc mới theo tháng" sub="12 tháng gần nhất" icon={<Boxes size={18} />} className="lg:col-span-2">
          <div className="flex h-full flex-col justify-center">
            <Sparkline values={supply.new_per_month.map((x: any) => x.value)} color="#e8408a" height={64} width={260} />
            <div className="mt-2 text-[12px] text-slate-500">
              Tổng 12 tháng: <b className="text-bluedark">{fmtInt(supply.new_per_month.reduce((s: number, x: any) => s + x.value, 0))}</b> nhà thuốc tham gia
            </div>
          </div>
        </ChartCard>
      </div>

      {/* ===== Heatmap + top trang ===== */}
      <div className="grid gap-3 lg:grid-cols-5">
        <ChartCard title="Bản đồ giờ truy cập" sub="Ngày trong tuần × giờ (giờ Việt Nam) — tối ưu lịch trực bác sĩ" icon={<HeartPulse size={18} />} className="lg:col-span-3">
          <Heatmap matrix={heatmap} />
          {!hasTraffic && <ChartEmpty note="Bản đồ sẽ hiện rõ sau vài ngày ghi nhận lượt truy cập" />}
        </ChartCard>
        <ChartCard title="Trang được xem nhiều nhất" sub="Top 10 trong kỳ" icon={<BarChart3 size={18} />} className="lg:col-span-2">
          {topPaths.length ? (
            <HBars
              items={topPaths.map((p: any) => ({
                label: p.path === '/' ? 'Trang chủ' : p.path,
                value: p.visits,
                hint: `${fmtInt(p.uniques)} khách`,
                color: '#0d71e2',
              }))}
            />
          ) : (
            <p className="py-6 text-center text-[12px] text-slate-400">Chưa có dữ liệu trang truy cập.</p>
          )}
        </ChartCard>
      </div>
    </div>
  )
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone: 'blue' | 'green' | 'red' | 'amber' | 'pink' }) {
  const cls = {
    blue: 'text-bluedark', green: 'text-mint-fg', red: 'text-redflag-fg', amber: 'text-amber-600', pink: 'text-pink-dark',
  }[tone]
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2.5">
      <div className={`text-[14.5px] font-extrabold leading-tight ${cls}`}>{value}</div>
      <div className="mt-0.5 text-[10.5px] leading-snug text-slate-400">{label}</div>
    </div>
  )
}
