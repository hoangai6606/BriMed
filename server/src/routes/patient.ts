import { Router } from 'express'
import { db, nowIso } from '../db.js'
import { requireAuth, requireRole } from '../auth.js'

const r = Router()
r.use(requireAuth, requireRole('patient'))

const ALLOWED_DISEASES = [
  'Cúm', 'Viêm mũi họng cấp', 'Viêm mũi họng mạn', 'COVID-19', 'Bệnh da dị ứng/nấm',
  'Viêm kết mạc', 'Đau đầu do căng thẳng', 'Đầu nửa đầu (Migraine)', 'Viêm dạ dày – tá tràng',
  'Trào ngược', 'Táo bón',
]

export function computeRedFlags(b: any): string[] {
  const flags: string[] = []
  if (b.is_child) flags.push('Trẻ nhỏ – không nhận qua kênh từ xa, cần khám trực tiếp')
  if (b.pregnancy) flags.push('Thai phụ – không nhận qua kênh từ xa, cần khám trực tiếp')
  if (b.shortness_of_breath) flags.push('Khó thở / thở khò khè – dấu hiệu nặng, cần khám trực tiếp')
  if (b.fever && Number(b.fever_days) > 3) flags.push(`Sốt ${b.fever_days} ngày (trên 3 ngày) – cần khám trực tiếp`)
  if (!ALLOWED_DISEASES.includes(b.disease_group)) flags.push('Triệu chứng ngoài danh mục bệnh được phép khám từ xa (TT 30/2023)')
  return flags
}

// ---------- Hồ sơ sức khỏe ----------
r.get('/health-profile/me', (req, res) => {
  let row = db.prepare('SELECT * FROM health_profiles WHERE user_id = ?').get(req.user.id)
  if (!row) {
    db.prepare('INSERT INTO health_profiles (user_id) VALUES (?)').run(req.user.id)
    row = db.prepare('SELECT * FROM health_profiles WHERE user_id = ?').get(req.user.id)
  }
  res.json({ profile: row })
})

r.put('/health-profile/me', (req, res) => {
  const b = req.body || {}
  const p = db.prepare('SELECT * FROM health_profiles WHERE user_id = ?').get(req.user.id) as any
  db.prepare(`UPDATE health_profiles SET dob=?, gender=?, medical_history=?, drug_allergies=?, pregnant=?,
              current_medicines=?, temperature=?, spo2=?, blood_pressure=?, share_consent=? WHERE user_id=?`).run(
    b.dob ?? p.dob, b.gender ?? p.gender, b.medical_history ?? p.medical_history, b.drug_allergies ?? p.drug_allergies,
    b.pregnant ? 1 : 0, b.current_medicines ?? p.current_medicines, b.temperature ?? p.temperature,
    b.spo2 ?? p.spo2, b.blood_pressure ?? p.blood_pressure, b.share_consent ? 1 : 0, req.user.id
  )
  res.json({ profile: db.prepare('SELECT * FROM health_profiles WHERE user_id = ?').get(req.user.id) })
})

// ---------- Tư vấn / Form 1 ----------
r.post('/consultations', (req, res) => {
  const b = req.body || {}
  if (!b.disease_group) return res.status(400).json({ error: 'Vui lòng chọn nhóm triệu chứng chính.' })
  if (!b.symptom || !String(b.symptom).trim()) return res.status(400).json({ error: 'Vui lòng mô tả triệu chứng chính.' })
  if (!b.consent1 || !b.consent2) {
    return res.status(400).json({ error: 'Bạn cần đánh dấu cả 2 ô đồng ý trước khi gửi.' })
  }
  const redFlags = computeRedFlags(b)
  if (redFlags.length) {
    return res.status(422).json({
      error: 'Yêu cầu có dấu hiệu cảnh báo y khoa (cờ đỏ), không thể tạo yêu cầu kê đơn từ xa.',
      red_flags: redFlags,
      guidance: 'Vui lòng đến khám trực tiếp tại cơ sở y tế gần nhất. Trường hợp khẩn cấp hãy gọi 115.',
    })
  }
  const info = db.prepare(`INSERT INTO consultations (patient_id, disease_group, symptom, duration_days, fever, fever_days,
    shortness_of_breath, is_child, pregnancy, drug_allergies, current_medicines, consent_share, red_flag, status, created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,0,'pending',?)`).run(
    req.user.id, b.disease_group, b.symptom, b.duration_days || 1, b.fever ? 1 : 0, b.fever_days || 0,
    b.shortness_of_breath ? 1 : 0, b.is_child ? 1 : 0, b.pregnancy ? 1 : 0,
    b.drug_allergies || '', b.current_medicines || '', b.consent_share !== false ? 1 : 0, nowIso()
  )
  db.prepare('UPDATE health_profiles SET drug_allergies=?, current_medicines=?, pregnant=? WHERE user_id=?')
    .run(b.drug_allergies || '', b.current_medicines || '', b.pregnancy ? 1 : 0, req.user.id)
  const row = attachNames(db.prepare('SELECT * FROM consultations WHERE id = ?').get(Number(info.lastInsertRowid)))
  res.json({ consultation: row })
})

