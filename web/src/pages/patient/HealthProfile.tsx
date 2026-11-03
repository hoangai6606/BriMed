import { useEffect, useState } from 'react'
import { Thermometer, Activity, HeartPulse, Share2, Lock, Save, Baby, AlertTriangle } from 'lucide-react'
import { SeoMeta } from '../../components/common/SeoMeta'
import { api } from '../../api/client'
import { useUi } from '../../store/ui'
import { useAuth } from '../../store/auth'

export default function HealthProfile() {
  const [p, setP] = useState<any>(null)
  const [busy, setBusy] = useState(false)
  const toast = useUi((s) => s.toast)
  const user = useAuth((s) => s.user)!

  useEffect(() => {
    api('/patient/health-profile/me').then((d) => setP(d.profile)).catch((e) => toast(e.message, 'error'))
  }, [])

  if (!p) return <PageLoadingInline />

  const set = (k: string, v: any) => setP({ ...p, [k]: v })

  const save = async () => {
    setBusy(true)
    try {
      const d = await api('/patient/health-profile/me', { method: 'PUT', body: JSON.stringify(p) })
      setP(d.profile)
      toast('Đã lưu hồ sơ sức khỏe.', 'success')
    } catch (e: any) {
      toast(e.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <SeoMeta title="Hồ sơ sức khỏe – BriMed" />
      <div className="flex items-center justify-between">
        <h1 className="text-[20px] font-extrabold text-bluedark">Hồ sơ sức khỏe</h1>
        <button onClick={save} disabled={busy} className="btn-primary !min-h-[40px] !text-[13.5px]">
          <Save size={16} /> {busy ? 'Đang lưu…' : 'Lưu thay đổi'}
        </button>
      </div>

      {/* Chỉ số */}
      <section className="grid grid-cols-3 gap-3">
        <div className="card p-3.5 text-center">
          <Thermometer size={20} className="mx-auto text-primary mb-1" />
          <div className="text-[19px] font-extrabold text-bluedark">{p.temperature || '—'}°C</div>
          <div className="text-[11px] text-slate-400">Nhiệt độ</div>
          <input type="number" step="0.1" className="input !min-h-[36px] !text-[13px] mt-1.5 text-center" value={p.temperature ?? ''} onChange={(e) => set('temperature', Number(e.target.value))} aria-label="Cập nhật nhiệt độ" />
        </div>
        <div className="card p-3.5 text-center">
          <Activity size={20} className="mx-auto text-pink mb-1" />
          <div className="text-[19px] font-extrabold text-bluedark">{p.spo2 || '—'}%</div>
          <div className="text-[11px] text-slate-400">SpO₂</div>
          <input type="number" className="input !min-h-[36px] !text-[13px] mt-1.5 text-center" value={p.spo2 ?? ''} onChange={(e) => set('spo2', Number(e.target.value))} aria-label="Cập nhật SpO2" />
        </div>
        <div className="card p-3.5 text-center">
          <HeartPulse size={20} className="mx-auto text-mint-fg mb-1" />
          <div className="text-[19px] font-extrabold text-bluedark">{p.blood_pressure || '—'}</div>
          <div className="text-[11px] text-slate-400">Huyết áp</div>
          <input className="input !min-h-[36px] !text-[13px] mt-1.5 text-center" value={p.blood_pressure ?? ''} onChange={(e) => set('blood_pressure', e.target.value)} placeholder="120/80" aria-label="Cập nhật huyết áp" />
        </div>
      </section>

      {/* Thông tin cơ bản */}
      <section className="card p-4 space-y-3.5">
        <h2 className="section-title">Thông tin cá nhân</h2>
        <div className="grid sm:grid-cols-2 gap-3.5">
          <div>
            <label className="label" htmlFor="hp-dob">Ngày sinh</label>
            <input id="hp-dob" type="date" className="input" value={p.dob || ''} onChange={(e) => set('dob', e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="hp-gender">Giới tính</label>
            <select id="hp-gender" className="input" value={p.gender || ''} onChange={(e) => set('gender', e.target.value)}>
              <option value="">— Chọn —</option>
              <option>Nam</option>
              <option>Nữ</option>
              <option>Khác</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="hp-cccd">CCCD / Số định danh</label>
            <input id="hp-cccd" className="input bg-slate-50" value={user.cccd || ''} readOnly />
          </div>
          <div>
            <label className="label" htmlFor="hp-preg">Tình trạng thai kỳ</label>
            <select id="hp-preg" className="input" value={p.pregnant ? '1' : '0'} onChange={(e) => set('pregnant', e.target.value === '1')}>
              <option value="0">Không mang thai</option>
              <option value="1">Đang mang thai</option>
            </select>
            {p.pregnant === 1 && (
              <p className="mt-1.5 text-[12px] text-redflag-fg flex items-center gap-1"><AlertTriangle size={13} /> Thai phụ không thuộc phạm vi khám từ xa của BriMed.</p>
            )}
          </div>
        </div>
        <div>
          <label className="label" htmlFor="hp-history">Tiền sử bệnh</label>
          <textarea id="hp-history" rows={2} className="input" value={p.medical_history || ''} onChange={(e) => set('medical_history', e.target.value)} placeholder="VD: tăng huyết áp, đái tháo đường…" />
        </div>
        <div>
          <label className="label" htmlFor="hp-allergy">Tiền sử dị ứng thuốc</label>
          <textarea id="hp-allergy" rows={2} className="input" value={p.drug_allergies || ''} onChange={(e) => set('drug_allergies', e.target.value)} placeholder="VD: Penicillin (mề đay)…" />
        </div>
        <div>
          <label className="label" htmlFor="hp-meds">Thuốc đang dùng</label>
          <textarea id="hp-meds" rows={2} className="input" value={p.current_medicines || ''} onChange={(e) => set('current_medicines', e.target.value)} placeholder="VD: Amlodipin 5mg uống sáng…" />
        </div>
      </section>

      {/* Quyền riêng tư */}
      <section className={`card p-4 border-2 ${p.share_consent ? 'border-mint-fg/40' : 'border-slate-200'}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex gap-3">
            {p.share_consent ? <Share2 size={22} className="text-mint-fg shrink-0 mt-0.5" /> : <Lock size={22} className="text-slate-400 shrink-0 mt-0.5" />}
            <div>
              <h2 className="font-bold text-[15px] text-bluedark">Chia sẻ hồ sơ cho bác sĩ trong phiên tư vấn</h2>
              <p className="text-[13px] text-slate-500 mt-1 leading-relaxed">
                Khi bật, bác sĩ trực BriMed xem được tiền sử, dị ứng thuốc và chỉ số của bạn trong phiên kê đơn để đảm bảo an toàn.
                Tắt: bác sĩ chỉ thấy triệu chứng bạn khai trong form.
              </p>
            </div>
          </div>
          <button
            role="switch"
            aria-checked={!!p.share_consent}
            onClick={() => set('share_consent', p.share_consent ? 0 : 1)}
            className={`shrink-0 w-12 h-7 rounded-full transition relative ${p.share_consent ? 'bg-mint-fg' : 'bg-slate-300'}`}
          >
            <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-all ${p.share_consent ? 'left-[22px]' : 'left-0.5'}`} />
          </button>
        </div>
      </section>

      <p className="text-[12px] text-slate-400 flex items-start gap-1.5">
        <Baby size={14} className="shrink-0 mt-0.5" />
        Hồ sơ sức khỏe chỉ hiển thị cho chủ sở hữu và bác sĩ được cấp quyền trong phiên giao dịch (RBAC).
      </p>
    </div>
  )
}

function PageLoadingInline() {
  return (
    <div className="py-20 text-center text-slate-400">Đang tải hồ sơ…</div>
  )
}
