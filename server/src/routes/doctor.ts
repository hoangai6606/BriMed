import { Router } from 'express'
import { pool, nowIso } from '../db'
import { requireAuth, requireRole } from '../auth'

const r = Router()
r.use(requireAuth, requireRole('doctor'))

async function attachNames(c: any) {
  if (!c) return c
  const patient = (await pool.query('SELECT full_name, phone FROM users WHERE id = $1', [c.patient_id])).rows[0]
  const doctor = c.doctor_id
    ? (await pool.query('SELECT full_name, doctor_specialty FROM users WHERE id = $1', [c.doctor_id])).rows[0]
    : null
  const hp = (await pool.query('SELECT dob, gender, temperature, spo2, blood_pressure FROM health_profiles WHERE user_id = $1', [c.patient_id])).rows[0]
  return {
    ...c,
    patient_name: patient?.full_name, patient_phone: patient?.phone,
    doctor_name: doctor?.full_name, doctor_specialty: doctor?.doctor_specialty,
    patient_dob: hp?.dob ?? '', patient_gender: hp?.gender ?? '',
    temperature: hp?.temperature ?? null, spo2: hp?.spo2 ?? null, blood_pressure: hp?.blood_pressure ?? '',
    red_flag_reasons: JSON.parse(c.red_flag_reasons || '[]'),
  }
}

async function rxWithNames(p: any) {
  return {
    ...p,
    items: JSON.parse(p.items || '[]'),
    patient_name: (await pool.query('SELECT full_name FROM users WHERE id = $1', [p.patient_id])).rows[0]?.full_name,
    doctor_name: (await pool.query('SELECT full_name FROM users WHERE id = $1', [p.doctor_id])).rows[0]?.full_name,
  }
}

// ---------- Hàng đợi ----------
r.get('/queue', async (req, res) => {
  try {
    const pending = (await pool.query(`SELECT * FROM consultations WHERE status = 'pending' ORDER BY created_at ASC`)).rows
    const mine = (await pool.query(
      `SELECT * FROM consultations WHERE doctor_id = $1 AND status IN ('in_call','approved','rejected') ORDER BY created_at DESC LIMIT 20`,
      [req.user.id]
    )).rows
    res.json({ queue: await Promise.all(pending.map(attachNames)), mine: await Promise.all(mine.map(attachNames)) })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Lỗi máy chủ, vui lòng thử lại.' })
  }
})

r.get('/consultations/:id', async (req, res) => {
  try {
    const c = (await pool.query('SELECT * FROM consultations WHERE id = $1', [req.params.id])).rows[0]
    if (!c) return res.status(404).json({ error: 'Không tìm thấy yêu cầu tư vấn.' })
    const hp = (await pool.query('SELECT * FROM health_profiles WHERE user_id = $1', [c.patient_id])).rows[0]
    res.json({
      consultation: await attachNames(c),
      health_profile: hp?.share_consent ? hp : null,
      profile_locked: !hp?.share_consent,
    })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Lỗi máy chủ, vui lòng thử lại.' })
  }
})

// Bắt đầu / kết thúc cuộc gọi ngắn 1–2 phút
r.post('/consultations/:id/call-log', async (req, res) => {
  try {
    const c = (await pool.query('SELECT * FROM consultations WHERE id = $1', [req.params.id])).rows[0]
    if (!c || ['approved', 'rejected'].includes(c.status)) return res.status(400).json({ error: 'Yêu cầu đã được xử lý.' })
    const action = req.body?.action
    if (action === 'start') {
      await pool.query(`UPDATE consultations SET status = 'in_call', doctor_id = $1, call_started_at = $2 WHERE id = $3`, [req.user.id, nowIso(), c.id])
    } else if (action === 'end') {
      await pool.query('UPDATE consultations SET call_duration_sec = $1, call_note = $2 WHERE id = $3', [Number(req.body?.duration_sec) || 0, req.body?.call_note || '', c.id])
    }
    const updated = (await pool.query('SELECT * FROM consultations WHERE id = $1', [c.id])).rows[0]
    res.json({ consultation: await attachNames(updated) })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Lỗi máy chủ, vui lòng thử lại.' })
  }
})

