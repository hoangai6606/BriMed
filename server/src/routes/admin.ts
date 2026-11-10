import { Router } from 'express'
import { pool, ensureDb, nowIso } from '../db'
import { requireAuth, requireRole } from '../auth'
import { seedDb } from '../seed'

const r = Router()
r.use(requireAuth, requireRole('admin'))

const ANTIBIOTIC_THRESHOLD = 30 // % ngưỡng cảnh báo tỷ lệ toa có kháng sinh

r.get('/stats', async (_req, res) => {
  try {
    await ensureDb()
    const monthStart = new Date()
    monthStart.setDate(1)
    const monthStartIso = monthStart.toISOString()

    const issuedThisMonth = (await pool.query(
      `SELECT COUNT(*)::int AS c FROM prescriptions WHERE status IN ('issued','dispensed') AND created_at >= $1`,
      [monthStartIso]
    )).rows[0].c
    const issuedTotal = (await pool.query(
      `SELECT COUNT(*)::int AS c FROM prescriptions WHERE status IN ('issued','dispensed')`
    )).rows[0].c
    const abTotal = (await pool.query(
      `SELECT COUNT(*)::int AS c FROM prescriptions WHERE status IN ('issued','dispensed') AND has_antibiotic = 1`
    )).rows[0].c
    const abThisMonth = (await pool.query(
      `SELECT COUNT(*)::int AS c FROM prescriptions WHERE status IN ('issued','dispensed') AND has_antibiotic = 1 AND created_at >= $1`,
      [monthStartIso]
    )).rows[0].c

    const consultations = (await pool.query(`SELECT * FROM consultations`)).rows
    const decided = consultations.filter((c: any) => c.status === 'approved' || c.status === 'rejected')
    const waitMins = decided
      .filter((c: any) => c.decided_at)
      .map((c: any) => (new Date(c.decided_at).getTime() - new Date(c.created_at).getTime()) / 60000)
    const avgWait = waitMins.length ? waitMins.reduce((a: number, b: number) => a + b, 0) / waitMins.length : 0

    const b2bRevenue = (await pool.query(`SELECT COALESCE(SUM(amount_vnd),0)::int AS v FROM transactions WHERE type='b2b_subscription'`)).rows[0].v
    const consultRevenue = (await pool.query(`SELECT COALESCE(SUM(amount_vnd),0)::int AS v FROM transactions WHERE type='consultation_fee'`)).rows[0].v
    const doctorFees = (await pool.query(`SELECT COALESCE(SUM(amount_vnd),0)::int AS v FROM transactions WHERE type='doctor_fee'`)).rows[0].v
    const videoSecMonth = (await pool.query(
      `SELECT COALESCE(SUM(call_duration_sec),0)::int AS s FROM consultations WHERE call_started_at >= $1`, [monthStartIso]
    )).rows[0].s

    const patients = (await pool.query(`SELECT * FROM users WHERE role='patient'`)).rows
    // Tỷ lệ quay lại: bệnh nhân có từ 2 lượt khám trở lên / tổng bệnh nhân đã khám
    const patientsWithConsults = (await pool.query(`
      SELECT patient_id, COUNT(*)::int AS c FROM consultations GROUP BY patient_id`)).rows
    const consultMap = new Map(patientsWithConsults.map((r: any) => [r.patient_id, r.c]))
    const activePatients = patients.filter((p: any) => (consultMap.get(p.id) || 0) > 0)
    const returnedPatients = activePatients.filter((p: any) => (consultMap.get(p.id) || 0) >= 2)

    res.json({
      kpi: {
        prescriptions_this_month: issuedThisMonth,
        prescriptions_total: issuedTotal,
        avg_wait_minutes: Math.round(avgWait * 10) / 10,
        wait_target: 5,
        reject_rate: decided.length ? Math.round((consultations.filter((c: any) => c.status === 'rejected').length / decided.length) * 1000) / 10 : 0,
        antibiotic_rate: issuedTotal ? Math.round((abTotal / issuedTotal) * 1000) / 10 : 0,
        antibiotic_rate_this_month: issuedThisMonth ? Math.round((abThisMonth / issuedThisMonth) * 1000) / 10 : 0,
        antibiotic_threshold: ANTIBIOTIC_THRESHOLD,
        retention_rate: activePatients.length ? Math.round((returnedPatients.length / activePatients.length) * 1000) / 10 : 0,
        revenue_b2b_vnd: b2bRevenue,
        revenue_consultation_vnd: consultRevenue,
        doctor_fees_vnd: doctorFees,
        video_minutes_this_month: Math.round((videoSecMonth / 60) * 10) / 10,
        counts: {
          patients: patients.length,
          doctors: (await pool.query(`SELECT COUNT(*)::int AS c FROM users WHERE role='doctor'`)).rows[0].c,
          doctors_online: (await pool.query(`SELECT COUNT(*)::int AS c FROM users WHERE role='doctor' AND doctor_online=1`)).rows[0].c,
          pharmacies: (await pool.query(`SELECT COUNT(*)::int AS c FROM pharmacies`)).rows[0].c,
          medicines: (await pool.query(`SELECT COUNT(*)::int AS c FROM medicines`)).rows[0].c,
          partner_registrations: (await pool.query(`SELECT COUNT(*)::int AS c FROM partner_registrations`)).rows[0].c,
        },
      },
    })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Lỗi máy chủ, vui lòng thử lại.' })
  }
})

