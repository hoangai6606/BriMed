import { Router } from 'express'
import { db, nowIso } from '../db.js'

const r = Router()

// Tìm thuốc theo tên / hoạt chất + so sánh giá & tồn kho giữa các nhà thuốc
r.get('/medicines', (req, res) => {
  const q = String(req.query.q || '').trim()
  const area = String(req.query.area || '').trim()
  let meds: any[] = []
  if (q) {
    meds = db
      .prepare(`SELECT * FROM medicines WHERE name LIKE ? OR active_ingredient LIKE ? ORDER BY name`)
      .all(`%${q}%`, `%${q}%`)
  } else {
    meds = db.prepare('SELECT * FROM medicines ORDER BY name').all()
  }
  const pharmacies = area
    ? db.prepare('SELECT * FROM pharmacies WHERE district LIKE ? ORDER BY name').all(`%${area}%`)
    : db.prepare('SELECT * FROM pharmacies ORDER BY name').all()
  const rows = db
    .prepare(`SELECT i.*, p.name pharmacy_name, p.address pharmacy_address, p.ward, p.district, p.id pharmacy_id
              FROM inventory i JOIN pharmacies p ON p.id = i.pharmacy_id`).all()
  const stockByMed = new Map<number, any[]>()
  for (const row of rows) {
    if (!stockByMed.has(row.medicine_id)) stockByMed.set(row.medicine_id, [])
    stockByMed.get(row.medicine_id)!.push(row)
  }
  const result = meds.map((m) => {
    const stock = (stockByMed.get(m.id) || []).map((s) => ({
      pharmacy_id: s.pharmacy_id,
      pharmacy_name: s.pharmacy_name,
      address: `${s.pharmacy_address}, ${s.ward}`,
      sell_price: s.sell_price,
      stock: s.stock,
      status: s.stock <= 0 ? 'hết hàng' : s.stock <= s.low_stock_threshold ? 'sắp hết' : 'còn hàng',
    }))
    return { ...m, availability: stock, min_price: stock.length ? Math.min(...stock.filter((s) => s.stock > 0).map((s) => s.sell_price)) : null }
  })
  res.json({ medicines: result, pharmacies })
})

// Danh sách nhà thuốc đối tác
r.get('/pharmacies', (_req, res) => {
  res.json({ pharmacies: db.prepare('SELECT * FROM pharmacies ORDER BY name').all() })
})

// Form 2 – đăng ký nhà thuốc đối tác (landing B2B)
r.post('/partner-registrations', (req, res) => {
  const b = req.body || {}
  const required = ['pharmacy_name', 'address', 'owner_name', 'phone', 'license_number', 'pharmacist_name']
  for (const f of required) {
    if (!b[f] || !String(b[f]).trim()) return res.status(400).json({ error: 'Vui lòng điền đầy đủ các trường bắt buộc.' })
  }
  if (!/^0\d{9}$/.test(b.phone)) return res.status(400).json({ error: 'Số điện thoại/Zalo không hợp lệ.' })
  if (!b.agreed) return res.status(400).json({ error: 'Bạn cần đồng ý để BriMed liên hệ và hẹn lắp standee, mã QR.' })
  const info = db
    .prepare(`INSERT INTO partner_registrations (pharmacy_name, address, ward, district, owner_name, phone,
              license_number, pharmacist_name, software, csdl_synced, plan, agreed, status, created_at)
              VALUES (?,?,?,?,?,?,?,?,?,?,?,?, 'new', ?)`)
    .run(b.pharmacy_name, b.address, b.ward || '', b.district || 'Gò Vấp', b.owner_name, b.phone,
      b.license_number, b.pharmacist_name, b.software || '', b.csdl_synced ? 1 : 0, b.plan || '1_month', 1, nowIso())
  res.json({
    ok: true,
    id: Number(info.lastInsertRowid),
    message: 'Đã nhận yêu cầu, BriMed sẽ phản hồi trong 24 giờ làm việc. Hotline: 1900 2026.',
  })
})

export default r
