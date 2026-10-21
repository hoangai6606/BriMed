import { Router } from 'express'
import { db, nowIso } from '../db.js'
import { requireAuth, requireRole } from '../auth.js'

const r = Router()
r.use(requireAuth, requireRole('pharmacy'))

function myPharmacy(req: any) {
  const p = db.prepare('SELECT * FROM pharmacies WHERE id = ?').get(req.user.pharmacy_id)
  if (!p) throw new Error('NOT_FOUND')
  return p
}

const wrap = (fn: any) => (req: any, res: any) => {
  try {
    fn(req, res)
  } catch (e: any) {
    if (e?.message === 'NOT_FOUND') res.status(400).json({ error: 'Tài khoản chưa được gắn với nhà thuốc.' })
    else throw e
  }
}

// ---------- Tổng quan ----------
r.get('/me', wrap((req: any, res: any) => {
  const p = myPharmacy(req)
  res.json({ pharmacy: p })
}))

r.get('/dashboard', wrap((req: any, res: any) => {
  const p = myPharmacy(req)
  const today = new Date().toISOString().slice(0, 10)
  const orders = db.prepare('SELECT * FROM orders WHERE pharmacy_id = ? ORDER BY created_at DESC').all(p.id)
  const lowStock = db.prepare(`
    SELECT i.*, m.name medicine_name, m.active_ingredient FROM inventory i JOIN medicines m ON m.id = i.medicine_id
    WHERE i.pharmacy_id = ? AND i.stock <= i.low_stock_threshold ORDER BY i.stock ASC`).all(p.id)
  res.json({
    stats: {
      new_orders: orders.filter((o: any) => o.status === 'confirmed').length,
      processing: orders.filter((o: any) => ['preparing', 'ready_or_shipping'].includes(o.status)).length,
      completed_today: orders.filter((o: any) => o.status === 'completed' && String(o.completed_at || '').startsWith(today)).length,
      served_today: orders.filter((o: any) => String(o.created_at || '').startsWith(today)).length,
    },
    low_stock: lowStock,
    recent_orders: orders.slice(0, 10).map(orderWithNames),
  })
}))

function orderWithNames(o: any) {
  const rx: any = db.prepare('SELECT national_code, patient_id FROM prescriptions WHERE id = ?').get(o.prescription_id)
  return {
    ...o,
    items: JSON.parse(o.items || '[]'), quote: o.quote ? JSON.parse(o.quote) : null,
    patient_name: db.prepare('SELECT full_name FROM users WHERE id = ?').get(o.patient_id)?.full_name,
    prescription_code: rx?.national_code,
  }
}

// ---------- Tồn kho ----------
r.get('/inventory', wrap((req: any, res: any) => {
  const p = myPharmacy(req)
  const rows = db.prepare(`
    SELECT i.*, m.name medicine_name, m.active_ingredient, m.pack_size, m.category, m.is_antibiotic, m.reference_price
    FROM inventory i JOIN medicines m ON m.id = i.medicine_id
    WHERE i.pharmacy_id = ? ORDER BY m.name`).all(p.id)
  res.json({ inventory: rows })
}))

r.post('/inventory', wrap((req: any, res: any) => {
  const p = myPharmacy(req)
  const b = req.body || {}
  const m: any = db.prepare('SELECT * FROM medicines WHERE id = ?').get(b.medicine_id)
  if (!m) return res.status(404).json({ error: 'Không tìm thấy thuốc trong danh mục chuẩn.' })
  const exists = db.prepare('SELECT id FROM inventory WHERE pharmacy_id = ? AND medicine_id = ?').get(p.id, m.id)
  if (exists) return res.status(409).json({ error: 'Thuốc đã có trong kho của nhà thuốc.' })
  db.prepare('INSERT INTO inventory (pharmacy_id, medicine_id, sell_price, stock, low_stock_threshold) VALUES (?,?,?,?,?)')
    .run(p.id, m.id, b.sell_price ?? m.reference_price, b.stock ?? 0, b.low_stock_threshold ?? 10)
  res.json({ ok: true })
}))

r.put('/inventory/:id', wrap((req: any, res: any) => {
  const p = myPharmacy(req)
  const row: any = db.prepare('SELECT * FROM inventory WHERE id = ? AND pharmacy_id = ?').get(req.params.id, p.id)
  if (!row) return res.status(404).json({ error: 'Không tìm thấy mục kho.' })
  const b = req.body || {}
  db.prepare('UPDATE inventory SET sell_price=?, stock=?, low_stock_threshold=? WHERE id=?')
    .run(b.sell_price ?? row.sell_price, b.stock ?? row.stock, b.low_stock_threshold ?? row.low_stock_threshold, row.id)
  res.json({ ok: true })
}))

