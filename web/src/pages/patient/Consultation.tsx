import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, BadgeCheck, CalendarClock, ChevronLeft, ChevronRight, Clock, Send, ShieldAlert, Stethoscope, Video, XCircle } from 'lucide-react'
import { SeoMeta } from '../../components/common/SeoMeta'
import { api, ApiError } from '../../api/client'
import { DISEASE_GROUPS } from '../../data/constants'
import { useUi } from '../../store/ui'
import { Modal } from '../../components/common/Misc'
import { VietQRPay } from '../../components/domain/VietQRPay'

interface Form1 {
  full_name: string
  phone: string
  cccd: string
  disease_group: string
  symptom: string
  duration_days: number
  fever: boolean
  fever_days: number
  shortness_of_breath: boolean
  is_child: boolean
  pregnancy: boolean
  drug_allergies: string
  current_medicines: string
  consent1: boolean
  consent2: boolean
}

export default function Consultation() {
  const toast = useUi((s) => s.toast)
  const navigate = useNavigate()
  const [doctors, setDoctors] = useState<any[]>([])
  const [f, setF] = useState<Form1>({
    full_name: '', phone: '', cccd: '', disease_group: '', symptom: '', duration_days: 1,
    fever: false, fever_days: 0, shortness_of_breath: false, is_child: false, pregnancy: false,
    drug_allergies: '', current_medicines: '', consent1: false, consent2: false,
  })
  const [redOpen, setRedOpen] = useState(false)
  const [redFlags, setRedFlags] = useState<string[]>([])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api('/auth/doctors').then((d) => { setDoctors(d.doctors || []); setAvgWait(d.avg_wait_minutes ?? null) }).catch(() => setDoctors([]))
  }, [])

  const set = (k: keyof Form1, v: any) => setF((s) => ({ ...s, [k]: v }))

  // Sàng lọc cờ đỏ phía client (server cũng kiểm tra lại)
  const clientRedFlags = useMemo(() => {
    const flags: string[] = []
    if (f.is_child) flags.push('Trẻ nhỏ – không nhận qua kênh từ xa, cần khám trực tiếp')
    if (f.pregnancy) flags.push('Thai phụ – không nhận qua kênh từ xa, cần khám trực tiếp')
    if (f.shortness_of_breath) flags.push('Khó thở / thở khò khè – dấu hiệu nặng, cần khám trực tiếp')
    if (f.fever && f.fever_days > 3) flags.push(`Sốt ${f.fever_days} ngày (trên 3 ngày) – cần khám trực tiếp`)
    if (f.disease_group === 'Khác (ngoài danh mục)') flags.push('Triệu chứng ngoài danh mục bệnh được phép khám từ xa (TT 30/2023)')
    return flags
  }, [f])

  const blocked = clientRedFlags.length > 0
  const [paying, setPaying] = useState<{ consultation: any; payment: any; slot?: any; estimated?: string | null; doctor?: any } | null>(null)
  const [avgWait, setAvgWait] = useState<number | null>(null)
  const [step, setStep] = useState<1 | 2>(1)
  const [selected, setSelected] = useState<any | null>(null)
  const [profileDoc, setProfileDoc] = useState<any | null>(null)
  const [slots, setSlots] = useState<any[]>([])
  const [slotId, setSlotId] = useState<number | ''>('')
  const [slotBusy, setSlotBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (blocked) {
      setRedFlags(clientRedFlags)
      setRedOpen(true)
      return
    }
    setBusy(true)
    try {
      const d = await api('/patient/consultations', {
        method: 'POST',
        body: JSON.stringify({
          ...f,
          disease_group: f.disease_group,
          duration_days: Number(f.duration_days) || 1,
          fever_days: f.fever ? Number(f.fever_days) || 0 : 0,
          preferred_doctor_id: selected?.id,
          slot_id: slotId || undefined,
        }),
      })
      toast('Đã gửi yêu cầu! Thanh toán phí khám để bác sĩ tiếp nhận.', 'success')
      setPaying({ consultation: d.consultation, payment: d.payment, slot: d.slot, estimated: d.estimated_turn_at, doctor: d.preferred_doctor })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err: any) {
      if (err instanceof ApiError && err.data?.red_flags) {
        setRedFlags(err.data.red_flags)
        setRedOpen(true)
      } else {
        toast(err.message, 'error')
      }
    } finally {
      setBusy(false)
    }
  }

  const online = doctors.filter((d) => d.doctor_online)
  const offline = doctors.filter((d) => !d.doctor_online)
  const noChoice = doctors.length === 0 || (online.length === 0 && doctors.every((d: any) => !d.next_slot_at))

  const openProfile = async (d: any) => {
    setProfileDoc(d)
    setSlotId('')
    setSlotBusy(true)
    try {
      const r = await api('/doctor/slots/public', { method: 'POST', body: JSON.stringify({ doctor_id: d.id }) })
      setSlots((r.slots || []).filter((x: any) => x.booked < x.capacity))
    } catch { setSlots([]) } finally { setSlotBusy(false) }
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <SeoMeta title="Toa thuốc nhanh tại quầy – BriMed" />

      {/* Màn thanh toán VietQR sau khi gửi khai triệu chứng */}
      {paying ? (
        <div className="space-y-3">
        {paying.slot && (
          <div className="card p-3.5 flex items-center gap-2.5 border-2 border-pink/30 bg-lightpink/10">
            <CalendarClock size={18} className="text-pink shrink-0" />
            <div className="text-[13px] text-slate-700">
              Lịch hẹn với <strong>{paying.doctor?.full_name}</strong>:{' '}
              <strong className="text-bluedark">{new Date(paying.slot.starts_at).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}</strong>
              {paying.estimated && <> · dự kiến tới lượt ~<strong className="text-bluedark">{new Date(paying.estimated).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</strong></>}
            </div>
          </div>
        )}
        <VietQRPay
          consultation={paying.consultation}
          payment={paying.payment}
          onPaid={() => navigate('/patient/prescriptions')}
          onLater={() => navigate('/patient/dashboard')}
        />
        </div>
      ) : (
      <>
      {/* BƯỚC 1 — Chọn bác sĩ */}
      {step === 1 && (
      <section className="card p-4">
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <h2 className="section-title flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary text-white text-[12px] font-extrabold flex items-center justify-center">1</span>
            Chọn bác sĩ
          </h2>
          {avgWait != null && <span className="text-[11.5px] font-semibold text-slate-400">Phản hồi TB: {avgWait} phút</span>}
        </div>

        {doctors.length === 0 ? (
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-[13.5px] text-amber-800">
            <strong>Chưa có bác sĩ nào trên hệ thống.</strong> Vui lòng quay lại sau ít phút hoặc liên hệ hotline 1900 2026.
          </div>
        ) : (
          <>
          {online.length > 0 && (
            <>
            <div className="text-[12px] font-bold uppercase tracking-wide text-primary mb-1.5 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-primary inline-block" /> Đang trực tuyến — tư vấn ngay ({online.length})
            </div>
            <div className="grid sm:grid-cols-2 gap-2.5">
              {online.map((d) => (
                <button key={d.id} onClick={() => openProfile(d)} className="text-left flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 hover:border-primary/50 hover:shadow-card transition">
                  {d.avatar_url
                    ? <img src={d.avatar_url} alt={d.full_name} className="w-11 h-11 rounded-full object-cover shrink-0" />
                    : <span className="w-11 h-11 rounded-full bg-lightblue text-bluedark font-bold flex items-center justify-center text-[13px] shrink-0">{d.full_name.replace('BS. ', '').split(' ').map((w: string) => w[0]).slice(0, 2).join('')}</span>}
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px] font-bold text-slate-700 truncate">{d.full_name}</div>
                    <div className="text-[12px] text-slate-500 truncate">{d.doctor_specialty}</div>
                    <div className="mt-0.5 inline-flex items-center gap-1 text-[10.5px] font-bold text-primary">
                      <BadgeCheck size={11} /> Chứng chỉ đã xác minh · Sẵn sàng
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-slate-300 shrink-0" />
                </button>
              ))}
            </div>
            </>
          )}

          {doctors.some((d) => !d.doctor_online && d.next_slot_at) && (
            <>
            <div className="text-[12px] font-bold uppercase tracking-wide text-slate-400 mt-3 mb-1.5 flex items-center gap-1.5">
              <CalendarClock size={13} /> Có lịch đặt trước — đặt hẹn theo khung giờ
            </div>
            <div className="grid sm:grid-cols-2 gap-2.5">
              {doctors.filter((d) => !d.doctor_online && d.next_slot_at).map((d) => (
                <button key={d.id} onClick={() => openProfile(d)} className="text-left flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2.5 hover:border-primary/40 transition">
                  {d.avatar_url
                    ? <img src={d.avatar_url} alt={d.full_name} className="w-11 h-11 rounded-full object-cover shrink-0 opacity-90" />
                    : <span className="w-11 h-11 rounded-full bg-slate-200 text-slate-500 font-bold flex items-center justify-center text-[13px] shrink-0">{d.full_name.replace('BS. ', '').split(' ').map((w: string) => w[0]).slice(0, 2).join('')}</span>}
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px] font-bold text-slate-700 truncate">{d.full_name}</div>
                    <div className="text-[12px] text-slate-500 truncate">{d.doctor_specialty}</div>
                    <div className="mt-0.5 text-[10.5px] font-bold text-slate-500 flex items-center gap-1">
                      <Clock size={11} /> Lịch trống sớm nhất: {new Date(d.next_slot_at).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-slate-300 shrink-0" />
                </button>
              ))}
            </div>
            </>
          )}

          {noChoice && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-[13.5px] text-amber-800">
              <strong>Hiện không có bác sĩ trực tuyến và chưa có khung giờ đặt trước nào.</strong>
              {avgWait != null && <> Thời gian phản hồi trung bình gần đây: <strong>{avgWait} phút</strong>.</>}
              {' '}Bạn vui lòng quay lại sau ít phút — danh sách được cập nhật liên tục.
            </div>
          )}

          <p className="mt-3 text-[12.5px] text-slate-400 flex items-center gap-1.5">
            <Clock size={13} /> Bác sĩ luôn gọi ngắn/video 1–2 phút trước khi kê đơn · thầy thuốc có quyền từ chối và chuyển khám
          </p>
          </>
        )}
      </section>
      )}

      {/* BƯỚC 2 — Form khai triệu chứng */}
      {step === 2 && selected && (
      <section className="card p-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2 className="section-title flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary text-white text-[12px] font-extrabold flex items-center justify-center">2</span>
            Khai triệu chứng
          </h2>
          <button onClick={() => setStep(1)} className="text-[12.5px] font-bold text-primary flex items-center gap-0.5">
            <ChevronLeft size={14} /> Đổi bác sĩ
          </button>
        </div>
        <div className="flex items-center gap-2.5 rounded-xl bg-lightblue/40 px-3.5 py-2.5">
          {selected.avatar_url
            ? <img src={selected.avatar_url} alt={selected.full_name} className="w-9 h-9 rounded-full object-cover" />
            : <span className="w-9 h-9 rounded-full bg-lightblue text-bluedark font-bold flex items-center justify-center text-[12px]">{selected.full_name.replace('BS. ', '').split(' ').map((w: string) => w[0]).slice(0, 2).join('')}</span>}
          <div className="min-w-0 flex-1 text-[13px]">
            <div className="font-bold text-bluedark truncate">{selected.full_name} · {selected.doctor_specialty}</div>
            {slotId
              ? <div className="text-[11.5px] text-slate-500 flex items-center gap-1"><CalendarClock size={11} /> Lịch hẹn: {new Date((slots.find((x: any) => x.id === Number(slotId)) || {}).starts_at || '').toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}</div>
              : <div className="text-[11.5px] font-semibold text-primary flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" /> {selected.doctor_online ? 'Đang trực tuyến — vào hàng đợi ngay sau khi thanh toán' : 'Bác sĩ sẽ xử lý khi trực tuyến'}</div>}
          </div>
        </div>
      </section>
      )}

      {/* Form 1 — chỉ hiện sau khi chọn bác sĩ */}
      {step === 2 && selected && (
      <form onSubmit={submit} className="card p-4 space-y-4">
        <div>
          <h2 className="section-title">Form toa thuốc nhanh (TT 30/2023)</h2>
          <p className="text-[13px] text-slate-500 mt-1">Khách quét QR tại quầy · Dược sĩ có thể hỗ trợ thao tác hộ</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-3.5">
          <div>
            <label className="label" htmlFor="c-name">Họ tên *</label>
            <input id="c-name" className="input" required value={f.full_name} onChange={(e) => set('full_name', e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="c-phone">Số điện thoại / Zalo *</label>
            <input id="c-phone" className="input" required inputMode="tel" value={f.phone} onChange={(e) => set('phone', e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="c-cccd">CCCD / Số định danh (cho phép nhập tay nếu tra không được) *</label>
            <input id="c-cccd" className="input" required inputMode="numeric" value={f.cccd} onChange={(e) => set('cccd', e.target.value)} />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="c-disease">Triệu chứng chính (danh mục TT 30/2023) *</label>
          <select
            id="c-disease"
            className="input"
            required
            value={f.disease_group}
            onChange={(e) => set('disease_group', e.target.value)}
          >
            <option value="">— Chọn nhóm bệnh —</option>
            {DISEASE_GROUPS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
            <option value="Khác (ngoài danh mục)">Khác (ngoài danh mục) – sẽ được chuyển khám trực tiếp</option>
          </select>
        </div>

        <div>
          <label className="label" htmlFor="c-symptom">Mô tả triệu chứng & thời gian bị bệnh *</label>
          <textarea id="c-symptom" rows={3} className="input" required value={f.symptom} onChange={(e) => set('symptom', e.target.value)} placeholder="VD: đau rát họng, sổ mũi 2 ngày…" />
          <div className="mt-2 flex items-center gap-2">
            <label className="text-[13px] font-semibold text-slate-600 shrink-0" htmlFor="c-duration">Số ngày bị bệnh:</label>
            <input id="c-duration" type="number" min={1} className="input !w-24 !min-h-[38px]" value={f.duration_days} onChange={(e) => set('duration_days', Number(e.target.value))} />
          </div>
        </div>

        {/* Sàng lọc */}
        <div className="rounded-xl border border-slate-200 p-3.5 space-y-3 bg-slate-50/60">
          <div className="text-[13.5px] font-bold text-bluedark">Sàng lọc an toàn (bắt buộc)</div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-[13.5px] font-medium">
              <input type="checkbox" className="w-[18px] h-[18px] accent-[#0d71e2]" checked={f.fever} onChange={(e) => set('fever', e.target.checked)} /> Có sốt
            </label>
            {f.fever && (
              <span className="flex items-center gap-1.5">
                <input type="number" min={0} className="input !w-20 !min-h-[38px]" value={f.fever_days} onChange={(e) => set('fever_days', Number(e.target.value))} aria-label="Số ngày sốt" />
                <span className="text-[13px] text-slate-600">ngày</span>
              </span>
            )}
          </div>
          <label className="flex items-center gap-2 text-[13.5px] font-medium">
            <input type="checkbox" className="w-[18px] h-[18px] accent-[#0d71e2]" checked={f.shortness_of_breath} onChange={(e) => set('shortness_of_breath', e.target.checked)} />
            Khó thở / thở khò khè
          </label>
          <label className="flex items-center gap-2 text-[13.5px] font-medium">
            <input type="checkbox" className="w-[18px] h-[18px] accent-[#0d71e2]" checked={f.is_child} onChange={(e) => set('is_child', e.target.checked)} />
            Đăng ký cho trẻ nhỏ (dưới 6 tuổi)
          </label>
          <div>
            <span className="label !mb-1">Thai kỳ *</span>
            <div className="flex gap-2">
              {[['Không', false], ['Có', true]].map(([label, val]) => (
                <button
                  type="button"
                  key={String(label)}
                  onClick={() => set('pregnancy', val)}
                  className={`btn !min-h-[38px] !px-5 ${f.pregnancy === val ? 'bg-primary text-white' : 'bg-white border-2 border-slate-200 text-slate-500'}`}
                >
                  {label as string}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3.5">
          <div>
            <label className="label" htmlFor="c-allergy">Tiền sử dị ứng thuốc *</label>
            <input id="c-allergy" className="input" required value={f.drug_allergies} onChange={(e) => set('drug_allergies', e.target.value)} placeholder="VD: Penicillin / Không" />
          </div>
          <div>
            <label className="label" htmlFor="c-meds">Thuốc đang dùng *</label>
            <input id="c-meds" className="input" required value={f.current_medicines} onChange={(e) => set('current_medicines', e.target.value)} placeholder="VD: Amlodipin 5mg / Không" />
          </div>
        </div>

        {/* Đồng ý */}
        <div className="space-y-2.5">
          <label className="flex items-start gap-2.5 text-[13.5px] text-slate-600">
            <input type="checkbox" required className="mt-1 w-[18px] h-[18px] accent-[#0d71e2]" checked={f.consent1} onChange={(e) => set('consent1', e.target.checked)} />
            Tôi đồng ý chia sẻ thông tin sức khỏe để bác sĩ đánh giá.
          </label>
          <label className="flex items-start gap-2.5 text-[13.5px] text-slate-600">
            <input type="checkbox" required className="mt-1 w-[18px] h-[18px] accent-[#0d71e2]" checked={f.consent2} onChange={(e) => set('consent2', e.target.checked)} />
            Tôi hiểu dịch vụ này không dành cho cấp cứu và bác sĩ có quyền từ chối kê đơn.
          </label>
        </div>

        {blocked && (
          <div className="rounded-xl bg-redflag-bg border border-redflag-fg/30 p-3.5 flex gap-2.5" role="alert">
            <ShieldAlert size={20} className="text-redflag-fg shrink-0 mt-0.5" />
            <div>
              <div className="text-[13.5px] font-bold text-redflag-fg">Có dấu hiệu cảnh báo y khoa – không thể tạo yêu cầu kê đơn từ xa</div>
              <ul className="mt-1 text-[12.5px] text-redflag-fg/90 list-disc pl-4 space-y-0.5">
                {clientRedFlags.map((r) => <li key={r}>{r}</li>)}
              </ul>
            </div>
          </div>
        )}

        <button type="submit" disabled={busy || blocked} className="btn-pink w-full !min-h-[52px] !text-[16px]">
          {busy ? 'Đang gửi…' : <><Send size={18} /> Gửi cho {selected.full_name.replace('BS. ', 'BS. ')} — thanh toán &amp; vào hàng đợi</>}
        </button>
      </form>
      )}

      {/* Modal cờ đỏ */}
      <Modal open={redOpen} onClose={() => setRedOpen(false)} title="Cảnh báo y khoa – Cần khám trực tiếp">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-redflag-bg flex items-center justify-center mb-3">
            <AlertTriangle size={32} className="text-redflag-fg" />
          </div>
          <p className="text-[14.5px] font-bold text-redflag-fg">Yêu cầu của bạn có dấu hiệu nặng</p>
          <ul className="mt-2 text-[13.5px] text-slate-600 list-disc pl-5 text-left space-y-1">
            {redFlags.map((r) => <li key={r}>{r}</li>)}
          </ul>
          <p className="mt-3 text-[13.5px] text-slate-600 leading-relaxed">
            Vui lòng đến khám trực tiếp tại cơ sở y tế gần nhất.
            <br />
            <strong className="text-redflag-fg">Trường hợp khẩn cấp, hãy gọi 115.</strong>
          </p>
          <button onClick={() => setRedOpen(false)} className="btn-danger w-full mt-4">Tôi đã hiểu</button>
        </div>
      </Modal>

      {/* Modal hồ sơ bác sĩ + đặt lịch */}
      <Modal open={!!profileDoc} onClose={() => setProfileDoc(null)} title="Hồ sơ bác sĩ">
        {profileDoc && (
          <div className="space-y-3.5">
            <div className="flex items-center gap-3">
              {profileDoc.avatar_url
                ? <img src={profileDoc.avatar_url} alt={profileDoc.full_name} className="w-16 h-16 rounded-2xl object-cover" />
                : <span className="w-16 h-16 rounded-2xl bg-lightblue text-bluedark font-bold flex items-center justify-center text-[18px]">{profileDoc.full_name.replace('BS. ', '').split(' ').map((w: string) => w[0]).slice(0, 2).join('')}</span>}
              <div className="min-w-0 flex-1">
                <div className="text-[16px] font-extrabold text-bluedark">{profileDoc.full_name}</div>
                <div className="text-[13px] text-slate-500">{profileDoc.doctor_specialty}</div>
                {profileDoc.doctor_online
                  ? <span className="badge bg-lightblue text-bluedark mt-1">● Đang trực tuyến</span>
                  : <span className="badge bg-slate-100 text-slate-500 mt-1">Ngoại tuyến</span>}
              </div>
            </div>
            <div className="rounded-xl bg-slate-50 px-3.5 py-3 text-[13px] space-y-1.5">
              <div className="flex justify-between gap-2"><span className="text-slate-500">Chứng chỉ hành nghề</span><span className="font-bold text-bluedark flex items-center gap-1"><BadgeCheck size={13} className="text-primary" /> {profileDoc.doctor_license} · đã xác minh</span></div>
              <div className="flex justify-between gap-2"><span className="text-slate-500">Kê đơn theo</span><span className="font-semibold text-slate-700">TT 30/2023 · TT 26/2025</span></div>
              {avgWait != null && <div className="flex justify-between gap-2"><span className="text-slate-500">Phản hồi trung bình</span><span className="font-semibold text-slate-700">~{avgWait} phút</span></div>}
            </div>

            {profileDoc.doctor_online ? (
              <button
                onClick={() => { setSelected(profileDoc); setSlotId(''); setProfileDoc(null); setStep(2); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                className="btn-pink w-full !min-h-[50px]"
              >
                <Stethoscope size={18} /> Bắt đầu tư vấn ngay
              </button>
            ) : (
              <div className="space-y-2">
                <div className="text-[13px] font-bold text-slate-700 flex items-center gap-1.5"><CalendarClock size={15} className="text-primary" /> Chọn khung giờ bác sĩ mở lịch:</div>
                {slotBusy ? (
                  <p className="text-[13px] text-slate-400 text-center py-2">Đang tải lịch trống…</p>
                ) : slots.length === 0 ? (
                  <p className="text-[13px] text-slate-500 rounded-xl bg-slate-50 p-3">Bác sĩ chưa mở lịch hẹn. Vui lòng quay lại sau — hoặc chọn bác sĩ đang trực tuyến.</p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {slots.map((x: any) => {
                      const full = x.booked >= x.capacity
                      return (
                        <label key={x.id} className={`flex items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 cursor-pointer transition ${slotId === x.id ? 'border-primary bg-lightblue/30' : full ? 'border-slate-100 opacity-50' : 'border-slate-200 hover:border-primary/40'}`}>
                          <span className="flex items-center gap-2">
                            <input type="radio" name="slot" className="accent-[#0d71e2]" disabled={full} checked={slotId === x.id} onChange={() => setSlotId(x.id)} />
                            <span className="text-[13.5px] font-bold text-slate-700">
                              {new Date(x.starts_at).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                              <span className="font-normal text-slate-400"> · {x.duration_min} phút</span>
                            </span>
                          </span>
                          <span className={`badge ${full ? 'bg-slate-100 text-slate-400' : 'bg-lightblue text-bluedark'} shrink-0`}>{full ? 'Đã đầy' : `Còn ${x.capacity - x.booked} chỗ`}</span>
                        </label>
                      )
                    })}
                  </div>
                )}
                <button
                  onClick={() => { setSelected(profileDoc); setProfileDoc(null); setStep(2); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                  disabled={!slotId}
                  className="btn-pink w-full !min-h-[50px] disabled:opacity-50"
                >
                  <CalendarClock size={18} /> {slotId ? 'Tiếp tục với lịch hẹn đã chọn' : 'Chọn khung giờ để tiếp tục'}
                </button>
              </div>
            )}
            <button onClick={() => setProfileDoc(null)} className="text-[12.5px] font-semibold text-slate-400 hover:text-slate-600 w-full">Đóng</button>
          </div>
        )}
      </Modal>

      <div className="card p-4 bg-lightblue/25 flex gap-3">
        <Video size={20} className="text-primary shrink-0 mt-0.5" />
        <p className="text-[13px] text-slate-600 leading-relaxed">
          Sau khi gửi, bác sĩ sẽ <strong>xem form và gọi ngắn 1–2 phút</strong> xác nhận triệu chứng trực tiếp với bạn tại quầy,
          sau đó ký số đơn điện tử kèm mã tra cứu quốc gia (TT 26/2025).
          Phí khám <strong>25.000đ/lượt</strong> thanh toán qua VietQR ngay sau khi gửi.
        </p>
      </div>
      </>
      )}
    </div>
  )
}
