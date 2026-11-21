import { useEffect, useMemo, useState } from 'react'
import {
  BarChart3, FileCheck2, Timer, Users, Activity, Globe2, TrendingUp, ShieldCheck,
  Coins, Store, Boxes, Clock3, UserPlus, Repeat, HeartPulse, Radar, Gauge, Stethoscope, Pill,
  ShoppingBag, Package, ArrowRight, HandCoins, Truck, Ban,
} from 'lucide-react'
import { SeoMeta } from '../../components/common/SeoMeta'
import { api, fmtVnd } from '../../api/client'
import { PageLoading } from '../../components/common/Misc'
import { ROLE_LABELS } from '../../data/constants'
import {
  ROLE_COLORS, Sparkline, LineChart, StackedBarChart, BarChart, Donut, Heatmap, HBars, Funnel,
  RingStat, DeltaPill, ChartCard, ChartEmpty, fmtInt, fmtCompact,
} from '../../components/charts'
import { NorthStarCards, AuStrip, KpiCard } from '../../components/charts/AnalyticsBlocks'

// =====================================================================
// DATA CENTER BRI MED — chi tiết vi mô theo 7 nhóm chủ đề:
// 1 North Star & Tăng trưởng · 2 Vai trò Bệnh nhân · 3 Vai trò Bác sĩ
// 4 Vai trò Nhà thuốc · 5 Kinh doanh · 6 Tuân thủ · 7 Vận hành nền tảng
// =====================================================================

const RANGES = [7, 30, 90, 365].map((d) => ({ days: d, label: d <= 90 ? `${d} ngày` : '12 tháng' }))

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

