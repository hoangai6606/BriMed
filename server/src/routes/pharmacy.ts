import { Router } from 'express'
import { pool, nowIso } from '../db'
import { requireAuth, requireRole } from '../auth'

const r = Router()
r.use(requireAuth, requireRole('pharmacy'))

async function myPharmacy(req: any) {
  const p = (await pool.query('SELECT * FROM pharmacies WHERE id = $1', [req.user.pharmacy_id])).rows[0]
  if (!p) throw new Error('NOT_FOUND')
  return p
}

const wrap = (fn: any) => async (req: any, res: any) => {
  try {
    await fn(req, res)
  } catch (e: any) {
    if (e?.message === 'NOT_FOUND') res.status(400).json({ error: 'Tài khoản chưa được gắn với nhà thuốc.' })
    else {
      console.error(e)
      res.status(500).json({ error: 'Lỗi máy chủ, vui lòng thử lại.' })
    }
  }
}

// ---------- Tổng quan ----------
r.get('/me', wrap(async (req: any, res: any) => {
  const p = await myPharmacy(req)
  res.json({ pharmacy: p })
}))

r.get('/dashboard', wrap(async (req: any, res: any) => {
  const p = await myPharmacy(req)
  const today = new Date().toISOString().slice(0, 10)
  const orders = (await pool.query('SELECT * FROM orders WHERE pharmacy_id = $1 ORDER BY created_at DESC', [p.id])).rows
  const lowStock = (await pool.query(
    `SELECT i.*, m.name medicine_name, m.active_ingredient FROM inventory i JOIN medicines m ON m.id = i.medicine_id
     WHERE i.pharmacy_id = $1 AND i.stock <= i.low_stock_threshold ORDER BY i.stock ASC`,
    [p.id]
  )).rows
  res.json({
    stats: {
      new_orders: orders.filter((o: any) => o.status === 'confirmed').length,
      processing: orders.filter((o: any) => ['preparing', 'ready_or_shipping'].includes(o.status)).length,
      completed_today: orders.filter((o: any) => o.status === 'completed' && String(o.completed_at || '').startsWith(today)).length,
      served_today: orders.filter((o: any) => String(o.created_at || '').startsWith(today)).length,
    },
    low_stock: lowStock,
    recent_orders: await Promise.all(orders.slice(0, 10).map(orderWithNames)),
  })
}))

async function orderWithNames(o: any) {
  const rx = (await pool.query('SELECT national_code, patient_id FROM prescriptions WHERE id = $1', [o.prescription_id])).rows[0]
  return {
    ...o,
    items: JSON.parse(o.items || '[]'), quote: o.quote ? JSON.parse(o.quote) : null,
    patient_name: (await pool.query('SELECT full_name FROM users WHERE id = $1', [o.patient_id])).rows[0]?.full_name,
    prescription_code: rx?.national_code,
  }
}

// ---------- Tồn kho ----------
r.get('/inventory', wrap(async (req: any, res: any) => {
  const p = await myPharmacy(req)
  const { rows } = await pool.query(
    `SELECT i.*, m.name medicine_name, m.active_ingredient, m.pack_size, m.category, m.is_antibiotic, m.reference_price
     FROM inventory i JOIN medicines m ON m.id = i.medicine_id
     WHERE i.pharmacy_id = $1 ORDER BY m.name`,
    [p.id]
  )
  res.json({ inventory: rows })
}))

r.post('/inventory', wrap(async (req: any, res: any) => {
  const p = await myPharmacy(req)
  const b = req.body || {}
  const m = (await pool.query('SELECT * FROM medicines WHERE id = $1', [b.medicine_id])).rows[0]
  if (!m) return res.status(404).json({ error: 'Không tìm thấy thuốc trong danh mục chuẩn.' })
  const exists = (await pool.query('SELECT id FROM inventory WHERE pharmacy_id = $1 AND medicine_id = $2', [p.id, m.id])).rows[0]
  if (exists) return res.status(409).json({ error: 'Thuốc đã có trong kho của nhà thuốc.' })
  await pool.query(
    'INSERT INTO inventory (pharmacy_id, medicine_id, sell_price, stock, low_stock_threshold) VALUES ($1,$2,$3,$4,$5)',
    [p.id, m.id, b.sell_price ?? m.reference_price, b.stock ?? 0, b.low_stock_threshold ?? 10]
  )
  res.json({ ok: true })
}))

r.put('/inventory/:id', wrap(async (req: any, res: any) => {
  const p = await myPharmacy(req)
  const row = (await pool.query('SELECT * FROM inventory WHERE id = $1 AND pharmacy_id = $2', [req.params.id, p.id])).rows[0]
  if (!row) return res.status(404).json({ error: 'Không tìm thấy mục kho.' })
  const b = req.body || {}
  await pool.query(
    'UPDATE inventory SET sell_price=$1, stock=$2, low_stock_threshold=$3 WHERE id=$4',
    [b.sell_price ?? row.sell_price, b.stock ?? row.stock, b.low_stock_threshold ?? row.low_stock_threshold, row.id]
  )
  res.json({ ok: true })
}))

