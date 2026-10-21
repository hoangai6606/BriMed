import { Router } from 'express'
import { db, nowIso } from '../db.js'
import { requireAuth, requireRole } from '../auth.js'

const r = Router()
r.use(requireAuth, requireRole('doctor'))

function attachNames(c: any) {
  if (!c) return c
  const patient: any = db.prepare('SELECT full_name, phone FROM users WHERE id = ?').get(c.patient_id)
  const doctor: any = c.doctor_id ? db.prepare('SELECT full_name, doctor_specialty FROM users WHERE id = ?').get(c.doctor_id) : null
  const hp: any = db.prepare('SELECT dob, gender, temperature, spo2, blood_pressure FROM health_profiles WHERE user_id = ?').get(c.patient_id)
  return {
    ...c,
    patient_name: patient?.full_name, patient_phone: patient?.phone,
    doctor_name: doctor?.full_name, doctor_specialty: doctor?.doctor_specialty,
    patient_dob: hp?.dob ?? '', patient_gender: hp?.gender ?? '',
    temperature: hp?.temperature ?? null, spo2: hp?.spo2 ?? null, blood_pressure: hp?.blood_pressure ?? '',
    red_flag_reasons: JSON.parse(c.red_flag_reasons || '[]'),
  }
}

function rxWithNames(p: any) {
  return {
    ...p,
    items: JSON.parse(p.items || '[]'),
    patient_name: db.prepare('SELECT full_name FROM users WHERE id = ?').get(p.patient_id)?.full_name,
    doctor_name: db.prepare('SELECT full_name FROM users WHERE id = ?').get(p.doctor_id)?.full_name,
  }
}

// ---------- Hàng đợi ----------
r.get('/queue', (req, res) => {
  const pending = db.prepare(`SELECT * FROM consultations WHERE status = 'pending' ORDER BY created_at ASC`).all()
  const handling = db.prepare(`SELECT * FROM consultations WHERE doctor_id = ? AND status IN ('in_call','approved','rejected') ORDER BY created_at DESC LIMIT 20`).all(req.user.id)
  res.json({ queue: pending.map(attachNames), mine: handling.map(attachNames) })
})

r.get('/consultations/:id', (req, res) => {
  const c: any = db.prepare('SELECT * FROM consultations WHERE id = ?').get(req.params.id)
  if (!c) return res.status(404).json({ error: 'Không tìm thấy yêu cầu tư vấn.' })
  const hp: any = db.prepare('SELECT * FROM health_profiles WHERE user_id = ?').get(c.patient_id)
  res.json({
    consultation: attachNames(c),
    health_profile: hp?.share_consent ? hp : null,
    profile_locked: !hp?.share_consent,
  })
})

// Bắt đầu / kết thúc cuộc gọi ngắn 1–2 phút
r.post('/consultations/:id/call-log', (req, res) => {
  const c: any = db.prepare('SELECT * FROM consultations WHERE id = ?').get(req.params.id)
  if (!c || ['approved', 'rejected'].includes(c.status)) return res.status(400).json({ error: 'Yêu cầu đã được xử lý.' })
  const action = req.body?.action
  if (action === 'start') {
    db.prepare(`UPDATE consultations SET status = 'in_call', doctor_id = ?, call_started_at = ? WHERE id = ?`).run(req.user.id, nowIso(), c.id)
  } else if (action === 'end') {
    db.prepare('UPDATE consultations SET call_duration_sec = ?, call_note = ? WHERE id = ?')
      .run(Number(req.body?.duration_sec) || 0, req.body?.call_note || '', c.id)
  }
  res.json({ consultation: attachNames(db.prepare('SELECT * FROM consultations WHERE id = ?').get(c.id)) })
})

