import { useEffect, useState } from 'react'
import { FileText, Store, QrCode, Copy, CheckCircle2, XCircle, Pill, ShieldCheck } from 'lucide-react'
import { SeoMeta } from '../../components/common/SeoMeta'
import { api, fmtDateTime } from '../../api/client'
import { RX_STATUS } from '../../data/constants'
import { EmptyState, PageLoading, Modal } from '../../components/common/Misc'
import { useUi } from '../../store/ui'
import { useAuth } from '../../store/auth'

export default function MyPrescriptions() {
  const [rxs, setRxs] = useState<any[] | null>(null)
  const [pharmacies, setPharmacies] = useState<any[]>([])
  const [buying, setBuying] = useState<any | null>(null)
  const [choosePharmacy, setChoosePharmacy] = useState<number | ''>('')
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const toast = useUi((s) => s.toast)
  const refreshUser = useAuth((s) => s.refresh)

  const load = () => api('/patient/prescriptions/mine').then((d) => setRxs(d.prescriptions)).catch(() => setRxs([]))
  useEffect(() => {
    load()
    api('/catalog/pharmacies').then((d) => { setPharmacies(d.pharmacies); if (d.pharmacies[0]) setChoosePharmacy(d.pharmacies[0].id) }).catch(() => {})
  }, [])

  if (!rxs) return <PageLoading />

  const buyAtCounter = async () => {
    if (!buying || !choosePharmacy) return
    setBusy(true)
    try {
      const d = await api(`/patient/prescriptions/${buying.id}/purchase`, {
        method: 'POST',
        body: JSON.stringify({ mode: 'at_counter', pharmacy_id: choosePharmacy }),
      })
      toast(d.message, 'success')
      setBuying(null)
      await load()
      refreshUser()
    } catch (e: any) {
      toast(e.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const takeElsewhere = async (rx: any) => {
    setBusy(true)
    try {
      const d = await api(`/patient/prescriptions/${rx.id}/purchase`, { method: 'POST', body: JSON.stringify({ mode: 'elsewhere' }) })
      toast(d.message, 'success')
      await load()
      refreshUser()
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
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button onClick={() => setBuying(rx)} className="btn-primary !text-[13px] !px-2">
                  <Store size={16} /> Mua tại quầy (3 token)
                </button>
                <button onClick={() => takeElsewhere(rx)} disabled={busy} className="btn-outline !text-[13px] !px-2">
                  <QrCode size={16} /> Lấy mã đi nơi khác (4 token)
                </button>
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
              Đơn <strong>{buying.national_code}</strong> sẽ được gửi đến quầy nhà thuốc bạn chọn. Nhấn chọn và đến quầy nhận thuốc —
              nhân viên đối chiếu mã đơn và bán theo đơn.
            </p>
            <div>
              <label className="label" htmlFor="rx-pharmacy">Nhà thuốc (Gò Vấp)</label>
              <select id="rx-pharmacy" className="input" value={choosePharmacy} onChange={(e) => setChoosePharmacy(Number(e.target.value))}>
                {pharmacies.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} — {p.address}, {p.ward}</option>
                ))}
              </select>
            </div>
            <button onClick={buyAtCounter} disabled={busy || !choosePharmacy} className="btn-pink w-full">
              {busy ? 'Đang xử lý…' : 'Xác nhận – trừ 3 token (~15.000đ)'}
            </button>
          </div>
        )}
      </Modal>
    </div>
  )
}