r.delete('/inventory/:id', wrap(async (req: any, res: any) => {
  const p = await myPharmacy(req)
  await pool.query('DELETE FROM inventory WHERE id = $1 AND pharmacy_id = $2', [req.params.id, p.id])
  res.json({ ok: true })
}))

// Danh mục thuốc chuẩn (để thêm mới vào kho)
r.get('/catalog', wrap(async (_req: any, res: any) => {
  const { rows } = await pool.query('SELECT * FROM medicines ORDER BY name')
  res.json({ medicines: rows })
}))

// ---------- Tiếp nhận đơn ----------
r.post('/receive', wrap(async (req: any, res: any) => {
  const p = await myPharmacy(req)
  const code = String(req.body?.code || '').trim()
  if (!code) return res.status(400).json({ error: 'Vui lòng nhập hoặc quét mã đơn thuốc.' })
  const rx = (await pool.query('SELECT * FROM prescriptions WHERE national_code = $1', [code])).rows[0]
  if (!rx) return res.status(404).json({ error: `Không tìm thấy đơn thuốc với mã ${code}.` })
  if (rx.status === 'rejected') return res.status(400).json({ error: 'Đơn thuốc đã bị bác sĩ từ chối.' })
  const order = (await pool.query('SELECT * FROM orders WHERE prescription_id = $1 AND pharmacy_id = $2', [rx.id, p.id])).rows[0]
  const rawItems = JSON.parse(rx.items || '[]')
  const items = []
  for (const it of rawItems) {
    const inv = (await pool.query(
      'SELECT i.*, m.active_ingredient, m.med_group FROM inventory i JOIN medicines m ON m.id = i.medicine_id WHERE i.pharmacy_id = $1 AND i.medicine_id = $2',
      [p.id, it.medicine_id]
    )).rows[0]
    let options: any[] = []
    if (inv && inv.stock <= 0) {
      options = (await pool.query(
        `SELECT md.*, iv.sell_price, iv.stock FROM medicines md JOIN inventory iv ON iv.medicine_id = md.id AND iv.pharmacy_id = $1
         WHERE md.id != $2 AND (md.active_ingredient = $3 OR md.med_group = $4) AND iv.stock > 0
         ORDER BY CASE WHEN md.active_ingredient = $5 THEN 0 ELSE 1 END`,
        [p.id, it.medicine_id, inv.active_ingredient, inv.med_group, inv.active_ingredient]
      )).rows
    }
    items.push({
      ...it,
      in_inventory: !!inv,
      sell_price: inv?.sell_price ?? null,
      stock: inv?.stock ?? 0,
      available: !!inv && inv.stock >= it.quantity,
      low: !!inv && inv.stock > 0 && inv.stock <= inv.low_stock_threshold,
      substitute_options: options,
    })
  }
  res.json({
    prescription: {
      ...rx, items: JSON.parse(rx.items || '[]'),
      patient_name: (await pool.query('SELECT full_name FROM users WHERE id = $1', [rx.patient_id])).rows[0]?.full_name,
      doctor_name: (await pool.query('SELECT full_name, doctor_specialty FROM users WHERE id = $1', [rx.doctor_id])).rows[0]?.full_name,
    },
    order: order ? await orderWithNames(order) : null,
    stock_check: items,
    all_available: items.every((i: any) => i.available),
  })
}))

// Yêu cầu bác sĩ đổi hoạt chất tương đương (thuốc hết hàng)
r.post('/substitutions', wrap(async (req: any, res: any) => {
  const p = await myPharmacy(req)
  const b = req.body || {}
  const rx = (await pool.query('SELECT * FROM prescriptions WHERE id = $1', [b.prescription_id])).rows[0]
  if (!rx) return res.status(404).json({ error: 'Không tìm thấy đơn thuốc.' })
  const med = (await pool.query('SELECT * FROM medicines WHERE id = $1', [b.medicine_id])).rows[0]
  if (!med) return res.status(404).json({ error: 'Không tìm thấy thuốc trong đơn.' })
  const dup = (await pool.query(
    `SELECT id FROM substitution_requests WHERE prescription_id = $1 AND medicine_id = $2 AND status = 'pending'`,
    [rx.id, med.id]
  )).rows[0]
  if (dup) return res.status(409).json({ error: 'Đã gửi yêu cầu đổi thuốc này, đang chờ bác sĩ duyệt.' })
  const ins = await pool.query(
    `INSERT INTO substitution_requests (prescription_id, order_id, pharmacy_id, medicine_id, reason, status, created_at)
     VALUES ($1,$2,$3,$4,$5, 'pending', $6) RETURNING id`,
    [rx.id, b.order_id || null, p.id, med.id, b.reason || `${med.name} hết hàng tại quầy`, nowIso()]
  )
  res.json({ ok: true, id: ins.rows[0].id, message: 'Đã gửi yêu cầu đến bác sĩ kê đơn, vui lòng chờ trong ít phút.' })
}))

