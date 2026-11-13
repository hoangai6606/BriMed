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

// Ghi nhận thù lao bác sĩ 15.000đ cho một lượt khám đã thanh toán (kể cả trường hợp chuyển khám trực tiếp)
const DOCTOR_FEE_VND = 15000
async function payDoctorFee(doctorId: number, consultationId: number, nationalCode: string) {
  await pool.query(
    `INSERT INTO transactions (user_id, type, amount_token, amount_vnd, description, consultation_id, created_at)
     VALUES ($1, 'doctor_fee', 0, $2, $3, $4, $5)`,
    [doctorId, DOCTOR_FEE_VND, `Thù lao bác sĩ lượt khám ${nationalCode}`, consultationId, nowIso()]
  )
}

// ---------- Hàng đợi ----------
// Hàng đợi: lượt hẹn ĐÃ ĐẾN GIỜ (+10 phút đệm) ưu tiên trước -> lượt chỉ định tôi -> walk-in FIFO.
// Lượt hẹn tương lai tách nhóm upcoming riêng để không chặn hàng đợi hiện tại.
r.get('/queue', async (req, res) => {
  try {
    const nowIso = new Date().toISOString()
    await pool.query('UPDATE users SET last_seen_at = $1 WHERE id = $2', [nowIso, req.user.id])
    // Tự hoàn tác lượt in_call bỏ quên quá 20 phút (BS đóng tab giữa chừng) -> về pending cho nhận lại
    await pool.query(
      `UPDATE consultations SET status = 'pending' WHERE status = 'in_call' AND call_started_at < $1`,
      [new Date(Date.now() - 20 * 60000).toISOString()]
    )
    const soonIso = new Date(Date.now() + 10 * 60000).toISOString()
    const pending = (await pool.query(
      `SELECT c.*, ds.starts_at AS slot_starts_at, ds.duration_min AS slot_duration_min,
              (c.preferred_doctor_id = $1) AS for_me,
              (SELECT COUNT(*)::int FROM consultations c3 WHERE c3.slot_id = c.slot_id AND c3.status NOT IN ('rejected','cancelled') AND c3.id < c.id) AS slot_position
       FROM consultations c
       LEFT JOIN doctor_slots ds ON ds.id = c.slot_id
       WHERE c.status = 'pending' AND c.payment_status = 'paid'
         AND (c.slot_id IS NULL OR (ds.status = 'open' AND ds.starts_at <= $2))
       ORDER BY (c.slot_id IS NOT NULL) DESC, ds.starts_at ASC NULLS LAST,
                (c.preferred_doctor_id = $1) DESC, c.created_at ASC`,
      [req.user.id, soonIso]
    )).rows
    const upcoming = (await pool.query(
      `SELECT c.*, ds.starts_at AS slot_starts_at, ds.duration_min AS slot_duration_min, ds.ack AS slot_ack,
              (c.preferred_doctor_id = $1) AS for_me
       FROM consultations c
       JOIN doctor_slots ds ON ds.id = c.slot_id
       WHERE c.status = 'pending' AND c.payment_status = 'paid' AND ds.status = 'open' AND ds.starts_at > $2
       ORDER BY ds.starts_at ASC LIMIT 20`,
      [req.user.id, soonIso]
    )).rows
    const mine = (await pool.query(
      `SELECT * FROM consultations WHERE doctor_id = $1 AND status IN ('in_call','approved','rejected') ORDER BY created_at DESC LIMIT 20`,
      [req.user.id]
    )).rows
    res.json({ queue: await Promise.all(pending.map(attachNames)), upcoming: await Promise.all(upcoming.map(attachNames)), mine: await Promise.all(mine.map(attachNames)) })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Lỗi máy chủ, vui lòng thử lại.' })
  }
})

