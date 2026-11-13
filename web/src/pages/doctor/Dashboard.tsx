import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlarmClock, CalendarClock, ClipboardList, Plus, Trash2, UserRound, PhoneCall, CheckCircle2, XCircle, Lock } from 'lucide-react'
import { SeoMeta } from '../../components/common/SeoMeta'
import { api, timeAgo } from '../../api/client'
import { PageLoading } from '../../components/common/Misc'
import { useUi } from '../../store/ui'
import { CONSULT_STATUS } from '../../data/constants'

function SlaChip({ createdAt }: { createdAt: string }) {
  const [, tick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => tick((x) => x + 1), 1000)
    return () => clearInterval(t)
  }, [])
  const mins = (Date.now() - new Date(createdAt).getTime()) / 60000
  const danger = mins >= 5
  const warn = mins >= 3
  const mm = Math.floor(mins)
  const ss = Math.floor((mins - mm) * 60)
  return (
    <span className={`badge ${danger ? 'bg-redflag-bg text-redflag-fg' : warn ? 'bg-amber-100 text-amber-700' : 'bg-mint-bg text-mint-fg'} font-mono`}>
      <AlarmClock size={13} /> {String(mm).padStart(2, '0')}:{String(ss).padStart(2, '0')} / SLA 05:00
    </span>
  )
}

