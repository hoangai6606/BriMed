import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { FileText, Plus, Trash2, ShieldAlert, Search, Repeat, CheckCircle2, PenLine } from 'lucide-react'
import { SeoMeta } from '../../components/common/SeoMeta'
import { api, fmtVnd, timeAgo } from '../../api/client'
import { Modal, PageLoading } from '../../components/common/Misc'
import { useUi } from '../../store/ui'
import { RX_STATUS } from '../../data/constants'

interface Item {
  medicine_id: number | ''
  name: string
  is_antibiotic: boolean
  dosage: string
  usage: string
  duration_days: number
  quantity: number
}

const emptyItem = (): Item => ({ medicine_id: '', name: '', is_antibiotic: false, dosage: '', usage: '', duration_days: 3, quantity: 1 })

export default function DoctorPrescriptions() {
  const [params] = useSearchParams()
  const consultationId = params.get('consultation')
  const navigate = useNavigate()
  const toast = useUi((s) => s.toast)

  const [tab, setTab] = useState<'create' | 'mine' | 'subs'>('create')
  const [consultation, setConsultation] = useState<any>(null)
  const [medicines, setMedicines] = useState<any[]>([])
  const [items, setItems] = useState<Item[]>([emptyItem()])
  const [note, setNote] = useState('')
  const [abOpen, setAbOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [mine, setMine] = useState<any[]>([])
  const [subs, setSubs] = useState<any[]>([])
  const [subChoice, setSubChoice] = useState<Record<number, number>>({})
  const [search, setSearch] = useState('')

  const load = () => {
    if (consultationId) {
      api(`/doctor/consultations/${consultationId}`).then((d) => setConsultation(d.consultation)).catch(() => {})
    }
    api('/doctor/prescriptions/mine').then((d) => setMine(d.prescriptions)).catch(() => {})
    api('/doctor/substitutions/mine').then((d) => setSubs(d.substitutions)).catch(() => {})
  }
  useEffect(() => {
    api('/catalog/medicines').then((d) => setMedicines(d.medicines)).catch(() => {})
    load()
  }, [])

  const filteredMeds = useMemo(() => {
    const s = search.trim().toLowerCase()
    return s ? medicines.filter((m) => m.name.toLowerCase().includes(s) || m.active_ingredient.toLowerCase().includes(s)) : medicines
  }, [medicines, search])

  const setItem = (i: number, patch: Partial<Item>) => setItems((arr) => arr.map((it, idx) => (idx === i ? { ...it, ...patch } : it)))

  const pickMedicine = (i: number, medId: number) => {
    const m = medicines.find((x) => x.id === medId)
    if (!m) return
    setItem(i, { medicine_id: m.id, name: m.name, is_antibiotic: !!m.is_antibiotic })
  }

  const hasAntibiotic = items.some((it) => it.is_antibiotic)
  const valid = items.every((it) => it.medicine_id && it.dosage.trim() && it.usage.trim() && it.quantity > 0) && items.length > 0

  const create = async () => {
    if (!valid) {
      toast('Vui lòng điền đủ liều dùng, cách dùng và số lượng cho từng thuốc.', 'error')
      return
    }
    if (hasAntibiotic && !abOpen) {
      setAbOpen(true)
      return
    }
    setBusy(true)
    try {
      const d = await api('/doctor/prescriptions', {
        method: 'POST',
        body: JSON.stringify({
          consultation_id: consultationId ? Number(consultationId) : undefined,
          patient_id: consultation?.patient_id,
          items: items.map((it) => ({ ...it })),
          note,
          antibiotic_confirmed: hasAntibiotic,
        }),
      })
      toast(`Đã ký số & phát hành đơn ${d.prescription.national_code} (liên thông CSDL quốc gia).`, 'success')
      navigate(`/doctor/consultation/${consultationId}`) 
      setItems([emptyItem()])
      setNote('')
      load()
    } catch (e: any) {
      toast(e.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const approveSub = async (s: any, decision: 'approve' | 'reject') => {
    const substituteId = subChoice[s.id]
    if (decision === 'approve' && !substituteId) {
      toast('Chọn thuốc thay thế có sẵn trong kho.', 'error')
      return
    }
    setBusy(true)
    try {
      await api(`/doctor/substitutions/${s.id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ decision, substitute_medicine_id: substituteId }),
      })
      toast(decision === 'approve' ? 'Đã duyệt thay thế & ký số cấp lại đơn.' : 'Đã từ chối yêu cầu thay thế.', 'success')
      load()
    } catch (e: any) {
      toast(e.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const pendingSubs = subs.filter((s: any) => s.status === 'pending')

  return (
    <div className="space-y-4 max-w-3xl">
      <SeoMeta title="Tạo / Quản lý đơn thuốc – Bác sĩ BriMed" />
      <h1 className="text-[20px] font-extrabold text-bluedark">Đơn thuốc điện tử (TT 26/2025)</h1>

      {/* Tabs */}
      <div className="flex gap-1.5 bg-white rounded-xl p-1 border border-slate-200">
        {[
          ['create', 'Tạo đơn' + (pendingSubs.length ? '' : '')],
          ['mine', `Đơn đã kê (${mine.length})`],
          ['subs', `Yêu cầu đổi thuốc (${pendingSubs.length})`],
        ].map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k as any)}
            className={`flex-1 py-2 rounded-lg text-[13.5px] font-bold transition ${tab === k ? 'bg-primary text-white' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'create' && (
        <section className="card p-4 space-y-4">
          {consultation && (
            <div className="rounded-xl bg-lightblue/35 p-3 text-[13px] text-bluedark">
              Kê đơn cho phiên tư vấn #{consultation.id} · <strong>{consultation.patient_name}</strong> · {consultation.disease_group}
              {consultation.drug_allergies && consultation.drug_allergies !== 'Không' && (
                <div className="mt-1 text-redflag-fg font-semibold">⚠ Dị ứng thuốc: {consultation.drug_allergies}</div>
              )}
            </div>
          )}
          {!consultationId && (
            <div className="rounded-xl bg-slate-100 p-3 text-[12.5px] text-slate-500">
              Mở từ một phiên tư vấn ở hàng đợi để gắn đơn với bệnh nhân tương ứng.
            </div>
          )}

          {items.map((it, i) => (
            <div key={i} className="rounded-xl border border-slate-200 p-3.5 space-y-2.5 relative">
              {items.length > 1 && (
                <button onClick={() => setItems((arr) => arr.filter((_, idx) => idx !== i))} className="absolute right-2.5 top-2.5 text-slate-300 hover:text-redflag-fg" aria-label="Xóa thuốc">
                  <Trash2 size={16} />
                </button>
              )}
              <div className="grid sm:grid-cols-2 gap-2.5">
                <div className="sm:col-span-2">
                  <label className="label" htmlFor={`med-${i}`}>Thuốc {i + 1} *</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        className="input !pl-8 !pr-20"
                        placeholder="Tìm theo tên / hoạt chất…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        aria-label="Tìm thuốc"
                      />
                    </div>
                    <select id={`med-${i}`} className="input" value={it.medicine_id} onChange={(e) => pickMedicine(i, Number(e.target.value))}>
                      <option value="">— Chọn thuốc —</option>
                      {filteredMeds.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.active_ingredient}){m.is_antibiotic ? ' ⚠ kháng sinh' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="label" htmlFor={`dose-${i}`}>Liều dùng *</label>
                  <input id={`dose-${i}`} className="input" value={it.dosage} onChange={(e) => setItem(i, { dosage: e.target.value })} placeholder="VD: 1 viên/lần" />
                </div>
                <div>
                  <label className="label" htmlFor={`usage-${i}`}>Cách dùng *</label>
                  <input id={`usage-${i}`} className="input" value={it.usage} onChange={(e) => setItem(i, { usage: e.target.value })} placeholder="VD: Uống 3 lần/ngày sau ăn" />
                </div>
                <div>
                  <label className="label" htmlFor={`dur-${i}`}>Thời gian (ngày)</label>
                  <input id={`dur-${i}`} type="number" min={1} className="input" value={it.duration_days} onChange={(e) => setItem(i, { duration_days: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="label" htmlFor={`qty-${i}`}>Số lượng *</label>
                  <input id={`qty-${i}`} type="number" min={1} className="input" value={it.quantity} onChange={(e) => setItem(i, { quantity: Number(e.target.value) })} />
                </div>
              </div>
            </div>
          ))}

          <button onClick={() => setItems((arr) => [...arr, emptyItem()])} className="btn-outline w-full !border-dashed">
            <Plus size={16} /> Thêm thuốc
          </button>

          <div>
            <label className="label" htmlFor="rx-note">Lời dặn bác sĩ</label>
            <textarea id="rx-note" rows={2} className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="VD: Tái khám nếu sốt cao kéo dài hoặc khó thở." />
          </div>

          {hasAntibiotic && (
            <div className="rounded-xl bg-redflag-bg border border-redflag-fg/30 p-3.5 flex gap-2.5">
              <ShieldAlert size={19} className="text-redflag-fg shrink-0 mt-0.5" />
              <div className="text-[13px] text-redflag-fg">
                <strong>Đơn có kháng sinh.</strong> Cúm/viêm họng cấp phần lớn do virus — BriMed giám sát tỷ lệ toa kháng sinh.
                Kê chỉ khi có chỉ định rõ ràng; hệ thống sẽ ghi nhận vào báo cáo KPI.
              </div>
            </div>
          )}

          <button onClick={create} disabled={busy} className="btn-primary w-full !min-h-[52px] !text-[16px]">
            <PenLine size={18} /> {busy ? 'Đang ký số…' : 'Ký số & phát hành đơn điện tử'}
          </button>
        </section>
      )}

      {tab === 'mine' && (
        <section className="space-y-3">
          {mine.length === 0 && <p className="card p-6 text-center text-[13.5px] text-slate-400">Chưa kê đơn nào.</p>}
          {mine.map((p) => {
            const st = RX_STATUS[p.status]
            return (
              <article key={p.id} className="card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-extrabold text-[14.5px] text-bluedark">{p.national_code}</div>
                    <div className="text-[12.5px] text-slate-500">BN. {p.patient_name} · {timeAgo(p.created_at)}</div>
                  </div>
                  <span className={`badge ${st.cls}`}>{st.label}</span>
                </div>
                <div className="mt-2 text-[13px] text-slate-600">{p.items.map((it: any) => it.name).join(' · ')}</div>
                {p.has_antibiotic && <span className="badge bg-redflag-bg text-redflag-fg mt-1.5">Có kháng sinh</span>}
                <div className="mt-1.5 text-[11.5px] text-slate-400 font-mono truncate">{p.digital_signature}</div>
              </article>
            )
          })}
        </section>
      )}

      {tab === 'subs' && (
        <section className="space-y-3">
          {subs.length === 0 && <p className="card p-6 text-center text-[13.5px] text-slate-400">Chưa có yêu cầu đổi hoạt chất nào.</p>}
          {subs.map((s: any) => (
            <article key={s.id} className={`card p-4 ${s.status === 'pending' ? 'border-2 border-pink/40' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-extrabold text-[14.5px] text-bluedark flex items-center gap-1.5">
                    <Repeat size={16} className="text-pink" /> {s.medicine_name}
                  </div>
                  <div className="text-[12.5px] text-slate-500 mt-0.5">
                    Đơn {s.national_code} · BN. {s.patient_name} · {s.pharmacy_name} · {timeAgo(s.created_at)}
                  </div>
                  <div className="text-[13px] text-slate-600 mt-1">{s.reason}</div>
                </div>
                <span className={`badge ${s.status === 'pending' ? 'bg-lightpink text-pink-dark' : s.status === 'approved' ? 'bg-mint-bg text-mint-fg' : 'bg-redflag-bg text-redflag-fg'}`}>
                  {s.status === 'pending' ? 'Chờ duyệt' : s.status === 'approved' ? 'Đã duyệt' : 'Từ chối'}
                </span>
              </div>

              {s.status === 'pending' && (
                <div className="mt-3 space-y-2.5">
                  <label className="label !mb-1">Chọn hoạt chất tương đương có sẵn trong kho nhà thuốc</label>
                  {s.options.length === 0 ? (
                    <p className="text-[13px] text-redflag-fg">Không có thuốc tương đương nào còn hàng tại nhà thuốc.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {s.options.map((o: any) => (
                        <label key={o.id} className={`flex items-center gap-2.5 rounded-xl border-2 px-3 py-2.5 cursor-pointer ${subChoice[s.id] === o.id ? 'border-primary bg-lightblue/30' : 'border-slate-200'}`}>
                          <input
                            type="radio"
                            name={`sub-${s.id}`}
                            checked={subChoice[s.id] === o.id}
                            onChange={() => setSubChoice({ ...subChoice, [s.id]: o.id })}
                            className="w-[18px] h-[18px] accent-[#0d71e2]"
                          />
                          <span className="flex-1 text-[13.5px]">
                            <strong>{o.name}</strong> <span className="text-slate-400">· {o.active_ingredient}</span>
                          </span>
                          <span className="text-[12.5px] font-bold text-bluedark">{fmtVnd(o.sell_price)} · còn {o.stock}</span>
                        </label>
                      ))}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => approveSub(s, 'approve')} disabled={busy} className="btn-primary !text-[13px]">
                      <CheckCircle2 size={16} /> Duyệt & ký số cấp lại đơn
                    </button>
                    <button onClick={() => approveSub(s, 'reject')} disabled={busy} className="btn-danger !text-[13px]">
                      Từ chối
                    </button>
                  </div>
                </div>
              )}
              {s.status === 'approved' && s.substitute_name && (
                <div className="mt-2 rounded-xl bg-mint-bg px-3 py-2 text-[13px] text-mint-fg">
                  Đã thay bằng <strong>{s.substitute_name}</strong> và cấp lại đơn có chữ ký số mới.
                </div>
              )}
            </article>
          ))}
        </section>
      )}

      {/* Xác nhận kháng sinh */}
      <Modal open={abOpen} onClose={() => setAbOpen(false)} title="Xác nhận chỉ định kháng sinh">
        <div className="space-y-3.5">
          <div className="rounded-xl bg-redflag-bg p-3.5 text-[13.5px] text-redflag-fg leading-relaxed">
            <strong>Kiểm soát kê kháng sinh:</strong> bạn đang kê {items.filter((i) => i.is_antibiotic).map((i) => i.name).join(', ')}.
            Cúm và phần lớn viêm họng cấp do virus. Chỉ kê kháng sinh khi có chỉ định rõ ràng sau đánh giá lâm sàng.
          </div>
          <p className="text-[13px] text-slate-600">Tỷ lệ toa có kháng sinh của bạn được giám sát theo ngưỡng an toàn của hệ thống.</p>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setAbOpen(false)} className="btn-outline">Xem lại đơn</button>
            <button
              onClick={() => {
                setAbOpen(false)
                create()
              }}
              disabled={busy}
              className="btn-danger"
            >
              Xác nhận chỉ định & kê
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
