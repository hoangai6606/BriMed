import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, Send, Stethoscope, Video, ShieldAlert, Clock } from 'lucide-react'
import { SeoMeta } from '../../components/common/SeoMeta'
import { api, ApiError } from '../../api/client'
import { DISEASE_GROUPS } from '../../data/constants'
import { useUi } from '../../store/ui'
import { Modal } from '../../components/common/Misc'

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
    api('/auth/doctors').then((d) => setDoctors(d.doctors || [])).catch(() => setDoctors([]))
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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (blocked) {
      setRedFlags(clientRedFlags)
      setRedOpen(true)
      return
    }
    setBusy(true)
    try {
      await api('/patient/consultations', {
        method: 'POST',
        body: JSON.stringify({
          ...f,
          disease_group: f.disease_group,
          duration_days: Number(f.duration_days) || 1,
          fever_days: f.fever ? Number(f.fever_days) || 0 : 0,
        }),
      })
      toast('Đã gửi yêu cầu! Bác sĩ sẽ gọi ngắn trong 3–5 phút. Vui lòng giữ máy.', 'success')
      navigate('/patient/prescriptions')
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

  return (
    <div className="space-y-4 max-w-2xl">
      <SeoMeta title="Toa thuốc nhanh tại quầy – BriMed" />

      {/* Bác sĩ trực tuyến */}
      <section className="card p-4">
        <h2 className="section-title flex items-center gap-2">
          <Stethoscope size={18} className="text-primary" /> Bác sĩ đang trực tuyến ({online.length})
        </h2>
        <div className="mt-3 grid sm:grid-cols-2 gap-2.5">
          {online.map((d) => (
            <div key={d.id} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5">
              <span className="w-10 h-10 rounded-full bg-mint-bg text-mint-fg font-bold flex items-center justify-center text-[13px]">
                {d.full_name.replace('BS. ', '').split(' ').map((w: string) => w[0]).slice(0, 2).join('')}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px] font-bold text-slate-700 truncate">{d.full_name}</div>
                <div className="text-[12px] text-slate-500">{d.doctor_specialty}</div>
              </div>
              <span className="badge bg-mint-bg text-mint-fg shrink-0">● Sẵn sàng</span>
            </div>
          ))}
          {online.length === 0 && <p className="text-[13.5px] text-slate-400">Đang đồng bộ danh sách bác sĩ…</p>}
        </div>
        <p className="mt-3 text-[12.5px] text-slate-400 flex items-center gap-1.5">
          <Clock size={13} /> Mục tiêu phản hồi &lt; 3–5 phút · Bác sĩ luôn gọi ngắn 1–2 phút trước khi kê đơn
        </p>
      </section>

      {/* Form 1 */}
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
          {busy ? 'Đang gửi…' : <><Send size={18} /> Gửi cho bác sĩ – nhận đơn trong vài phút</>}
        </button>
      </form>

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

      <div className="card p-4 bg-lightblue/25 flex gap-3">
        <Video size={20} className="text-primary shrink-0 mt-0.5" />
        <p className="text-[13px] text-slate-600 leading-relaxed">
          Sau khi gửi, bác sĩ sẽ <strong>xem form và gọi ngắn 1–2 phút</strong> xác nhận triệu chứng trực tiếp với bạn tại quầy,
          sau đó ký số đơn điện tử liên thông Hệ thống đơn thuốc quốc gia (TT 26/2025).
        </p>
      </div>
    </div>
  )
}
