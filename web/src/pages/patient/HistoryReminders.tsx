import { useEffect, useState } from 'react'
import { BellRing, History, Plus, Trash2, RefreshCcw, Sun, Sunset, Moon, Printer } from 'lucide-react'
import { SeoMeta } from '../../components/common/SeoMeta'
import { api, fmtDate } from '../../api/client'
import { Modal } from '../../components/common/Misc'
import { useUi } from '../../store/ui'
import { CONSULT_STATUS, RX_STATUS, TIME_SLOTS } from '../../data/constants'

const SLOT_ICON: Record<string, any> = { 'Sáng': Sun, 'Trưa': Sunset, 'Tối': Moon }

export default function HistoryReminders() {
  const [history, setHistory] = useState<any>(null)
  const [reminders, setReminders] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ medicine_name: '', times: ['Sáng', 'Tối'], note: '' })
  const [busy, setBusy] = useState(false)
  const toast = useUi((s) => s.toast)

  const load = () => {
    api('/patient/history').then(setHistory).catch(() => setHistory({ consultations: [], prescriptions: [] }))
    api('/patient/reminders/mine').then((d) => setReminders(d.reminders)).catch(() => {})
  }
  useEffect(load, [])

  const addReminder = async () => {
    if (!form.medicine_name || !form.times.length) {
      toast('Vui lòng nhập tên thuốc và chọn buổi nhắc.', 'error')
      return
    }
    setBusy(true)
    try {
      await api('/patient/reminders', { method: 'POST', body: JSON.stringify(form) })
      toast('Đã tạo lịch nhắc uống thuốc.', 'success')
      setOpen(false)
      load()
    } catch (e: any) {
      toast(e.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const toggleReminder = async (r: any) => {
    await api(`/patient/reminders/${r.id}`, { method: 'PUT', body: JSON.stringify({ active: !r.active, times: r.times }) }).catch(() => {})
    load()
  }

  const removeReminder = async (r: any) => {
    await api(`/patient/reminders/${r.id}`, { method: 'DELETE' }).catch(() => {})
    load()
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <SeoMeta title="Lịch sử điều trị & nhắc uống thuốc – BriMed" />
      <h1 className="text-[20px] font-extrabold text-bluedark">Lịch sử & nhắc uống thuốc</h1>
      <button onClick={() => window.print()} className="btn-outline !min-h-[36px] !px-3 !text-[12.5px] mb-2 print:hidden">
        <Printer size={15} /> In / Lưu PDF lịch sử khám
      </button>

      {/* Nhắc uống thuốc */}
      <section className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="section-title flex items-center gap-2"><BellRing size={18} className="text-pink" /> Lịch nhắc uống thuốc</h2>
          <button onClick={() => setOpen(true)} className="btn-pink !min-h-[38px] !px-3 !text-[13px]">
            <Plus size={16} /> Thêm
          </button>
        </div>
        {reminders.length === 0 ? (
          <p className="text-[13.5px] text-slate-400 text-center py-3">Chưa có lời nhắc nào.</p>
        ) : (
          <ul className="space-y-2">
            {reminders.map((r) => (
              <li key={r.id} className={`rounded-xl border px-3.5 py-3 flex items-center gap-3 ${r.active ? 'border-pink/30 bg-lightpink/25' : 'border-slate-200 bg-slate-50 opacity-70'}`}>
                <div className="flex gap-1">
                  {TIME_SLOTS.map((s) => {
                    const on = r.times.includes(s)
                    const Icon = SLOT_ICON[s]
                    return <Icon key={s} size={16} className={on ? 'text-pink' : 'text-slate-300'} />
                  })}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13.5px] font-bold text-slate-700 truncate">{r.medicine_name}</div>
                  <div className="text-[12px] text-slate-500">
                    {r.times.join(' · ')}{r.note ? ` · ${r.note}` : ''}
                  </div>
                </div>
                <button onClick={() => toggleReminder(r)} className="text-slate-400 hover:text-primary p-1.5" aria-label="Bật/tắt lời nhắc" title={r.active ? 'Tạm dừng' : 'Kích hoạt lại'}>
                  <RefreshCcw size={16} />
                </button>
                <button onClick={() => removeReminder(r)} className="text-slate-400 hover:text-redflag-fg p-1.5" aria-label="Xóa lời nhắc">
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Gói tái khám từ xa */}
        <div className="mt-3 rounded-xl bg-lightblue/30 p-3.5 text-[13px] text-slate-600 leading-relaxed">
          <strong className="text-bluedark">Gói tái khám từ xa cho bệnh mạn tính ổn định:</strong> dựa trên đơn/hồ sơ cũ,
          bạn có thể yêu cầu tái khám nhanh mà không cần điền lại toàn bộ form — bác sĩ xem lại hồ sơ và kê đơn mới ngay tại quầy.
        </div>
      </section>

      {/* Lịch sử điều trị */}
      <section className="card p-4">
        <h2 className="section-title flex items-center gap-2 mb-1"><History size={18} className="text-primary" /> Lịch sử điều trị</h2>
        {!history ? (
          <p className="text-[13.5px] text-slate-400 py-3 text-center">Đang tải…</p>
        ) : (
          <ol className="mt-2 relative border-l-2 border-lightblue ml-2 space-y-4">
            {history.consultations.map((c: any) => {
              const rx = (history.prescriptions || []).find((p: any) => p.consultation_id === c.id)
              const st = CONSULT_STATUS[c.status]
              return (
                <li key={c.id} className="ml-4">
                  <span className={`absolute -left-[9px] w-4 h-4 rounded-full border-2 border-white ${c.status === 'rejected' ? 'bg-redflag-fg' : c.status === 'approved' ? 'bg-mint-fg' : 'bg-primary'}`} />
                  <div className="text-[12px] text-slate-400">{fmtDate(c.created_at)}</div>
                  <div className="text-[14px] font-bold text-slate-700">{c.disease_group} {rx && <span className="text-primary">· {rx.national_code}</span>}</div>
                  <div className="text-[12.5px] text-slate-500">
                    {c.doctor_name ? c.doctor_name : 'Chưa phân bác sĩ'} · {c.symptom.slice(0, 60)}{c.symptom.length > 60 ? '…' : ''}
                  </div>
                  <span className={`badge ${st.cls} mt-1`}>{st.label}</span>
                  {rx && rx.status === 'rejected' && (
                    <div className="text-[12px] text-redflag-fg mt-1">{rx.reject_reason}</div>
                  )}
                  {rx && rx.items?.length > 0 && (
                    <div className="text-[12.5px] text-slate-500 mt-1">
                      {rx.items.map((it: any) => it.name).join(', ')}
                    </div>
                  )}
                </li>
              )
            })}
            {history.consultations.length === 0 && <li className="ml-4 text-[13.5px] text-slate-400">Chưa có lịch sử điều trị.</li>}
          </ol>
        )}
      </section>

      <Modal open={open} onClose={() => setOpen(false)} title="Thêm lịch nhắc uống thuốc">
        <div className="space-y-3.5">
          <div>
            <label className="label" htmlFor="rm-med">Tên thuốc *</label>
            <input id="rm-med" className="input" value={form.medicine_name} onChange={(e) => setForm({ ...form, medicine_name: e.target.value })} placeholder="VD: Omeprazol 20mg" />
          </div>
          <div>
            <span className="label">Buổi uống *</span>
            <div className="flex gap-2">
              {TIME_SLOTS.map((s) => {
                const on = form.times.includes(s)
                const Icon = SLOT_ICON[s]
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setForm({ ...form, times: on ? form.times.filter((t) => t !== s) : [...form.times, s] })}
                    className={`btn flex-1 !px-2 ${on ? 'bg-pink text-white' : 'bg-white border-2 border-slate-200 text-slate-500'}`}
                  >
                    <Icon size={16} /> {s}
                  </button>
                )
              })}
            </div>
          </div>
          <div>
            <label className="label" htmlFor="rm-note">Ghi chú (liều dùng)</label>
            <input id="rm-note" className="input" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="VD: 1 viên trước ăn 30 phút" />
          </div>
          <button onClick={addReminder} disabled={busy} className="btn-pink w-full">{busy ? 'Đang lưu…' : 'Tạo lịch nhắc'}</button>
        </div>
      </Modal>
    </div>
  )
}
