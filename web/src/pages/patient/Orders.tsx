import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ShoppingCart, Coins, Truck, Store, ReceiptText } from 'lucide-react'
import { SeoMeta } from '../../components/common/SeoMeta'
import { api, fmtDateTime, fmtVnd, timeAgo } from '../../api/client'
import { EmptyState, OrderTimeline, PageLoading } from '../../components/common/Misc'

export default function MyOrders() {
  const [orders, setOrders] = useState<any[] | null>(null)

  useEffect(() => {
    api('/patient/orders/mine').then((d) => setOrders(d.orders)).catch(() => setOrders([]))
  }, [])

  if (!orders) return <PageLoading />

  return (
    <div className="space-y-4 max-w-2xl">
      <SeoMeta title="Đơn hàng của tôi – BriMed" />
      <h1 className="text-[20px] font-extrabold text-bluedark">Giỏ hàng / Đơn hàng</h1>

      {orders.length === 0 ? (
        <EmptyState
          icon={<ShoppingCart size={24} />}
          title="Chưa có đơn hàng"
          desc="Mua theo đơn thuốc để tạo đơn hàng tại nhà thuốc đối tác."
          action={<Link to="/patient/prescriptions" className="btn-primary">Xem đơn thuốc của tôi</Link>}
        />
      ) : (
        orders.map((o) => (
          <article key={o.id} className="card p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-extrabold text-[15px] text-bluedark">Đơn hàng #{o.id}</div>
                <div className="text-[12.5px] text-slate-500">
                  Mã đơn thuốc {o.prescription_code} · {o.pharmacy_name}
                </div>
              </div>
              <div className="text-right">
                <div className={`badge ${o.receive_method === 'delivery' ? 'bg-lightpink text-pink-dark' : 'bg-lightblue text-bluedark'}`}>
                  {o.receive_method === 'delivery' ? <><Truck size={13} /> Giao hàng</> : <><Store size={13} /> Nhận tại quầy</>}
                </div>
                <div className="text-[11.5px] text-slate-400 mt-1">{timeAgo(o.created_at)}</div>
              </div>
            </div>

            <ul className="mt-3 divide-y divide-slate-50 border-y border-slate-100">
              {o.items.map((it: any, i: number) => (
                <li key={i} className="py-2 flex justify-between text-[13.5px]">
                  <span className="text-slate-700">{it.name} × {it.quantity}</span>
                  <span className="font-semibold text-slate-600">{fmtVnd(it.line_total ?? it.unit_price * it.quantity)}</span>
                </li>
              ))}
            </ul>

            {o.quote && (
              <div className="mt-2.5 text-[13px] space-y-1">
                <div className="flex justify-between text-slate-500"><span>Tạm tính</span><span>{fmtVnd(o.quote.subtotal)}</span></div>
                <div className="flex justify-between text-slate-500"><span>Phí giao hàng</span><span>{fmtVnd(o.quote.delivery_fee)}</span></div>
                <div className="flex justify-between font-extrabold text-[15px] text-bluedark border-t border-slate-100 pt-1.5">
                  <span>Tổng cộng</span><span>{fmtVnd(o.quote.total)}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[12px] text-pink-dark">
                  <Coins size={13} />
                  Tiền thuốc trả trực tiếp tại quầy — BriMed không thu hoa hồng
                </div>
              </div>
            )}

            <div className="mt-4">
              <OrderTimeline status={o.status} />
              {o.completed_at && (
                <div className="mt-2 text-center text-[12px] text-mint-fg font-semibold flex items-center justify-center gap-1">
                  <ReceiptText size={13} /> Hoàn tất {fmtDateTime(o.completed_at)}
                </div>
              )}
            </div>
          </article>
        ))
      )}
    </div>
  )
}