// Từ chối kê đơn / chuyển khám trực tiếp
r.post('/consultations/:id/decision', (req, res) => {
  const c: any = db.prepare('SELECT * FROM consultations WHERE id = ?').get(req.params.id)
  if (!c || ['approved', 'rejected'].includes(c.status)) return res.status(400).json({ error: 'Yêu cầu đã được xử lý.' })
  if (req.body?.decision !== 'reject') return res.status(400).json({ error: 'Dùng POST /doctor/prescriptions để kê đơn.' })
  const reason = String(req.body?.reason || '').trim()
  if (!reason) return res.status(400).json({ error: 'Vui lòng ghi rõ lý do từ chối / chuyển khám.' })
  const t = nowIso()
  db.prepare(`UPDATE consultations SET status='rejected', doctor_id=?, reject_reason=?, doctor_note=?, decided_at=? WHERE id=?`)
    .run(req.user.id, reason, req.body?.note || '', t, c.id)
  db.prepare(`INSERT INTO prescriptions (national_code, consultation_id, patient_id, doctor_id, items, status, reject_reason, created_at)
              VALUES (?,?,?,?, 'rejected', ?, ?)`)
    .run(nextCode(), c.id, c.patient_id, req.user.id, reason, t)
  res.json({ ok: true, consultation: attachNames(db.prepare('SELECT * FROM consultations WHERE id = ?').get(c.id)) })
})

// ---------- Hồ sơ bệnh nhân (chỉ khi được cấp quyền) ----------
r.get('/patients/:id/record', (req, res) => {
  const patient: any = db.prepare(`SELECT * FROM users WHERE id = ? AND role='patient'`).get(req.params.id)
  if (!patient) return res.status(404).json({ error: 'Không tìm thấy bệnh nhân.' })
  const hp: any = db.prepare('SELECT * FROM health_profiles WHERE user_id = ?').get(patient.id)
  if (!hp?.share_consent) {
    return res.status(403).json({ error: 'Bệnh nhân chưa đồng ý chia sẻ hồ sơ sức khỏe.', profile_locked: true })
  }
  const history = db.prepare('SELECT * FROM consultations WHERE patient_id = ? ORDER BY created_at DESC LIMIT 10').all(patient.id)
  const rxs = db.prepare(`SELECT * FROM prescriptions WHERE patient_id = ? AND status != 'rejected' ORDER BY created_at DESC LIMIT 10`).all(patient.id)
  res.json({
    patient: { id: patient.id, full_name: patient.full_name, phone: patient.phone, token_balance: patient.token_balance },
    profile: hp,
    consultations: history.map(attachNames),
    prescriptions: rxs.map(rxWithNames),
  })
})

// Danh sách hồ sơ bệnh nhân đã cấp quyền truy cập
r.get('/patients', (req, res) => {
  const rows = db.prepare(`
    SELECT DISTINCT u.id, u.full_name, u.phone, hp.dob, hp.gender, hp.share_consent,
      (SELECT COUNT(*) FROM consultations c WHERE c.patient_id = u.id) consult_count
    FROM users u JOIN health_profiles hp ON hp.user_id = u.id
    WHERE u.role='patient' AND EXISTS (SELECT 1 FROM consultations c WHERE c.patient_id = u.id AND c.doctor_id = ?)
  `).all(req.user.id)
  res.json({ patients: rows })
})

// ---------- Tạo đơn thuốc điện tử (TT 26/2025) ----------
function nextCode(): string {
  const last: any = db.prepare(`SELECT national_code FROM prescriptions ORDER BY id DESC LIMIT 1`).get()
  const n = last ? Number(last.national_code.split('-').pop()) + 1 : 1
  return `VN-Rx-2026-${String(n).padStart(5, '0')}`
}

r.get('/prescriptions/mine', (req, res) => {
  const rows = db.prepare('SELECT * FROM prescriptions WHERE doctor_id = ? ORDER BY created_at DESC').all(req.user.id)
  res.json({ prescriptions: rows.map(rxWithNames) })
})

