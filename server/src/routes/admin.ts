import { Router } from 'express'
import { pool, ensureDb, nowIso } from '../db'
import { requireAuth, requireRole } from '../auth'

const r = Router()
r.use(requireAuth, requireRole('admin'))

// Khách hàng quan tâm — form đăng ký trên trang chủ
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
    const { rows } = await pool.query('SELECT * FROM patient_leads WHERE id = $1', [req.params.id])
    if (!rows[0]) return res.status(404).json({ error: 'Không tìm thấy khách hàng quan tâm.' })
    await pool.query('UPDATE patient_leads SET status = $1 WHERE id = $2', [req.body?.status || rows[0].status, req.params.id])
    res.json({ ok: true })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Lỗi máy chủ, vui lòng thử lại.' })
  }
})

// Đăng ký nhà thuốc đối tác
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
    const { rows } = await pool.query('SELECT * FROM partner_registrations WHERE id = $1', [req.params.id])
    if (!rows[0]) return res.status(404).json({ error: 'Không tìm thấy đăng ký.' })
    await pool.query('UPDATE partner_registrations SET status = $1 WHERE id = $2', [req.body?.status || rows[0].status, req.params.id])
    res.json({ ok: true })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Lỗi máy chủ, vui lòng thử lại.' })
  }
})

// Danh sách tài khoản
r.get('/users', async (_req, res) => {
  try {
    await ensureDb()
    const { rows } = await pool.query(`
      SELECT u.id, u.full_name, u.phone, u.role, u.token_balance, u.free_prescriptions,
        u.doctor_specialty, u.pharmacy_id, u.created_at,
        (SELECT name FROM pharmacies WHERE id = u.pharmacy_id) AS pharmacy_name
      FROM users u ORDER BY u.role, u.full_name`)
    res.json({ users: rows })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Lỗi máy chủ, vui lòng thử lại.' })
  }
})

export default r
