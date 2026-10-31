import { Router } from 'express'
import { pool, ensureDb, nowIso } from '../db'
import { createSession, mePayload, requireAuth, sha256 } from '../auth'

const r = Router()

// Đăng ký tài khoản — bệnh nhân được tặng 20 token & 2 toa miễn phí
r.post('/register', async (req, res) => {
  try {
    await ensureDb()
    const { full_name, phone, password, role, cccd } = req.body || {}
    if (!full_name || !phone || !password || !role) {
      return res.status(400).json({ error: 'Vui lòng điền đầy đủ họ tên, số điện thoại, mật khẩu và vai trò.' })
    }
    if (!['patient', 'doctor', 'pharmacy'].includes(role)) {
      return res.status(400).json({ error: 'Vai trò không hợp lệ.' })
    }
    if (!/^0\d{9}$/.test(phone)) return res.status(400).json({ error: 'Số điện thoại không hợp lệ (10 số, bắt đầu bằng 0).' })
    if (String(password).length < 6) return res.status(400).json({ error: 'Mật khẩu cần tối thiểu 6 ký tự.' })
    const dup = await pool.query('SELECT id FROM users WHERE phone = $1', [phone])
    if (dup.rows[0]) return res.status(409).json({ error: 'Số điện thoại đã được đăng ký.' })
    const { rows } = await pool.query(
      `INSERT INTO users (full_name, phone, password_hash, cccd, role, token_balance, free_prescriptions, created_at)
       VALUES ($1, $2, $3, $4, $5, 20, $6, $7) RETURNING id`,
      [full_name, phone, sha256(password), cccd || '', role, role === 'patient' ? 2 : 0, nowIso()]
    )
    const userId = rows[0].id
    await pool.query('INSERT INTO health_profiles (user_id, share_consent) VALUES ($1, 1)', [userId])
    if (role === 'patient') {
      await pool.query(
        `INSERT INTO transactions (user_id, type, amount_token, description, created_at)
         VALUES ($1, 'topup', 20, 'Tặng 20 token chào mừng tài khoản mới', $2)`,
        [userId, nowIso()]
      )
    }
    const user = (await pool.query('SELECT * FROM users WHERE id = $1', [userId])).rows[0]
    const token = await createSession(userId)
    res.json({ token, ...mePayload(user) })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Lỗi máy chủ, vui lòng thử lại.' })
  }
})

r.post('/login', async (req, res) => {
  try {
    await ensureDb()
    const { phone, password, role } = req.body || {}
    const user = (await pool.query('SELECT * FROM users WHERE phone = $1', [phone || ''])).rows[0]
    if (!user || user.password_hash !== sha256(password || '')) {
      return res.status(401).json({ error: 'Số điện thoại hoặc mật khẩu không đúng.' })
    }
    if (role && user.role !== role) {
      return res.status(403).json({ error: `Tài khoản này không thuộc vai trò ${role}.` })
    }
    const token = await createSession(user.id)
    res.json({ token, ...mePayload(user) })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Lỗi máy chủ, vui lòng thử lại.' })
  }
})

r.get('/doctors', async (_req, res) => {
  try {
    await ensureDb()
    const { rows } = await pool.query(
      `SELECT id, full_name, doctor_specialty, doctor_license, doctor_online
       FROM users WHERE role = 'doctor' ORDER BY doctor_online DESC, full_name`
    )
    res.json({ doctors: rows.map((d: any) => ({ ...d, doctor_online: !!d.doctor_online })) })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Lỗi máy chủ, vui lòng thử lại.' })
  }
})

r.post('/logout', requireAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM sessions WHERE token = $1', [res.locals.token])
    res.json({ ok: true })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Lỗi máy chủ, vui lòng thử lại.' })
  }
})

r.get('/me', requireAuth, (req, res) => {
  res.json(mePayload(req.user))
})

export default r
