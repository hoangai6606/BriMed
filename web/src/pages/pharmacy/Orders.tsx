import { useEffect, useState } from 'react'
import { ClipboardList, ChevronRight, Store, Truck } from 'lucide-react'
import { SeoMeta } from '../../components/common/SeoMeta'
import { api, fmtDateTime, fmtVnd, timeAgo } from '../../api/client'
import { OrderTimeline, PageLoading } from '../../components/common/Misc'
import { ORDER_STEPS } from '../../data/constants'
import { useUi } from '../../store/ui'

const NEXT_LABEL: Record<string, string> = {
  confirmed: 'Xác nhận đơn',
  preparing: 'Hoàn tất chuẩn bị',
  ready_or_shipping: 'Bàn giao & hoàn tất',
}

export default function PharmacyOrders() {
  const [orders, setOrders] = useState<any[] | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const toast = useUi((s) => s.toast)

  const load = () => api('/pharmacy/orders').then((d) => setOrders(d.orders)).catch(() => setOrders([]))
  useEffect(() => {
    load()
    const t = setInterval(load, 15000)
    return () => clearInterval(t)
  }, [])

  if (!orders) return <PageLoading />

  const advance = async (o: any) => {
    setBusyId(o.id)
    try {
      await api(`/pharmacy/orders/${o.id}/advance`, { method: 'POST', body: JSON.stringify({}) })
      toast(
        o.status === 'ready_or_shipping'
          ? 'Đã hoàn tất: trừ tồn kho, ghi giao dịch và cấp phát đơn.'
          : `Đơn #${o.id} → ${ORDER_STEPS[ORDER_STEPS.findIndex((s) => s.key === o.status) + 1].label}`,
        'success',
      )
      load()
    } catch (e: any) {
      toast(e.message, 'error')
    } finally {
      setBusyId(null)
    }
  }

  const active = orders.filter((o) => o.status !== 'completed')
  const done = orders.filter((o) => o.status === 'completed')

  return (
    <div className="space-y-4 max-w-2xl">
      <SeoMeta title="Quản lý đơn hàng – Nhà thuốc BriMed" />
      <h1 className="text-[20px] font-extrabold text-bluedark">Quản lý đơn hàng</h1>

      <section className="card p-4">
        <h2 className="section-title flex items-center gap-2 mb-3"><ClipboardList size={18} className="text-primary" /> Đang xử lý ({active.length})</h2>
        {active.length === 0 ? (
          <p className="text-[13.5px] text-slate-400 text-center py-3">Không có đơn đang xử lý.</p>
        ) : (
          <ul className="space-y-3">
            {active.map((o) => (
              <li key={o.id} className="rounded-xl border border-slate-200 p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-extrabold text-[14.5px] text-bluedark">#{o.id} · {o.patient_name}</div>
                    <div className="text-[12.5px] text-slate-500">Mã đơn {o.prescription_code} · {timeAgo(o.created_at)}</div>
                  </div>
                  <span className={`badge ${o.receive_method === 'delivery' ? 'bg-lightpink text-pink-dark' : 'bg-lightblue text-bluedark'} shrink-0`}>
                    {o.receive_method === 'delivery' ? <><Truck size={13} /> Giao hàng</> : <><Store size={13} /> Tại quầy</>}
                  </span>
                </div>
                <div className="text-[13px] text-slate-600 mt-1.5">
                  {o.items.map((it: any) => `${it.name} × ${it.quantity}`).join(' · ')}
                </div>
                {o.quote && (
                  <div className="text-[13px] mt-1">Tổng: <strong className="text-bluedark">{fmtVnd(o.quote.total)}</strong></div>
                )}
                <div className="mt-3">
                  <OrderTimeline status={o.status} />
                </div>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <a href={`/pharmacy/quote-confirm/${o.id}`} className="btn-outline !text-[13px]">
                    Báo giá / chi tiết <ChevronRight size={15} />
                  </a>
                  <button onClick={() => advance(o)} disabled={busyId === o.id} className="btn-primary !text-[13px]">
                    {busyId === o.id ? 'Đang xử lý…' : NEXT_LABEL[o.status] || 'Tiếp tục'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card p-4">
        <h2 className="section-title mb-2">Đã hoàn tất ({done.length})</h2>
        {done.length === 0 ? (
          <p className="text-[13.5px] text-slate-400 text-center py-2">Chưa có đơn hoàn tất.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {done.map((o) => (
              <li key={o.id} className="py-2.5 flex items-center justify-between gap-2">
                <div>
                  <div className="text-[13.5px] font-bold text-slate-700">#{o.id} · {o.patient_name}</div>
                  <div className="text-[12px] text-slate-400">Hoàn tất {fmtDateTime(o.completed_at)} · {fmtVnd(o.quote?.total)}</div>
                </div>
                <span className="badge bg-mint-bg text-mint-fg">Hoàn tất</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-[12.5px] text-slate-400">
        Khi bấm "Bàn giao & hoàn tất": hệ thống tự trừ tồn kho, đánh dấu đơn thuốc "Đã cấp phát" và ghi lịch sử giao dịch (thù lao bác sĩ 6.000đ/toa).
      </p>
    </div>
  )
}
