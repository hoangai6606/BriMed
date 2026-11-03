import { useState } from 'react'
import { Link } from 'react-router-dom'
import { QrCode, ScanLine, CheckCircle2, XCircle, Repeat, AlertTriangle } from 'lucide-react'
import { SeoMeta } from '../../components/common/SeoMeta'
import { api, fmtVnd } from '../../api/client'
import { useUi } from '../../store/ui'

export default function ReceivePrescription() {
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [data, setData] = useState<any>(null)
  const [err, setErr] = useState<string | null>(null)
  const toast = useUi((s) => s.toast)

  const receive = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!code.trim()) return
    setBusy(true)
    setErr(null)
    setData(null)
    try {
      const d = await api('/pharmacy/receive', { method: 'POST', body: JSON.stringify({ code: code.trim() }) })
      setData(d)
    } catch (e: any) {
      setErr(e.message)
    } finally {
      setBusy(false)
    }
  }

  const requestSub = async (item: any) => {
    if (!data) return
    setBusy(true)
    try {
      const d = await api('/pharmacy/substitutions', {
        method: 'POST',
        body: JSON.stringify({
          prescription_id: data.prescription.id,
          order_id: data.order?.id,
          medicine_id: item.medicine_id,
          reason: `${item.name} hết hàng tại quầy – đề xuất hoạt chất tương đương`,
        }),
      })
      toast(d.message, 'success')
      receive()
    } catch (e: any) {
      toast(e.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const fillDemo = () => {
    setCode('VN-Rx-2026-00003')
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <SeoMeta title="Tiếp nhận đơn thuốc – Nhà thuốc BriMed" />
      <h1 className="text-[20px] font-extrabold text-bluedark">Tiếp nhận đơn thuốc điện tử</h1>

      <form onSubmit={receive} className="card p-4">
        <label className="label" htmlFor="rx-code">Nhập hoặc quét mã đơn thuốc của khách</label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <ScanLine size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-primary" />
            <input
              id="rx-code"
              className="input !pl-10 font-mono"
              placeholder="VN-Rx-2026-XXXXX"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>
          <button type="submit" disabled={busy} className="btn-primary !px-4">
            <QrCode size={17} /> {busy ? 'Đang tra…' : 'Tra cứu'}
          </button>
        </div>
        <button type="button" onClick={fillDemo} className="text-[12.5px] text-primary font-semibold mt-2 hover:underline">
          Điền nhanh mã đơn: VN-Rx-2026-00003
        </button>
      </form>

      {err && (
        <div className="card p-4 border-redflag-fg/30 bg-redflag-bg/40 text-[14px] text-redflag-fg flex items-center gap-2">
          <AlertTriangle size={18} /> {err}
        </div>
      )}

      {data && (
        <>
          <section className="card p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-extrabold text-[16px] text-bluedark">{data.prescription.national_code}</div>
                <div className="text-[13px] text-slate-500 mt-0.5">
                  BN. {data.prescription.patient_name} · {data.prescription.doctor_name?.full_name} ({data.prescription.doctor_name?.doctor_specialty})
                </div>
              </div>
              <span className={`badge ${data.all_available ? 'bg-mint-bg text-mint-fg' : 'bg-redflag-bg text-redflag-fg'}`}>
                {data.all_available ? <CheckCircle2 size={13} /> : <XCircle size={13} />} {data.all_available ? 'Đủ hàng cung ứng' : 'Thiếu hàng'}
              </span>
            </div>

            <ul className="mt-3 divide-y divide-slate-100 border-t border-slate-100">
              {data.stock_check.map((it: any, i: number) => (
                <li key={i} className="py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[14px] font-bold text-slate-700">{it.name}</div>
                      <div className="text-[12.5px] text-slate-500">
                        {it.dosage} · {it.usage} · {it.duration_days} ngày · SL {it.quantity}
                      </div>
                      <div className="text-[12.5px] mt-0.5">
                        {it.in_inventory ? (
                          <>Giá bán: <strong className="text-bluedark">{fmtVnd(it.sell_price)}</strong> · Tồn kho: <strong>{it.stock}</strong></>
                        ) : (
                          <span className="text-redflag-fg font-semibold">Không có trong kho nhà thuốc</span>
                        )}
                      </div>
                    </div>
                    <span className={`badge shrink-0 ${it.available ? 'bg-mint-bg text-mint-fg' : it.stock > 0 ? 'bg-amber-100 text-amber-700' : 'bg-redflag-bg text-redflag-fg'}`}>
                      {it.available ? 'Đủ' : it.stock > 0 ? `Thiếu (còn ${it.stock})` : 'Hết hàng'}
                    </span>
                  </div>

                  {!it.available && it.substitute_options.length > 0 && (
                    <div className="mt-2 rounded-xl bg-lightpink/30 border border-pink/25 p-3">
                      <div className="text-[12.5px] font-bold text-pink-dark flex items-center gap-1.5">
                        <Repeat size={14} /> Hoạt chất tương đương có sẵn — gửi yêu cầu bác sĩ duyệt đổi:
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {it.substitute_options.map((o: any) => (
                          <button
                            key={o.id}
                            disabled={busy}
                            onClick={() => requestSub({ ...it, medicine_id: o.id, name: o.name })}
                            className="badge bg-white border border-pink/40 text-pink-dark hover:bg-pink hover:text-white !px-2.5 !py-1.5"
                          >
                            {o.name} · {fmtVnd(o.sell_price)} · còn {o.stock}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {!it.available && it.substitute_options.length === 0 && (
                    <div className="mt-2 text-[12.5px] text-slate-500">
                      Không có hoạt chất tương đương nào còn hàng — đề nghị khách quay lại sau hoặc liên hệ bác sĩ.
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>

          {data.order ? (
            <section className="card p-4 bg-lightblue/25">
              <div className="text-[13.5px] text-bluedark">
                Đơn hàng <strong>#{data.order.id}</strong> đã được bệnh nhân gửi đến quầy nhà thuốc bạn.
              </div>
              <Link to={`/pharmacy/quote-confirm/${data.order.id}`} className="btn-primary w-full mt-3">
                Sang bước báo giá & xác nhận đơn
              </Link>
            </section>
          ) : (
            <section className="card p-4 bg-amber-50 border-amber-200 text-[13.5px] text-amber-800">
              Đơn này chưa gắn với quầy nhà thuốc — bệnh nhân có thể mang mã đơn đến nhà thuốc khác.
              Hướng dẫn khách mở app BriMed → Đơn thuốc của tôi → <strong>Gửi đơn đến quầy nhà thuốc</strong>.
            </section>
          )}
        </>
      )}
    </div>
  )
}