function attachNames(c: any) {
  if (!c) return c
  const patient = db.prepare('SELECT full_name, phone FROM users WHERE id = ?').get(c.patient_id)
  const doctor = c.doctor_id ? db.prepare('SELECT full_name, doctor_specialty FROM users WHERE id = ?').get(c.doctor_id) : null
  return {
    ...c,
    patient_name: patient?.full_name, patient_phone: patient?.phone,
    doctor_name: doctor?.full_name, doctor_specialty: doctor?.doctor_specialty,
    red_flag_reasons: JSON.parse(c.red_flag_reasons || '[]'),
  }
}

r.get('/consultations/mine', (req, res) => {
  const rows = db.prepare('SELECT * FROM consultations WHERE patient_id = ? ORDER BY created_at DESC').all(req.user.id)
  res.json({ consultations: rows.map(attachNames) })
})

// ---------- Đơn thuốc của tôi ----------
r.get('/prescriptions/mine', (req, res) => {
  const rows = db.prepare('SELECT * FROM prescriptions WHERE patient_id = ? ORDER BY created_at DESC').all(req.user.id)
  const orders = db.prepare('SELECT * FROM orders WHERE patient_id = ?').all(req.user.id)
  const result = rows.map((p: any) => ({
    ...p,
    items: JSON.parse(p.items || '[]'),
    doctor_name: db.prepare('SELECT full_name FROM users WHERE id = ?').get(p.doctor_id)?.full_name,
    order: orders.find((o: any) => o.prescription_id === p.id) || null,
  }))
  res.json({ prescriptions: result })
})

// Mua tại quầy (3 token) hoặc lấy mã đi nơi khác (4 token)
r.post('/prescriptions/:id/purchase', (req, res) => {
  const mode = req.body?.mode
  const rx: any = db.prepare('SELECT * FROM prescriptions WHERE id = ? AND patient_id = ?').get(req.params.id, req.user.id)
  if (!rx) return res.status(404).json({ error: 'Không tìm thấy đơn thuốc.' })
  if (rx.status === 'rejected') return res.status(400).json({ error: 'Đơn đã bị từ chối, không thể sử dụng.' })
  if (rx.status === 'dispensed') return res.status(400).json({ error: 'Đơn đã được cấp phát, hoàn tất.' })
  const existing = db.prepare('SELECT * FROM orders WHERE prescription_id = ?').get(rx.id)
  if (existing) return res.status(409).json({ error: 'Đơn này đã có đơn hàng đang xử lý.', order: existing })

  const cost = mode === 'elsewhere' ? 4 : 3
  const useFree = req.user.free_prescriptions > 0
  if (!useFree && req.user.token_balance < cost) {
    return res.status(402).json({ error: `Không đủ token (cần ${cost}, đang có ${req.user.token_balance}). Vui lòng nạp thêm.` })
  }
  let pharmacy: any = null
  if (mode !== 'elsewhere') {
    pharmacy = db.prepare('SELECT * FROM pharmacies WHERE id = ?').get(Number(req.body?.pharmacy_id))
    if (!pharmacy) return res.status(400).json({ error: 'Vui lòng chọn nhà thuốc đối tác để mua tại quầy.' })
  }
  const t = nowIso()
  if (useFree) {
    db.prepare('UPDATE users SET free_prescriptions = free_prescriptions - 1 WHERE id = ?').run(req.user.id)
    db.prepare(`INSERT INTO transactions (user_id, type, amount_token, amount_vnd, description, prescription_id, created_at)
                VALUES (?, 'prescription_free', 0, 0, ?, ?, ?)`)
      .run(req.user.id, `Dùng toa miễn phí (${rx.national_code})`, rx.id, t)
  } else {
    db.prepare('UPDATE users SET token_balance = token_balance - ? WHERE id = ?').run(cost, req.user.id)
    db.prepare(`INSERT INTO transactions (user_id, type, amount_token, amount_vnd, description, prescription_id, created_at)
                VALUES (?, 'token_deduct', ?, ?, ?, ?, ?)`)
      .run(req.user.id, -cost, cost * 5000, `${mode === 'elsewhere' ? 'Lấy mã đơn mang đi nơi khác' : 'Mua tại quầy'} (${rx.national_code})`, rx.id, t)
  }

  if (mode === 'elsewhere') {
    return res.json({
      mode, used_free: useFree, tokens_charged: 0, national_code: rx.national_code,
      message: 'Đã trừ 4 token. Quý khách mang mã đơn đến bất kỳ nhà thuốc hợp lệ nào để mua thuốc.',
    })
  }
  const items = JSON.parse(rx.items || '[]').map((it: any) => {
    const inv: any = db.prepare('SELECT sell_price FROM inventory WHERE pharmacy_id = ? AND medicine_id = ?').get(pharmacy.id, it.medicine_id)
    const unit = inv?.sell_price ?? 0
    return { ...it, unit_price: unit, line_total: unit * it.quantity }
  })
  const ins = db.prepare(`INSERT INTO orders (prescription_id, patient_id, pharmacy_id, items, receive_method,
    tokens_charged, is_free, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)`)
  const orderInfo = ins.run(rx.id, req.user.id, pharmacy.id, JSON.stringify(items), 'pickup', useFree ? 0 : cost, useFree ? 1 : 0, 'confirmed', t, t)
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(Number(orderInfo.lastInsertRowid))
  res.json({
    mode, used_free: useFree, tokens_charged: useFree ? 0 : cost, order,
    message: `Đã tạo đơn hàng tại ${pharmacy.name}. Vui lòng đến quầy và cung cấp mã đơn ${rx.national_code}.`,
  })
})