// ---------- Lịch trực của bác sĩ (khung giờ nhận lượt hẹn) ----------
r.get('/slots', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT ds.*,
        (SELECT COUNT(*)::int FROM consultations c WHERE c.slot_id = ds.id AND c.status != 'rejected') AS booked
       FROM doctor_slots ds
       WHERE ds.doctor_id = $1 AND ds.status = 'open' AND ds.starts_at > $2
       ORDER BY ds.starts_at ASC`,
      [req.user.id, new Date().toISOString()]
    )
    res.json({ slots: rows })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Lỗi máy chủ, vui lòng thử lại.' })
  }
})

// Xác nhận lịch hẹn (bác sĩ đã biết và sẽ có mặt)
r.post('/slots/:id/ack', async (req, res) => {
  try {
    const slot = (await pool.query('SELECT * FROM doctor_slots WHERE id = $1 AND doctor_id = $2', [req.params.id, req.user.id])).rows[0]
    if (!slot) return res.status(404).json({ error: 'Không tìm thấy khung giờ.' })
    await pool.query('UPDATE doctor_slots SET ack = 1 WHERE id = $1', [slot.id])
    res.json({ ok: true })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Lỗi máy chủ, vui lòng thử lại.' })
  }
})

// P1-7: Thù lao của bác sĩ
r.get('/earnings', async (req, res) => {
  try {
    const total = (await pool.query(
      `SELECT COALESCE(SUM(amount_vnd),0)::int AS v, COUNT(*)::int AS c FROM transactions WHERE user_id = $1 AND type = 'doctor_fee'`,
      [req.user.id]
    )).rows[0]
    const monthStart = new Date(); monthStart.setDate(1)
    const month = (await pool.query(
      `SELECT COALESCE(SUM(amount_vnd),0)::int AS v, COUNT(*)::int AS c FROM transactions WHERE user_id = $1 AND type = 'doctor_fee' AND created_at >= $2`,
      [req.user.id, monthStart.toISOString()]
    )).rows[0]
    const list = (await pool.query(
      `SELECT amount_vnd, description, created_at FROM transactions WHERE user_id = $1 AND type = 'doctor_fee' ORDER BY created_at DESC LIMIT 20`,
      [req.user.id]
    )).rows
    res.json({ total_vnd: total.v, total_count: total.c, month_vnd: month.v, month_count: month.c, recent: list })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Lỗi máy chủ, vui lòng thử lại.' })
  }
})

r.post('/slots', async (req, res) => {
  try {
    const b = req.body || {}
    if (!b.starts_at) return res.status(400).json({ error: 'Vui lòng chọn thời gian bắt đầu khung giờ.' })
    const startsAt = new Date(b.starts_at)
    if (isNaN(startsAt.getTime())) return res.status(400).json({ error: 'Thời gian không hợp lệ.' })
    if (startsAt.getTime() < Date.now()) return res.status(400).json({ error: 'Khung giờ phải ở tương lai.' })
    const duration = Math.min(Math.max(Number(b.duration_min) || 30, 15), 120)
    const capacity = Math.min(Math.max(Number(b.capacity) || 1, 1), 10)
    const ins = await pool.query(
      `INSERT INTO doctor_slots (doctor_id, starts_at, duration_min, capacity, status, created_at)
       VALUES ($1,$2,$3,$4,'open',$5) RETURNING *`,
      [req.user.id, startsAt.toISOString(), duration, capacity, nowIso()]
    )
    res.json({ slot: ins.rows[0] })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Lỗi máy chủ, vui lòng thử lại.' })
  }
})

r.delete('/slots/:id', async (req, res) => {
  try {
    const slot = (await pool.query('SELECT * FROM doctor_slots WHERE id = $1 AND doctor_id = $2', [req.params.id, req.user.id])).rows[0]
    if (!slot) return res.status(404).json({ error: 'Không tìm thấy khung giờ.' })
    const booked = (await pool.query(
      `SELECT COUNT(*)::int AS c FROM consultations WHERE slot_id = $1 AND status NOT IN ('rejected','cancelled')`, [slot.id]
    )).rows[0].c
    if (booked > 0) {
      if (!req.body?.confirm) {
        return res.status(409).json({
          error: `Khung giờ này có ${booked} bệnh nhân đã đặt lịch. Xác nhận huỷ sẽ chuyển các lượt hẹn về hàng đợi thường (không mất phí, không mất chỗ trong hàng đợi).`,
          need_confirm: true, booked,
        })
      }
      await pool.query(`UPDATE doctor_slots SET status = 'cancelled' WHERE id = $1`, [slot.id])
      // Gỡ gắn slot khỏi các lượt đã đặt -> chúng về hàng đợi thường (walk-in ưu tiên theo chỉ định)
      await pool.query(`UPDATE consultations SET slot_id = NULL WHERE slot_id = $1 AND status = 'pending'`, [slot.id])
      return res.json({ ok: true, message: `Đã huỷ khung giờ và chuyển ${booked} lượt hẹn về hàng đợi thường. Hệ thống đã ghi nhận — bệnh nhân sẽ thấy cập nhật khi mở app.` })
    }
    await pool.query(`DELETE FROM doctor_slots WHERE id = $1`, [slot.id])
    res.json({ ok: true })
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

// Cấp token vào phòng gọi video (LiveKit) của lượt khám
r.post('/consultations/:id/call-token', async (req, res) => {
  try {
    const c = (await pool.query('SELECT * FROM consultations WHERE id = $1', [req.params.id])).rows[0]
    if (!c) return res.status(404).json({ error: 'Không tìm thấy yêu cầu tư vấn.' })
    if (['approved', 'rejected'].includes(c.status)) return res.status(400).json({ error: 'Yêu cầu đã được xử lý.' })
    if (c.payment_status !== 'paid') return res.status(402).json({ error: 'Bệnh nhân chưa thanh toán phí khám — chưa thể gọi video.' })
    const guardErr = await designatedGuardError(c, req)
    if (guardErr) return res.status(403).json({ error: guardErr })
    if (c.status === 'in_call' && c.doctor_id && c.doctor_id !== req.user.id) {
      return res.status(403).json({ error: 'Cuộc gọi đang được bác sĩ khác xử lý.' })
    }
    const { livekitEnabled, mintCallToken } = await import('../livekit.js')
    if (!livekitEnabled()) return res.status(503).json({ error: 'Tính năng gọi video chưa được kích hoạt trên hệ thống.' })
    if (c.status === 'pending') {
      await pool.query(`UPDATE consultations SET status = 'in_call', doctor_id = $1, call_started_at = $2 WHERE id = $3`, [req.user.id, nowIso(), c.id])
    }
    res.json(await mintCallToken(c.id, { id: req.user.id, full_name: req.user.full_name }, 'doctor'))
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
    const guardErrCl = await designatedGuardError(c, req)
    if (guardErrCl) return res.status(403).json({ error: guardErrCl })
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
    const guardErrDc = await designatedGuardError(c, req)
    if (guardErrDc) return res.status(403).json({ error: guardErrDc })
    if (req.body?.decision !== 'reject') return res.status(400).json({ error: 'Dùng POST /doctor/prescriptions để kê đơn.' })
    const reason = String(req.body?.reason || '').trim()
    if (!reason) return res.status(400).json({ error: 'Vui lòng ghi rõ lý do từ chối / chuyển khám.' })
    const t = nowIso()
    const rejectCode = await nextCode()
    await pool.query(
      `UPDATE consultations SET status='rejected', doctor_id=$1, reject_reason=$2, doctor_note=$3, decided_at=$4 WHERE id=$5`,
      [req.user.id, reason, req.body?.note || '', t, c.id]
    )
    await pool.query(
      `INSERT INTO prescriptions (national_code, consultation_id, patient_id, doctor_id, items, status, reject_reason, created_at)
       VALUES ($1, $2, $3, $4, '[]', 'rejected', $5, $6)`,
      [rejectCode, c.id, c.patient_id, req.user.id, reason, t]
    )
    await payDoctorFee(req.user.id, c.id, rejectCode)
    const updated = (await pool.query('SELECT * FROM consultations WHERE id = $1', [c.id])).rows[0]
    res.json({ ok: true, consultation: await attachNames(updated) })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Lỗi máy chủ, vui lòng thử lại.' })
  }
})

// S2-5: ca chỉ định — 5 phút đầu chỉ bác sĩ được chỉ định mới được nhận
async function designatedGuardError(c: any, req: any): Promise<string | null> {
  if (c.status === 'pending' && c.preferred_doctor_id && c.preferred_doctor_id !== req.user.id) {
    const ageMin = (Date.now() - new Date(c.created_at).getTime()) / 60000
    if (ageMin < 5) {
      const designated = (await pool.query('SELECT full_name FROM users WHERE id = $1', [c.preferred_doctor_id])).rows[0]
      return `Lượt này bệnh nhân chỉ định ${designated?.full_name || 'bác sĩ khác'} — vui lòng chờ sau 5 phút đầu nếu bác sĩ đó chưa nhận.`
    }
  }
  return null
}

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
      patient: { id: patient.id, full_name: patient.full_name, phone: patient.phone },
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
      const guardErrPr = await designatedGuardError(consultation, req)
      if (guardErrPr) return res.status(403).json({ error: guardErrPr })
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
      await payDoctorFee(req.user.id, consultation.id, code)
    }
    const rx = (await pool.query('SELECT * FROM prescriptions WHERE id = $1', [ins.rows[0].id])).rows[0]

    // Tự sinh nhắc uống thuốc cho bệnh nhân (Sáng/Trưa/Tối) — bệnh nhân sửa/xoá được sau này
    for (const m of meds) {
      await pool.query(
        `INSERT INTO reminders (patient_id, prescription_id, medicine_name, times, note, active, created_at)
         VALUES ($1,$2,$3,$4,$5,1,$6)`,
        [patientId, rx.id, m.name, JSON.stringify(['Sáng', 'Trưa', 'Tối']), `${m.dosage} · ${m.usage} · ${m.duration_days} ngày`, t]
      )
    }

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
