import { useEffect, useState } from 'react'
import { FileText, Store, Copy, CheckCircle2, XCircle, Pill, ShieldCheck } from 'lucide-react'
import { SeoMeta } from '../../components/common/SeoMeta'
import { api, fmtDateTime } from '../../api/client'
import { RX_STATUS } from '../../data/constants'
import { EmptyState, PageLoading, Modal } from '../../components/common/Misc'
import { useUi } from '../../store/ui'

export default function MyPrescriptions() {
  const [rxs, setRxs] = useState<any[] | null>(null)
  const [recommend, setRecommend] = useState<any[]>([])
  const [buying, setBuying] = useState<any | null>(null)
  const [choosePharmacy, setChoosePharmacy] = useState<number | ''>('')
  const [receiveMethod, setReceiveMethod] = useState<'pickup' | 'delivery'>('pickup')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const toast = useUi((s) => s.toast)

  const load = () => api('/patient/prescriptions/mine').then((d) => setRxs(d.prescriptions)).catch(() => setRxs([]))
  useEffect(() => { load() }, [])

  const openBuying = (rx: any) => {
    setBuying(rx)
    setReceiveMethod('pickup')
    setDeliveryAddress('')
    setRecommend([])
    api(`/patient/prescriptions/${rx.id}/recommend`)
      .then((d) => {
        const recs = d.recommendations || []
        setRecommend(recs)
        const best = recs.find((x: any) => x.all_in_stock) || recs[0]
        if (best) setChoosePharmacy(best.pharmacy_id)
      })
      .catch(() => {})
  }

  if (!rxs) return <PageLoading />

  const buyAtCounter = async () => {
    if (!buying || !choosePharmacy) return
    setBusy(true)
    try {
      const d = await api(`/patient/prescriptions/${buying.id}/purchase`, {
        method: 'POST',
        body: JSON.stringify({ pharmacy_id: choosePharmacy, receive_method: receiveMethod, delivery_address: deliveryAddress }),
      })
      toast(d.message, 'success')
      setBuying(null)
      await load()
    } catch (e: any) {
      toast(e.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const copyCode = (code: string) => {
    navigator.clipboard?.writeText(code).catch(() => {})
    setCopied(code)
    setTimeout(() => setCopied(null), 1500)
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <SeoMeta title="Đơn thuốc của tôi – BriMed" />
      <h1 className="text-[20px] font-extrabold text-bluedark">Đơn thuốc của tôi</h1>

      {rxs.length === 0 && (
        <EmptyState
          icon={<FileText size={24} />}
          title="Chưa có đơn thuốc nào"
          desc="Gửi form triệu chứng để bác sĩ kê đơn điện tử cho bạn."
        />
      )}

      {rxs.map((rx) => {
        const st = RX_STATUS[rx.status] || RX_STATUS.pending
        const canBuy = rx.status === 'issued' && !rx.order
        return (
          <article key={rx.id} className="card p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-[15px] text-bluedark">{rx.national_code}</span>
                  <button onClick={() => copyCode(rx.national_code)} className="text-slate-400 hover:text-primary" aria-label="Sao chép mã đơn">
                    {copied === rx.national_code ? <CheckCircle2 size={15} className="text-mint-fg" /> : <Copy size={15} />}
                  </button>
                </div>
                <div className="text-[12.5px] text-slate-500 mt-0.5">
                  {rx.doctor_name} · {fmtDateTime(rx.created_at)}
                </div>
              </div>
              <span className={`badge ${st.cls}`}>{st.label}</span>
            </div>

            {rx.status === 'rejected' && (
              <div className="mt-3 rounded-xl bg-redflag-bg p-3 text-[13px] text-redflag-fg flex gap-2">
                <XCircle size={16} className="shrink-0 mt-0.5" />
                <span><strong>Lý do từ chối:</strong> {rx.reject_reason}</span>
              </div>
            )}

            {rx.items?.length > 0 && (
              <ul className="mt-3 divide-y divide-slate-100 border-t border-slate-100">
                {rx.items.map((it: any, i: number) => (
                  <li key={i} className="py-2.5 flex gap-2.5">
                    <Pill size={16} className="text-primary shrink-0 mt-0.5" />
                    <div className="text-[13.5px]">
                      <div className="font-bold text-slate-700">{it.name} <span className="text-slate-400 font-normal">· {it.active_ingredient}</span></div>
                      <div className="text-slate-500">{it.dosage} · {it.usage} · {it.duration_days} ngày · SL {it.quantity}</div>
                      {it.substitution_note && <div className="text-[12px] text-pink-dark mt-0.5">↻ {it.substitution_note}</div>}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {rx.status !== 'rejected' && (
              <div className="mt-3 text-[12px] text-slate-400 flex items-center gap-1.5">
                <ShieldCheck size={13} /> Chữ ký số: {rx.digital_signature || '—'}
              </div>
            )}

            {canBuy && (
              <div className="mt-3">
                <button onClick={() => openBuying(rx)} className="btn-primary w-full !text-[13px] !px-2">
                  <Store size={16} /> Gửi đơn đến quầy nhà thuốc
                </button>
                <p className="mt-1.5 text-[11.5px] text-slate-400 flex items-center gap-1">
                  <ShieldCheck size={12} /> Tiền thuốc trả trực tiếp tại quầy — BriMed không thu hoa hồng.
                </p>
              </div>
            )}
            {rx.order && (
              <div className="mt-3 rounded-xl bg-lightblue/40 px-3.5 py-2.5 text-[13px] text-bluedark">
                Đơn hàng #{rx.order.id} tại nhà thuốc · trạng thái: <strong>{({ confirmed: 'Đã xác nhận', preparing: 'Đang chuẩn bị', ready_or_shipping: 'Sẵn sàng nhận', completed: 'Hoàn tất' } as any)[rx.order.status]}</strong>
              </div>
            )}
          </article>
        )
      })}

      <Modal open={!!buying} onClose={() => setBuying(null)} title="Chọn nhà thuốc đối tác">
        {buying && (
          <div className="space-y-3">
            <p className="text-[13.5px] text-slate-600">
              Đơn <strong>{buying.national_code}</strong> sẽ được gửi đến quầy nhà thuốc bạn chọn. Đến quầy, bạn cung cấp mã đơn —
              dược sĩ đối chiếu và bán thuốc theo giá niêm yết của quầy.
            </p>
            <div>
              <label className="label">Nhà thuốc (Gò Vấp) — ★ là đề xuất theo tồn kho &amp; giá</label>
              {recommend.length === 0 ? (
                <p className="text-[13px] text-slate-400 py-1">Đang phân tích tồn kho các nhà thuốc…</p>
              ) : (
                <div className="space-y-1.5 max-h-56 overflow-y-auto">
                  {recommend.map((r: any, idx: number) => (
                    <label key={r.pharmacy_id} className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 cursor-pointer transition ${choosePharmacy === r.pharmacy_id ? 'border-primary bg-lightblue/30' : 'border-slate-200 hover:border-primary/40'}`}>
                      <span className="flex items-start gap-2 min-w-0">
                        <input type="radio" name="pharmacy" className="accent-[#0d71e2] mt-1" checked={choosePharmacy === r.pharmacy_id} onChange={() => setChoosePharmacy(r.pharmacy_id)} />
                        <span className="text-[13px] min-w-0">
                          <span className="font-bold text-slate-700">{idx === 0 ? '★ ' : ''}{r.name}</span>
                          <span className={`block text-[11.5px] ${r.all_in_stock ? 'text-primary font-semibold' : 'text-amber-600'}`}>
                            {r.all_in_stock ? `Đủ ${r.items_in_stock}/${r.items_total} thuốc · ~${new Intl.NumberFormat('vi-VN').format(r.estimated_total)}đ` : `Thiếu ${r.items_total - r.items_in_stock}/${r.items_total} thuốc`}
                          </span>
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div>
              <span className="label">Cách nhận thuốc</span>
              <div className="flex gap-2">
                <button type="button" onClick={() => setReceiveMethod('pickup')} className={`btn flex-1 !min-h-[42px] ${receiveMethod === 'pickup' ? 'bg-primary text-white' : 'bg-white border-2 border-slate-200 text-slate-500'}`}>Nhận tại quầy</button>
                <button type="button" onClick={() => setReceiveMethod('delivery')} className={`btn flex-1 !min-h-[42px] ${receiveMethod === 'delivery' ? 'bg-primary text-white' : 'bg-white border-2 border-slate-200 text-slate-500'}`}>Giao tận nhà</button>
              </div>
              {receiveMethod === 'delivery' && (
                <input className="input mt-2" placeholder="Địa chỉ giao hàng (số nhà, đường, phường…) *" value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} />
              )}
            </div>
            <button onClick={buyAtCounter} disabled={busy || !choosePharmacy || (receiveMethod === 'delivery' && !deliveryAddress.trim())} className="btn-pink w-full">
              {busy ? 'Đang xử lý…' : 'Xác nhận gửi đến nhà thuốc'}
            </button>
          </div>
        )}
      </Modal>
    </div>
  )
}