// ---------- Đơn hàng ----------
r.get('/orders/mine', (req, res) => {
  const rows = db.prepare('SELECT * FROM orders WHERE patient_id = ? ORDER BY created_at DESC').all(req.user.id)
  const result = rows.map((o: any) => ({
    ...o,
    items: JSON.parse(o.items || '[]'), quote: o.quote ? JSON.parse(o.quote) : null,
    pharmacy_name: db.prepare('SELECT name FROM pharmacies WHERE id = ?').get(o.pharmacy_id)?.name,
    prescription_code: db.prepare('SELECT national_code FROM prescriptions WHERE id = ?').get(o.prescription_id)?.national_code,
  }))
  res.json({ orders: result })
})

// ---------- Lịch sử & nhắc uống ----------
r.get('/reminders/mine', (req, res) => {
  const rows = db.prepare('SELECT * FROM reminders WHERE patient_id = ? ORDER BY created_at DESC').all(req.user.id)
  res.json({ reminders: rows.map((x: any) => ({ ...x, times: JSON.parse(x.times || '[]') })) })
})

r.post('/reminders', (req, res) => {
  const b = req.body || {}
  if (!b.medicine_name) return res.status(400).json({ error: 'Vui lòng nhập tên thuốc cần nhắc.' })
  if (!Array.isArray(b.times) || !b.times.length) return res.status(400).json({ error: 'Chọn ít nhất 1 buổi (Sáng/Trưa/Tối).' })
  const info = db.prepare('INSERT INTO reminders (patient_id, prescription_id, medicine_name, times, note, active, created_at) VALUES (?,?,?,?,?,1,?)')
    .run(req.user.id, b.prescription_id || null, b.medicine_name, JSON.stringify(b.times), b.note || '', nowIso())
  const row: any = db.prepare('SELECT * FROM reminders WHERE id = ?').get(Number(info.lastInsertRowid))
  res.json({ reminder: { ...row, times: JSON.parse(row.times) } })
})

r.put('/reminders/:id', (req, res) => {
  const b = req.body || {}
  const row = db.prepare('SELECT * FROM reminders WHERE id = ? AND patient_id = ?').get(req.params.id, req.user.id)
  if (!row) return res.status(404).json({ error: 'Không tìm thấy lời nhắc.' })
  db.prepare('UPDATE reminders SET active = ?, times = ?, note = ? WHERE id = ?')
    .run(b.active === false ? 0 : 1, JSON.stringify(b.times || JSON.parse((row as any).times)), b.note ?? (row as any).note, req.params.id)
  const updated: any = db.prepare('SELECT * FROM reminders WHERE id = ?').get(req.params.id)
  res.json({ reminder: { ...updated, times: JSON.parse(updated.times) } })
})

r.delete('/reminders/:id', (req, res) => {
  db.prepare('DELETE FROM reminders WHERE id = ? AND patient_id = ?').run(req.params.id, req.user.id)
  res.json({ ok: true })
})

// ---------- Lịch sử giao dịch ----------
r.get('/transactions/mine', (req, res) => {
  res.json({ transactions: db.prepare('SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id) })
})

// ---------- Lịch sử điều trị ----------
r.get('/history', (req, res) => {
  const cs = db.prepare('SELECT * FROM consultations WHERE patient_id = ? ORDER BY created_at DESC').all(req.user.id)
  const rxs = db.prepare('SELECT * FROM prescriptions WHERE patient_id = ? ORDER BY created_at DESC').all(req.user.id)
  res.json({
    consultations: cs.map(attachNames),
    prescriptions: rxs.map((p: any) => ({
      ...p, items: JSON.parse(p.items || '[]'),
      doctor_name: db.prepare('SELECT full_name FROM users WHERE id = ?').get(p.doctor_id)?.full_name,
    })),
  })
})

export default r
