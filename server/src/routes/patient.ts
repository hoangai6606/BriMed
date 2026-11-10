import { Router } from 'express'
import { pool, nowIso } from '../db'
import { requireAuth, requireRole } from '../auth'

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

async function attachNames(c: any) {
  if (!c) return c
  const patient = (await pool.query('SELECT full_name, phone FROM users WHERE id = $1', [c.patient_id])).rows[0]
  const doctor = c.doctor_id
    ? (await pool.query('SELECT full_name, doctor_specialty FROM users WHERE id = $1', [c.doctor_id])).rows[0]
    : null
  return {
    ...c,
    patient_name: patient?.full_name, patient_phone: patient?.phone,
    doctor_name: doctor?.full_name, doctor_specialty: doctor?.doctor_specialty,
    red_flag_reasons: JSON.parse(c.red_flag_reasons || '[]'),
  }
}

// ---------- Hồ sơ sức khỏe ----------
r.get('/health-profile/me', async (req, res) => {
  try {
    let row = (await pool.query('SELECT * FROM health_profiles WHERE user_id = $1', [req.user.id])).rows[0]
    if (!row) {
      await pool.query('INSERT INTO health_profiles (user_id) VALUES ($1)', [req.user.id])
      row = (await pool.query('SELECT * FROM health_profiles WHERE user_id = $1', [req.user.id])).rows[0]
    }
    res.json({ profile: row })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Lỗi máy chủ, vui lòng thử lại.' })
  }
})

r.put('/health-profile/me', async (req, res) => {
  try {
    const b = req.body || {}
    const p = (await pool.query('SELECT * FROM health_profiles WHERE user_id = $1', [req.user.id])).rows[0]
    await pool.query(
      `UPDATE health_profiles SET dob=$1, gender=$2, medical_history=$3, drug_allergies=$4, pregnant=$5,
       current_medicines=$6, temperature=$7, spo2=$8, blood_pressure=$9, share_consent=$10 WHERE user_id=$11`,
      [b.dob ?? p?.dob, b.gender ?? p?.gender, b.medical_history ?? p?.medical_history, b.drug_allergies ?? p?.drug_allergies,
        b.pregnant ? 1 : 0, b.current_medicines ?? p?.current_medicines, b.temperature ?? p?.temperature,
        b.spo2 ?? p?.spo2, b.blood_pressure ?? p?.blood_pressure, b.share_consent ? 1 : 0, req.user.id]
    )
    const profile = (await pool.query('SELECT * FROM health_profiles WHERE user_id = $1', [req.user.id])).rows[0]
    res.json({ profile })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Lỗi máy chủ, vui lòng thử lại.' })
  }
})

// ---------- Tư vấn / Form 1 ----------
const CONSULT_FEE_VND = 25000 // Phí khám/lượt — bác sĩ nhận 15.000đ, BriMed giữ 10.000đ (gồm GTGT)

// Thông tin thanh toán VietQR (QR hiển thị trong web; tài khoản thu hộ cập nhật khi kích hoạt payOS)
function paymentInfo(id: number) {
  return {
    consultation_id: id,
    amount_vnd: CONSULT_FEE_VND,
    currency: 'VND',
    method: 'VietQR',
    content: `BRIMED ${id}`,
  }
}

// Cấp token vào phòng gọi video (LiveKit) — chỉ khi bác sĩ đã bắt đầu cuộc gọi
r.post('/consultations/:id/call-token', async (req, res) => {
  try {
    const c = (await pool.query('SELECT * FROM consultations WHERE id = $1 AND patient_id = $2', [req.params.id, req.user.id])).rows[0]
    if (!c) return res.status(404).json({ error: 'Không tìm thấy yêu cầu tư vấn.' })
    if (c.payment_status !== 'paid') return res.status(402).json({ error: 'Bạn chưa thanh toán phí khám cho lượt này.' })
    if (c.status !== 'in_call') return res.status(400).json({ error: 'Bác sĩ chưa bắt đầu cuộc gọi. Vui lòng chờ trong giây lát.' })
    const { livekitEnabled, mintCallToken } = await import('../livekit')
    if (!livekitEnabled()) return res.status(503).json({ error: 'Tính năng gọi video chưa được kích hoạt trên hệ thống.' })
    res.json(await mintCallToken(c.id, { id: req.user.id, full_name: req.user.full_name }, 'patient'))
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Lỗi máy chủ, vui lòng thử lại.' })
  }
})

r.post('/consultations', async (req, res) => {
  try {
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
    const { rows } = await pool.query(
      `INSERT INTO consultations (patient_id, disease_group, symptom, duration_days, fever, fever_days,
       shortness_of_breath, is_child, pregnancy, drug_allergies, current_medicines, consent_share, red_flag, status, payment_status, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,0,'pending','unpaid',$13) RETURNING id`,
      [req.user.id, b.disease_group, b.symptom, b.duration_days || 1, b.fever ? 1 : 0, b.fever_days || 0,
        b.shortness_of_breath ? 1 : 0, b.is_child ? 1 : 0, b.pregnancy ? 1 : 0,
        b.drug_allergies || '', b.current_medicines || '', b.consent_share !== false ? 1 : 0, nowIso()]
    )
    await pool.query(
      'UPDATE health_profiles SET drug_allergies=$1, current_medicines=$2, pregnant=$3 WHERE user_id=$4',
      [b.drug_allergies || '', b.current_medicines || '', b.pregnancy ? 1 : 0, req.user.id]
    )
    const row = (await pool.query('SELECT * FROM consultations WHERE id = $1', [rows[0].id])).rows[0]
    res.json({ consultation: await attachNames(row), payment: paymentInfo(rows[0].id) })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Lỗi máy chủ, vui lòng thử lại.' })
  }
})