r.delete('/inventory/:id', wrap((req: any, res: any) => {
  const p = myPharmacy(req)
  db.prepare('DELETE FROM inventory WHERE id = ? AND pharmacy_id = ?').run(req.params.id, p.id)
  res.json({ ok: true })
}))

// Danh mục thuốc chuẩn (để thêm mới vào kho)
r.get('/catalog', (_req: any, res: any) => {
  res.json({ medicines: db.prepare('SELECT * FROM medicines ORDER BY name').all() })
})

// ---------- Tiếp nhận đơn ----------
r.post('/receive', wrap((req: any, res: any) => {
  const p = myPharmacy(req)
  const code = String(req.body?.code || '').trim()
  if (!code) return res.status(400).json({ error: 'Vui lòng nhập hoặc quét mã đơn thuốc.' })
  const rx: any = db.prepare('SELECT * FROM prescriptions WHERE national_code = ?').get(code)
  if (!rx) return res.status(404).json({ error: `Không tìm thấy đơn thuốc với mã ${code}.` })
  if (rx.status === 'rejected') return res.status(400).json({ error: 'Đơn thuốc đã bị bác sĩ từ chối.' })
  const order: any = db.prepare('SELECT * FROM orders WHERE prescription_id = ? AND pharmacy_id = ?').get(rx.id, p.id)
  const items = JSON.parse(rx.items || '[]').map((it: any) => {
    const inv: any = db.prepare('SELECT i.*, m.active_ingredient, m.med_group FROM inventory i JOIN medicines m ON m.id = i.medicine_id WHERE i.pharmacy_id = ? AND i.medicine_id = ?').get(p.id, it.medicine_id)
    const options = inv && inv.stock <= 0
      ? db.prepare(`SELECT md.*, iv.sell_price, iv.stock FROM medicines md JOIN inventory iv ON iv.medicine_id = md.id AND iv.pharmacy_id = ?
                    WHERE md.id != ? AND (md.active_ingredient = ? OR md.med_group = ?) AND iv.stock > 0
                    ORDER BY CASE WHEN md.active_ingredient = ? THEN 0 ELSE 1 END`).all(p.id, it.medicine_id, inv.active_ingredient, inv.med_group, inv.active_ingredient)
      : []
    return {
      ...it,
      in_inventory: !!inv,
      sell_price: inv?.sell_price ?? null,
      stock: inv?.stock ?? 0,
      available: !!inv && inv.stock >= it.quantity,
      low: !!inv && inv.stock > 0 && inv.stock <= inv.low_stock_threshold,
      substitute_options: options,
    }
  })
  res.json({
    prescription: {
      ...rx, items: JSON.parse(rx.items || '[]'),
      patient_name: db.prepare('SELECT full_name FROM users WHERE id = ?').get(rx.patient_id)?.full_name,
      doctor_name: db.prepare('SELECT full_name, doctor_specialty FROM users WHERE id = ?').get(rx.doctor_id),
    },
    order: order ? orderWithNames(order) : null,
    stock_check: items,
    all_available: items.every((i: any) => i.available),
  })
}))

// Yêu cầu bác sĩ đổi hoạt chất tương đương (thuốc hết hàng)
r.post('/substitutions', wrap((req: any, res: any) => {
  const p = myPharmacy(req)
  const b = req.body || {}
  const rx: any = db.prepare('SELECT * FROM prescriptions WHERE id = ?').get(b.prescription_id)
  if (!rx) return res.status(404).json({ error: 'Không tìm thấy đơn thuốc.' })
  const med: any = db.prepare('SELECT * FROM medicines WHERE id = ?').get(b.medicine_id)
  if (!med) return res.status(404).json({ error: 'Không tìm thấy thuốc trong đơn.' })
  const dup = db.prepare(`SELECT id FROM substitution_requests WHERE prescription_id = ? AND medicine_id = ? AND status = 'pending'`).get(rx.id, med.id)
  if (dup) return res.status(409).json({ error: 'Đã gửi yêu cầu đổi thuốc này, đang chờ bác sĩ duyệt.' })
  const info = db.prepare(`INSERT INTO substitution_requests (prescription_id, order_id, pharmacy_id, medicine_id, reason, status, created_at)
    VALUES (?,?,?,?,?, 'pending', ?)`)
    .run(rx.id, b.order_id || null, p.id, med.id, b.reason || `${med.name} hết hàng tại quầy`, nowIso())
  res.json({ ok: true, id: Number(info.lastInsertRowid), message: 'Đã gửi yêu cầu đến bác sĩ kê đơn, vui lòng chờ trong ít phút.' })
}))

// ---------- Đơn hàng ----------
r.get('/orders', wrap((req: any, res: any) => {
  const p = myPharmacy(req)
  const rows = db.prepare('SELECT * FROM orders WHERE pharmacy_id = ? ORDER BY created_at DESC').all(p.id)
  res.json({ orders: rows.map(orderWithNames) })
}))

