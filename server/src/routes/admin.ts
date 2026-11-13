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

    // Ca đã trả phí nhưng chờ quá 15 phút chưa ai nhận (cảnh báo vận hành)
    const stuck = (await pool.query(
      `SELECT COUNT(*)::int AS c FROM consultations WHERE status = 'pending' AND payment_status = 'paid' AND created_at < $1`,
      [new Date(Date.now() - 15 * 60000).toISOString()]
    )).rows[0].c

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
        stuck_over_15min: stuck,
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
      'UPDATE users SET doctor_online = $1, last_seen_at = CASE WHEN $1 = 1 THEN $2 ELSE last_seen_at END WHERE id = $3',
      [b.doctor_online !== undefined ? (b.doctor_online ? 1 : 0) : u.doctor_online, nowIso(), u.id]
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

// S2-9/10: can thiệp ca kẹt — huỷ & hoàn tiền, hoặc gắn lại bác sĩ
r.post('/consultations/:id/force-close', async (req, res) => {
  try {
    await ensureDb()
    const c = (await pool.query('SELECT * FROM consultations WHERE id = $1', [req.params.id])).rows[0]
    if (!c) return res.status(404).json({ error: 'Không tìm thấy phiên tư vấn.' })
    if (c.status !== 'pending') return res.status(400).json({ error: 'Chỉ can thiệp được phiên đang chờ.' })
    if (req.body?.doctor_id) {
      const doc = (await pool.query(`SELECT id, full_name FROM users WHERE id = $1 AND role = 'doctor'`, [Number(req.body.doctor_id)])).rows[0]
      if (!doc) return res.status(404).json({ error: 'Không tìm thấy bác sĩ.' })
      await pool.query('UPDATE consultations SET preferred_doctor_id = $1 WHERE id = $2', [doc.id, c.id])
      return res.json({ ok: true, message: `Đã gắn phiên #${c.id} cho ${doc.full_name}.` })
    }
    await pool.query(`UPDATE consultations SET status = 'cancelled' WHERE id = $1`, [c.id])
    if (c.payment_status === 'paid') {
      await pool.query(`UPDATE consultations SET payment_status = 'refunded' WHERE id = $1`, [c.id])
      await pool.query(
        `INSERT INTO transactions (user_id, type, amount_token, amount_vnd, description, consultation_id, created_at)
         VALUES ($1, 'consultation_refund', 0, -25000, $2, $3, $4)`,
        [c.patient_id, `Hoàn phí khám do quản trị đóng phiên kẹt #${c.id}`, c.id, nowIso()]
      )
      return res.json({ ok: true, refunded: true, message: `Đã huỷ phiên #${c.id} và hoàn 25.000đ cho bệnh nhân.` })
    }
    res.json({ ok: true, refunded: false, message: `Đã huỷ phiên #${c.id} (chưa thanh toán).` })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Lỗi máy chủ, vui lòng thử lại.' })
  }
})