// Xác nhận thanh toán phí khám qua VietQR
r.post('/consultations/:id/pay', async (req, res) => {
  try {
    const c = (await pool.query('SELECT * FROM consultations WHERE id = $1 AND patient_id = $2', [req.params.id, req.user.id])).rows[0]
    if (!c) return res.status(404).json({ error: 'Không tìm thấy yêu cầu tư vấn.' })
    if (c.payment_status === 'paid') {
      return res.json({ ok: true, consultation: await attachNames(c), message: 'Yêu cầu này đã được thanh toán.' })
    }
    await pool.query(`UPDATE consultations SET payment_status = 'paid', paid_at = $1 WHERE id = $2`, [nowIso(), c.id])
    await pool.query(
      `INSERT INTO transactions (user_id, type, amount_token, amount_vnd, description, consultation_id, created_at)
       VALUES ($1, 'consultation_fee', 0, $2, $3, $4, $5)`,
      [req.user.id, CONSULT_FEE_VND, `Phí khám từ xa (${await consultCode(c.id)})`, c.id, nowIso()]
    )
    const updated = (await pool.query('SELECT * FROM consultations WHERE id = $1', [c.id])).rows[0]
    res.json({ ok: true, consultation: await attachNames(updated), message: 'Đã xác nhận thanh toán — bác sĩ sẽ tiếp nhận yêu cầu của bạn.' })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Lỗi máy chủ, vui lòng thử lại.' })
  }
})

// Mã hiển thị cho nội dung chuyển khoản (dùng mã tư vấn, chưa có đơn thuốc)
async function consultCode(id: number): Promise<string> {
  return `CV-${String(id).padStart(5, '0')}`
}

r.get('/consultations/mine', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM consultations WHERE patient_id = $1 ORDER BY created_at DESC', [req.user.id])
    res.json({ consultations: await Promise.all(rows.map(attachNames)) })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Lỗi máy chủ, vui lòng thử lại.' })
  }
})

// ---------- Đơn thuốc của tôi ----------
r.get('/prescriptions/mine', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM prescriptions WHERE patient_id = $1 ORDER BY created_at DESC', [req.user.id])
    const orders = (await pool.query('SELECT * FROM orders WHERE patient_id = $1', [req.user.id])).rows
    const result = await Promise.all(rows.map(async (p: any) => ({
      ...p,
      items: JSON.parse(p.items || '[]'),
      doctor_name: (await pool.query('SELECT full_name FROM users WHERE id = $1', [p.doctor_id])).rows[0]?.full_name,
      order: orders.find((o: any) => o.prescription_id === p.id) || null,
    })))
    res.json({ prescriptions: result })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Lỗi máy chủ, vui lòng thử lại.' })
  }
})

// Gửi đơn đến quầy nhà thuốc chọn sẵn (tiền thuốc trả trực tiếp tại quầy — BriMed không thu hoa hồng)
r.post('/prescriptions/:id/purchase', async (req, res) => {
  try {
    const rx = (await pool.query('SELECT * FROM prescriptions WHERE id = $1 AND patient_id = $2', [req.params.id, req.user.id])).rows[0]
    if (!rx) return res.status(404).json({ error: 'Không tìm thấy đơn thuốc.' })
    if (rx.status === 'rejected') return res.status(400).json({ error: 'Đơn đã bị từ chối, không thể sử dụng.' })
    if (rx.status === 'dispensed') return res.status(400).json({ error: 'Đơn đã được cấp phát, hoàn tất.' })
    const existing = (await pool.query('SELECT * FROM orders WHERE prescription_id = $1', [rx.id])).rows[0]
    if (existing) return res.status(409).json({ error: 'Đơn này đã có đơn hàng đang xử lý.', order: existing })

    const pharmacy = (await pool.query('SELECT * FROM pharmacies WHERE id = $1', [Number(req.body?.pharmacy_id)])).rows[0]
    if (!pharmacy) return res.status(400).json({ error: 'Vui lòng chọn nhà thuốc đối tác để mua tại quầy.' })

    const t = nowIso()
    const rawItems = JSON.parse(rx.items || '[]')
    const items = []
    for (const it of rawItems) {
      const inv = (await pool.query('SELECT sell_price FROM inventory WHERE pharmacy_id = $1 AND medicine_id = $2', [pharmacy.id, it.medicine_id])).rows[0]
      const unit = inv?.sell_price ?? 0
      items.push({ ...it, unit_price: unit, line_total: unit * it.quantity })
    }
    const ins = await pool.query(
      `INSERT INTO orders (prescription_id, patient_id, pharmacy_id, items, receive_method,
       tokens_charged, is_free, status, created_at, updated_at) VALUES ($1,$2,$3,$4,'pickup',0,0,'confirmed',$5,$6) RETURNING id`,
      [rx.id, req.user.id, pharmacy.id, JSON.stringify(items), t, t]
    )
    const order = (await pool.query('SELECT * FROM orders WHERE id = $1', [ins.rows[0].id])).rows[0]
    res.json({
      order,
      message: `Đã gửi đơn đến ${pharmacy.name}. Đến quầy, bạn cung cấp mã đơn ${rx.national_code} và trả tiền thuốc theo báo giá của quầy.`,
    })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Lỗi máy chủ, vui lòng thử lại.' })
  }
})

