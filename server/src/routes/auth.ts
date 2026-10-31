import { Router } from 'express'
import { pool, ensureDb, nowIso } from '../db'
import { createSession, mePayload, requireAuth, sha256 } from '../auth'

const r = Router()

// Đăng nhập — Giai đoạn 1 chỉ có tài khoản quản trị viên
r.post('/login', async (req, res) => {
  try {
    await ensureDb()
    const { phone, password } = req.body || {}
    const { rows } = await pool.query('SELECT * FROM users WHERE phone = $1', [phone || ''])
    const user = rows[0]
    if (!user || user.password_hash !== sha256(password || '')) {
      return res.status(401).json({ error: 'Số điện thoại hoặc mật khẩu không đúng.' })
    }
    const token = await createSession(user.id)
    res.json({ token, ...mePayload(user) })
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