// Từ chối kê đơn / chuyển khám trực tiếp
r.post('/consultations/:id/decision', async (req, res) => {
  try {
    const c = (await pool.query('SELECT * FROM consultations WHERE id = $1', [req.params.id])).rows[0]
    if (!c || ['approved', 'rejected'].includes(c.status)) return res.status(400).json({ error: 'Yêu cầu đã được xử lý.' })
    if (req.body?.decision !== 'reject') return res.status(400).json({ error: 'Dùng POST /doctor/prescriptions để kê đơn.' })
    const reason = String(req.body?.reason || '').trim()
    if (!reason) return res.status(400).json({ error: 'Vui lòng ghi rõ lý do từ chối / chuyển khám.' })
    const t = nowIso()
    await pool.query(
      `UPDATE consultations SET status='rejected', doctor_id=$1, reject_reason=$2, doctor_note=$3, decided_at=$4 WHERE id=$5`,
      [req.user.id, reason, req.body?.note || '', t, c.id]
    )
    await pool.query(
      `INSERT INTO prescriptions (national_code, consultation_id, patient_id, doctor_id, items, status, reject_reason, created_at)
       VALUES ($1, $2, $3, $4, '[]', 'rejected', $5, $6)`,
      [await nextCode(), c.id, c.patient_id, req.user.id, reason, t]
    )
    const updated = (await pool.query('SELECT * FROM consultations WHERE id = $1', [c.id])).rows[0]
    res.json({ ok: true, consultation: await attachNames(updated) })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Lỗi máy chủ, vui lòng thử lại.' })
  }
})

// ---------- Hồ sơ bệnh nhân (chỉ khi được cấp quyền) ----------
r.get('/patients/:id/record', async (req, res) => {
  try {
    const patient = (await pool.query(`SELECT * FROM users WHERE id = $1 AND role='patient'`, [req.params.id])).rows[0]
    if (!patient) return res.status(404).json({ error: 'Không tìm thấy bệnh nhân.' })
    const hp = (await pool.query('SELECT * FROM health_profiles WHERE user_id = $1', [patient.id])).rows[0]
    if (!hp?.share_consent) {
      return res.status(403).json({ error: 'Bệnh nhân chưa đồng ý chia sẻ hồ sơ sức khỏe.', profile_locked: true })
    }
    const history = (await pool.query('SELECT * FROM consultations WHERE patient_id = $1 ORDER BY created_at DESC LIMIT 10', [patient.id])).rows
    const rxs = (await pool.query(`SELECT * FROM prescriptions WHERE patient_id = $1 AND status != 'rejected' ORDER BY created_at DESC LIMIT 10`, [patient.id])).rows
    res.json({
      patient: { id: patient.id, full_name: patient.full_name, phone: patient.phone, token_balance: patient.token_balance },
      profile: hp,
      consultations: await Promise.all(history.map(attachNames)),
      prescriptions: await Promise.all(rxs.map(rxWithNames)),
    })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Lỗi máy chủ, vui lòng thử lại.' })
  }
})