// ---------- Đơn hàng ----------
r.get('/orders/mine', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM orders WHERE patient_id = $1 ORDER BY created_at DESC', [req.user.id])
    const result = await Promise.all(rows.map(async (o: any) => ({
      ...o,
      items: JSON.parse(o.items || '[]'), quote: o.quote ? JSON.parse(o.quote) : null,
      pharmacy_name: (await pool.query('SELECT name FROM pharmacies WHERE id = $1', [o.pharmacy_id])).rows[0]?.name,
      prescription_code: (await pool.query('SELECT national_code FROM prescriptions WHERE id = $1', [o.prescription_id])).rows[0]?.national_code,
    })))
    res.json({ orders: result })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Lỗi máy chủ, vui lòng thử lại.' })
  }
})

// ---------- Lịch sử & nhắc uống ----------
r.get('/reminders/mine', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM reminders WHERE patient_id = $1 ORDER BY created_at DESC', [req.user.id])
    res.json({ reminders: rows.map((x: any) => ({ ...x, times: JSON.parse(x.times || '[]') })) })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Lỗi máy chủ, vui lòng thử lại.' })
  }
})

r.post('/reminders', async (req, res) => {
  try {
    const b = req.body || {}
    if (!b.medicine_name) return res.status(400).json({ error: 'Vui lòng nhập tên thuốc cần nhắc.' })
    if (!Array.isArray(b.times) || !b.times.length) return res.status(400).json({ error: 'Chọn ít nhất 1 buổi (Sáng/Trưa/Tối).' })
    const ins = await pool.query(
      'INSERT INTO reminders (patient_id, prescription_id, medicine_name, times, note, active, created_at) VALUES ($1,$2,$3,$4,$5,1,$6) RETURNING id',
      [req.user.id, b.prescription_id || null, b.medicine_name, JSON.stringify(b.times), b.note || '', nowIso()]
    )
    const row = (await pool.query('SELECT * FROM reminders WHERE id = $1', [ins.rows[0].id])).rows[0]
    res.json({ reminder: { ...row, times: JSON.parse(row.times) } })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Lỗi máy chủ, vui lòng thử lại.' })
  }
})

r.put('/reminders/:id', async (req, res) => {
  try {
    const b = req.body || {}
    const row = (await pool.query('SELECT * FROM reminders WHERE id = $1 AND patient_id = $2', [req.params.id, req.user.id])).rows[0]
    if (!row) return res.status(404).json({ error: 'Không tìm thấy lời nhắc.' })
    await pool.query(
      'UPDATE reminders SET active = $1, times = $2, note = $3 WHERE id = $4',
      [b.active === false ? 0 : 1, JSON.stringify(b.times || JSON.parse(row.times)), b.note ?? row.note, req.params.id]
    )
    const updated = (await pool.query('SELECT * FROM reminders WHERE id = $1', [req.params.id])).rows[0]
    res.json({ reminder: { ...updated, times: JSON.parse(updated.times) } })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Lỗi máy chủ, vui lòng thử lại.' })
  }
})

r.delete('/reminders/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM reminders WHERE id = $1 AND patient_id = $2', [req.params.id, req.user.id])
    res.json({ ok: true })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Lỗi máy chủ, vui lòng thử lại.' })
  }
})

// ---------- Lịch sử giao dịch ----------
r.get('/transactions/mine', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM transactions WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id])
    res.json({ transactions: rows })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Lỗi máy chủ, vui lòng thử lại.' })
  }
})

// ---------- Lịch sử điều trị ----------
r.get('/history', async (req, res) => {
  try {
    const cs = (await pool.query('SELECT * FROM consultations WHERE patient_id = $1 ORDER BY created_at DESC', [req.user.id])).rows
    const rxs = (await pool.query('SELECT * FROM prescriptions WHERE patient_id = $1 ORDER BY created_at DESC', [req.user.id])).rows
    res.json({
      consultations: await Promise.all(cs.map(attachNames)),
      prescriptions: await Promise.all(rxs.map(async (p: any) => ({
        ...p, items: JSON.parse(p.items || '[]'),
        doctor_name: (await pool.query('SELECT full_name FROM users WHERE id = $1', [p.doctor_id])).rows[0]?.full_name,
      }))),
    })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Lỗi máy chủ, vui lòng thử lại.' })
  }
})

export default r