r.post('/prescriptions', (req, res) => {
  const b = req.body || {}
  const items = Array.isArray(b.items) ? b.items : []
  if (!items.length) return res.status(400).json({ error: 'Đơn thuốc cần ít nhất 1 thuốc.' })
  for (const it of items) {
    if (!it.medicine_id || !it.dosage || !it.usage || !it.quantity) {
      return res.status(400).json({ error: 'Mỗi thuốc cần đủ: liều dùng, cách dùng, thời gian và số lượng.' })
    }
    if (!db.prepare('SELECT id FROM medicines WHERE id = ?').get(it.medicine_id)) {
      return res.status(400).json({ error: `Thuốc (id ${it.medicine_id}) không có trong danh mục chuẩn.` })
    }
  }
  let consultation: any = null
  let patientId = Number(b.patient_id) || null
  if (b.consultation_id) {
    consultation = db.prepare('SELECT * FROM consultations WHERE id = ?').get(b.consultation_id)
    if (!consultation) return res.status(404).json({ error: 'Không tìm thấy phiên tư vấn.' })
    if (['approved', 'rejected'].includes(consultation.status)) return res.status(400).json({ error: 'Phiên tư vấn đã được xử lý.' })
    patientId = consultation.patient_id
  }
  if (!patientId) return res.status(400).json({ error: 'Thiếu thông tin bệnh nhân.' })

  const meds = items.map((it: any) => {
    const m: any = db.prepare('SELECT * FROM medicines WHERE id = ?').get(it.medicine_id)
    return {
      medicine_id: m.id, name: m.name, active_ingredient: m.active_ingredient,
      dosage: it.dosage, usage: it.usage, duration_days: it.duration_days || 3, quantity: it.quantity,
    }
  })
  const hasAb = meds.some((m: any) => db.prepare('SELECT is_antibiotic FROM medicines WHERE id = ?').get(m.medicine_id)?.is_antibiotic)
  if (hasAb && !b.antibiotic_confirmed) {
    return res.status(400).json({ error: 'Kê kháng sinh cần bác sĩ xác nhận chỉ định (tỷ lệ toa kháng sinh đang được giám sát).' })
  }
  const t = nowIso()
  const code = nextCode()
  const sig = `SmartCA-BS.${String(req.user.id).padStart(4, '0')}-${t.replace(/[-:.]/g, '').slice(0, 13)}Z`
  const info = db.prepare(`INSERT INTO prescriptions (national_code, consultation_id, patient_id, doctor_id, items,
    digital_signature, status, has_antibiotic, note, issued_at, created_at)
    VALUES (?,?,?,?,?,?, 'issued', ?, ?, ?, ?)`)
    .run(code, b.consultation_id || null, patientId, req.user.id, JSON.stringify(meds), sig, hasAb ? 1 : 0, b.note || '', t, t)
  if (consultation) {
    db.prepare(`UPDATE consultations SET status='approved', doctor_id=?, doctor_note=?, decided_at=? WHERE id=?`)
      .run(req.user.id, b.note || '', t, consultation.id)
  }
  res.json({ prescription: rxWithNames(db.prepare('SELECT * FROM prescriptions WHERE id = ?').get(Number(info.lastInsertRowid))) })
})

// ---------- Duyệt thay thế hoạt chất tương đương ----------
r.get('/substitutions/mine', (req, res) => {
  const rows = db.prepare(`SELECT s.*, m.name medicine_name, m.active_ingredient,
      sm.name substitute_name, p.national_code, p.items AS rx_items, ph.name pharmacy_name, u.full_name patient_name
    FROM substitution_requests s
    JOIN medicines m ON m.id = s.medicine_id
    LEFT JOIN medicines sm ON sm.id = s.substitute_medicine_id
    JOIN prescriptions p ON p.id = s.prescription_id
    JOIN pharmacies ph ON ph.id = s.pharmacy_id
    JOIN users u ON u.id = p.patient_id
    WHERE p.doctor_id = ? ORDER BY s.created_at DESC`).all(req.user.id)
  res.json({
    substitutions: rows.map((x: any) => ({
      ...x, rx_items: JSON.parse(x.rx_items || '[]'),
      options: sameGroupOptions(x.medicine_id, x.pharmacy_id),
    })),
  })
})