// Danh sách hồ sơ bệnh nhân đã cấp quyền truy cập
r.get('/patients', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT DISTINCT u.id, u.full_name, u.phone, hp.dob, hp.gender, hp.share_consent,
        (SELECT COUNT(*) FROM consultations c WHERE c.patient_id = u.id) consult_count
       FROM users u JOIN health_profiles hp ON hp.user_id = u.id
       WHERE u.role='patient' AND EXISTS (SELECT 1 FROM consultations c WHERE c.patient_id = u.id AND c.doctor_id = $1)`,
      [req.user.id]
    )
    res.json({ patients: rows })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Lỗi máy chủ, vui lòng thử lại.' })
  }
})

// ---------- Tạo đơn thuốc điện tử (TT 26/2025) ----------
async function nextCode(): Promise<string> {
  const last = (await pool.query(`SELECT national_code FROM prescriptions ORDER BY id DESC LIMIT 1`)).rows[0]
  const n = last ? Number(last.national_code.split('-').pop()) + 1 : 1
  return `VN-Rx-2026-${String(n).padStart(5, '0')}`
}

r.get('/prescriptions/mine', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM prescriptions WHERE doctor_id = $1 ORDER BY created_at DESC', [req.user.id])
    res.json({ prescriptions: await Promise.all(rows.map(rxWithNames)) })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Lỗi máy chủ, vui lòng thử lại.' })
  }
})

r.post('/prescriptions', async (req, res) => {
  try {
    const b = req.body || {}
    const items = Array.isArray(b.items) ? b.items : []
    if (!items.length) return res.status(400).json({ error: 'Đơn thuốc cần ít nhất 1 thuốc.' })
    for (const it of items) {
      if (!it.medicine_id || !it.dosage || !it.usage || !it.quantity) {
        return res.status(400).json({ error: 'Mỗi thuốc cần đủ: liều dùng, cách dùng, thời gian và số lượng.' })
      }
      const med = (await pool.query('SELECT id FROM medicines WHERE id = $1', [it.medicine_id])).rows[0]
      if (!med) return res.status(400).json({ error: `Thuốc (id ${it.medicine_id}) không có trong danh mục chuẩn.` })
    }
    let consultation: any = null
    let patientId = Number(b.patient_id) || null
    if (b.consultation_id) {
      consultation = (await pool.query('SELECT * FROM consultations WHERE id = $1', [b.consultation_id])).rows[0]
      if (!consultation) return res.status(404).json({ error: 'Không tìm thấy phiên tư vấn.' })
      if (['approved', 'rejected'].includes(consultation.status)) return res.status(400).json({ error: 'Phiên tư vấn đã được xử lý.' })
      patientId = consultation.patient_id
    }
    if (!patientId) return res.status(400).json({ error: 'Thiếu thông tin bệnh nhân.' })

    const meds = []
    for (const it of items) {
      const m = (await pool.query('SELECT * FROM medicines WHERE id = $1', [it.medicine_id])).rows[0]
      meds.push({
        medicine_id: m.id, name: m.name, active_ingredient: m.active_ingredient,
        dosage: it.dosage, usage: it.usage, duration_days: it.duration_days || 3, quantity: it.quantity,
      })
    }
    let hasAb = false
    for (const m of meds) {
      const row = (await pool.query('SELECT is_antibiotic FROM medicines WHERE id = $1', [m.medicine_id])).rows[0]
      if (row?.is_antibiotic) hasAb = true
    }
    if (hasAb && !b.antibiotic_confirmed) {
      return res.status(400).json({ error: 'Kê kháng sinh cần bác sĩ xác nhận chỉ định (tỷ lệ toa kháng sinh đang được giám sát).' })
    }
    const t = nowIso()
    const code = await nextCode()
    const sig = `SmartCA-BS.${String(req.user.id).padStart(4, '0')}-${t.replace(/[-:.]/g, '').slice(0, 13)}Z`
    const ins = await pool.query(
      `INSERT INTO prescriptions (national_code, consultation_id, patient_id, doctor_id, items,
       digital_signature, status, has_antibiotic, note, issued_at, created_at)
       VALUES ($1,$2,$3,$4,$5,$6, 'issued', $7, $8, $9, $10) RETURNING id`,
      [code, b.consultation_id || null, patientId, req.user.id, JSON.stringify(meds), sig, hasAb ? 1 : 0, b.note || '', t, t]
    )
    if (consultation) {
      await pool.query(
        `UPDATE consultations SET status='approved', doctor_id=$1, doctor_note=$2, decided_at=$3 WHERE id=$4`,
        [req.user.id, b.note || '', t, consultation.id]
      )
    }
    const rx = (await pool.query('SELECT * FROM prescriptions WHERE id = $1', [ins.rows[0].id])).rows[0]
    res.json({ prescription: await rxWithNames(rx) })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Lỗi máy chủ, vui lòng thử lại.' })
  }
})

// ---------- Duyệt thay thế hoạt chất tương đương ----------
r.get('/substitutions/mine', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT s.*, m.name medicine_name, m.active_ingredient,
          sm.name substitute_name, p.national_code, p.items AS rx_items, ph.name pharmacy_name, u.full_name patient_name
        FROM substitution_requests s
        JOIN medicines m ON m.id = s.medicine_id
        LEFT JOIN medicines sm ON sm.id = s.substitute_medicine_id
        JOIN prescriptions p ON p.id = s.prescription_id
        JOIN pharmacies ph ON ph.id = s.pharmacy_id
        JOIN users u ON u.id = p.patient_id
        WHERE p.doctor_id = $1 ORDER BY s.created_at DESC`,
      [req.user.id]
    )
    const result = await Promise.all(rows.map(async (x: any) => ({
      ...x, rx_items: JSON.parse(x.rx_items || '[]'),
      options: await sameGroupOptions(x.medicine_id, x.pharmacy_id),
    })))
    res.json({ substitutions: result })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Lỗi máy chủ, vui lòng thử lại.' })
  }
})

