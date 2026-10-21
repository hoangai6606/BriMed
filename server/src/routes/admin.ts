import { Router } from 'express'
import { db, nowIso } from '../db.js'
import { requireAuth, requireRole } from '../auth.js'

const r = Router()
r.use(requireAuth, requireRole('admin'))

const ANTIBIOTIC_THRESHOLD = 30 // % ngưỡng cảnh báo tỷ lệ toa có kháng sinh

r.get('/stats', (_req, res) => {
  const monthStart = new Date()
  monthStart.setDate(1)
  const monthStartIso = monthStart.toISOString()

  const issuedThisMonth: any = db.prepare(
    `SELECT COUNT(*) c FROM prescriptions WHERE status IN ('issued','dispensed') AND created_at >= ?`
  ).get(monthStartIso)
  const issuedTotal: any = db.prepare(`SELECT COUNT(*) c FROM prescriptions WHERE status IN ('issued','dispensed')`).get()
  const abTotal: any = db.prepare(`SELECT COUNT(*) c FROM prescriptions WHERE status IN ('issued','dispensed') AND has_antibiotic = 1`).get()
  const abThisMonth: any = db.prepare(
    `SELECT COUNT(*) c FROM prescriptions WHERE status IN ('issued','dispensed') AND has_antibiotic = 1 AND created_at >= ?`
  ).get(monthStartIso)

  const consultations: any[] = db.prepare(`SELECT * FROM consultations`).all()
  const decided = consultations.filter((c) => c.status === 'approved' || c.status === 'rejected')
  const waitMins = decided
    .filter((c) => c.decided_at)
    .map((c) => (new Date(c.decided_at).getTime() - new Date(c.created_at).getTime()) / 60000)
  const avgWait = waitMins.length ? waitMins.reduce((a, b) => a + b, 0) / waitMins.length : 0

  const b2bRevenue = (db.prepare(`SELECT COALESCE(SUM(amount_vnd),0) v FROM transactions WHERE type='b2b_subscription'`).get() as any).v
  const tokenRevenue = (db.prepare(`SELECT COALESCE(SUM(amount_vnd),0) v FROM transactions WHERE type='token_deduct'`).get() as any).v
  const doctorFees = (db.prepare(`SELECT COALESCE(SUM(amount_vnd),0) v FROM transactions WHERE type='doctor_fee'`).get() as any).v

  const patients = db.prepare(`SELECT * FROM users WHERE role='patient'`).all() as any[]
  const usedAllFree = patients.filter((p) => p.free_prescriptions <= 0)
  const returnedPatients = usedAllFree.filter((p) =>
    (db.prepare(`SELECT COUNT(*) c FROM transactions WHERE user_id = ? AND type IN ('token_deduct')`).get(p.id) as any).c > 0
  )

  res.json({
    kpi: {
      prescriptions_this_month: issuedThisMonth.c,
      prescriptions_total: issuedTotal.c,
      avg_wait_minutes: Math.round(avgWait * 10) / 10,
      wait_target: 5,
      reject_rate: decided.length ? Math.round((consultations.filter((c) => c.status === 'rejected').length / decided.length) * 1000) / 10 : 0,
      antibiotic_rate: issuedTotal.c ? Math.round((abTotal.c / issuedTotal.c) * 1000) / 10 : 0,
      antibiotic_rate_this_month: issuedThisMonth.c ? Math.round((abThisMonth.c / issuedThisMonth.c) * 1000) / 10 : 0,
      antibiotic_threshold: ANTIBIOTIC_THRESHOLD,
      retention_rate: usedAllFree.length ? Math.round((returnedPatients.length / usedAllFree.length) * 1000) / 10 : 0,
      revenue_b2b_vnd: b2bRevenue,
      revenue_token_vnd: tokenRevenue,
      doctor_fees_vnd: doctorFees,
      counts: {
        patients: patients.length,
        doctors: (db.prepare(`SELECT COUNT(*) c FROM users WHERE role='doctor'`).get() as any).c,
        doctors_online: (db.prepare(`SELECT COUNT(*) c FROM users WHERE role='doctor' AND doctor_online=1`).get() as any).c,
        pharmacies: (db.prepare(`SELECT COUNT(*) c FROM pharmacies`).get() as any).c,
        medicines: (db.prepare(`SELECT COUNT(*) c FROM medicines`).get() as any).c,
        partner_registrations: db.prepare(`SELECT COUNT(*) c FROM partner_registrations`).get().c,
      },
    },
  })
})

