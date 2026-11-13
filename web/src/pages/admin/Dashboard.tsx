import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Video,
  ShieldCheck, AlertTriangle, Timer, XCircle, Pill, RefreshCcw, Users, Coins,
  Store, TrendingUp, RotateCcw, FileCheck2, ListChecks, UserPlus,
} from 'lucide-react'
import { SeoMeta } from '../../components/common/SeoMeta'
import { api, fmtDate, fmtVnd } from '../../api/client'
import { PageLoading, Modal } from '../../components/common/Misc'
import { useUi } from '../../store/ui'
import { useAuth } from '../../store/auth'
import { DISEASE_GROUPS, ROLE_LABELS } from '../../data/constants'

type Tab = 'kpi' | 'leads' | 'users' | 'consultations' | 'medicines' | 'diseases' | 'registrations'

export default function AdminDashboard() {
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as Tab) || 'kpi'
  const [kpi, setKpi] = useState<any>(null)
  const [users, setUsers] = useState<any[]>([])
  const [medicines, setMedicines] = useState<any[]>([])
  const [regs, setRegs] = useState<any[]>([])
  const [consults, setConsults] = useState<any[]>([])
  const [doctors, setDoctors] = useState<any[]>([])
  const [pharmacies, setPharmacies] = useState<any[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState({ role: 'doctor', full_name: '', phone: '', doctor_specialty: 'Nội tổng quát', doctor_license: '', pharmacy_id: '' })
  const [leads, setLeads] = useState<any[]>([])
  const [busy, setBusy] = useState(false)
  const toast = useUi((s) => s.toast)
  const refreshAuth = useAuth((s) => s.refresh)
  const [newMed, setNewMed] = useState({ name: '', active_ingredient: '', pack_size: '', med_group: '', category: 'otc', is_antibiotic: false, reference_price: 0 })

  const setTab = (t: Tab) => setParams({ tab: t })

  const load = () => {
    api('/admin/stats').then((d) => setKpi(d.kpi)).catch(() => {})
    api('/admin/users').then((d) => setUsers(d.users)).catch(() => {})
    api('/admin/medicines').then((d) => setMedicines(d.medicines)).catch(() => {})
    api('/admin/partner-registrations').then((d) => setRegs(d.registrations)).catch(() => {})
    api('/admin/consultations').then((d) => setConsults(d.consultations || [])).catch(() => {})
    api('/auth/doctors').then((d) => setDoctors(d.doctors || [])).catch(() => {})
    api('/catalog/pharmacies').then((d) => setPharmacies(d.pharmacies || [])).catch(() => {})
    api('/admin/patient-leads').then((d) => setLeads(d.leads)).catch(() => {})
  }
  useEffect(load, [])

  const resetDemo = async () => {
    if (!confirm('Khôi phục toàn bộ dữ liệu về trạng thái ban đầu? Các phiên đăng nhập hiện tại sẽ bị đăng xuất.')) return
    setBusy(true)
    try {
      await api('/admin/reset-demo', { method: 'POST' })
      toast('Đã khôi phục dữ liệu. Vui lòng đăng nhập lại.', 'success')
      refreshAuth()
      window.location.href = '/auth'
    } catch (e: any) {
      toast(e.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const addMedicine = async () => {
    if (!newMed.name || !newMed.active_ingredient) {
      toast('Cần tên thuốc và hoạt chất.', 'error')
      return
    }
    setBusy(true)
    try {
      await api('/admin/medicines', { method: 'POST', body: JSON.stringify(newMed) })
      toast('Đã thêm thuốc vào danh mục chuẩn.', 'success')
      setNewMed({ name: '', active_ingredient: '', pack_size: '', med_group: '', category: 'otc', is_antibiotic: false, reference_price: 0 })
      load()
    } catch (e: any) {
      toast(e.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const updateLead = async (l: any, status: string) => {
    await api(`/admin/patient-leads/${l.id}`, { method: 'PUT', body: JSON.stringify({ status }) }).catch(() => {})
    toast(status === 'converted' ? 'Đã ghi nhận khách hàng sử dụng dịch vụ.' : 'Đã đánh dấu đã liên hệ.', 'success')
    load()
  }

  const toggleOnline = async (u: any) => {
    await api(`/admin/users/${u.id}`, { method: 'PUT', body: JSON.stringify({ doctor_online: !u.doctor_online }) }).catch(() => {})
    load()
  }

  const updateReg = async (r: any, status: string) => {
    await api(`/admin/partner-registrations/${r.id}`, { method: 'PUT', body: JSON.stringify({ status }) }).catch(() => {})
  }

  const forceClose = async (c: any) => {
    if (!window.confirm(`Huỷ phiên #${c.id} của ${c.patient_name}? Phí 25.000đ sẽ được hoàn nếu đã thanh toán.`)) return
    try {
      const d = await api(`/admin/consultations/${c.id}/force-close`, { method: 'POST', body: JSON.stringify({}) })
      toast(d.message, 'success'); load()
    } catch (e: any) { toast(e.message, 'error') }
  }

  const reassign = async (c: any, doctorId: string) => {
    if (!doctorId) return
    try {
      const d = await api(`/admin/consultations/${c.id}/force-close`, { method: 'POST', body: JSON.stringify({ doctor_id: Number(doctorId) }) })
      toast(d.message, 'success'); load()
    } catch (e: any) { toast(e.message, 'error') }
  }

  const createUser = async () => {
    if (!createForm.full_name || !createForm.phone) { toast('Cần họ tên và số điện thoại.', 'error'); return }
    try {
      const d = await api('/admin/users', { method: 'POST', body: JSON.stringify({ ...createForm, pharmacy_id: createForm.pharmacy_id || undefined }) })
      toast(`${d.account.phone} · Mật khẩu: ${d.account.password}`, 'success')
      setCreateOpen(false)
      setCreateForm({ role: 'doctor', full_name: '', phone: '', doctor_specialty: 'Nội tổng quát', doctor_license: '', pharmacy_id: '' })
      load()
    } catch (e: any) { toast(e.message, 'error') }
  }

  const billSubscriptions = async () => {
    if (!window.confirm('Chốt phí thuê bao tháng hiện tại cho toàn bộ nhà thuốc đang hoạt động (500.000đ 6 tháng đầu / 900.000đ sau đó)?')) return
    try {
      const d = await api('/admin/bill-subscriptions', { method: 'POST' })
      const billed = d.results.filter((x: any) => x.status === 'billed')
      const skipped = d.results.length - billed.length
      toast(`Đã chốt ${billed.length} nhà thuốc (${d.month})${skipped ? `, bỏ qua ${skipped} đã chốt` : ''}.`, 'success')
      load()
    } catch (e: any) { toast(e.message, 'error') }
  }

  const provision = async (r: any) => {
    if (!window.confirm(`Duyệt "${r.pharmacy_name}" và tự tạo nhà thuốc + tài khoản quản lý ${r.phone}?`)) return
    try {
      const d = await api(`/admin/registrations/${r.id}/provision`, { method: 'POST' })
      toast(`${d.message} Mật khẩu: ${d.account.password}`, 'success')
      load()
    } catch (e: any) { toast(e.message, 'error') }
    toast(`Đã chuyển đăng ký "${r.pharmacy_name}" sang ${status === 'contacted' ? 'đã liên hệ' : 'đã ký gói'}.`, 'success')
    load()
  }

  if (!kpi) return <PageLoading />
  const abOver = kpi.antibiotic_rate > kpi.antibiotic_threshold
  const waitOk = kpi.avg_wait_minutes <= kpi.wait_target

  return (
    <div className="space-y-4 max-w-4xl">
      <SeoMeta title="Quản trị hệ thống – BriMed" />
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-[20px] font-extrabold text-bluedark flex items-center gap-2">
          <ShieldCheck size={22} className="text-primary" /> Quản trị hệ thống BriMed
        </h1>
        <button onClick={resetDemo} disabled={busy} className="btn-outline !min-h-[38px] !text-[12.5px]">
          <RotateCcw size={15} /> Khôi phục dữ liệu
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 bg-white rounded-xl p-1 border border-slate-200 overflow-x-auto">
        {([
          ['kpi', 'KPI vận hành'],
          ['users', `Tài khoản (${kpi.counts.patients + kpi.counts.doctors + kpi.counts.pharmacies + 1})`],
          ['medicines', `Danh mục thuốc (${kpi.counts.medicines})`],
          ['diseases', 'Danh mục bệnh TT 30/2023'],
          ['consultations', `Phiên tư vấn (${consults.filter((c: any) => c.status === 'pending').length})`],
          ['registrations', `Đăng ký đối tác (${kpi.counts.partner_registrations})`],
          ['leads', `Khách hàng quan tâm (${leads.length})`],
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

      {tab === 'kpi' && (
        <>
          <div className="flex justify-end">
            <button onClick={billSubscriptions} className="btn-primary !min-h-[38px] !px-3.5 !text-[12.5px] mb-1">Chốt phí thuê bao tháng này</button>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard icon={<FileCheck2 size={18} />} label="Toa phát hành tháng này" value={kpi.prescriptions_this_month} tone="blue" />
            <KpiCard
              icon={<Timer size={18} />}
              label="Thời gian chờ trung bình"
              value={`${kpi.avg_wait_minutes} phút`}
              sub={`mục tiêu ≤ ${kpi.wait_target} phút`}
              tone={waitOk ? 'green' : 'red'}
            />
            <KpiCard icon={<XCircle size={18} />} label="Tỷ lệ từ chối / chuyển khám" value={`${kpi.reject_rate}%`} tone="amber" />
            <KpiCard
              icon={<Pill size={18} />}
              label="Tỷ lệ toa có kháng sinh"
              value={`${kpi.antibiotic_rate}%`}
              sub={`ngưỡng ${kpi.antibiotic_threshold}%`}
              tone={abOver ? 'red' : 'green'}
            />
            <KpiCard icon={<RefreshCcw size={18} />} label="Tỷ lệ bệnh nhân quay lại" value={`${kpi.retention_rate}%`} tone="pink" />
            <KpiCard icon={<Store size={18} />} label="Doanh thu thuê bao B2B" value={fmtVnd(kpi.revenue_b2b_vnd)} tone="blue" />
            <KpiCard icon={<Coins size={18} />} label="Doanh thu phí khám" value={fmtVnd(kpi.revenue_consultation_vnd)} tone="pink" />
            <KpiCard icon={<Users size={18} />} label="Bác sĩ trực / tổng" value={`${kpi.counts.doctors_online}/${kpi.counts.doctors}`} tone="blue" />
            <KpiCard icon={<Video size={18} />} label="Phút gọi video (tháng)" value={`${kpi.video_minutes_this_month ?? 0} phút`} sub="gói miễn phí 10.000 phút/tháng" tone="blue" />
            {(kpi.stuck_over_15min ?? 0) > 0 && (
              <KpiCard icon={<AlertTriangle size={18} />} label="⚠ Ca chờ quá 15 phút" value={`${kpi.stuck_over_15min} ca`} sub="đã trả phí, chưa bác sĩ nào nhận — cần xử lý ngay" tone="red" />
            )}
          </div>

          {abOver && (
            <div className="card p-4 border-2 border-redflag-fg/40 bg-redflag-bg/40 flex gap-3" role="alert">
              <AlertTriangle size={22} className="text-redflag-fg shrink-0 mt-0.5" />
              <div className="text-[14px] text-redflag-fg">
                <strong>Cảnh báo kiểm soát kháng sinh:</strong> tỷ lệ toa có kháng sinh {kpi.antibiotic_rate}% vượt ngưỡng an toàn {kpi.antibiotic_threshold}%.
                Kiểm tra chính sách kê kháng sinh và rà soát đơn của các bác sĩ.
              </div>
            </div>
          )}

          <section className="card p-4">
            <h2 className="section-title flex items-center gap-2 mb-3"><TrendingUp size={18} className="text-primary" /> Tổng quan hệ sinh thái</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <Mini label="Bệnh nhân" value={kpi.counts.patients} />
              <Mini label="Bác sĩ" value={kpi.counts.doctors} />
              <Mini label="Nhà thuốc đối tác" value={kpi.counts.pharmacies} />
              <Mini label="Thuốc trong danh mục" value={kpi.counts.medicines} />
            </div>
            <div className="mt-3 text-[13px] text-slate-500">
              Thù lao bác sĩ đã chi (theo toa): <strong className="text-bluedark">{fmtVnd(kpi.doctor_fees_vnd)}</strong> ·
              Tổng toa phát hành: <strong className="text-bluedark">{kpi.prescriptions_total}</strong>
            </div>
          </section>
        </>
      )}

      {tab === 'users' && (
        <>
        <div className="flex justify-end mb-2">
          <button onClick={() => setCreateOpen(true)} className="btn-primary !min-h-[38px] !px-3.5 !text-[12.5px]">+ Tạo tài khoản</button>
        </div>
        <section className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[13.5px] min-w-[640px]">
              <thead>
                <tr className="bg-slate-50 text-left text-[11.5px] uppercase text-slate-400">
                  <th className="px-3.5 py-2.5">Họ tên</th>
                  <th className="px-2 py-2.5">SĐT</th>
                  <th className="px-2 py-2.5">Vai trò</th>
                  <th className="px-3 py-2.5 text-right">Trạng thái</th>
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
                    <td className="px-3 py-2.5 text-right">
                      {u.role === 'doctor' ? (
                        <button onClick={() => toggleOnline(u)} className={`badge ${u.doctor_online ? 'bg-mint-bg text-mint-fg' : 'bg-slate-100 text-slate-500'}`}>
                          ● {u.doctor_online ? 'Đang trực' : 'Ngoại tuyến'}
                        </button>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        </>
      )}

      {createOpen && (
        <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Tạo tài khoản mới">
          <div className="space-y-3">
            <div>
              <label className="label">Vai trò *</label>
              <select className="input" value={createForm.role} onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}>
                <option value="doctor">Bác sĩ</option>
                <option value="patient">Bệnh nhân</option>
                <option value="pharmacy">Nhà thuốc</option>
              </select>
            </div>
            <div>
              <label className="label">Họ tên *</label>
              <input className="input" value={createForm.full_name} onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })} placeholder="BS. / QL …" />
            </div>
            <div>
              <label className="label">Số điện thoại (đăng nhập) *</label>
              <input className="input" inputMode="tel" value={createForm.phone} onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })} placeholder="090xxxxxxx" />
            </div>
            {createForm.role === 'doctor' && (
              <>
                <div>
                  <label className="label">Chuyên khoa</label>
                  <input className="input" value={createForm.doctor_specialty} onChange={(e) => setCreateForm({ ...createForm, doctor_specialty: e.target.value })} />
                </div>
                <div>
                  <label className="label">Số giấy phép hành nghề</label>
                  <input className="input" value={createForm.doctor_license} onChange={(e) => setCreateForm({ ...createForm, doctor_license: e.target.value })} placeholder="BYT-BS-xxxx" />
                </div>
              </>
            )}
            {createForm.role === 'pharmacy' && (
              <div>
                <label className="label">Nhà thuốc gắn với tài khoản *</label>
                <select className="input" value={createForm.pharmacy_id} onChange={(e) => setCreateForm({ ...createForm, pharmacy_id: e.target.value })}>
                  <option value="">— Chọn nhà thuốc —</option>
                  {pharmacies.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            )}
            <div className="rounded-xl bg-lightblue/40 p-3 text-[12.5px] text-bluedark">Mật khẩu tự sinh (kiểu brimed@1234) và hiển thị một lần sau khi tạo.</div>
            <button onClick={createUser} className="btn-pink w-full">Tạo tài khoản</button>
          </div>
        </Modal>
      )}

      {tab === 'medicines' && (
        <>
          <section className="card p-4 space-y-3">
            <h2 className="section-title">Thêm thuốc vào danh mục chuẩn</h2>
            <div className="grid sm:grid-cols-3 gap-2.5">
              <input className="input" placeholder="Tên thuốc *" value={newMed.name} onChange={(e) => setNewMed({ ...newMed, name: e.target.value })} aria-label="Tên thuốc" />
              <input className="input" placeholder="Hoạt chất *" value={newMed.active_ingredient} onChange={(e) => setNewMed({ ...newMed, active_ingredient: e.target.value })} aria-label="Hoạt chất" />
              <input className="input" placeholder="Quy cách" value={newMed.pack_size} onChange={(e) => setNewMed({ ...newMed, pack_size: e.target.value })} aria-label="Quy cách" />
              <input className="input" placeholder="Nhóm điều trị" value={newMed.med_group} onChange={(e) => setNewMed({ ...newMed, med_group: e.target.value })} aria-label="Nhóm" />
              <select className="input" value={newMed.category} onChange={(e) => setNewMed({ ...newMed, category: e.target.value })} aria-label="Phân loại">
                <option value="otc">Không kê đơn (OTC)</option>
                <option value="rx">Kê đơn (Rx)</option>
              </select>
              <input type="number" className="input" placeholder="Giá tham khảo" value={newMed.reference_price} onChange={(e) => setNewMed({ ...newMed, reference_price: Number(e.target.value) })} aria-label="Giá tham khảo" />
            </div>
            <label className="flex items-center gap-2 text-[13.5px] text-slate-600">
              <input type="checkbox" className="w-[18px] h-[18px] accent-[#0d71e2]" checked={newMed.is_antibiotic} onChange={(e) => setNewMed({ ...newMed, is_antibiotic: e.target.checked })} />
              Là kháng sinh (giám sát tỷ lệ kê)
            </label>
            <button onClick={addMedicine} disabled={busy} className="btn-pink !min-h-[42px]">Thêm thuốc</button>
          </section>

          <section className="card p-4">
            <h2 className="section-title mb-2">Danh mục hiện có ({medicines.length})</h2>
            <ul className="divide-y divide-slate-100">
              {medicines.map((m) => (
                <li key={m.id} className="py-2.5 flex items-center justify-between gap-2">
                  <div>
                    <div className="text-[13.5px] font-bold text-slate-700">{m.name}</div>
                    <div className="text-[12px] text-slate-400">{m.active_ingredient} · {m.pack_size}</div>
                  </div>
                  <div className="flex gap-1.5 items-center">
                    {m.is_antibiotic ? <span className="badge bg-redflag-bg text-redflag-fg">Kháng sinh</span> : null}
                    <span className={`badge ${m.category === 'rx' ? 'bg-lightpink text-pink-dark' : 'bg-slate-100 text-slate-500'}`}>{m.category === 'rx' ? 'Rx' : 'OTC'}</span>
                    <span className="text-[12.5px] font-bold text-bluedark">{fmtVnd(m.reference_price)}</span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      {tab === 'diseases' && (
        <section className="card p-4">
          <h2 className="section-title flex items-center gap-2 mb-3"><ListChecks size={18} className="text-primary" /> Danh mục bệnh được phép khám từ xa (TT 30/2023/TT-BYT)</h2>
          <div className="grid sm:grid-cols-2 gap-2">
            {DISEASE_GROUPS.map((d, i) => (
              <div key={d} className="rounded-xl bg-mint-bg/60 border border-mint-fg/20 px-3.5 py-2.5 text-[13.5px] font-semibold text-mint-fg flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-mint-fg text-white text-[11px] flex items-center justify-center shrink-0">{i + 1}</span>
                {d}
              </div>
            ))}
          </div>
          <div className="mt-3.5 rounded-xl bg-redflag-bg border border-redflag-fg/25 p-3.5 text-[13px] text-redflag-fg">
            <strong>Không nhận:</strong> viêm phế quản, viêm phổi, tiêu chảy (ngoài danh mục), sốt cao kéo dài, trẻ nhỏ, thai phụ,
            thuốc gây nghiện/hướng thần. Bác sĩ có quyền từ chối kê đơn — tỷ lệ từ chối được theo dõi ở tab KPI.
          </div>
        </section>
      )}

      {tab === 'leads' && (
        <section className="card p-4">
          <h2 className="section-title flex items-center gap-2 mb-2"><UserPlus size={18} className="text-pink" /> Khách hàng quan tâm (form đăng ký trên trang chủ)</h2>
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
                      <button onClick={() => updateLead(l, 'contacted')} className="btn-ghost !min-h-[34px] !px-3 !text-[12.5px]">Đánh dấu đã liên hệ</button>
                      <button onClick={() => updateLead(l, 'converted')} className="btn-primary !min-h-[34px] !px-3 !text-[12.5px]">Đã dùng dịch vụ</button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {tab === 'consultations' && (
        <section className="card p-4">
          <h2 className="section-title mb-2">Phiên tư vấn — can thiệp ca kẹt</h2>
          {consults.length === 0 ? (
            <p className="text-[13.5px] text-slate-400 text-center py-3">Chưa có phiên nào.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {consults.map((c: any) => {
                const stuckMin = Math.floor((Date.now() - new Date(c.created_at).getTime()) / 60000)
                const stuck = c.status === 'pending' && c.payment_status === 'paid' && stuckMin > 15
                return (
                  <li key={c.id} className={`py-3 rounded-xl px-2 ${stuck ? 'bg-redflag-bg/40 border border-redflag-fg/30' : ''}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[14px] font-bold text-slate-700">
                          #{c.id} {c.patient_name} <span className="text-slate-400 font-normal">· {c.disease_group}</span>
                        </div>
                        <div className="text-[12px] text-slate-500">
                          {c.doctor_name || 'Chưa có bác sĩ'} · {fmtDate(c.created_at)} ({stuckMin} phút trước) ·{' '}
                          <span className={c.payment_status === 'paid' ? 'text-primary font-bold' : c.payment_status === 'refunded' ? 'text-pink-dark font-bold' : 'text-amber-600 font-bold'}>
                            {{ paid: 'Đã trả 25k', unpaid: 'Chưa trả', refunded: 'Đã hoàn' }[c.payment_status as string]}
                          </span>
                        </div>
                        {stuck && <div className="text-[12px] font-bold text-redflag-fg mt-0.5">⚠ Chờ quá {stuckMin} phút — cần xử lý ngay</div>}
                      </div>
                      <span className={`badge ${c.status === 'approved' ? 'bg-mint-bg text-mint-fg' : c.status === 'rejected' ? 'bg-redflag-bg text-redflag-fg' : c.status === 'in_call' ? 'bg-lightpink text-pink-dark' : c.status === 'cancelled' ? 'bg-slate-100 text-slate-500' : 'bg-amber-100 text-amber-700'}`}>
                        {{ pending: 'Chờ', in_call: 'Đang gọi', approved: 'Đã duyệt', rejected: 'Từ chối', cancelled: 'Đã huỷ' }[c.status as string]}
                      </span>
                    </div>
                    {c.status === 'pending' && (
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <select
                          className="input !min-h-[34px] !w-56 !text-[12.5px]"
                          defaultValue=""
                          onChange={(e: any) => reassign(c, e.target.value)}
                          aria-label={`Gắn phiên ${c.id} cho bác sĩ`}
                        >
                          <option value="">Gắn cho bác sĩ…</option>
                          {doctors.map((d: any) => <option key={d.id} value={d.id}>{d.full_name} · {d.doctor_specialty}</option>)}
                        </select>
                        <button onClick={() => forceClose(c)} className="btn-danger !min-h-[34px] !px-3 !text-[12.5px]">Huỷ &amp; hoàn tiền</button>
                      </div>
                    )}
                  </li>
                )
              })}
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
                  <div className="flex flex-wrap gap-2 mt-2">
                    {r.status !== 'converted' && r.status !== 'signed' && (
                      <button onClick={() => updateReg(r, 'contacted')} className="btn-ghost !min-h-[34px] !px-3 !text-[12.5px]">Đánh dấu đã liên hệ</button>
                    )}
                    {r.status !== 'converted' && (
                      <button onClick={() => updateReg(r, 'signed')} className="btn-ghost !min-h-[34px] !px-3 !text-[12.5px]">Đã ký gói</button>
                    )}
                    {r.status !== 'converted' && (
                      <button onClick={() => provision(r)} className="btn-pink !min-h-[34px] !px-3 !text-[12.5px]">Duyệt &amp; tạo tài khoản</button>
                    )}
                    {r.status === 'converted' && <span className="badge bg-mint-bg text-mint-fg">Đã tạo tài khoản nhà thuốc</span>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  )
}

function KpiCard({ icon, label, value, sub, tone }: { icon: any; label: string; value: any; sub?: string; tone: 'blue' | 'green' | 'red' | 'amber' | 'pink' }) {
  const toneCls = {
    blue: 'bg-primary text-white',
    green: 'bg-mint-fg text-white',
    red: 'bg-redflag-fg text-white',
    amber: 'bg-amber-500 text-white',
    pink: 'bg-pink text-white',
  }[tone]
  return (
    <div className="card p-3.5">
      <span className={`w-9 h-9 rounded-xl ${toneCls} flex items-center justify-center`}>{icon}</span>
      <div className="text-[21px] font-extrabold text-bluedark mt-1.5 leading-none">{value}</div>
      <div className="text-[12px] text-slate-500 mt-1 leading-snug">{label}</div>
      {sub && <div className="text-[11px] text-slate-400 mt-0.5">{sub}</div>}
    </div>
  )
}

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <div className="text-[19px] font-extrabold text-bluedark">{value}</div>
      <div className="text-[11.5px] text-slate-500">{label}</div>
    </div>
  )
}