function GroupHeader({ icon, kicker, title, desc }: { icon: any; kicker: string; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 pt-4 pb-1">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-white shadow-float">{icon}</span>
      <div>
        <div className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-pink-dark">{kicker}</div>
        <h2 className="text-[19px] font-extrabold leading-tight text-bluedark">{title}</h2>
        <p className="mt-0.5 text-[12px] text-slate-400">{desc}</p>
      </div>
    </div>
  )
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
  const hasTraffic = useMemo(() => (data ? data.series.some((s: any) => s.visits > 0) : false), [data])

  if (error) {
    return (
      <div className="max-w-5xl space-y-4">
        <SeoMeta title="Data Center BriMed" />
        <div className="card border-redflag-fg/30 bg-redflag-bg/40 p-5 text-[14px] text-redflag-fg">{error}</div>
      </div>
    )
  }
  if (!data) return <><SeoMeta title="Data Center BriMed" /><PageLoading /></>

  const { north_star: ns, active, series, funnel, roles, heatmap, top_paths: topPaths, ops, compliance, revenue, retention, supply, roles_detail: rd } = data
  const since = data.tracking_since ? new Date(data.tracking_since) : null
  const sinceVi = since ? since.toLocaleDateString('vi-VN') : ''
  const diseaseColors = ['#0d71e2', '#e8408a', '#1E8E3E', '#f59e0b', '#a6d3fd', '#B92A69', '#64748b', '#0756AF']
  const doctors = rd.doctors_board.filter((d: any) => d.consults > 0)
  const pharmacies = rd.pharmacies_board

  return (
    <div className="max-w-5xl space-y-4">
      <SeoMeta title="Data Center BriMed" />

      {/* ===== Header + chọn kỳ ===== */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-[20px] font-extrabold text-bluedark">
            <BarChart3 size={22} className="text-primary" /> Data Center BriMed
          </h1>
          <p className="mt-0.5 text-[12px] text-slate-400">
            Chi tiết vi mô theo nhóm · Cập nhật {new Date(data.generated_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
            {sinceVi && ` · Tracking từ ${sinceVi}`}
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

      {/* ═══════════ NHÓM 1 · North Star & Tăng trưởng ═══════════ */}
      <GroupHeader icon={<Radar size={20} />} kicker="Nhóm 1" title="North Star & Tăng trưởng" desc="Hai chỉ số đỉnh của cây metric + nhịp tăng trưởng toàn nền tảng" />
      <NorthStarCards ns={ns} />
      <ChartCard
        title="Người dùng hoạt động theo vai trò" sub="DAU/WAU/MAU/YAU so với kỳ trước · độ bám dính DAU/MAU"
        icon={<Activity size={18} />}
        right={<span className="badge shrink-0 bg-lightblue text-bluedark">DAU/MAU: <b className="ml-1">{active.stickiness}%</b></span>}
      >
        <AuStrip active={active} series={series} days={days} />
      </ChartCard>
      <div className="grid gap-3 lg:grid-cols-2">
        <ChartCard title="Tăng trưởng nền tảng" sub="Đăng ký mới · toa phát hành · Form khám" icon={<TrendingUp size={18} />}>
          <LineChart
            buckets={buckets}
            series={[
              { name: 'Toa phát hành', color: '#0756AF', values: series.map((s: any) => s.issued) },
              { name: 'Form khám', color: '#0d71e2', values: series.map((s: any) => s.consults), area: true },
              { name: 'Đăng ký mới', color: '#e8408a', values: series.map((s: any) => s.new_users) },
            ]}
          />
        </ChartCard>
        <ChartCard title="Bản đồ giờ truy cập" sub="Ngày trong tuần × giờ (giờ Việt Nam)" icon={<HeartPulse size={18} />} className="relative">
          <Heatmap matrix={heatmap} />
          {!hasTraffic && <ChartEmpty note="Bản đồ sẽ hiện rõ sau vài ngày ghi nhận lượt truy cập" />}
        </ChartCard>
      </div>
      <div className="grid gap-3 lg:grid-cols-5">
        <ChartCard title="Trang được xem nhiều nhất" sub="Top 10 trong kỳ" icon={<BarChart3 size={18} />} className="lg:col-span-3">
          {topPaths.length ? (
            <HBars items={topPaths.map((p: any) => ({ label: p.path === '/' ? 'Trang chủ' : p.path, value: p.visits, hint: `${fmtInt(p.uniques)} khách`, color: '#0d71e2' }))} />
          ) : <p className="py-6 text-center text-[12px] text-slate-400">Chưa có dữ liệu trang truy cập.</p>}
        </ChartCard>
        <ChartCard title="Lượt truy cập theo vai trò" sub="Cột chồng theo ngày" icon={<Globe2 size={18} />} className="relative lg:col-span-2">
          <StackedBarChart
            buckets={buckets}
            series={(['guest', 'patient', 'doctor', 'pharmacy', 'admin'] as const).map((role) => ({
              name: ROLE_VI[role], color: ROLE_COLORS[role], values: series.map((s: any) => s.by_role[role] || 0),
            }))}
          />
          {!hasTraffic && <ChartEmpty note="Tracking tích lũy từ khi bật" />}
        </ChartCard>
      </div>

      {/* ═══════════ NHÓM 2 · Vai trò Bệnh nhân ═══════════ */}
      <GroupHeader icon={<Users size={20} />} kicker="Nhóm 2" title="Vai trò Bệnh nhân" desc="Góc nhìn admin về hành trình & mức độ gắn kết của người mua thuốc" />
      <div className="grid gap-3 lg:grid-cols-5">
        <ChartCard title="Phễu hành trình bệnh nhân" sub="Từ truy cập đến mua thuốc tại quầy" icon={<TrendingUp size={18} />} className="lg:col-span-3">
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
          {!hasTraffic && <p className="mt-2 text-center text-[11px] text-slate-400">Bước truy cập cần dữ liệu tracking tích lũy dần</p>}
        </ChartCard>
        <ChartCard title="Khách mới / quay lại" sub="Trong kỳ" icon={<Repeat size={18} />} className="lg:col-span-2">
          {retention.new_visitors + retention.returning_visitors > 0 ? (
            <Donut
              slices={[
                { label: 'Khách mới', value: retention.new_visitors, color: '#0d71e2' },
                { label: 'Quay lại', value: retention.returning_visitors, color: '#e8408a' },
              ]}
              center={{ value: `${retention.new_visitors + retention.returning_visitors ? Math.round((retention.new_visitors / (retention.new_visitors + retention.returning_visitors)) * 100) : 0}%`, label: 'khách mới' }}
            />
          ) : <ChartEmpty note="Chưa đủ lịch sử truy cập" />}
        </ChartCard>
      </div>
      <div className="grid gap-3 lg:grid-cols-5">
        <ChartCard title="Bệnh nhân mới theo ngày" sub="Chỉ role bệnh nhân" icon={<UserPlus size={18} />} className="lg:col-span-3">
          <LineChart buckets={buckets} series={[{ name: 'BN mới', color: '#0d71e2', values: rd.patient_series.map((x: any) => x.value), area: true }]} />
        </ChartCard>
        <ChartCard title="Bệnh nhân hoạt động nhất" sub="Số lượt khám trong kỳ" icon={<Users size={18} />} className="lg:col-span-2">
          {rd.top_patients.length ? (
            <HBars items={rd.top_patients.map((p: any) => ({ label: p.name, value: p.count, color: '#e8408a' }))} />
          ) : <ChartEmpty note="Chưa có lượt khám trong kỳ" />}
        </ChartCard>
      </div>
      <div className="grid gap-3 lg:grid-cols-5">
        <ChartCard title="Phân bổ truy cập theo vai trò" sub="Tỷ trọng trong kỳ" icon={<Globe2 size={18} />} className="lg:col-span-2">
          <Donut
            slices={roles.map((r: any) => ({ label: ROLE_VI[r.role], value: r.visits, color: ROLE_COLORS[r.role] }))}
            center={{ value: fmtCompact(series.reduce((s: number, x: any) => s + x.visits, 0)), label: 'lượt truy cập' }}
          />
        </ChartCard>
        <ChartCard title="Giữ chân" sub="Retention — khám lại" icon={<Repeat size={18} />} className="lg:col-span-3">
          <div className="space-y-3.5">
            <RingStat pct={retention.overall_pct} color="#0d71e2" label="Bệnh nhân khám ≥ 2 lần" sub="toàn bộ lịch sử — tỷ lệ quay lại cốt lõi" />
            <RingStat pct={retention.repeat_in_range_pct} color="#1E8E3E" label="Khám lại trong kỳ này" sub="BN có ≥ 2 lượt khám trong kỳ" />
          </div>
        </ChartCard>
      </div>

      {/* ═══════════ NHÓM 3 · Vai trò Bác sĩ ═══════════ */}
      <GroupHeader icon={<Stethoscope size={20} />} kicker="Nhóm 3" title="Vai trò Bác sĩ" desc="Bảng xếp hạng năng suất — chất lượng — thu nhập của đội ngũ trực" />
      <div className="grid gap-3 lg:grid-cols-2">
        <ChartCard title="Ca xử lý theo bác sĩ" sub="Số phiên tư vấn trong kỳ" icon={<Activity size={18} />}>
          {doctors.length ? (
            <HBars items={doctors.map((d: any) => ({ label: d.name.replace('BS. ', ''), value: d.consults, hint: `${d.approved} duyệt · ${d.rejected} từ chối`, color: d.online ? '#1E8E3E' : '#0d71e2' }))} />
          ) : <ChartEmpty note="Chưa có ca nào trong kỳ" />}
        </ChartCard>
        <ChartCard title="Thù lao theo bác sĩ" sub="15.000đ mỗi lượt hoàn thành" icon={<HandCoins size={18} />}>
          {doctors.length ? (
            <HBars items={doctors.map((d: any) => ({ label: d.name.replace('BS. ', ''), value: d.earnings_vnd, color: '#e8408a' }))} fmt={fmtVndCompact} />
          ) : <ChartEmpty note="Chưa có thù lao trong kỳ" />}
        </ChartCard>
        <ChartCard title="SLA phản hồi theo bác sĩ" sub="Chờ TB (phút) — càng thấp càng tốt" icon={<Timer size={18} />}>
          {doctors.filter((d: any) => d.avg_wait > 0).length ? (
            <HBars items={doctors.filter((d: any) => d.avg_wait > 0).map((d: any) => ({ label: d.name.replace('BS. ', ''), value: d.avg_wait, color: d.avg_wait > ops.wait.target ? '#D93025' : '#1E8E3E' }))} threshold={{ value: ops.wait.target, label: 'Mục tiêu' }} fmt={(v) => `${v}′`} />
          ) : <ChartEmpty note="Chưa có ca đã quyết định" />}
        </ChartCard>
        <ChartCard title="Kháng sinh theo bác sĩ" sub={`Tỷ lệ toa có kháng sinh — ngưỡng ${compliance.threshold}%`} icon={<Pill size={18} />}>
          {doctors.filter((d: any) => d.rx > 0).length ? (
            <HBars
              items={doctors.filter((d: any) => d.rx > 0).map((d: any) => ({ label: d.name.replace('BS. ', ''), value: d.antibiotic_rate, hint: `${d.rx} toa`, color: d.antibiotic_rate > compliance.threshold ? '#D93025' : '#1E8E3E' }))}
              fmt={(v) => `${v}%`}
              threshold={{ value: compliance.threshold, label: 'Ngưỡng' }}
            />
          ) : <ChartEmpty note="Chưa có toa trong kỳ" />}
        </ChartCard>
      </div>
      <div className="grid gap-3 lg:grid-cols-5">
        <ChartCard title="Cơ cấu nhóm bệnh toàn nền tảng" sub="Consultations trong kỳ" icon={<Stethoscope size={18} />} className="lg:col-span-2">
          {rd.disease_mix.length ? (
            <Donut
              slices={rd.disease_mix.map((x: any, i: number) => ({ label: x.group, value: x.count, color: diseaseColors[i % diseaseColors.length] }))}
              center={{ value: fmtInt(rd.disease_mix.reduce((s: number, x: any) => s + x.count, 0)), label: 'ca khám' }}
            />
          ) : <ChartEmpty note="Chưa có ca khám trong kỳ" />}
        </ChartCard>
        <ChartCard title="Cuộc gọi video" sub="Tháng này / hạn mức" icon={<Clock3 size={18} />} className="lg:col-span-3">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <RingStat pct={Math.min((ops.calls.video_minutes_month / ops.calls.free_quota_minutes) * 100, 100)} color="#0d71e2" label={`${fmtInt(ops.calls.video_minutes_month)} phút`} sub={`hạn mức 10.000 phút/tháng`} />
            <RingStat pct={Math.min((ops.calls.avg_minutes / 2) * 100, 100)} color="#e8408a" label={`Gọi TB ${ops.calls.avg_minutes}′`} sub="mục tiêu 1–2 phút/lượt" />
            <RingStat pct={ops.doctors.slot_utilization_pct} color="#f59e0b" label="Slot trực được đặt" sub={`${ops.doctors.online}/${ops.doctors.total} BS trực · ${fmtInt(ops.calls.started)} cuộc gọi kỳ này`} />
          </div>
        </ChartCard>
      </div>

      {/* ═══════════ NHÓM 4 · Vai trò Nhà thuốc ═══════════ */}
      <GroupHeader icon={<Store size={20} />} kicker="Nhóm 4" title="Vai trò Nhà thuốc" desc="Hiệu quả kinh doanh & sức khỏe kho của từng nhà thuốc đối tác" />
      <div className="grid gap-3 lg:grid-cols-2">
        <ChartCard title="Đơn nhận theo nhà thuốc" sub="Đơn tạo trong kỳ" icon={<ShoppingBag size={18} />}>
          {pharmacies.some((p: any) => p.orders > 0) ? (
            <HBars items={pharmacies.filter((p: any) => p.orders > 0).map((p: any) => ({ label: p.name, value: p.orders, hint: `${p.completed} hoàn tất`, color: '#0d71e2' }))} />
          ) : <ChartEmpty note="Chưa có đơn trong kỳ" />}
        </ChartCard>
        <ChartCard title="Doanh thu tiền thuốc theo nhà thuốc" sub="Tổng quote của đơn hoàn tất — về thẳng quầy" icon={<Coins size={18} />}>
          {pharmacies.some((p: any) => p.revenue_vnd > 0) ? (
            <HBars items={pharmacies.filter((p: any) => p.revenue_vnd > 0).map((p: any) => ({ label: p.name, value: p.revenue_vnd, color: '#e8408a' }))} fmt={fmtVndCompact} />
          ) : <ChartEmpty note="Chưa có doanh thu trong kỳ" />}
        </ChartCard>
        <ChartCard title="Dòng hết hàng theo nhà thuốc" sub="Số dòng tồn kho = 0" icon={<Package size={18} />}>
          {pharmacies.some((p: any) => p.out_lines > 0) ? (
            <HBars items={pharmacies.filter((p: any) => p.out_lines > 0).map((p: any) => ({ label: p.name, value: p.out_lines, hint: `${p.inv_lines} dòng`, color: '#D93025' }))} />
          ) : <ChartEmpty note="Không nhà thuốc nào hết hàng" />}
        </ChartCard>
        <ChartCard title="Mix gói thuê bao" sub="Cơ cấu gói của nhà thuốc hoạt động" icon={<Boxes size={18} />}>
          <Donut
            slices={supply.plan_mix.map((p: any) => ({ label: p.plan === '3_months' ? 'Gói 3 tháng' : 'Gói 1 tháng', value: p.count, color: p.plan === '3_months' ? '#0d71e2' : '#a6d3fd' }))}
            center={{ value: fmtInt(supply.plan_mix.reduce((s: number, x: any) => s + x.count, 0)), label: 'nhà thuốc' }}
          />
        </ChartCard>
      </div>
      <div className="grid gap-3 lg:grid-cols-5">
        <ChartCard title="Pipeline nhà thuốc đối tác" sub="Đăng ký → vận hành thật" icon={<Store size={18} />} className="lg:col-span-3">
          <Funnel
            steps={[
              { label: 'Đăng ký mới', value: supply.pipeline.new, color: '#a6d3fd' },
              { label: 'Đã liên hệ', value: supply.pipeline.contacted, color: '#0d71e2' },
              { label: 'Đã ký gói', value: supply.pipeline.signed, color: '#f59e0b' },
              { label: 'Đã tạo tài khoản', value: supply.pipeline.converted, color: '#1E8E3E' },
            ]}
          />
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

      {/* ═══════════ NHÓM 5 · Kinh doanh ═══════════ */}
      <GroupHeader icon={<Coins size={20} />} kicker="Nhóm 5" title="Kinh doanh" desc="Dòng tiền B2C · B2B · hiệu quả đơn giá của nền tảng" />
      <div className="grid gap-3 lg:grid-cols-2">
        <ChartCard title="Doanh thu theo nguồn" sub="Phí khám B2C + thuê bao B2B" icon={<Coins size={18} />} right={<span className="badge shrink-0 bg-lightblue text-bluedark">{fmtVnd(revenue.total_vnd)}</span>}>
          <StackedBarChart
            buckets={buckets}
            series={[
              { name: 'Phí khám B2C', color: '#0d71e2', values: series.map((s: any) => s.revenue.consult) },
              { name: 'Thuê bao B2B', color: '#e8408a', values: series.map((s: any) => s.revenue.b2b) },
            ]}
            yFmt={fmtVndCompact}
          />
        </ChartCard>
        <ChartCard title="Thuê bao B2B theo kỳ" sub="Dòng thu định kỳ từ nhà thuốc" icon={<Store size={18} />}>
          <LineChart buckets={buckets} series={[{ name: 'B2B (nghìn đồng)', color: '#e8408a', values: series.map((s: any) => Math.round(s.revenue.b2b / 1000)), area: true }]} yFmt={(v) => `${v}k`} />
        </ChartCard>
      </div>
      <div className="grid gap-3 lg:grid-cols-5">
        <ChartCard title="Hình thức nhận thuốc" sub="Tại quầy so với giao tận nơi" icon={<Truck size={18} />} className="lg:col-span-2">
          <Donut
            slices={[
              { label: 'Nhận tại quầy', value: revenue.pickup, color: '#0d71e2' },
              { label: 'Giao tận nơi', value: revenue.delivery, color: '#e8408a' },
            ]}
            center={{ value: `${revenue.pickup + revenue.delivery ? Math.round((revenue.pickup / (revenue.pickup + revenue.delivery)) * 100) : 0}%`, label: 'tại quầy' }}
          />
        </ChartCard>
        <div className="grid grid-cols-2 gap-3 lg:col-span-3 lg:grid-cols-2">
          <KpiCard label="ARPU (phí khám/BN trả phí)" value={fmtVnd(revenue.arpu_vnd)} tone="blue" icon={<Users size={16} />} />
          <KpiCard label="Giá trị TB đơn thuốc (AOV)" value={revenue.aov_vnd ? fmtVnd(revenue.aov_vnd) : '—'} tone="pink" icon={<ShoppingBag size={16} />} />
          <KpiCard label="Thù lao bác sĩ (chi)" value={fmtVnd(revenue.doctor_fee_vnd)} tone="amber" icon={<HandCoins size={16} />} />
          <KpiCard label="Hoàn phí" value={fmtVnd(revenue.refund_vnd)} tone={revenue.refund_vnd > 0 ? 'red' : 'green'} icon={<Ban size={16} />} />
        </div>
      </div>

      {/* ═══════════ NHÓM 6 · Tuân thủ & an toàn ═══════════ */}
      <GroupHeader icon={<ShieldCheck size={20} />} kicker="Nhóm 6" title="Tuân thủ & an toàn" desc="Kháng sinh · chữ ký số · vòng truy vết — chuẩn TT 26/2025 & TT 30/2023" />
      <div className="grid gap-3 lg:grid-cols-5">
        <ChartCard
          title="Kiểm soát kháng sinh" sub={`Tỷ lệ toa có kháng sinh ${compliance.antibiotic_pct}% · ngưỡng ${compliance.threshold}%`}
          icon={<ShieldCheck size={18} />}
          className="relative lg:col-span-3"
          right={<span className={`badge shrink-0 ${compliance.antibiotic_pct > compliance.threshold ? 'bg-redflag-bg text-redflag-fg' : 'bg-mint-bg text-mint-fg'}`}>{compliance.antibiotic_pct}%</span>}
        >
          <LineChart
            buckets={buckets}
            series={[{ name: 'Tỷ lệ kháng sinh (%)', color: '#e8408a', values: compliance.antibiotic_trend.map((x: any) => x.rate), area: true }]}
            threshold={{ value: compliance.threshold, label: `ngưỡng ${compliance.threshold}%` }}
            yFmt={(v) => `${v}%`}
          />
        </ChartCard>
        <ChartCard title="Vòng tròn an toàn" sub="Ký số · cấp phát · liên thông" icon={<FileCheck2 size={18} />} className="lg:col-span-2">
          <div className="space-y-4">
            <RingStat pct={compliance.digital_signature_pct} color="#0d71e2" label="Toa có chữ ký số" sub="TT 26/2025/TT-BYT" />
            <RingStat pct={compliance.dispensed_pct} color="#1E8E3E" label="Toa đã cấp phát" sub="đóng vòng tròn truy vết" />
            <RingStat pct={compliance.csdl_pct} color="#e8408a" label="NT liên thông CSDL" sub="dược quốc gia" />
          </div>
        </ChartCard>
      </div>

      {/* ═══════════ NHÓM 7 · Vận hành nền tảng ═══════════ */}
      <GroupHeader icon={<Clock3 size={20} />} kicker="Nhóm 7" title="Vận hành nền tảng" desc="SLA · đổi hoạt chất · tình trạng đơn — hạ tầng phục vụ cả 3 vai trò" />
      <ChartCard
        title="SLA thời gian chờ khám"
        sub={`TB ${ops.wait.avg_minutes}′ · p50 ${ops.wait.p50}′ · p90 ${ops.wait.p90}′ · ${ops.wait.within_target_pct}% ca đạt mục tiêu`}
        icon={<Clock3 size={18} />}
        right={<span className={`badge shrink-0 ${ops.wait.within_target_pct >= 80 ? 'bg-mint-bg text-mint-fg' : 'bg-redflag-bg text-redflag-fg'}`}>{ops.wait.within_target_pct}% đạt SLA</span>}
      >
        <LineChart
          buckets={buckets}
          series={[{ name: 'Chờ TB (phút)', color: '#0d71e2', values: series.map((s: any) => s.wait_avg), area: true }]}
          threshold={{ value: ops.wait.target, label: `mục tiêu ${ops.wait.target}′` }}
          yFmt={(v) => `${v}′`}
        />
        <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <MiniStat label="Ca chờ >15′ đã trả phí" value={`${ops.wait.stuck15}`} tone={ops.wait.stuck15 > 0 ? 'red' : 'green'} />
          <MiniStat label="Đơn chốt TB" value={`${ops.fulfillment.avg_minutes} phút`} tone="blue" />
          <MiniStat label="Đổi hoạt chất" value={`${ops.substitution.total} yc · ${ops.substitution.pending} chờ`} tone={ops.substitution.pending > 0 ? 'amber' : 'blue'} />
          <MiniStat label="Hết hàng tồn kho" value={`${ops.stock.stockout_pct}% (${ops.stock.out}/${ops.stock.total})`} tone={ops.stock.stockout_pct > 5 ? 'red' : 'green'} />
          <MiniStat label="Tỷ lệ từ chối khám" value={`${ops.rx.reject_pct}%`} tone="amber" />
          <MiniStat label="Phiên bắt cờ đỏ" value={`${ops.rx.red_flag_pct}%`} tone="blue" />
          <MiniStat label="Toa / ngày" value={`${ops.rx.per_day}`} tone="blue" />
          <MiniStat label="BS trực / tổng" value={`${ops.doctors.online}/${ops.doctors.total}`} tone={ops.doctors.online > 0 ? 'green' : 'amber'} />
        </div>
      </ChartCard>
      <div className="grid gap-3 lg:grid-cols-5">
        <ChartCard title="Yêu cầu đổi hoạt chất theo ngày" sub="Nhà thuốc xin thay thuốc cùng hoạt chất" icon={<Repeat size={18} />} className="lg:col-span-3">
          <BarChart buckets={buckets} values={rd.sub_series.map((x: any) => x.total)} color="#f59e0b" />
        </ChartCard>
        <ChartCard title="Kết quả duyệt đổi hoạt chất" sub="Trong kỳ" icon={<Repeat size={18} />} className="lg:col-span-2">
          {rd.sub_status.pending + rd.sub_status.approved + rd.sub_status.rejected > 0 ? (
            <Donut
              slices={[
                { label: 'Chờ duyệt', value: rd.sub_status.pending, color: '#f59e0b' },
                { label: 'Đã duyệt', value: rd.sub_status.approved, color: '#1E8E3E' },
                { label: 'Từ chối', value: rd.sub_status.rejected, color: '#D93025' },
              ]}
              center={{ value: fmtInt(rd.sub_status.pending + rd.sub_status.approved + rd.sub_status.rejected), label: 'yêu cầu' }}
            />
          ) : <ChartEmpty note="Chưa có yêu cầu đổi hoạt chất" />}
        </ChartCard>
      </div>

      {/* Bảng hoạt động theo vai trò (bảng dữ liệu chi tiết cuối trang) */}
      <ChartCard title="Hoạt động theo vai trò" sub={days === 365 ? 'Trong 12 tháng' : `Trong ${days} ngày`} icon={<Users size={18} />}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-[12.5px]">
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
                  <td className="px-2 py-2.5 text-right font-semibold text-slate-600">{r.role === 'guest' ? '—' : `${fmtInt(r.active)}${r.active_pct != null ? ` (${r.active_pct}%)` : ''}`}</td>
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