r.get('/users', async (_req, res) => {
  try {
    await ensureDb()
    const { rows } = await pool.query(`
      SELECT u.id, u.full_name, u.phone, u.role, u.doctor_specialty, u.doctor_online, u.avatar_url, u.pharmacy_id,
        (SELECT name FROM pharmacies WHERE id = u.pharmacy_id) pharmacy_name, u.created_at
      FROM users u ORDER BY u.role, u.full_name`)
    res.json({ users: rows })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Lỗi máy chủ, vui lòng thử lại.' })
  }
})

r.put('/users/:id', async (req, res) => {
  try {
    await ensureDb()
    const u = (await pool.query('SELECT * FROM users WHERE id = $1', [req.params.id])).rows[0]
    if (!u) return res.status(404).json({ error: 'Không tìm thấy tài khoản.' })
    const b = req.body || {}
    await pool.query(
      'UPDATE users SET doctor_online = $1 WHERE id = $2',
      [b.doctor_online !== undefined ? (b.doctor_online ? 1 : 0) : u.doctor_online, u.id]
    )
    res.json({ ok: true })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Lỗi máy chủ, vui lòng thử lại.' })
  }
})

r.get('/medicines', async (_req, res) => {
  try {
    await ensureDb()
    const { rows } = await pool.query('SELECT * FROM medicines ORDER BY name')
    res.json({ medicines: rows })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Lỗi máy chủ, vui lòng thử lại.' })
  }
})

r.post('/medicines', async (req, res) => {
  try {
    await ensureDb()
    const b = req.body || {}
    if (!b.name || !b.active_ingredient) return res.status(400).json({ error: 'Cần tên thuốc và hoạt chất.' })
    const ins = await pool.query(
      `INSERT INTO medicines (name, active_ingredient, pack_size, info, form, category, is_antibiotic, med_group, reference_price)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
      [b.name, b.active_ingredient, b.pack_size || '', b.info || '', b.form || '', b.category === 'rx' ? 'rx' : 'otc', b.is_antibiotic ? 1 : 0, b.med_group || '', b.reference_price || 0]
    )
    res.json({ id: ins.rows[0].id })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Lỗi máy chủ, vui lòng thử lại.' })
  }
})

r.get('/partner-registrations', async (_req, res) => {
  try {
    await ensureDb()
    const { rows } = await pool.query('SELECT * FROM partner_registrations ORDER BY created_at DESC')
    res.json({ registrations: rows })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Lỗi máy chủ, vui lòng thử lại.' })
  }
})

r.put('/partner-registrations/:id', async (req, res) => {
  try {
    await ensureDb()
    const row = (await pool.query('SELECT * FROM partner_registrations WHERE id = $1', [req.params.id])).rows[0]
    if (!row) return res.status(404).json({ error: 'Không tìm thấy đăng ký.' })
    await pool.query('UPDATE partner_registrations SET status = $1 WHERE id = $2', [req.body?.status || row.status, req.params.id])
    res.json({ ok: true })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Lỗi máy chủ, vui lòng thử lại.' })
  }
})

r.get('/consultations', async (_req, res) => {
  try {
    await ensureDb()
    const { rows } = await pool.query(`
      SELECT c.*, u.full_name patient_name, d.full_name doctor_name FROM consultations c
      LEFT JOIN users u ON u.id = c.patient_id LEFT JOIN users d ON d.id = c.doctor_id
      ORDER BY c.created_at DESC LIMIT 50`)
    res.json({ consultations: rows.map((c: any) => ({ ...c, red_flag_reasons: JSON.parse(c.red_flag_reasons || '[]') })) })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Lỗi máy chủ, vui lòng thử lại.' })
  }
})

r.get('/patient-leads', async (_req, res) => {
  try {
    await ensureDb()
    const { rows } = await pool.query('SELECT * FROM patient_leads ORDER BY created_at DESC')
    res.json({ leads: rows })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Lỗi máy chủ, vui lòng thử lại.' })
  }
})

r.put('/patient-leads/:id', async (req, res) => {
  try {
    await ensureDb()
    const row = (await pool.query('SELECT * FROM patient_leads WHERE id = $1', [req.params.id])).rows[0]
    if (!row) return res.status(404).json({ error: 'Không tìm thấy khách hàng quan tâm.' })
    await pool.query('UPDATE patient_leads SET status = $1 WHERE id = $2', [req.body?.status || row.status, req.params.id])
    res.json({ ok: true })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Lỗi máy chủ, vui lòng thử lại.' })
  }
})

// Khôi phục toàn bộ dữ liệu về bộ dữ liệu mẫu
r.post('/reset-demo', async (_req, res) => {
  try {
    await seedDb()
    res.json({ ok: true, message: 'Đã khôi phục dữ liệu. Vui lòng đăng nhập lại.' })
  } catch (e: any) {
    console.error(e)
    res.status(500).json({ error: 'Reset thất bại: ' + (e?.message || e) })
  }
})

export default r
