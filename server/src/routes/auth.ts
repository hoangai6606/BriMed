import { Router } from 'express'
import { db, nowIso, publicUser } from '../db.js'
import { createSession, mePayload, requireAuth, sha256 } from '../auth.js'

const r = Router()

r.post('/register', (req, res) => {
  const { full_name, phone, password, role, cccd } = req.body || {}
  if (!full_name || !phone || !password || !role) {
    return res.status(400).json({ error: 'Vui lòng điền đầy đủ họ tên, số điện thoại, mật khẩu và vai trò.' })
  }
  if (!['patient', 'doctor', 'pharmacy'].includes(role)) {
    return res.status(400).json({ error: 'Vai trò không hợp lệ.' })
  }
  if (!/^0\d{9}$/.test(phone)) return res.status(400).json({ error: 'Số điện thoại không hợp lệ (10 số, bắt đầu bằng 0).' })
  if (String(password).length < 6) return res.status(400).json({ error: 'Mật khẩu cần tối thiểu 6 ký tự.' })
  if (db.prepare('SELECT id FROM users WHERE phone = ?').get(phone)) {
    return res.status(409).json({ error: 'Số điện thoại đã được đăng ký.' })
  }
  const info = db
    .prepare(`INSERT INTO users (full_name, phone, password_hash, cccd, role, token_balance, free_prescriptions, created_at)
              VALUES (?, ?, ?, ?, ?, 20, ?, ?)`)
    .run(full_name, phone, sha256(password), cccd || '', role, role === 'patient' ? 2 : 0, nowIso())
  const userId = Number(info.lastInsertRowid)
  db.prepare('INSERT INTO health_profiles (user_id, share_consent) VALUES (?, 1)').run(userId)
  if (role === 'patient') {
    db.prepare(`INSERT INTO transactions (user_id, type, amount_token, description, created_at)
                VALUES (?, 'topup', 20, 'Tặng 20 token chào mừng tài khoản mới', ?)`).run(userId, nowIso())
  }
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId)
  res.json({ token: createSession(userId), ...mePayload(user) })
})

r.post('/login', (req, res) => {
  const { phone, password, role } = req.body || {}
  const user: any = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone || '')
  if (!user || user.password_hash !== sha256(password || '')) {
    return res.status(401).json({ error: 'Số điện thoại hoặc mật khẩu không đúng.' })
  }
  if (role && user.role !== role) {
    return res.status(403).json({ error: `Tài khoản này không thuộc vai trò ${role}.` })
  }
  res.json({ token: createSession(user.id), ...mePayload(user) })
})

r.post('/quick-login', (req, res) => {
  const map: Record<string, string> = { patient: '0901234567', doctor: '0908888881', pharmacy: '0907777771', admin: '0900000001' }
  const phone = map[(req.body || {}).persona || '']
  const user: any = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone || '')
  if (!user) return res.status(404).json({ error: 'Không tìm thấy tài khoản đăng nhập nhanh. Vui lòng đăng nhập bằng số điện thoại.' })
  res.json({ token: createSession(user.id), ...mePayload(user) })
})

r.get('/doctors', (_req, res) => {
  const doctors = db
    .prepare(`SELECT id, full_name, doctor_specialty, doctor_license, doctor_online FROM users WHERE role='doctor' ORDER BY doctor_online DESC, full_name`)
    .all()
  res.json({ doctors })
})

r.post('/logout', requireAuth, (req, res) => {
  db.prepare('DELETE FROM sessions WHERE token = ?').run(res.locals.token)
  res.json({ ok: true })
})

r.get('/me', requireAuth, (req, res) => {
  res.json(mePayload(req.user))
})

export default r