r.get('/users', (_req, res) => {
  const rows = db.prepare(`
    SELECT u.id, u.full_name, u.phone, u.role, u.token_balance, u.free_prescriptions, u.doctor_specialty, u.pharmacy_id,
      (SELECT name FROM pharmacies WHERE id = u.pharmacy_id) pharmacy_name, u.created_at
    FROM users u ORDER BY u.role, u.full_name`).all()
  res.json({ users: rows })
})

r.put('/users/:id', (req, res) => {
  const u: any = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id)
  if (!u) return res.status(404).json({ error: 'Không tìm thấy tài khoản.' })
  const b = req.body || {}
  db.prepare('UPDATE users SET token_balance = ?, doctor_online = ? WHERE id = ?')
    .run(b.token_balance ?? u.token_balance, b.doctor_online !== undefined ? (b.doctor_online ? 1 : 0) : u.doctor_online, u.id)
  res.json({ ok: true })
})

r.get('/medicines', (_req, res) => {
  res.json({ medicines: db.prepare('SELECT * FROM medicines ORDER BY name').all() })
})

r.post('/medicines', (req, res) => {
  const b = req.body || {}
  if (!b.name || !b.active_ingredient) return res.status(400).json({ error: 'Cần tên thuốc và hoạt chất.' })
  const info = db.prepare(`INSERT INTO medicines (name, active_ingredient, pack_size, info, form, category, is_antibiotic, med_group, reference_price)
    VALUES (?,?,?,?,?,?,?,?,?)`)
    .run(b.name, b.active_ingredient, b.pack_size || '', b.info || '', b.form || '', b.category === 'rx' ? 'rx' : 'otc', b.is_antibiotic ? 1 : 0, b.med_group || '', b.reference_price || 0)
  res.json({ id: Number(info.lastInsertRowid) })
})

r.get('/partner-registrations', (_req, res) => {
  res.json({ registrations: db.prepare('SELECT * FROM partner_registrations ORDER BY created_at DESC').all() })
})

r.put('/partner-registrations/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM partner_registrations WHERE id = ?').get(req.params.id)
  if (!row) return res.status(404).json({ error: 'Không tìm thấy đăng ký.' })
  db.prepare('UPDATE partner_registrations SET status = ? WHERE id = ?').run(req.body?.status || (row as any).status, req.params.id)
  res.json({ ok: true })
})

r.get('/consultations', (_req, res) => {
  const rows = db.prepare(`
    SELECT c.*, u.full_name patient_name, d.full_name doctor_name FROM consultations c
    LEFT JOIN users u ON u.id = c.patient_id LEFT JOIN users d ON d.id = c.doctor_id
    ORDER BY c.created_at DESC LIMIT 50`).all()
  res.json({ consultations: rows.map((c: any) => ({ ...c, red_flag_reasons: JSON.parse(c.red_flag_reasons || '[]') })) })
})

// Reset toàn bộ dữ liệu về seed mẫu
r.post('/reset-demo', async (_req, res) => {
  const { execFileSync } = await import('node:child_process')
  const path = await import('node:path')
  try {
    execFileSync('npx tsx src/seed.ts', { cwd: path.join(import.meta.dirname, '..', '..'), stdio: 'pipe', shell: true })
    res.json({ ok: true, message: 'Đã khôi phục dữ liệu. Vui lòng đăng nhập lại.' })
  } catch (e: any) {
    res.status(500).json({ error: 'Reset thất bại: ' + (e?.message || e) })
  }
})

export default r
