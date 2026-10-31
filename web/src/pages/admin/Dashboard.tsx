import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ShieldCheck, Database } from 'lucide-react'
import { SeoMeta } from '../../components/common/SeoMeta'
import { api, fmtDate } from '../../api/client'
import { PageLoading } from '../../components/common/Misc'
import { useUi } from '../../store/ui'
import { ROLE_LABELS } from '../../data/constants'

type Tab = 'leads' | 'registrations' | 'users'

// Bảng điều khiển quản trị — Giai đoạn 1: tiếp nhận khách hàng quan tâm,
// đăng ký nhà thuốc đối tác và danh sách tài khoản.
export default function AdminDashboard() {
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as Tab) || 'leads'
  const [leads, setLeads] = useState<any[] | null>(null)
  const [regs, setRegs] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [busy, setBusy] = useState(false)
  const toast = useUi((s) => s.toast)

  const setTab = (t: Tab) => setParams({ tab: t })

  const load = () => {
    api('/admin/patient-leads').then((d) => setLeads(d.leads)).catch(() => setLeads([]))
    api('/admin/partner-registrations').then((d) => setRegs(d.registrations)).catch(() => {})
    api('/admin/users').then((d) => setUsers(d.users)).catch(() => {})
  }
  useEffect(load, [])

  const updateLead = async (l: any, status: string) => {
    setBusy(true)
    try {
      await api(`/admin/patient-leads/${l.id}`, { method: 'PUT', body: JSON.stringify({ status }) })
      toast(status === 'converted' ? 'Đã ghi nhận khách hàng sử dụng dịch vụ.' : 'Đã đánh dấu đã liên hệ.', 'success')
      load()
    } finally {
      setBusy(false)
    }
  }

  const updateReg = async (r: any, status: string) => {
    setBusy(true)
    try {
      await api(`/admin/partner-registrations/${r.id}`, { method: 'PUT', body: JSON.stringify({ status }) })
      toast(`Đã chuyển đăng ký "${r.pharmacy_name}" sang ${status === 'signed' ? 'đã ký gói' : 'đã liên hệ'}.`, 'success')
      load()
    } finally {
      setBusy(false)
    }
  }

  if (leads === null) return <PageLoading />
  const newLeads = leads.filter((l) => l.status === 'new').length

  return (
    <div className="space-y-4 max-w-4xl">
      <SeoMeta title="Bảng điều khiển quản trị – BriMed" />
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-[20px] font-extrabold text-bluedark flex items-center gap-2">
          <ShieldCheck size={22} className="text-primary" /> Bảng điều khiển quản trị
        </h1>
        {newLeads > 0 && (
          <span className="badge bg-lightpink text-pink-dark">{newLeads} thông tin mới chờ liên hệ</span>
        )}
      </div>

      <div className="flex gap-1.5 bg-white rounded-xl p-1 border border-slate-200 overflow-x-auto">
        {([
          ['leads', `Khách hàng quan tâm (${leads.length})`],
          ['registrations', `Đăng ký đối tác (${regs.length})`],
          ['users', `Tài khoản (${users.length})`],
        ] as [Tab, string][]).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-3.5 py-2 rounded-lg text-[13px] font-bold whitespace-nowrap transition ${tab === k ? 'bg-primary text-white' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'leads' && (
        <section className="card p-4">
          <h2 className="section-title mb-2">Khách hàng quan tâm (form đăng ký trên trang chủ)</h2>
          {leads.length === 0 ? (
            <p className="text-[13.5px] text-slate-400 text-center py-3">Chưa có khách hàng nào đăng ký.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {leads.map((l) => (
                <li key={l.id} className="py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-[14px] font-bold text-slate-700">{l.full_name}</div>
                      <div className="text-[12.5px] text-slate-500">{l.phone} · {fmtDate(l.created_at)}</div>
                      <div className="text-[12px] text-slate-400 mt-0.5">{l.interest}</div>
                    </div>
                    <span className={`badge ${
                      l.status === 'converted' ? 'bg-mint-bg text-mint-fg' : l.status === 'contacted' ? 'bg-lightblue text-bluedark' : 'bg-lightpink text-pink-dark'
                    }`}>
                      {l.status === 'new' ? 'Mới' : l.status === 'contacted' ? 'Đã liên hệ' : 'Đã dùng dịch vụ'}
                    </span>
                  </div>
                  {l.status === 'new' && (
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => updateLead(l, 'contacted')} disabled={busy} className="btn-ghost !min-h-[34px] !px-3 !text-[12.5px]">Đánh dấu đã liên hệ</button>
                      <button onClick={() => updateLead(l, 'converted')} disabled={busy} className="btn-primary !min-h-[34px] !px-3 !text-[12.5px]">Đã dùng dịch vụ</button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {tab === 'registrations' && (
        <section className="card p-4">
          <h2 className="section-title mb-2">Đăng ký nhà thuốc đối tác (Form 2)</h2>
          {regs.length === 0 ? (
            <p className="text-[13.5px] text-slate-400 text-center py-3">Chưa có đăng ký nào.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {regs.map((r) => (
                <li key={r.id} className="py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-[14px] font-bold text-slate-700">{r.pharmacy_name}</div>
                      <div className="text-[12.5px] text-slate-500">{r.address}, {r.ward}, {r.district} · {r.phone}</div>
                      <div className="text-[12px] text-slate-400 mt-0.5">
                        Chủ: {r.owner_name} · DS phụ trách: {r.pharmacist_name} · GP: {r.license_number} ·
                        {r.csdl_synced ? ' Đã liên thông CSDL' : ' Chưa liên thông CSDL'} ·
                        Quan tâm: {r.plan === '3_months' ? 'Gói 3 tháng' : 'Gói 1 tháng'} · {fmtDate(r.created_at)}
                      </div>
                    </div>
                    <span className={`badge ${
                      r.status === 'signed' ? 'bg-mint-bg text-mint-fg' : r.status === 'contacted' ? 'bg-lightblue text-bluedark' : 'bg-lightpink text-pink-dark'
                    }`}>
                      {r.status === 'new' ? 'Mới' : r.status === 'contacted' ? 'Đã liên hệ' : 'Đã ký gói'}
                    </span>
                  </div>
                  {r.status === 'new' && (
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => updateReg(r, 'contacted')} disabled={busy} className="btn-ghost !min-h-[34px] !px-3 !text-[12.5px]">Đánh dấu đã liên hệ</button>
                      <button onClick={() => updateReg(r, 'signed')} disabled={busy} className="btn-primary !min-h-[34px] !px-3 !text-[12.5px]">Đã ký gói</button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {tab === 'users' && (
        <section className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[13.5px] min-w-[560px]">
              <thead>
                <tr className="bg-slate-50 text-left text-[11.5px] uppercase text-slate-400">
                  <th className="px-3.5 py-2.5">Họ tên</th>
                  <th className="px-2 py-2.5">SĐT</th>
                  <th className="px-2 py-2.5">Vai trò</th>
                  <th className="px-2 py-2.5 text-right">Token</th>
                  <th className="px-3 py-2.5 text-right">Ngày tạo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="px-3.5 py-2.5 font-semibold text-slate-700">
                      {u.full_name}
                      {u.pharmacy_name && <div className="text-[11.5px] text-slate-400">{u.pharmacy_name}</div>}
                      {u.doctor_specialty && <div className="text-[11.5px] text-slate-400">{u.doctor_specialty}</div>}
                    </td>
                    <td className="px-2 py-2.5 text-slate-500">{u.phone}</td>
                    <td className="px-2 py-2.5">
                      <span className={`badge ${
                        u.role === 'doctor' ? 'bg-mint-bg text-mint-fg' : u.role === 'pharmacy' ? 'bg-lightpink text-pink-dark' : u.role === 'admin' ? 'bg-slate-200 text-slate-700' : 'bg-lightblue text-bluedark'
                      }`}>{ROLE_LABELS[u.role]}</span>
                    </td>
                    <td className="px-2 py-2.5 text-right font-bold">{u.role === 'patient' ? `${u.token_balance} (${u.free_prescriptions} free)` : '—'}</td>
                    <td className="px-3 py-2.5 text-right text-slate-400">{fmtDate(u.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <p className="text-[12.5px] text-slate-400 flex items-center gap-1.5">
        <Database size={14} /> Mọi thông tin khách gửi từ trang chủ và đăng ký tài khoản đều tập trung về đây.
      </p>
    </div>
  )
}
