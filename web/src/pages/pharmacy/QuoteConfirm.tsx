import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ReceiptText, Coins, Truck, Store, CheckCircle2 } from 'lucide-react'
import { SeoMeta } from '../../components/common/SeoMeta'
import { api, fmtVnd } from '../../api/client'
import { OrderTimeline, PageLoading } from '../../components/common/Misc'
import { useUi } from '../../store/ui'

export default function QuoteConfirm() {
  const { id } = useParams()
  const [order, setOrder] = useState<any>(null)
  const [deliveryFee, setDeliveryFee] = useState(0)
  const [method, setMethod] = useState<'pickup' | 'delivery'>('pickup')
  const [busy, setBusy] = useState(false)
  const toast = useUi((s) => s.toast)

  const load = () => api(`/pharmacy/orders/${id}`).then((d) => {
    setOrder(d.order)
    setDeliveryFee(d.order.delivery_fee || 0)
    setMethod(d.order.receive_method)
  }).catch((e) => toast(e.message, 'error'))
  useEffect(() => {
    load()
  }, [id])

  if (!order) return <PageLoading />

  const subtotal = order.items.reduce((s: number, it: any) => s + (it.unit_price || 0) * it.quantity, 0)
  const total = subtotal + (method === 'delivery' ? deliveryFee : 0)

  const submitQuote = async () => {
    setBusy(true)
    try {
      const items = order.items.map((it: any) => ({
        ...it,
        unit_price: it.unit_price ?? 0,
        line_total: (it.unit_price ?? 0) * it.quantity,
      }))
      const d = await api(`/pharmacy/orders/${order.id}/quote`, {
        method: 'POST',
        body: JSON.stringify({ items, delivery_fee: method === 'delivery' ? deliveryFee : 0 }),
      })
      setOrder(d.order)
      toast('Đã gửi báo giá cho bệnh nhân.', 'success')
    } catch (e: any) {
      toast(e.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const confirmOrder = async () => {
    setBusy(true)
    try {
      const d = await api(`/pharmacy/orders/${order.id}/confirm`, { method: 'POST', body: JSON.stringify({}) })
      setOrder(d.order)
      toast('Đã xác nhận đơn. Chuyển sang chuẩn bị thuốc.', 'success')
    } catch (e: any) {
      toast(e.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <SeoMeta title="Báo giá & xác nhận đơn – Nhà thuốc BriMed" />
      <h1 className="text-[20px] font-extrabold text-bluedark">Báo giá & xác nhận đơn #{order.id}</h1>

      <section className="card p-4">
        <div className="text-[13px] text-slate-500">
          BN. {order.patient_name} · Mã đơn {order.prescription_code}
        </div>
        <div className="mt-3">
          <OrderTimeline status={order.status} />
        </div>
      </section>

      <section className="card p-4">
        <h2 className="section-title flex items-center gap-2 mb-3"><ReceiptText size={18} className="text-primary" /> Báo giá chi tiết</h2>
        <ul className="divide-y divide-slate-100">
          {order.items.map((it: any, i: number) => (
            <li key={i} className="py-2.5 flex items-center gap-2">
              <span className="flex-1 text-[13.5px]">
                <span className="font-bold text-slate-700">{it.name}</span>
                <span className="text-slate-400"> × {it.quantity}</span>
                <div className="text-[12px] text-slate-500">{it.dosage} · {it.usage}</div>
              </span>
              <span className="text-[13.5px] font-bold text-bluedark">{fmtVnd((it.unit_price || 0) * it.quantity)}</span>
            </li>
          ))}
        </ul>

        <div className="mt-3.5 space-y-2.5">
          <div className="flex gap-2">
            <button
              onClick={() => setMethod('pickup')}
              className={`btn flex-1 ${method === 'pickup' ? 'bg-primary text-white' : 'bg-white border-2 border-slate-200 text-slate-500'}`}
            >
              <Store size={16} /> Nhận ngay tại quầy
            </button>
            <button
              onClick={() => setMethod('delivery')}
              className={`btn flex-1 ${method === 'delivery' ? 'bg-primary text-white' : 'bg-white border-2 border-slate-200 text-slate-500'}`}
            >
              <Truck size={16} /> Giao hàng
            </button>
          </div>
          {method === 'delivery' && (
            <div>
              <label className="label" htmlFor="qc-fee">Phí giao hàng (đ)</label>
              <input id="qc-fee" type="number" className="input" value={deliveryFee} onChange={(e) => setDeliveryFee(Number(e.target.value))} placeholder="15000" />
            </div>
          )}

          <div className="rounded-xl bg-slate-50 p-3.5 text-[14px] space-y-1">
            <div className="flex justify-between text-slate-500"><span>Tạm tính thuốc</span><span>{fmtVnd(subtotal)}</span></div>
            <div className="flex justify-between text-slate-500"><span>Phí giao hàng</span><span>{method === 'delivery' ? fmtVnd(deliveryFee) : '0đ'}</span></div>
            <div className="flex justify-between text-slate-500">
              <span>Phí khám BriMed</span>
              <span>Bệnh nhân đã trả qua VietQR — không tính vào hóa đơn thuốc</span>
            </div>
            <div className="flex justify-between font-extrabold text-[16px] text-bluedark border-t border-slate-200 pt-1.5">
              <span>Bệnh nhân trả</span><span>{fmtVnd(total)}</span>
            </div>
          </div>
        </div>

        <div className="mt-3.5 grid grid-cols-2 gap-2">
          <button onClick={submitQuote} disabled={busy} className="btn-outline">
            {busy ? 'Đang gửi…' : 'Cập nhật báo giá'}
          </button>
          {order.status === 'confirmed' ? (
            <button onClick={confirmOrder} disabled={busy} className="btn-primary">
              <CheckCircle2 size={17} /> Xác nhận & chốt đơn
            </button>
          ) : (
            <Link to="/pharmacy/orders" className="btn-primary">Đơn đã chốt → Xử lý</Link>
          )}
        </div>
      </section>

      <p className="text-[12.5px] text-slate-400 flex items-center gap-1.5">
        <Coins size={14} /> BriMed không thu hoa hồng tiền thuốc — số tiền bên trên là giá thuốc quầy thu trực tiếp của bệnh nhân.
      </p>
    </div>
  )
}