// ---------- Đơn hàng ----------
r.get('/orders', wrap(async (req: any, res: any) => {
  const p = await myPharmacy(req)
  const { rows } = await pool.query('SELECT * FROM orders WHERE pharmacy_id = $1 ORDER BY created_at DESC', [p.id])
  res.json({ orders: await Promise.all(rows.map(orderWithNames)) })
}))

r.get('/orders/:id', wrap(async (req: any, res: any) => {
  const p = await myPharmacy(req)
  const o = (await pool.query('SELECT * FROM orders WHERE id = $1 AND pharmacy_id = $2', [req.params.id, p.id])).rows[0]
  if (!o) return res.status(404).json({ error: 'Không tìm thấy đơn hàng.' })
  res.json({ order: await orderWithNames(o) })
}))

// Báo giá
r.post('/orders/:id/quote', wrap(async (req: any, res: any) => {
  const p = await myPharmacy(req)
  const o = (await pool.query('SELECT * FROM orders WHERE id = $1 AND pharmacy_id = $2', [req.params.id, p.id])).rows[0]
  if (!o) return res.status(404).json({ error: 'Không tìm thấy đơn hàng.' })
  const lines = Array.isArray(req.body?.items) ? req.body.items : JSON.parse(o.items || '[]')
  const subtotal = lines.reduce((s: number, it: any) => s + (it.unit_price || 0) * it.quantity, 0)
  const deliveryFee = Number(req.body?.delivery_fee) || o.delivery_fee || 0
  const quote = { subtotal, delivery_fee: deliveryFee, total: subtotal + deliveryFee, quoted_at: nowIso() }
  await pool.query('UPDATE orders SET items=$1, delivery_fee=$2, quote=$3, updated_at=$4 WHERE id=$5',
    [JSON.stringify(lines), deliveryFee, JSON.stringify(quote), nowIso(), o.id])
  const updated = (await pool.query('SELECT * FROM orders WHERE id = $1', [o.id])).rows[0]
  res.json({ order: await orderWithNames(updated) })
}))

// Xác nhận đơn (khóa báo giá, chuyển sang chuẩn bị)
r.post('/orders/:id/confirm', wrap(async (req: any, res: any) => {
  const p = await myPharmacy(req)
  const o = (await pool.query('SELECT * FROM orders WHERE id = $1 AND pharmacy_id = $2', [req.params.id, p.id])).rows[0]
  if (!o) return res.status(404).json({ error: 'Không tìm thấy đơn hàng.' })
  if (o.status !== 'confirmed') return res.status(400).json({ error: 'Đơn đã được xác nhận trước đó.' })
  await pool.query(`UPDATE orders SET status='preparing', updated_at=$1 WHERE id=$2`, [nowIso(), o.id])
  const updated = (await pool.query('SELECT * FROM orders WHERE id = $1', [o.id])).rows[0]
  res.json({ order: await orderWithNames(updated) })
}))

// Chuyển trạng thái: preparing -> ready_or_shipping -> completed
r.post('/orders/:id/advance', wrap(async (req: any, res: any) => {
  const p = await myPharmacy(req)
  const o = (await pool.query('SELECT * FROM orders WHERE id = $1 AND pharmacy_id = $2', [req.params.id, p.id])).rows[0]
  if (!o) return res.status(404).json({ error: 'Không tìm thấy đơn hàng.' })
  const t = nowIso()
  if (o.status === 'preparing') {
    await pool.query(`UPDATE orders SET status='ready_or_shipping', updated_at=$1 WHERE id=$2`, [t, o.id])
  } else if (o.status === 'ready_or_shipping') {
    // Hoàn tất: trừ tồn kho, đánh dấu đơn đã cấp phát
    const items = JSON.parse(o.items || '[]')
    for (const it of items) {
      await pool.query('UPDATE inventory SET stock = GREATEST(0, stock - $1) WHERE pharmacy_id = $2 AND medicine_id = $3',
        [it.quantity, p.id, it.medicine_id])
    }
    await pool.query(`UPDATE prescriptions SET status='dispensed', dispensed_at=$1 WHERE id=$2`, [t, o.prescription_id])
    await pool.query(`UPDATE orders SET status='completed', updated_at=$1, completed_at=$2 WHERE id=$3`, [t, t, o.id])
  } else {
    return res.status(400).json({ error: 'Đơn hàng đã hoàn tất.' })
  }
  const updated = (await pool.query('SELECT * FROM orders WHERE id = $1', [o.id])).rows[0]
  res.json({ order: await orderWithNames(updated) })
}))

export default r
