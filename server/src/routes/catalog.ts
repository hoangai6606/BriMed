import { Router } from 'express'
import { pool, ensureDb, nowIso } from '../db'

const r = Router()

// Tìm thuốc theo tên / hoạt chất + so sánh giá & tồn kho giữa các nhà thuốc
r.get('/medicines', async (req, res) => {
  try {
    await ensureDb()
    const q = String(req.query.q || '').trim()
    const area = String(req.query.area || '').trim()
    const meds = q
      ? (await pool.query('SELECT * FROM medicines WHERE name ILIKE $1 OR active_ingredient ILIKE $1 ORDER BY name', [`%${q}%`])).rows
      : (await pool.query('SELECT * FROM medicines ORDER BY name')).rows
    const pharmacies = area
      ? (await pool.query('SELECT * FROM pharmacies WHERE district ILIKE $1 ORDER BY name', [`%${area}%`])).rows
      : (await pool.query('SELECT * FROM pharmacies ORDER BY name')).rows
    const { rows } = await pool.query(
      `SELECT i.*, p.name AS pharmacy_name, p.address AS pharmacy_address, p.ward, p.district, p.id AS pharmacy_id
       FROM inventory i JOIN pharmacies p ON p.id = i.pharmacy_id`
    )
    const stockByMed = new Map<number, any[]>()
    for (const row of rows) {
      if (!stockByMed.has(row.medicine_id)) stockByMed.set(row.medicine_id, [])
      stockByMed.get(row.medicine_id)!.push(row)
    }
    const result = meds.map((m: any) => {
      const stock = (stockByMed.get(m.id) || []).map((s: any) => ({
        pharmacy_id: s.pharmacy_id,
        pharmacy_name: s.pharmacy_name,
        address: `${s.pharmacy_address}, ${s.ward}`,
        sell_price: s.sell_price,
        stock: s.stock,
        status: s.stock <= 0 ? 'hết hàng' : s.stock <= s.low_stock_threshold ? 'sắp hết' : 'còn hàng',
      }))
      const inStock = stock.filter((s) => s.stock > 0)
      return { ...m, availability: stock, min_price: inStock.length ? Math.min(...inStock.map((s) => s.sell_price)) : null }
    })
    res.json({ medicines: result, pharmacies })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Lỗi máy chủ, vui lòng thử lại.' })
  }
})

// Danh sách nhà thuốc đối tác
r.get('/pharmacies', async (_req, res) => {
  try {
    await ensureDb()
    const { rows } = await pool.query('SELECT * FROM pharmacies ORDER BY name')
    res.json({ pharmacies: rows })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Lỗi máy chủ, vui lòng thử lại.' })
  }
})

// Form 2 – đăng ký nhà thuốc đối tác (landing B2B)
r.post('/partner-registrations', async (req, res) => {
  try {
    await ensureDb()
    const b = req.body || {}
    const required = ['pharmacy_name', 'address', 'owner_name', 'phone', 'license_number', 'pharmacist_name']
    for (const f of required) {
      if (!b[f] || !String(b[f]).trim()) return res.status(400).json({ error: 'Vui lòng điền đầy đủ các trường bắt buộc.' })
    }
    if (!/^0\d{9}$/.test(b.phone || '')) return res.status(400).json({ error: 'Số điện thoại/Zalo không hợp lệ.' })
    if (!b.agreed) return res.status(400).json({ error: 'Bạn cần đồng ý để BriMed liên hệ và hẹn lắp standee, mã QR.' })
    const { rows } = await pool.query(
      `INSERT INTO partner_registrations (pharmacy_name, address, ward, district, owner_name, phone,
        license_number, pharmacist_name, software, csdl_synced, plan, agreed, status, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,1,'new',$12) RETURNING id`,
      [b.pharmacy_name, b.address, b.ward || '', b.district || 'Gò Vấp', b.owner_name, b.phone,
        b.license_number, b.pharmacist_name, b.software || '', b.csdl_synced ? 1 : 0, b.plan || '1_month', nowIso()]
    )
    res.json({
      ok: true,
      id: rows[0].id,
      message: 'Đã nhận yêu cầu, BriMed sẽ phản hồi trong 24 giờ làm việc. Hotline: 1900 2026.',
    })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Lỗi máy chủ, vui lòng thử lại.' })
  }
})

// Đăng ký quan tâm của khách hàng cá nhân (form trên trang chủ)
r.post('/patient-leads', async (req, res) => {
  try {
    await ensureDb()
    const b = req.body || {}
    if (!b.full_name || !String(b.full_name).trim()) return res.status(400).json({ error: 'Vui lòng nhập họ tên.' })
    if (!/^0\d{9}$/.test(b.phone || '')) return res.status(400).json({ error: 'Số điện thoại/Zalo không hợp lệ (10 số, bắt đầu bằng 0).' })
    const { rows } = await pool.query(
      `INSERT INTO patient_leads (full_name, phone, interest, status, created_at) VALUES ($1, $2, $3, 'new', $4) RETURNING id`,
      [String(b.full_name).trim(), b.phone, b.interest || 'Muốn dùng BriMed', nowIso()]
    )
    res.json({
      ok: true,
      id: rows[0].id,
      message: 'Đã nhận thông tin! BriMed sẽ liên hệ hướng dẫn bạn nhận 2 toa miễn phí trong 24 giờ.',
    })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Lỗi máy chủ, vui lòng thử lại.' })
  }
})

// Dang ky quan tam cua khach hang ca nhan (form tren trang chu)
r.post('/patient-leads', (req, res) => {
  const b = req.body || {}
  if (!b.full_name || !String(b.full_name).trim()) return res.status(400).json({ error: 'Vui lòng nhập họ tên.' })
  if (!/^0\d{9}$/.test(b.phone || '')) return res.status(400).json({ error: 'Số điện thoại/Zalo không hợp lệ (10 số, bắt đầu bằng 0).' })
  const info = db
    .prepare(`INSERT INTO patient_leads (full_name, phone, interest, status, created_at) VALUES (?, ?, ?, 'new', ?)`)
    .run(String(b.full_name).trim(), b.phone, b.interest || 'Muốn dùng BriMed', nowIso())
  res.json({
    ok: true,
    id: Number(info.lastInsertRowid),
    message: 'Đã nhận thông tin! BriMed sẽ liên hệ hướng dẫn bạn nhận 2 toa miễn phí trong 24 giờ.',
  })
})

export default r