// S2-11: tạo tài khoản mới (bác sĩ / bệnh nhân / nhà thuốc)
r.post('/users', async (req, res) => {
  try {
    await ensureDb()
    const b = req.body || {}
    if (!b.full_name || !b.phone) return res.status(400).json({ error: 'Cần họ tên và số điện thoại.' })
    if (!/^0\d{9}$/.test(b.phone)) return res.status(400).json({ error: 'Số điện thoại không hợp lệ.' })
    if (!['patient', 'doctor', 'pharmacy'].includes(b.role)) return res.status(400).json({ error: 'Vai trò không hợp lệ.' })
    const dup = (await pool.query('SELECT id FROM users WHERE phone = $1', [b.phone])).rows[0]
    if (dup) return res.status(409).json({ error: `Số điện thoại ${b.phone} đã có tài khoản.` })
    let pharmacyId: number | null = null
    if (b.role === 'pharmacy') {
      if (!b.pharmacy_id) return res.status(400).json({ error: 'Chọn nhà thuốc để gắn tài khoản.' })
      const ph = (await pool.query('SELECT id FROM pharmacies WHERE id = $1', [Number(b.pharmacy_id)])).rows[0]
      if (!ph) return res.status(404).json({ error: 'Không tìm thấy nhà thuốc.' })
      pharmacyId = ph.id
    }
    const password = b.password || ('brimed@' + String(Math.floor(1000 + Math.random() * 9000)))
    const { sha256 } = await import('../auth.js')
    const ins = await pool.query(
      `INSERT INTO users (full_name, phone, password_hash, cccd, role, doctor_specialty, doctor_license, avatar_url, pharmacy_id, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
      [b.full_name, b.phone, sha256(password), b.cccd || '', b.role,
        b.role === 'doctor' ? (b.doctor_specialty || 'Nội tổng quát') : null,
        b.role === 'doctor' ? (b.doctor_license || '') : null,
        b.role === 'doctor' ? (b.avatar_url || '') : '',
        pharmacyId, nowIso()]
    )
    res.json({ ok: true, id: ins.rows[0].id, account: { phone: b.phone, password, note: 'Mật khẩu hiển thị một lần — chuyển giao và yêu cầu đổi sau đăng nhập đầu tiên.' } })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Lỗi máy chủ, vui lòng thử lại.' })
  }
})

// Duyệt đăng ký đối tác -> tự tạo nhà thuốc + tài khoản quản lý (onboarding khép kín)
r.post('/registrations/:id/provision', async (req, res) => {
  try {
    await ensureDb()
    const reg = (await pool.query('SELECT * FROM partner_registrations WHERE id = $1', [req.params.id])).rows[0]
    if (!reg) return res.status(404).json({ error: 'Không tìm thấy đăng ký.' })
    if (reg.status === 'converted') return res.status(400).json({ error: 'Đăng ký này đã được duyệt và tạo tài khoản.' })

    const dup = (await pool.query('SELECT id FROM users WHERE phone = $1', [reg.phone])).rows[0]
    if (dup) return res.status(409).json({ error: `Số điện thoại ${reg.phone} đã có tài khoản trên hệ thống.` })

    const ph = (await pool.query(
      `INSERT INTO pharmacies (name, address, ward, district, owner_name, phone, license_number, pharmacist_name, csdl_synced, subscription_plan, subscription_started_at, standee_code)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
      [reg.pharmacy_name, reg.address, reg.ward, reg.district, reg.owner_name, reg.phone,
        reg.license_number, reg.pharmacist_name, reg.csdl_synced ? 1 : 0, reg.plan || '1_month',
        nowIso(), 'BR-GV-' + String(Math.floor(100 + Math.random() * 900))]
    )).rows[0]

    const password = 'brimed@' + String(Math.floor(1000 + Math.random() * 9000))
    const { sha256 } = await import('../auth.js')
    const user = (await pool.query(
      `INSERT INTO users (full_name, phone, password_hash, role, pharmacy_id, created_at)
       VALUES ($1,$2,$3,'pharmacy',$4,$5) RETURNING id`,
      ['QL ' + reg.pharmacy_name, reg.phone, sha256(password), ph.id, nowIso()]
    )).rows[0]

    await pool.query('UPDATE partner_registrations SET status = $1 WHERE id = $2', ['converted', reg.id])
    res.json({
      ok: true,
      pharmacy_id: ph.id,
      account: { phone: reg.phone, password, note: 'Mật khẩu hiển thị một lần — chuyển giao cho nhà thuốc và yêu cầu đổi sau khi đăng nhập đầu tiên.' },
      message: `Đã tạo nhà thuốc "${reg.pharmacy_name}" và tài khoản quản lý ${reg.phone}.`,
    })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Lỗi máy chủ, vui lòng thử lại.' })
  }
})

// Chốt phí thuê bao tháng hiện tại cho toàn bộ nhà thuốc (500k tháng 1-6, 900k từ tháng 7)
r.post('/bill-subscriptions', async (_req, res) => {
  try {
    await ensureDb()
    const now = new Date()
    const monthTag = `T${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const pharmacies = (await pool.query('SELECT * FROM pharmacies ORDER BY name')).rows
    const results: any[] = []
    for (const p of pharmacies) {
      if (!p.subscription_started_at) continue
      const monthsActive = (now.getTime() - new Date(p.subscription_started_at).getTime()) / (30.44 * 86400000)
      const price = monthsActive < 6 ? 500000 : 900000
      const dup = (await pool.query(
        `SELECT id FROM transactions WHERE type = 'b2b_subscription' AND description LIKE '%' || $1 || '%' AND description LIKE '%' || $2 || '%'`,
        [monthTag, p.name]
      )).rows[0]
      if (dup) { results.push({ pharmacy: p.name, status: 'already', monthTag }); continue }
      await pool.query(
        `INSERT INTO transactions (user_id, type, amount_token, amount_vnd, description, created_at)
         VALUES (NULL, 'b2b_subscription', 0, $1, $2, $3)`,
        [price, `Phí nhà thuốc ${monthTag} – ${p.name} (${price === 500000 ? '6 tháng đầu' : 'ổn định'})`, nowIso()]
      )
      results.push({ pharmacy: p.name, status: 'billed', amount: price, monthTag })
    }
    res.json({ ok: true, month: monthTag, results })
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
