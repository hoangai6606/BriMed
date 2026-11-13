import { Router } from 'express'
import { pool, ensureDb, nowIso } from '../db'
import { createSession, mePayload, requireAuth, sha256 } from '../auth'

const r = Router()

// Đăng ký tài khoản — miễn phí, phí khám trả theo lượt qua VietQR
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
      `INSERT INTO users (full_name, phone, password_hash, cccd, role, created_at)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [full_name, phone, sha256(password), cccd || '', role, nowIso()]
    )
    const userId = rows[0].id
    await pool.query('INSERT INTO health_profiles (user_id, share_consent) VALUES ($1, 1)', [userId])
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
    if (user.role === 'doctor') {
      await pool.query('UPDATE users SET doctor_online = 1, last_seen_at = $1 WHERE id = $2', [nowIso(), user.id])
      user.doctor_online = 1
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
    const nowIso = new Date().toISOString()
    const { rows } = await pool.query(
      `SELECT u.id, u.full_name, u.doctor_specialty, u.doctor_license, u.doctor_online, u.last_seen_at, u.avatar_url,
        (SELECT ds.starts_at FROM doctor_slots ds
          WHERE ds.doctor_id = u.id AND ds.status = 'open' AND ds.starts_at > $1
            AND (SELECT COUNT(*)::int FROM consultations c2 WHERE c2.slot_id = ds.id AND c2.status != 'rejected') < ds.capacity
          ORDER BY ds.starts_at LIMIT 1) AS next_slot_at
       FROM users u WHERE u.role = 'doctor'
       ORDER BY (u.doctor_online = 1 AND u.last_seen_at != '' AND u.last_seen_at > $2) DESC, u.full_name`,
      [nowIso, new Date(Date.now() - 10 * 60000).toISOString()]
    )
    // Thời gian phản hồi trung bình từ 20 lượt đã xử lý gần nhất (phút)
    const avgRow = (await pool.query(
      `SELECT ROUND(AVG((EXTRACT(EPOCH FROM (decided_at::timestamp - created_at::timestamp)) / 60))::numeric, 1)::float AS m
       FROM (SELECT decided_at, created_at FROM consultations
             WHERE decided_at IS NOT NULL ORDER BY decided_at DESC LIMIT 20) t`
    )).rows[0]
    res.json({
      avg_wait_minutes: avgRow?.m ?? null,
      doctors: rows.map((d: any) => ({
        ...d,
        doctor_online: !!d.doctor_online && !!d.last_seen_at && (Date.now() - new Date(d.last_seen_at).getTime() < 10 * 60000),
        verified: !!d.doctor_license,
        avatar_url: d.avatar_url || '',
      })),
    })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Lỗi máy chủ, vui lòng thử lại.' })
  }
})

r.post('/logout', requireAuth, async (req, res) => {
  try {
    if (req.user.role === 'doctor') {
      await pool.query('UPDATE users SET doctor_online = 0 WHERE id = $1', [req.user.id])
    }
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
