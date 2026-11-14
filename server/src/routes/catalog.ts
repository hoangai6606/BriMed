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

// Lịch bác sĩ trực 7 ngày tới (công khai, chỉ đọc) — cho mục "Lịch bác sĩ" trên trang chủ.
// Chỉ trả thông tin hành nghề công khai (tên, chuyên khoa, mã CCHN), không lộ dữ liệu bệnh nhân.
r.get('/schedule', async (_req, res) => {
  try {
    await ensureDb()
    const now = new Date()
    const until = new Date(now.getTime() + 7 * 24 * 3600_000)
    const { rows } = await pool.query(
      `SELECT ds.id, ds.starts_at, ds.duration_min, ds.capacity,
        u.id AS doctor_id, u.full_name AS doctor_name, u.doctor_specialty, u.doctor_license, u.avatar_url,
        (SELECT COUNT(*)::int FROM consultations c
          WHERE c.slot_id = ds.id AND c.status NOT IN ('rejected','cancelled')
            AND (c.payment_status = 'paid' OR c.created_at > $3)) AS booked
       FROM doctor_slots ds JOIN users u ON u.id = ds.doctor_id
       WHERE ds.status = 'open' AND ds.starts_at > $1 AND ds.starts_at < $2 AND u.role = 'doctor'
       ORDER BY ds.starts_at ASC LIMIT 80`,
      // Cùng quy tắc với lúc đặt lịch: ghế chưa thanh toán chỉ được giữ 15 phút
      [now.toISOString(), until.toISOString(), new Date(now.getTime() - 15 * 60000).toISOString()]
    )
    res.json({
      slots: rows.map((s: any) => ({
        ...s,
        avatar_url: s.avatar_url || '',
        seats_left: Math.max(0, Number(s.capacity) - Number(s.booked)),
      })),
    })
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

export default r