async function sameGroupOptions(medicineId: number, pharmacyId: number) {
  const m = (await pool.query('SELECT * FROM medicines WHERE id = $1', [medicineId])).rows[0]
  if (!m) return []
  const { rows } = await pool.query(
    `SELECT md.*, i.sell_price, i.stock FROM medicines md
     JOIN inventory i ON i.medicine_id = md.id AND i.pharmacy_id = $1
     WHERE md.id != $2 AND (md.active_ingredient = $3 OR md.med_group = $4) AND i.stock > 0
     ORDER BY CASE WHEN md.active_ingredient = $5 THEN 0 ELSE 1 END, i.stock DESC`,
    [pharmacyId, medicineId, m.active_ingredient, m.med_group, m.active_ingredient]
  )
  return rows
}

r.post('/substitutions/:id/approve', async (req, res) => {
  try {
    const s = (await pool.query('SELECT * FROM substitution_requests WHERE id = $1', [req.params.id])).rows[0]
    if (!s) return res.status(404).json({ error: 'Không tìm thấy yêu cầu đổi thuốc.' })
    if (s.status !== 'pending') return res.status(400).json({ error: 'Yêu cầu đã được xử lý.' })
    const rx = (await pool.query('SELECT * FROM prescriptions WHERE id = $1', [s.prescription_id])).rows[0]
    if (!rx) return res.status(404).json({ error: 'Không tìm thấy đơn thuốc gốc.' })
    if (rx.doctor_id !== req.user.id) return res.status(403).json({ error: 'Chỉ bác sĩ kê đơn mới được duyệt thay thế.' })

    if (req.body?.decision === 'reject') {
      await pool.query(`UPDATE substitution_requests SET status='rejected', doctor_id=$1, decided_at=$2 WHERE id=$3`, [req.user.id, nowIso(), s.id])
      return res.json({ ok: true, status: 'rejected' })
    }
    const subId = Number(req.body?.substitute_medicine_id)
    const sub = (await pool.query('SELECT * FROM medicines WHERE id = $1', [subId])).rows[0]
    if (!sub) return res.status(400).json({ error: 'Chọn thuốc thay thế hợp lệ.' })
    const inv = (await pool.query('SELECT stock FROM inventory WHERE pharmacy_id = $1 AND medicine_id = $2', [s.pharmacy_id, subId])).rows[0]
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
    await pool.query(
      'UPDATE prescriptions SET items=$1, digital_signature=$2, note = $3 WHERE id=$4',
      [JSON.stringify(items), sig, `${rx.note} | [Cấp lại đơn do thay thế hoạt chất: ${sub.name}]`.trim(), rx.id]
    )
    await pool.query(
      `UPDATE substitution_requests SET status='approved', substitute_medicine_id=$1, doctor_id=$2, decided_at=$3 WHERE id=$4`,
      [subId, req.user.id, t, s.id]
    )
    const order = (await pool.query('SELECT * FROM orders WHERE prescription_id = $1', [rx.id])).rows[0]
    if (order) {
      const updatedItems = []
      for (const it of items) {
        const inv2 = (await pool.query('SELECT sell_price FROM inventory WHERE pharmacy_id = $1 AND medicine_id = $2', [s.pharmacy_id, it.medicine_id])).rows[0]
        const unit = inv2?.sell_price ?? 0
        updatedItems.push({ ...it, unit_price: unit, line_total: unit * it.quantity })
      }
      await pool.query('UPDATE orders SET items=$1, updated_at=$2 WHERE id=$3', [JSON.stringify(updatedItems), t, order.id])
    }
    const updatedRx = (await pool.query('SELECT * FROM prescriptions WHERE id = $1', [rx.id])).rows[0]
    res.json({ ok: true, status: 'approved', prescription: await rxWithNames(updatedRx) })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Lỗi máy chủ, vui lòng thử lại.' })
  }
})

export default r
