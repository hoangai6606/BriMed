import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { QrCode, ClipboardList, Package, AlertTriangle, ReceiptText, BadgeCheck, RefreshCcw } from 'lucide-react'
import { SeoMeta } from '../../components/common/SeoMeta'
import { api, fmtDate, fmtVnd, timeAgo } from '../../api/client'
import { PageLoading } from '../../components/common/Misc'
import { useAuth } from '../../store/auth'

export default function PharmacyDashboard() {
  const [data, setData] = useState<any>(null)
  const pharmacy = useAuth((s) => s.pharmacy)

  const load = () => api('/pharmacy/dashboard').then(setData).catch(() => setData({ stats: {}, low_stock: [], recent_orders: [] }))
  useEffect(() => {
    load()
    const t = setInterval(load, 15000)
    return () => clearInterval(t)
  }, [])

  if (!data) return <PageLoading />
  const s = data.stats

  return (
    <div className="space-y-4 max-w-3xl">
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

      {/* Thống kê nhanh */}
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
                  {i.stock <= 0 ? 'Hết hàng' : `Còn ${i.stock} (ngưỡng ${i.low_stock_threshold})`}
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
