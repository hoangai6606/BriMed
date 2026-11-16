import { Router } from 'express'
import { pool, nowIso } from '../db'

// Ghi nhận lượt truy cập trang cho bảng "Phân tích & Theo dõi" của quản trị viên.
// Route công khai (khách chưa đăng nhập vẫn được ghi, role='guest'); nếu request
// mang token hợp lệ, middleware attachUser đã gắn req.user → ghi đúng vai trò.
const r = Router()

// Dedupe trong bộ nhớ: cùng visitor + path trong 10 giây chỉ ghi 1 sự kiện
// (tránh double-fire khi React StrictMode / điều hướng SPA chạy effect 2 lần)
const recent = new Map<string, number>()
if (typeof setInterval === 'function') {
  const cleaner = setInterval(() => {
    const cutoff = Date.now() - 60_000
    for (const [k, t] of recent) if (t < cutoff) recent.delete(k)
  }, 60_000)
  ;(cleaner as any).unref?.()
}

r.post('/visit', async (req, res) => {
  try {
    const b = req.body || {}
    const path = String(b.path || '/').slice(0, 200)
    const referrer = String(b.referrer || '').slice(0, 300)
    const visitorId = String(b.visitor_id || '').slice(0, 64)
    const key = `${visitorId}:${path}`
    const now = Date.now()
    if (visitorId && recent.has(key) && now - (recent.get(key) as number) < 10_000) {
      return res.json({ ok: true, deduped: true })
    }
    if (visitorId) recent.set(key, now)
    await pool.query(
      `INSERT INTO activity_events (user_id, role, event, path, referrer, visitor_id, created_at)
       VALUES ($1, $2, 'visit', $3, $4, $5, $6)`,
      [req.user?.id ?? null, req.user?.role || 'guest', path, referrer, visitorId, nowIso()]
    )
    res.json({ ok: true })
  } catch {
    // Tracking không bao giờ được làm hỏng trải nghiệm người dùng
    res.status(200).json({ ok: false })
  }
})

export default r