export default function DoctorDashboard() {
  const [data, setData] = useState<any>(null)
  const [patients, setPatients] = useState<any[]>([])
  const [slots, setSlots] = useState<any[]>([])
  const [earnings, setEarnings] = useState<any>(null)
  const [slotForm, setSlotForm] = useState({ starts_at: '', duration_min: 30, capacity: 1 })
  const [slotBusy, setSlotBusy] = useState(false)
  const toast = useUi((s) => s.toast)

  const loadSlots = useCallback(() => {
    api('/doctor/slots').then((d) => setSlots(d.slots)).catch(() => setSlots([]))
  }, [])

  const createSlot = async () => {
    if (!slotForm.starts_at) { toast('Vui lòng chọn thời gian bắt đầu.', 'error'); return }
    setSlotBusy(true)
    try {
      await api('/doctor/slots', { method: 'POST', body: JSON.stringify(slotForm) })
      toast('Đã mở khung giờ nhận lượt hẹn.', 'success')
      setSlotForm({ starts_at: '', duration_min: 30, capacity: 1 })
      loadSlots()
    } catch (e: any) { toast(e.message, 'error') } finally { setSlotBusy(false) }
  }

  const removeSlot = async (id: number) => {
    try {
      const d = await api(`/doctor/slots/${id}`, { method: 'DELETE' })
      if (d.need_confirm) {
        if (!window.confirm(d.error)) return
        const d2 = await api(`/doctor/slots/${id}`, { method: 'DELETE', body: JSON.stringify({ confirm: true }) })
        toast(d2.message || 'Đã huỷ khung giờ.', 'success')
      } else {
        toast(d.message || 'Đã xoá khung giờ.', 'success')
      }
      loadSlots()
    } catch (e: any) { toast(e.message, 'error') }
  }

  const load = useCallback(() => {
    api('/doctor/queue').then(setData).catch(() => setData({ queue: [], upcoming: [], mine: [] }))
    api('/doctor/patients').then((d) => setPatients(d.patients)).catch(() => setPatients([]))
    loadSlots()
    api('/doctor/earnings').then(setEarnings).catch(() => {})
  }, [])

  useEffect(() => {
    load()
    const t = setInterval(load, 15000)
    return () => clearInterval(t)
  }, [load])

  if (!data) return <PageLoading />

  return (
    <div className="space-y-4 max-w-3xl">
      <SeoMeta title="Hàng đợi tư vấn – Bác sĩ BriMed" />
      <div className="flex items-center justify-between">
        <h1 className="text-[20px] font-extrabold text-bluedark">Hàng đợi yêu cầu tư vấn</h1>
        <span className="badge bg-lightpink text-pink-dark">Mục tiêu phản hồi &lt; 3–5 phút</span>
      </div>

      {/* Lịch trực — khung giờ nhận lượt hẹn */}
      <section className="card p-4">
        <h2 className="section-title flex items-center gap-2 mb-1">
          <CalendarClock size={18} className="text-pink" /> Lịch trực — mở khung giờ nhận lượt hẹn
        </h2>
        <p className="text-[12px] text-slate-400 mb-3">Bệnh nhân có thể đặt trước các khung giờ này; lượt hẹn luôn được xử lý trước lượt walk-in.</p>
        <div className="grid grid-cols-2 gap-2 items-end sm:grid-cols-[1fr_auto_auto_auto]">
          <div className="col-span-2 sm:col-span-1">
            <label className="label" htmlFor="slot-start">Thời gian bắt đầu</label>
            <input id="slot-start" type="datetime-local" className="input" value={slotForm.starts_at} onChange={(e) => setSlotForm({ ...slotForm, starts_at: e.target.value })} />
          </div>
          <div>
            <label className="label" htmlFor="slot-dur">Phút</label>
            <input id="slot-dur" type="number" min={15} max={120} step={15} className="input !w-20 !min-h-[42px]" value={slotForm.duration_min} onChange={(e) => setSlotForm({ ...slotForm, duration_min: Number(e.target.value) })} />
          </div>
          <div>
            <label className="label" htmlFor="slot-cap">Chỗ</label>
            <input id="slot-cap" type="number" min={1} max={10} className="input !w-16 !min-h-[42px]" value={slotForm.capacity} onChange={(e) => setSlotForm({ ...slotForm, capacity: Number(e.target.value) })} />
          </div>
          <button onClick={createSlot} disabled={slotBusy} className="btn-pink !min-h-[42px] !px-3 flex items-center gap-1.5">
            <Plus size={16} /> Mở lịch
          </button>
        </div>
        {slots.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {slots.map((x: any) => (
              <li key={x.id} className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3.5 py-2.5">
                <div className="text-[13.5px]">
                  <span className="font-bold text-slate-700">{new Date(x.starts_at).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}</span>
                  <span className="text-slate-400"> · {x.duration_min} phút · còn {x.capacity - x.booked}/{x.capacity} chỗ</span>
                  {x.ack ? <span className="badge bg-mint-bg text-mint-fg ml-2">Đã xác nhận</span> : null}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!x.ack && (
                    <button onClick={() => api(`/doctor/slots/${x.id}/ack`, { method: 'POST' }).then(() => { toast('Đã xác nhận lịch hẹn.', 'success'); loadSlots() }).catch((e: any) => toast(e.message, 'error'))} className="btn-outline !min-h-[32px] !px-2.5 !text-[11.5px]">
                      Xác nhận
                    </button>
                  )}
                  <button onClick={() => removeSlot(x.id)} className="text-slate-400 hover:text-redflag-fg" aria-label="Xoá khung giờ">
                    <Trash2 size={15} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Thu nhập của tôi */}
      {earnings && (
        <section className="card p-4 flex items-center justify-between gap-3 bg-gradient-to-r from-primary to-bluedark text-white">
          <div>
            <div className="text-[12px] text-white/70">Thu nhập của tôi</div>
            <div className="text-[22px] font-extrabold">{new Intl.NumberFormat('vi-VN').format(earnings.month_vnd)}đ <span className="text-[12px] font-semibold text-white/70">tháng này · {earnings.month_count} lượt</span></div>
            <div className="text-[11.5px] text-white/60">Lũy kế: {new Intl.NumberFormat('vi-VN').format(earnings.total_vnd)}đ · {earnings.total_count} lượt đã xử lý</div>
          </div>
          <PhoneCall size={30} className="opacity-40 shrink-0" />
        </section>
      )}

      {/* Lượt hẹn sắp tới (chưa đến giờ) */}
      {data.upcoming?.length > 0 && (
        <section className="card p-4 border-2 border-pink/30 bg-lightpink/10">
          <h2 className="section-title !text-[15.5px] flex items-center gap-1.5">
            <CalendarClock size={16} className="text-pink" /> Lịch hẹn sắp tới ({data.upcoming.length})
          </h2>
          <ul className="mt-2 space-y-1.5">
            {data.upcoming.map((c: any) => (
              <li key={c.id} className="flex items-center justify-between gap-2 rounded-xl bg-white px-3.5 py-2.5">
                <div className="min-w-0 text-[13px]">
                  <span className="font-bold text-slate-700">{new Date(c.slot_starts_at).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}</span>
                  <span className="text-slate-500"> · {c.patient_name} · {c.disease_group}</span>
                  {c.slot_ack && <span className="badge bg-mint-bg text-mint-fg ml-2">Đã xác nhận</span>}
                </div>
                <Link to={`/doctor/consultation/${c.id}`} className="btn-outline !min-h-[32px] !px-2.5 !text-[11.5px] shrink-0">Xem trước</Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Queue */}
      <section className="card p-4">
        <h2 className="section-title flex items-center gap-2 mb-3">
          <ClipboardList size={18} className="text-primary" /> Yêu cầu mới ({data.queue.length})
        </h2>
        {data.queue.length === 0 ? (
          <p className="text-[13.5px] text-slate-400 text-center py-4">Không có yêu cầu nào đang chờ.</p>
        ) : (
          <ul className="space-y-2.5">
            {data.queue.map((c: any) => (
              <li key={c.id} className={`rounded-xl border p-3.5 ${c.red_flag ? 'border-redflag-fg/40 bg-redflag-bg/40' : 'border-slate-200'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-bold text-[14.5px] text-slate-700">
                      {c.patient_name} <span className="text-slate-400 font-normal">· {c.patient_gender || '—'} · {c.patient_dob || '—'}</span>
                    </div>
                    <div className="text-[13px] text-primary font-semibold mt-0.5">{c.disease_group}</div>
                    <div className="text-[12.5px] text-slate-500 mt-0.5 line-clamp-2">{c.symptom}</div>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {c.slot_starts_at && <span className="badge bg-lightblue text-bluedark font-bold">Lịch hẹn {new Date(c.slot_starts_at).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}</span>}
                      {c.for_me && !c.slot_starts_at && <span className="badge bg-lightpink text-pink-dark font-bold">Bệnh nhân chỉ định bạn</span>}
                      {c.fever ? <span className="badge bg-amber-100 text-amber-700">Sốt {c.fever_days} ngày</span> : null}
                      {c.duration_days ? <span className="badge bg-slate-100 text-slate-600">Bệnh {c.duration_days} ngày</span> : null}
                      {c.drug_allergies && c.drug_allergies !== 'Không' ? <span className="badge bg-lightpink text-pink-dark">Dị ứng: {c.drug_allergies}</span> : null}
                    </div>
                  </div>
                  <SlaChip createdAt={c.created_at} />
                </div>
                <Link to={`/doctor/consultation/${c.id}`} className="btn-primary w-full mt-3 !min-h-[42px]">
                  <PhoneCall size={16} /> Xem hồ sơ & gọi ngắn
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Đã xử lý */}
      <section className="card p-4">
        <h2 className="section-title mb-3">Phiên tôi đã xử lý</h2>
        {data.mine.length === 0 ? (
          <p className="text-[13.5px] text-slate-400 text-center py-3">Chưa có phiên nào.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.mine.map((c: any) => {
              const st = CONSULT_STATUS[c.status]
              return (
                <li key={c.id} className="py-2.5 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[13.5px] font-bold text-slate-700 truncate">
                      {c.patient_name} · {c.disease_group}
                    </div>
                    <div className="text-[12px] text-slate-400">{timeAgo(c.created_at)} {c.reject_reason ? `· ${c.reject_reason.slice(0, 50)}…` : ''}</div>
                  </div>
                  <span className={`badge ${st.cls} shrink-0`}>
                    {c.status === 'approved' ? <CheckCircle2 size={13} /> : <XCircle size={13} />} {st.label}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* Hồ sơ được cấp quyền */}
      <section className="card p-4">
        <h2 className="section-title flex items-center gap-2 mb-3">
          <UserRound size={18} className="text-mint-fg" /> Hồ sơ bệnh nhân được cấp quyền truy cập
        </h2>
        {patients.length === 0 ? (
          <p className="text-[13.5px] text-slate-400 text-center py-3">Chưa có bệnh nhân nào.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {patients.map((p: any) => (
              <li key={p.id} className="py-2.5 flex items-center justify-between gap-2">
                <div>
                  <div className="text-[13.5px] font-bold text-slate-700">{p.full_name}</div>
                  <div className="text-[12px] text-slate-400">{p.phone} · {p.consult_count} phiên tư vấn</div>
                </div>
                <Link to={`/doctor/patient-record?patient=${p.id}`} className="btn-ghost !min-h-[36px] !px-3 !text-[12.5px]">
                  {p.share_consent ? 'Xem hồ sơ' : <><Lock size={13} /> Bị khóa</>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
