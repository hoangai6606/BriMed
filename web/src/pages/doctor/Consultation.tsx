import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { PhoneCall, PhoneOff, Mic, MicOff, Video, ShieldAlert, Lock, FileText, Thermometer, Activity, AlertTriangle, XCircle } from 'lucide-react'
import { SeoMeta } from '../../components/common/SeoMeta'
import { api } from '../../api/client'
import { PageLoading, Modal } from '../../components/common/Misc'
import { useUi } from '../../store/ui'
import { VideoCallRoom } from '../../components/domain/VideoCallRoom'

export default function DoctorConsultation() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useUi((s) => s.toast)
  const [data, setData] = useState<any>(null)
  const [callState, setCallState] = useState<'idle' | 'ringing' | 'active' | 'ended'>('idle')
  const [videoOpen, setVideoOpen] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [muted, setMuted] = useState(false)
  const [callNote, setCallNote] = useState('')
  const [note, setNote] = useState('')
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [busy, setBusy] = useState(false)
  const timerRef = useRef<any>(null)

  const load = () => api(`/doctor/consultations/${id}`).then(setData).catch((e) => toast(e.message, 'error'))
  useEffect(() => {
    load()
    return () => clearInterval(timerRef.current)
  }, [id])

  if (!data) return <PageLoading />
  const c = data.consultation
  const decided = c.status === 'approved' || c.status === 'rejected'

  const startCall = async () => {
    setCallState('ringing')
    setTimeout(async () => {
      setCallState('active')
      setSeconds(0)
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000)
      await api(`/doctor/consultations/${id}/call-log`, { method: 'POST', body: JSON.stringify({ action: 'start' }) }).catch(() => {})
      load()
    }, 1200)
  }

  const endCall = async () => {
    clearInterval(timerRef.current)
    setCallState('ended')
    await api(`/doctor/consultations/${id}/call-log`, {
      method: 'POST',
      body: JSON.stringify({ action: 'end', duration_sec: seconds, call_note: callNote || `Gọi ngắn ${seconds}s, bệnh nhân xác nhận triệu chứng.` }),
    }).catch(() => {})
    toast('Đã kết thúc cuộc gọi ngắn và lưu ghi chú.', 'success')
    load()
  }

  // Kết thúc cuộc gọi video — ghi thời lượng thật vào call-log
  const endVideoCall = async (sec: number, note: string) => {
    await api(`/doctor/consultations/${id}/call-log`, {
      method: 'POST',
      body: JSON.stringify({ action: 'end', duration_sec: sec, call_note: callNote || note }),
    }).catch(() => {})
    setVideoOpen(false)
    setCallState('ended')
    load()
  }

  const reject = async () => {
    if (!rejectReason.trim()) {
      toast('Vui lòng ghi rõ lý do từ chối / chuyển khám.', 'error')
      return
    }
    setBusy(true)
    try {
      await api(`/doctor/consultations/${id}/decision`, {
        method: 'POST',
        body: JSON.stringify({ decision: 'reject', reason: rejectReason, note }),
      })
      toast('Đã từ chối kê đơn và chuyển khám trực tiếp.', 'success')
      navigate('/doctor/dashboard')
    } catch (e: any) {
      toast(e.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const mmss = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`

  return (
    <div className="space-y-4 max-w-2xl">
      <SeoMeta title={`Tư vấn bệnh nhân – ${c.patient_name} – BriMed`} />

      {/* Đầu trang */}
      <div className="card p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-[19px] font-extrabold text-bluedark">{c.patient_name}</h1>
            <div className="text-[13px] text-slate-500">{c.patient_phone} · {c.patient_gender || '—'} · {c.patient_dob || '—'}</div>
          </div>
          {c.red_flag ? (
            <span className="badge bg-redflag-bg text-redflag-fg"><ShieldAlert size={13} /> Có cờ đỏ</span>
          ) : (
            <span className="badge bg-mint-bg text-mint-fg">Đã qua sàng lọc</span>
          )}
        </div>
        {c.red_flag_reasons.length > 0 && (
          <div className="mt-2.5 rounded-xl bg-redflag-bg border border-redflag-fg/30 p-3 text-[13px] text-redflag-fg">
            <strong>Nhãn cảnh báo:</strong>
            <ul className="list-disc pl-4 mt-1 space-y-0.5">
              {c.red_flag_reasons.map((r: string) => <li key={r}>{r}</li>)}
            </ul>
          </div>
        )}
      </div>

      {/* Chỉ số & form triệu chứng */}
      <section className="card p-4">
        <h2 className="section-title mb-2.5">Form triệu chứng bệnh nhân gửi</h2>
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="rounded-xl bg-slate-50 p-2.5 text-center">
            <Thermometer size={16} className="mx-auto text-primary" />
            <div className="text-[15px] font-extrabold text-bluedark mt-0.5">{c.temperature ?? '—'}°C</div>
            <div className="text-[10.5px] text-slate-400">Nhiệt độ tại quầy</div>
          </div>
          <div className="rounded-xl bg-slate-50 p-2.5 text-center">
            <Activity size={16} className="mx-auto text-pink" />
            <div className="text-[15px] font-extrabold text-bluedark mt-0.5">{c.spo2 ?? '—'}%</div>
            <div className="text-[10.5px] text-slate-400">SpO₂ tại quầy</div>
          </div>
          <div className="rounded-xl bg-slate-50 p-2.5 text-center">
            <AlertTriangle size={16} className="mx-auto text-amber-500" />
            <div className="text-[15px] font-extrabold text-bluedark mt-0.5">{c.fever ? `${c.fever_days} ngày` : 'Không'}</div>
            <div className="text-[10.5px] text-slate-400">Sốt</div>
          </div>
        </div>
        <dl className="text-[13.5px] divide-y divide-slate-50">
          {[
            ['Nhóm bệnh (TT 30/2023)', c.disease_group],
            ['Triệu chứng chính', c.symptom],
            ['Thời gian bị bệnh', `${c.duration_days} ngày`],
            ['Tiền sử dị ứng thuốc', c.drug_allergies || '—'],
            ['Thuốc đang dùng', c.current_medicines || '—'],
            ['Thai kỳ', c.pregnancy ? 'Có' : 'Không'],
            ['Trẻ nhỏ', c.is_child ? 'Có' : 'Không'],
          ].map(([k, v]) => (
            <div key={k as string} className="py-2 grid grid-cols-[minmax(120px,38%)_1fr] gap-2">
              <dt className="text-slate-400 font-medium">{k}</dt>
              <dd className="text-slate-700 font-semibold">{v as string}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Hồ sơ bệnh nhân (RBAC) */}
      <section className="card p-4">
        <h2 className="section-title flex items-center gap-2 mb-2">
          <FileText size={18} className="text-primary" /> Hồ sơ sức khỏe
        </h2>
        {data.profile_locked || !data.health_profile ? (
          <div className="rounded-xl bg-slate-100 p-4 text-center text-[13.5px] text-slate-500 flex flex-col items-center gap-2">
            <Lock size={22} className="text-slate-400" />
            Bệnh nhân chưa đồng ý chia sẻ hồ sơ sức khỏe đầy đủ.
            <span className="text-[12px]">Chỉ dựa trên thông tin form triệu chứng để đánh giá.</span>
          </div>
        ) : (
          <dl className="text-[13.5px] grid sm:grid-cols-2 gap-x-4 gap-y-2">
            <Info k="Ngày sinh" v={data.health_profile.dob} />
            <Info k="Tiền sử bệnh" v={data.health_profile.medical_history} />
            <Info k="Dị ứng thuốc" v={data.health_profile.drug_allergies} highlight={!!data.health_profile.drug_allergies && data.health_profile.drug_allergies !== 'Không'} />
            <Info k="Thuốc đang dùng" v={data.health_profile.current_medicines} />
            <Info k="Huyết áp" v={data.health_profile.blood_pressure} />
          </dl>
        )}
      </section>

      {/* Call widget */}
      {!decided && (
        <section className="card p-4">
          <h2 className="section-title mb-3">Cuộc gọi xác nhận (video · tối đa 7 phút)</h2>
          {videoOpen && (
            <VideoCallRoom consultationId={id!} role="doctor" onEnded={endVideoCall} />
          )}
          {!videoOpen && callState === 'idle' && (
            <div className="space-y-2">
              <button
                onClick={async () => {
                  setVideoOpen(true)
                  await api(`/doctor/consultations/${id}/call-log`, { method: 'POST', body: JSON.stringify({ action: 'start' }) }).catch(() => {})
                }}
                className="btn-pink w-full !min-h-[52px] !text-[16px] pulse-ring"
              >
                <Video size={20} /> Gọi video bệnh nhân tại quầy
              </button>
              <p className="text-[12px] text-slate-400 text-center">
                Mạng yếu hoặc bệnh nhân không có camera?{' '}
                <button onClick={startCall} className="font-bold text-primary hover:underline">
                  Ghi nhận cuộc gọi điện thoại
                </button>
              </p>
            </div>
          )}
          {callState === 'ringing' && (
            <div className="text-center py-6">
              <div className="mx-auto w-20 h-20 rounded-full bg-lightpink flex items-center justify-center pulse-ring">
                <PhoneCall size={34} className="text-pink" />
              </div>
              <p className="mt-3 font-bold text-[15px] text-pink-dark">Đang đổ chuông… kết nối qua quầy thuốc</p>
            </div>
          )}
          {callState === 'active' && (
            <div>
              <div className="rounded-2xl bg-bluedark text-white p-5 text-center relative overflow-hidden">
                <Video size={22} className="absolute left-4 top-4 opacity-60" />
                <div className="text-[12px] text-white/70">Đang trò chuyện · âm thanh + video</div>
                <div className="text-[30px] font-mono font-extrabold mt-1">{mmss}</div>
                <div className="text-[13px] text-white/80">{c.patient_name} · nhà thuốc đối tác</div>
              </div>
              <div className="mt-3 flex gap-2">
                <button onClick={() => setMuted(!muted)} className={`btn flex-1 ${muted ? 'bg-slate-200 text-slate-600' : 'bg-lightblue text-bluedark'}`}>
                  {muted ? <MicOff size={17} /> : <Mic size={17} />} {muted ? 'Bỏ tắt tiếng' : 'Tắt tiếng'}
                </button>
                <button onClick={endCall} className="btn-danger flex-1">
                  <PhoneOff size={17} /> Kết thúc
                </button>
              </div>
              <div className="mt-3">
                <label className="label" htmlFor="call-note">Ghi chú cuộc gọi</label>
                <textarea id="call-note" rows={2} className="input" value={callNote} onChange={(e) => setCallNote(e.target.value)} placeholder="Bệnh nhân xác nhận: đau họng 2 ngày, không khó thở…" />
              </div>
            </div>
          )}
          {callState === 'ended' && (
            <div className="rounded-xl bg-mint-bg p-3.5 text-[13.5px] text-mint-fg flex items-center gap-2">
              <PhoneCall size={16} /> Đã gọi ngắn {c.call_duration_sec}s. Ghi chú: {c.call_note || '—'}
            </div>
          )}
        </section>
      )}

      {/* Quyết định */}
      {!decided ? (
        <section className="card p-4 space-y-3">
          <h2 className="section-title">Kết luận & quyết định</h2>
          <div>
            <label className="label" htmlFor="dc-note">Ghi chú chuyên môn / tư vấn</label>
            <textarea id="dc-note" rows={3} className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="VD: Viêm mũi họng cấp thể nhẹ, không chỉ định kháng sinh…" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => navigate(`/doctor/prescriptions?consultation=${id}`)} className="btn-primary !min-h-[52px]">
              <FileText size={18} /> Tiến hành kê đơn
            </button>
            <button onClick={() => setRejectOpen(true)} className="btn-danger !min-h-[52px]">
              <XCircle size={18} /> Từ chối / Chuyển khám
            </button>
          </div>
        </section>
      ) : (
        <section className={`card p-4 ${c.status === 'rejected' ? 'border-redflag-fg/30' : 'border-mint-fg/40'}`}>
          <h2 className="section-title">Phiên đã xử lý</h2>
          <p className="text-[13.5px] text-slate-600 mt-1.5">
            {c.status === 'approved' ? 'Đã duyệt kê đơn điện tử.' : `Đã từ chối: ${c.reject_reason}`}
          </p>
          {c.doctor_note && <p className="text-[12.5px] text-slate-400 mt-1">Ghi chú: {c.doctor_note}</p>}
          <button onClick={() => navigate('/doctor/dashboard')} className="btn-ghost mt-2 !px-3">← Về hàng đợi</button>
        </section>
      )}

      <Modal open={rejectOpen} onClose={() => setRejectOpen(false)} title="Từ chối kê đơn / Chuyển khám trực tiếp">
        <div className="space-y-3.5">
          <div>
            <label className="label" htmlFor="rj-reason">Lý do từ chối (bắt buộc, hiển thị cho bệnh nhân) *</label>
            <textarea id="rj-reason" rows={3} className="input" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="VD: Nghi ngờ viêm phổi – ngoài danh mục TT 30/2023, chuyển khám trực tiếp." />
          </div>
          <div className="rounded-xl bg-lightblue/40 p-3 text-[12.5px] text-bluedark">
            Tỷ lệ từ chối/chuyển khám được ghi nhận vào KPI hệ thống nhằm đảm bảo chất lượng chuyên môn.
          </div>
          <button onClick={reject} disabled={busy} className="btn-danger w-full">{busy ? 'Đang xử lý…' : 'Xác nhận từ chối kê đơn'}</button>
        </div>
      </Modal>
    </div>
  )
}

function Info({ k, v, highlight }: { k: string; v: string; highlight?: boolean }) {
  return (
    <div>
      <dt className="text-[11.5px] text-slate-400 font-semibold">{k}</dt>
      <dd className={`text-[13.5px] font-semibold ${highlight ? 'text-redflag-fg' : 'text-slate-700'}`}>{v || '—'}</dd>
    </div>
  )
}