r.get('/orders/:id', wrap((req: any, res: any) => {
  const p = myPharmacy(req)
  const o: any = db.prepare('SELECT * FROM orders WHERE id = ? AND pharmacy_id = ?').get(req.params.id, p.id)
  if (!o) return res.status(404).json({ error: 'Không tìm thấy đơn hàng.' })
  res.json({ order: orderWithNames(o) })
}))

// Báo giá
r.post('/orders/:id/quote', wrap((req: any, res: any) => {
  const p = myPharmacy(req)
  const o: any = db.prepare('SELECT * FROM orders WHERE id = ? AND pharmacy_id = ?').get(req.params.id, p.id)
  if (!o) return res.status(404).json({ error: 'Không tìm thấy đơn hàng.' })
  const lines = Array.isArray(req.body?.items) ? req.body.items : JSON.parse(o.items || '[]')
  const subtotal = lines.reduce((s: number, it: any) => s + (it.unit_price || 0) * it.quantity, 0)
  const deliveryFee = Number(req.body?.delivery_fee) || o.delivery_fee || 0
  const quote = { subtotal, delivery_fee: deliveryFee, total: subtotal + deliveryFee, quoted_at: nowIso() }
  db.prepare('UPDATE orders SET items=?, delivery_fee=?, quote=?, updated_at=? WHERE id=?')
    .run(JSON.stringify(lines), deliveryFee, JSON.stringify(quote), nowIso(), o.id)
  res.json({ order: orderWithNames(db.prepare('SELECT * FROM orders WHERE id = ?').get(o.id)) })
}))

// Xác nhận đơn (khóa báo giá, chuyển sang chuẩn bị)
r.post('/orders/:id/confirm', wrap((req: any, res: any) => {
  const p = myPharmacy(req)
  const o: any = db.prepare('SELECT * FROM orders WHERE id = ? AND pharmacy_id = ?').get(req.params.id, p.id)
  if (!o) return res.status(404).json({ error: 'Không tìm thấy đơn hàng.' })
  if (o.status !== 'confirmed') return res.status(400).json({ error: 'Đơn đã được xác nhận trước đó.' })
  db.prepare(`UPDATE orders SET status='preparing', updated_at=? WHERE id=?`).run(nowIso(), o.id)
  res.json({ order: orderWithNames(db.prepare('SELECT * FROM orders WHERE id = ?').get(o.id)) })
}))

// Chuyển trạng thái: preparing -> ready_or_shipping -> completed
r.post('/orders/:id/advance', wrap((req: any, res: any) => {
  const p = myPharmacy(req)
  const o: any = db.prepare('SELECT * FROM orders WHERE id = ? AND pharmacy_id = ?').get(req.params.id, p.id)
  if (!o) return res.status(404).json({ error: 'Không tìm thấy đơn hàng.' })
  const t = nowIso()
  if (o.status === 'preparing') {
    db.prepare(`UPDATE orders SET status='ready_or_shipping', updated_at=? WHERE id=?`).run(t, o.id)
  } else if (o.status === 'ready_or_shipping') {
    // Hoàn tất: trừ tồn kho, đánh dấu đơn đã cấp phát, ghi giao dịch
    const items = JSON.parse(o.items || '[]')
    const dec = db.prepare('UPDATE inventory SET stock = MAX(0, stock - ?) WHERE pharmacy_id = ? AND medicine_id = ?')
    for (const it of items) dec.run(it.quantity, p.id, it.medicine_id)
    db.prepare(`UPDATE prescriptions SET status='dispensed', dispensed_at=? WHERE id=?`).run(t, o.prescription_id)
    db.prepare(`UPDATE orders SET status='completed', updated_at=?, completed_at=? WHERE id=?`).run(t, t, o.id)
    const rx: any = db.prepare('SELECT * FROM prescriptions WHERE id = ?').get(o.prescription_id)
    db.prepare(`INSERT INTO transactions (user_id, type, amount_token, amount_vnd, description, prescription_id, order_id, created_at)
                VALUES (?, 'doctor_fee', 0, 6000, ?, ?, ?, ?)`)
      .run(rx?.doctor_id || null, `Thù lao bác sĩ toa ${rx?.national_code}`, o.prescription_id, o.id, t)
    if (o.tokens_charged > 0) {
      db.prepare(`INSERT INTO transactions (user_id, type, amount_token, amount_vnd, description, prescription_id, order_id, created_at)
                  VALUES (?, 'token_revenue', ?, ?, ?, ?, ?, ?)`)
        .run(null, o.tokens_charged, o.tokens_charged * 5000, `Doanh thu token đơn ${rx?.national_code}`, o.prescription_id, o.id, t)
    }
  } else {
    return res.status(400).json({ error: 'Đơn hàng đã hoàn tất.' })
  }
  res.json({ order: orderWithNames(db.prepare('SELECT * FROM orders WHERE id = ?').get(o.id)) })
}))

export default r
