import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Lock, Thermometer, Activity, HeartPulse, FileText, History } from 'lucide-react'
import { SeoMeta } from '../../components/common/SeoMeta'
import { api, fmtDate } from '../../api/client'
import { PageLoading } from '../../components/common/Misc'
import { CONSULT_STATUS, RX_STATUS } from '../../data/constants'

export default function PatientRecord() {
  const [params] = useSearchParams()
  const patientId = params.get('patient')
  const [data, setData] = useState<any>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (!patientId) return
    api(`/doctor/patients/${patientId}/record`)
      .then(setData)
      .catch((e) => setErr(e.message))
  }, [patientId])

  if (!patientId) {
    return (
      <div className="card p-8 text-center text-[14px] text-slate-500">
        Chọn một bệnh nhân từ <strong>Hàng đợi</strong> hoặc danh sách hồ sơ được cấp quyền.
      </div>
    )
  }
  if (err) {
    return (
      <div className="card p-8 text-center">
        <Lock size={30} className="mx-auto text-slate-400 mb-2" />
        <p className="text-[14.5px] font-bold text-slate-600">{err}</p>
        <p className="text-[13px] text-slate-400 mt-1.5">Hồ sơ sức khỏe chỉ hiển thị khi bệnh nhân đã tick đồng ý chia sẻ quyền truy cập (RBAC).</p>
      </div>
    )
  }
  if (!data) return <PageLoading />

  const p = data.profile

  return (
    <div className="space-y-4 max-w-2xl">
      <SeoMeta title={`Hồ sơ bệnh nhân – ${data.patient.full_name} – BriMed`} />
      <div className="card p-4">
        <h1 className="text-[19px] font-extrabold text-bluedark">{data.patient.full_name}</h1>
        <div className="text-[13px] text-slate-500">{data.patient.phone}</div>
        <div className="grid grid-cols-3 gap-2 mt-3">
          <Vital icon={<Thermometer size={16} className="text-primary" />} value={`${p.temperature}°C`} label="Nhiệt độ" />
          <Vital icon={<Activity size={16} className="text-pink" />} value={`${p.spo2}%`} label="SpO₂" />
          <Vital icon={<HeartPulse size={16} className="text-mint-fg" />} value={p.blood_pressure} label="Huyết áp" />
        </div>
      </div>

      <section className="card p-4">
        <h2 className="section-title mb-2.5">Thông tin sức khỏe</h2>
        <dl className="text-[13.5px] divide-y divide-slate-50">
          {[
            ['Ngày sinh / giới tính', `${fmtDate(p.dob)} · ${p.gender}`],
            ['Tiền sử bệnh', p.medical_history],
            ['Dị ứng thuốc', p.drug_allergies],
            ['Thai kỳ', p.pregnant ? 'Đang mang thai' : 'Không'],
            ['Thuốc đang dùng', p.current_medicines],
          ].map(([k, v]) => (
            <div key={k} className="py-2 grid grid-cols-[minmax(120px,38%)_1fr] gap-2">
              <dt className="text-slate-400 font-medium">{k}</dt>
              <dd className={`font-semibold ${k === 'Dị ứng thuốc' && v && v !== 'Không' ? 'text-redflag-fg' : 'text-slate-700'}`}>{v || '—'}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="card p-4">
        <h2 className="section-title flex items-center gap-2 mb-2"><History size={17} className="text-primary" /> Lịch sử tư vấn</h2>
        <ul className="divide-y divide-slate-100">
          {data.consultations.map((c: any) => (
            <li key={c.id} className="py-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="text-[13.5px] font-bold text-slate-700">{c.disease_group} <span className="font-normal text-slate-400">· {fmtDate(c.created_at)}</span></div>
                <span className={`badge ${CONSULT_STATUS[c.status].cls}`}>{CONSULT_STATUS[c.status].label}</span>
              </div>
              <div className="text-[12.5px] text-slate-500 mt-0.5">{c.symptom}</div>
            </li>
          ))}
        </ul>
      </section>

      <section className="card p-4">
        <h2 className="section-title flex items-center gap-2 mb-2"><FileText size={17} className="text-pink" /> Đơn thuốc đã cấp</h2>
        <ul className="divide-y divide-slate-100">
          {data.prescriptions.map((rx: any) => (
            <li key={rx.id} className="py-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="text-[13.5px] font-bold text-bluedark">{rx.national_code}</div>
                <span className={`badge ${RX_STATUS[rx.status].cls}`}>{RX_STATUS[rx.status].label}</span>
              </div>
              <div className="text-[12.5px] text-slate-500">{rx.items.map((it: any) => `${it.name} × ${it.quantity}`).join(', ')}</div>
            </li>
          ))}
          {data.prescriptions.length === 0 && <li className="py-3 text-center text-[13px] text-slate-400">Chưa có đơn nào.</li>}
        </ul>
      </section>
    </div>
  )
}

function Vital({ icon, value, label }: { icon: any; value: string; label: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-2.5 text-center">
      <div className="flex justify-center">{icon}</div>
      <div className="text-[15px] font-extrabold text-bluedark mt-0.5">{value}</div>
      <div className="text-[10.5px] text-slate-400">{label}</div>
    </div>
  )
}