function sameGroupOptions(medicineId: number, pharmacyId: number) {
  const m: any = db.prepare('SELECT * FROM medicines WHERE id = ?').get(medicineId)
  if (!m) return []
  const rows = db.prepare(`
    SELECT md.*, i.sell_price, i.stock FROM medicines md
    JOIN inventory i ON i.medicine_id = md.id AND i.pharmacy_id = ?
    WHERE md.id != ? AND (md.active_ingredient = ? OR md.med_group = ?) AND i.stock > 0
    ORDER BY CASE WHEN md.active_ingredient = ? THEN 0 ELSE 1 END, i.stock DESC`).all(pharmacyId, medicineId, m.active_ingredient, m.med_group, m.active_ingredient)
  return rows
}

r.post('/substitutions/:id/approve', (req, res) => {
  const s: any = db.prepare('SELECT * FROM substitution_requests WHERE id = ?').get(req.params.id)
  if (!s) return res.status(404).json({ error: 'Không tìm thấy yêu cầu đổi thuốc.' })
  if (s.status !== 'pending') return res.status(400).json({ error: 'Yêu cầu đã được xử lý.' })
  const rx: any = db.prepare('SELECT * FROM prescriptions WHERE id = ?').get(s.prescription_id)
  if (!rx) return res.status(404).json({ error: 'Không tìm thấy đơn thuốc gốc.' })
  if (rx.doctor_id !== req.user.id) return res.status(403).json({ error: 'Chỉ bác sĩ kê đơn mới được duyệt thay thế.' })

  if (req.body?.decision === 'reject') {
    db.prepare(`UPDATE substitution_requests SET status='rejected', doctor_id=?, decided_at=? WHERE id=?`).run(req.user.id, nowIso(), s.id)
    return res.json({ ok: true, status: 'rejected' })
  }
  const subId = Number(req.body?.substitute_medicine_id)
  const sub: any = db.prepare('SELECT * FROM medicines WHERE id = ?').get(subId)
  if (!sub) return res.status(400).json({ error: 'Chọn thuốc thay thế hợp lệ.' })
  const inv: any = db.prepare('SELECT stock FROM inventory WHERE pharmacy_id = ? AND medicine_id = ?').get(s.pharmacy_id, subId)
  if (!inv || inv.stock <= 0) return res.status(400).json({ error: 'Thuốc thay thế không còn hàng tại nhà thuốc.' })

  const t = nowIso()
  const items = JSON.parse(rx.items || '[]').map((it: any) =>
    it.medicine_id === s.medicine_id
      ? {
          ...it, medicine_id: sub.id, name: sub.name, active_ingredient: sub.active_ingredient,
          dosage: req.body?.dosage || it.dosage, usage: req.body?.usage || it.usage,
          substitution_note: `Thay thế ${it.name} (hết hàng) – cùng hoạt chất/nhóm điều trị`,
        }
      : it
  )
  const sig = `SmartCA-BS.${String(req.user.id).padStart(4, '0')}-${t.replace(/[-:.]/g, '').slice(0, 13)}Z-R`
  db.prepare('UPDATE prescriptions SET items=?, digital_signature=?, note = ? WHERE id=?')
    .run(JSON.stringify(items), sig, `${rx.note} | [Cấp lại đơn do thay thế hoạt chất: ${sub.name}]`.trim(), rx.id)
  db.prepare(`UPDATE substitution_requests SET status='approved', substitute_medicine_id=?, doctor_id=?, decided_at=? WHERE id=?`)
    .run(subId, req.user.id, t, s.id)
  const order: any = db.prepare('SELECT * FROM orders WHERE prescription_id = ?').get(rx.id)
  if (order) {
    const updatedItems = items.map((it: any) => {
      const inv2: any = db.prepare('SELECT sell_price FROM inventory WHERE pharmacy_id = ? AND medicine_id = ?').get(s.pharmacy_id, it.medicine_id)
      const unit = inv2?.sell_price ?? 0
      return { ...it, unit_price: unit, line_total: unit * it.quantity }
    })
    db.prepare('UPDATE orders SET items=?, updated_at=? WHERE id=?').run(JSON.stringify(updatedItems), t, order.id)
  }
  res.json({ ok: true, status: 'approved', prescription: rxWithNames(db.prepare('SELECT * FROM prescriptions WHERE id = ?').get(rx.id)) })
})

export default r
