import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  QrCode, ClipboardList, Package, AlertTriangle, ReceiptText, BadgeCheck, RefreshCcw,
  ShoppingBag, Coins, Boxes, TrendingUp, HandCoins, Repeat, Truck, Store,
} from 'lucide-react'
import { SeoMeta } from '../../components/common/SeoMeta'
import { api, fmtDate, fmtVnd, timeAgo } from '../../api/client'
import { PageLoading } from '../../components/common/Misc'
import { useAuth } from '../../store/auth'
import {
  Sparkline, LineChart, StackedBarChart, Donut, HBars, RingStat, ChartCard, ChartEmpty, fmtInt,
} from '../../components/charts'

const RANGES = [7, 30, 90]

function bucketLabel(key: string, bucket: string) {
  if (bucket === 'month') return `T${Number(key.split('-')[1])}`
  const [, m, d] = key.split('-')
  return `${Number(d)}/${Number(m)}`
}

const STATUS_VI: Record<string, string> = {
  confirmed: 'Chờ xác nhận', preparing: 'Đang chuẩn bị', ready_or_shipping: 'Sẵn sàng nhận', completed: 'Hoàn tất',
}
const STATUS_COLORS: Record<string, string> = {
  confirmed: '#B0B8C0', preparing: '#f59e0b', ready_or_shipping: '#a6d3fd', completed: '#1E8E3E',
}

