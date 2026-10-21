import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlarmClock, ClipboardList, UserRound, PhoneCall, CheckCircle2, XCircle, Lock } from 'lucide-react'
import { SeoMeta } from '../../components/common/SeoMeta'
import { api, timeAgo } from '../../api/client'
import { PageLoading } from '../../components/common/Misc'
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

  const load = useCallback(() => {
    api('/doctor/queue').then(setData).catch(() => setData({ queue: [], mine: [] }))
    api('/doctor/patients').then((d) => setPatients(d.patients)).catch(() => setPatients([]))
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