// ═══ Khối phân tích kinh doanh & vận hành (gọi /pharmacy/analytics) ═══
function PharmacyAnalytics() {
  const [days, setDays] = useState(30)
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    setData(null)
    api(`/pharmacy/analytics?days=${days}`).then(setData).catch(() => setData({ error: true }))
  }, [days])

  const buckets = useMemo(
    () => (data?.series ? data.series.map((s: any) => ({ key: s.key, label: bucketLabel(s.key, data.range.bucket) })) : []),
    [data],
  )
  if (!data) return <div className="card p-4"><PageLoading /></div>
  if (data.error) return null

  const k = data.kpi
  const hasOrders = data.series.some((s: any) => s.orders > 0)
  const totalOrders = data.series.reduce((s: number, x: any) => s + x.orders, 0)
  const doneRate = totalOrders ? Math.round((k.orders_done / totalOrders) * 100) : 0

  return (
    <>
      {/* Bộ chọn khoảng thời gian */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-[20px] font-extrabold text-bluedark">Tổng quan nhà thuốc</h1>
        <div className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1">
          {RANGES.map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`rounded-lg px-3.5 py-2 text-[12.5px] font-bold transition ${days === d ? 'bg-primary text-white shadow-float' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              {d} ngày
            </button>
          ))}
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Đơn mới hôm nay" value={fmtInt(k.orders_today)} sub={`${fmtInt(totalOrders)} đơn trong kỳ`} tone="blue" icon={<ShoppingBag size={16} />}
          spark={data.series.slice(-14).map((s: any) => s.orders)} color="#0d71e2" />
        <KpiCard label="Doanh thu tiền thuốc" value={fmtVnd(k.revenue_vnd)} sub={`AOV ${fmtVnd(k.aov_vnd)} · ${k.orders_done} đơn hoàn tất`} tone="pink" icon={<Coins size={16} />}
          spark={data.series.slice(-14).map((s: any) => s.revenue_vnd / 1000)} color="#e8408a" />
        <KpiCard label="Giá trị tồn kho" value={fmtVnd(k.inventory.value_vnd)} sub={`${k.inventory.lines} dòng · ${k.inventory.low} sắp hết`} tone={k.inventory.out ? 'red' : 'green'} icon={<Boxes size={16} />}
          spark={[]} color="#f59e0b" />
        <KpiCard label="Tốc độ chốt đơn" value={`${k.fulfill_avg_minutes}′`} sub="từ tiếp nhận đến hoàn tất" tone="green" icon={<Repeat size={16} />}
          spark={data.series.slice(-14).map((s: any) => s.fulfill_avg ?? 0)} color="#1E8E3E" />
      </div>

      {/* Đơn theo trạng thái + doanh thu */}
      <ChartCard title="Đơn thuốc theo trạng thái" sub={`Đơn tạo trong ${days} ngày — cột chồng theo trạng thái`} icon={<ClipboardList size={18} />} className="relative">
        <StackedBarChart
          buckets={buckets}
          series={(['completed', 'ready_or_shipping', 'preparing', 'confirmed'] as const).map((st) => ({
            name: STATUS_VI[st], color: STATUS_COLORS[st], values: data.series.map((s: any) => s[st]),
          }))}
        />
        {!hasOrders && <ChartEmpty note="Chưa có đơn nào trong kỳ này" />}
      </ChartCard>

      <div className="grid gap-3 lg:grid-cols-2">
        {/* Doanh thu tiền thuốc */}
        <ChartCard title="Doanh thu tiền thuốc" sub="Tổng tiền của đơn hoàn чтоб (quote) theo ngày" icon={<HandCoins size={18} />} className="relative">
          <LineChart
            buckets={buckets}
            series={[{ name: 'Doanh thu (nghìn đồng)', color: '#e8408a', values: data.series.map((s: any) => Math.round(s.revenue_vnd / 1000)), area: true }]}
            yFmt={(n) => `${n}k`}
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="badge bg-lightpink text-pink-dark">Tổng kỳ: <b className="ml-1">{fmtVnd(k.revenue_vnd)}</b></span>
            <span className="badge bg-lightblue text-bluedark">BriMed không thu hoa hồng tiền thuốc</span>
          </div>
          {!hasOrders && <ChartEmpty note="Chưa có doanh thu trong kỳ" />}
        </ChartCard>

        {/* Hình thức nhận + trạng thái */}
        <div className="grid gap-3 sm:grid-cols-2">
          <ChartCard title="Hình thức nhận" sub="Trong kỳ" icon={<Store size={18} />}>
            {data.pickup + data.delivery > 0 ? (
              <Donut
                slices={[
                  { label: 'Nhận tại quầy', value: data.pickup, color: '#0d71e2' },
                  { label: 'Giao tận nơi', value: data.delivery, color: '#e8408a' },
                ]}
                center={{ value: `${data.pickup + data.delivery ? Math.round((data.pickup / (data.pickup + data.delivery)) * 100) : 0}%`, label: 'tại quầy' }}
              />
            ) : <ChartEmpty note="Chưa có đơn trong kỳ" />}
          </ChartCard>
          <ChartCard title="Trạng thái đơn trong kỳ" sub="Tổng hợp" icon={<Truck size={18} />}>
            {totalOrders > 0 ? (
              <Donut
                slices={Object.entries(data.status_mix).map(([st, v]) => ({ label: STATUS_VI[st], value: v as number, color: STATUS_COLORS[st] }))}
                center={{ value: fmtInt(totalOrders), label: 'đơn' }}
              />
            ) : <ChartEmpty note="Chưa có đơn trong kỳ" />}
          </ChartCard>
        </div>
      </div>

      {/* Top thuốc bán chạy + vòng chất lượng */}
      <div className="grid gap-3 lg:grid-cols-2">
        <ChartCard title="Thuốc bán chạy nhất" sub="Theo số lượng của đơn hoàn tất trong kỳ" icon={<Package size={18} />}>
          {data.top_medicines.length ? (
            <HBars items={data.top_medicines.map((m: any) => ({ label: m.name, value: m.qty, hint: fmtVnd(m.revenue), color: '#0d71e2' }))} />
          ) : <ChartEmpty note="Chưa có đơn hoàn tất trong kỳ" />}
        </ChartCard>
        <ChartCard title="Chất lượng vận hành" sub="Các vòng tròn cần theo sát mỗi tuần" icon={<TrendingUp size={18} />}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <RingStat pct={doneRate} color="#1E8E3E" label="Tỷ lệ hoàn tất đơn" sub={`${k.orders_done}/${totalOrders} đơn tạo trong kỳ`} />
            <RingStat pct={100 - k.inventory.stockout_pct} color={k.inventory.stockout_pct > 5 ? '#D93025' : '#0d71e2'} label="Tỷ lệ kho còn hàng" sub={`${k.inventory.out} hết · ${k.inventory.low} sắp hết / ${k.inventory.lines} dòng`} />
            <RingStat pct={Math.min((k.fulfill_avg_minutes / 10) * 100, 100)} color="#f59e0b" label={`Chốt đơn TB ${k.fulfill_avg_minutes}′`} sub="mục tiêu ~10 phút tại quầy" />
            <RingStat pct={data.subscription.csdl_synced ? 100 : 0} color="#e8408a" label="Liên thông CSDL Dược" sub={data.subscription.csdl_synced ? 'Đã liên thông' : 'Chưa liên thông — cần hoàn tất'} />
          </div>
        </ChartCard>
      </div>
    </>
  )
}

function KpiCard({ label, value, sub, tone, icon, spark, color }: { label: string; value: string; sub?: string; tone: 'blue' | 'green' | 'red' | 'pink'; icon: any; spark: number[]; color: string }) {
  const toneCls = { blue: 'bg-primary', green: 'bg-mint-fg', red: 'bg-redflag-fg', pink: 'bg-pink' }[tone]
  return (
    <div className="card p-3.5">
      <div className="flex items-center justify-between">
        <span className={`w-8 h-8 rounded-xl ${toneCls} text-white flex items-center justify-center`}>{icon}</span>
        {spark.length > 0 && <Sparkline values={spark} color={color} height={30} width={110} />}
      </div>
      <div className="text-[20px] font-extrabold text-bluedark mt-1.5 leading-none">{value}</div>
      <div className="text-[12px] text-slate-500 mt-1">{label}</div>
      {sub && <div className="text-[11px] text-slate-400 mt-0.5">{sub}</div>}
    </div>
  )
}

export default function PharmacyDashboard() {
  const [data, setData] = useState<any>(null)
  const [pharmacy, setPharmacy] = useState<any>(null)

  const load = () => api('/pharmacy/dashboard').then(setData).catch(() => setData({ stats: {}, low_stock: [], recent_orders: [] }))
  useEffect(() => {
    load()
    // Hero: ưu tiên pharmacy trong store, fallback gọi /pharmacy/me (mePayload không trả pharmacy)
    const cur = (useAuth as any).getState?.()?.pharmacy
    if (cur) setPharmacy(cur)
    else api('/pharmacy/me').then((d) => setPharmacy(d.pharmacy)).catch(() => {})
    const t = setInterval(load, 15000)
    return () => clearInterval(t)
  }, [])

  if (!data) return <><SeoMeta title="Tổng quan nhà thuốc – BriMed" /><PageLoading /></>
  const s = data.stats

  return (
    <div className="space-y-4 max-w-5xl">
      <SeoMeta title="Tổng quan nhà thuốc – BriMed" />

      {/* Gói thuê bao + QR */}
      <section className="rounded-2xl bg-gradient-to-br from-pink to-pink-dark text-white p-5 shadow-card">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[12.5px] text-white/80">Nhà thuốc đối tác BriMed</div>
            <h1 className="text-[20px] font-extrabold mt-0.5">{pharmacy?.name || 'Nhà thuốc'}</h1>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="badge bg-white/20 text-white !px-2.5">
                <BadgeCheck size={13} /> {pharmacy?.subscription_plan === '3_months' ? 'Gói 3 tháng' : 'Gói 1 tháng'}
              </span>
              <span className="badge bg-white/20 text-white !px-2.5">
                {pharmacy?.csdl_synced ? 'Đã liên thông CSDL Dược' : 'Chưa liên thông CSDL Dược'}
              </span>
            </div>
            <div className="text-[12px] text-white/70 mt-2">
              Gia hạn từ {fmtDate(pharmacy?.subscription_started_at)} · Standee: {pharmacy?.standee_code}
            </div>
          </div>
          <div className="bg-white rounded-2xl p-2.5 text-center shrink-0">
            <QrCode size={64} className="text-bluedark" />
            <div className="text-[10px] font-bold text-bluedark mt-1">{pharmacy?.standee_code}</div>
          </div>
        </div>
      </section>

      {/* ═══ Phần phân tích (KPI + biểu đồ) ═══ */}
      <PharmacyAnalytics />

      {/* Thống kê nhanh vận hành hôm nay */}
      <div className="flex items-center justify-between pt-2">
        <h2 className="section-title !text-[17px]">Vận hành hôm nay</h2>
        <span className="badge bg-lightblue text-bluedark">Làm mới mỗi 15 giây</span>
      </div>
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat icon={<ClipboardList size={19} />} color="bg-primary" value={s.new_orders} label="Đơn mới tại quầy" />
        <Stat icon={<RefreshCcw size={19} />} color="bg-pink" value={s.processing} label="Đơn đang xử lý" />
        <Stat icon={<ReceiptText size={19} />} color="bg-mint-fg" value={s.completed_today} label="Toa hoàn tất hôm nay" />
        <Stat icon={<Package size={19} />} color="bg-amber-500" value={s.served_today} label="Toa phục vụ trong ngày" />
      </section>

      {/* Cảnh báo tồn kho */}
      <section className="card p-4">
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="section-title flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-500" /> Cảnh báo tồn kho ({data.low_stock.length})
          </h2>
          <Link to="/pharmacy/inventory" className="text-[13px] font-bold text-primary">Quản lý kho</Link>
        </div>
        {data.low_stock.length === 0 ? (
          <p className="text-[13.5px] text-slate-400 text-center py-2">Kho thuốc đang ổn định.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.low_stock.map((i: any) => (
              <li key={i.id} className="py-2.5 flex items-center justify-between gap-2">
                <div>
                  <div className="text-[13.5px] font-bold text-slate-700">{i.medicine_name}</div>
                  <div className="text-[12px] text-slate-400">{i.active_ingredient}</div>
                </div>
                <span className={`badge ${i.stock <= 0 ? 'bg-redflag-bg text-redflag-fg' : 'bg-amber-100 text-amber-700'}`}>
                  {i.stock <= 0 ? 'Hết hàng' : `Còn ${i.stock}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Đơn gần đây */}
      <section className="card p-4">
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="section-title">Đơn hàng gần đây</h2>
          <Link to="/pharmacy/orders" className="text-[13px] font-bold text-primary">Xem tất cả</Link>
        </div>
        {data.recent_orders.length === 0 ? (
          <p className="text-[13.5px] text-slate-400 text-center py-2">Chưa có đơn hàng nào.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.recent_orders.map((o: any) => (
              <li key={o.id} className="py-2.5 flex items-center justify-between gap-2">
                <div>
                  <div className="text-[13.5px] font-bold text-slate-700">#{o.id} · {o.patient_name}</div>
                  <div className="text-[12px] text-slate-400">Mã đơn {o.prescription_code} · {timeAgo(o.created_at)}</div>
                </div>
                <span className={`badge ${
                  o.status === 'completed' ? 'bg-mint-bg text-mint-fg' : o.status === 'confirmed' ? 'bg-lightblue text-bluedark' : 'bg-amber-100 text-amber-700'
                }`}>
                  {({ confirmed: 'Đã xác nhận', preparing: 'Đang chuẩn bị', ready_or_shipping: 'Sẵn sàng nhận', completed: 'Hoàn tất' } as any)[o.status]}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function Stat({ icon, color, value, label }: { icon: any; color: string; value: number; label: string }) {
  return (
    <div className="card p-3.5">
      <span className={`w-9 h-9 rounded-xl ${color} text-white flex items-center justify-center`}>{icon}</span>
      <div className="text-[24px] font-extrabold text-bluedark mt-1.5 leading-none">{value ?? 0}</div>
      <div className="text-[12px] text-slate-500 mt-1">{label}</div>
    </div>
  )
}
