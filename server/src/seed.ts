import crypto from 'node:crypto'
import { pool } from './db'

const sha256 = (s: string) => crypto.createHash('sha256').update(s).digest('hex')

const iso = (d: Date) => d.toISOString()
const hoursAgo = (h: number) => iso(new Date(Date.now() - h * 3600_000))
const daysAgo = (d: number) => iso(new Date(Date.now() - d * 86400_000))

// Xoá dữ liệu cũ và nạp lại bộ dữ liệu mẫu đầy đủ của BriMed (dùng cho
// lần khởi tạo đầu tiên và tính năng "Khôi phục dữ liệu" của quản trị viên)
export async function seedDb(): Promise<void> {
  // Lưu ý: KHÔNG xoá patient_leads & partner_registrations — đây là dữ liệu
  // thực tế thu thập từ form trên website. Các bảng nghiệp vụ demo được nạp lại.
  await pool.query(`
    DELETE FROM reminders; DELETE FROM substitution_requests;
    DELETE FROM transactions; DELETE FROM orders; DELETE FROM prescriptions; DELETE FROM consultations;
    DELETE FROM inventory; DELETE FROM pharmacies; DELETE FROM medicines;
    DELETE FROM health_profiles; DELETE FROM sessions; DELETE FROM users;
  `)

  // ---------------- Nhà thuốc (Gò Vấp) ----------------
  const pharmacies = [
    { name: 'Nhà thuốc Minh Châu', address: '128 Nguyễn Oanh, Gò Vấp', ward: 'P.17', owner_name: 'Nguyễn Minh Châu', phone: '0903777001', license_number: 'GP-KD-2026-0123', pharmacist_name: 'DS. Nguyễn Minh Châu', csdl_synced: 1, subscription_plan: '3_months', subscription_started_at: daysAgo(45), standee_code: 'BR-GV-001' },
    { name: 'Nhà thuốc An Khang', address: '56 Lê Đức Thọ, Gò Vấp', ward: 'P.6', owner_name: 'Trần An Khang', phone: '0903777002', license_number: 'GP-KD-2026-0188', pharmacist_name: 'DS. Trần An Khang', csdl_synced: 1, subscription_plan: '3_months', subscription_started_at: daysAgo(30), standee_code: 'BR-GV-002' },
    { name: 'Nhà thuốc Thanh Đạt', address: '45 Quang Trung, Gò Vấp', ward: 'P.3', owner_name: 'Lê Thanh Đạt', phone: '0903777003', license_number: 'GP-KD-2026-0241', pharmacist_name: 'DS. Lê Thanh Đạt', csdl_synced: 1, subscription_plan: '1_month', subscription_started_at: daysAgo(12), standee_code: 'BR-GV-003' },
    { name: 'Nhà thuốc Phúc An', address: '212 Nguyễn Kiệm, Gò Vấp', ward: 'P.4', owner_name: 'Phạm Phúc An', phone: '0903777004', license_number: 'GP-KD-2026-0290', pharmacist_name: 'DS. Phạm Phúc An', csdl_synced: 1, subscription_plan: '3_months', subscription_started_at: daysAgo(60), standee_code: 'BR-GV-004' },
    { name: 'Nhà thuốc Hòa Bình', address: '78 Phan Văn Trị, Gò Vấp', ward: 'P.10', owner_name: 'Võ Hòa Bình', phone: '0903777005', license_number: 'GP-KD-2026-0355', pharmacist_name: 'DS. Võ Hòa Bình', csdl_synced: 0, subscription_plan: '1_month', subscription_started_at: daysAgo(5), standee_code: 'BR-GV-005' },
    { name: 'Nhà thuốc Tân Phát', address: '9 Thống Nhất, Gò Vấp', ward: 'P.15', owner_name: 'Đinh Tân Phát', phone: '0903777006', license_number: 'GP-KD-2026-0399', pharmacist_name: 'DS. Đinh Tân Phát', csdl_synced: 1, subscription_plan: '1_month', subscription_started_at: daysAgo(2), standee_code: 'BR-GV-006' },
  ]
  const pharmacyIds: number[] = []
  for (const p of pharmacies) {
    const r = await pool.query(
      `INSERT INTO pharmacies (name, address, ward, district, owner_name, phone, license_number, pharmacist_name,
       csdl_synced, subscription_plan, subscription_started_at, standee_code)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
      [p.name, p.address, p.ward, 'Gò Vấp', p.owner_name, p.phone, p.license_number, p.pharmacist_name,
        p.csdl_synced, p.subscription_plan, p.subscription_started_at, p.standee_code]
    )
    pharmacyIds.push(r.rows[0].id)
  }

  // ---------------- Thuốc ----------------
  const medicines = [
    { name: 'Efferalgan 500mg', active_ingredient: 'Paracetamol', pack_size: 'Hộp 2 vỉ x 16 viên', info: 'Hạ sốt, giảm đau nhẹ đến vừa.', form: 'Viên nén', category: 'otc', is_antibiotic: 0, med_group: 'Hạ sốt giảm đau', reference_price: 32000 },
    { name: 'Paracetamol 500 (Việt Nam)', active_ingredient: 'Paracetamol', pack_size: 'Hộp 10 vỉ x 10 viên', info: 'Hạ sốt, giảm đau, thay thế tương đương Efferalgan.', form: 'Viên nén', category: 'otc', is_antibiotic: 0, med_group: 'Hạ sốt giảm đau', reference_price: 4500 },
    { name: 'Ibuprofen 400mg', active_ingredient: 'Ibuprofen', pack_size: 'Hộp 10 vỉ x 10 viên', info: 'Giảm đau, kháng viêm không steroid.', form: 'Viên nén', category: 'otc', is_antibiotic: 0, med_group: 'Hạ sốt giảm đau', reference_price: 28000 },
    { name: 'Siro ho Astex', active_ingredient: 'Dextromethorphan', pack_size: 'Hộp 1 chai 60ml', info: 'Giảm ho khan, long đàm.', form: 'Siro', category: 'otc', is_antibiotic: 0, med_group: 'Thuốc ho', reference_price: 25000 },
    { name: 'Siro Terpindion', active_ingredient: 'Terpin hydrat', pack_size: 'Hộp 1 chai 100ml', info: 'Long đàm, giảm ho có đàm.', form: 'Siro', category: 'otc', is_antibiotic: 0, med_group: 'Thuốc ho', reference_price: 21000 },
    { name: 'Oresol gói 20,5g', active_ingredient: 'ORS (Natri Clorid, Kali Clorid...)', pack_size: 'Hộp 20 gói', info: 'Bù nước và điện giải khi sốt, mất nước.', form: 'Bột pha uống', category: 'otc', is_antibiotic: 0, med_group: 'Bù nước & tiêu hóa', reference_price: 5500 },
    { name: 'Loratadin 10mg', active_ingredient: 'Loratadin', pack_size: 'Hộp 2 vỉ x 10 viên', info: 'Điều trị dị ứng, sổ mũi, mề đay.', form: 'Viên nén', category: 'otc', is_antibiotic: 0, med_group: 'Kháng histamin', reference_price: 12000 },
    { name: 'Cetirizin 10mg', active_ingredient: 'Cetirizin dihydrochlorid', pack_size: 'Hộp 2 vỉ x 10 viên', info: 'Điều trị dị ứng, thay thế tương đương Loratadin.', form: 'Viên nén', category: 'otc', is_antibiotic: 0, med_group: 'Kháng histamin', reference_price: 15000 },
    { name: 'Amoxicillin 500mg', active_ingredient: 'Amoxicillin', pack_size: 'Hộp 2 vỉ x 16 viên', info: 'Kháng sinh nhóm beta-lactam, kê đơn.', form: 'Viên nang', category: 'rx', is_antibiotic: 1, med_group: 'Kháng sinh', reference_price: 48000 },
    { name: 'Augmentin 1g', active_ingredient: 'Amoxicillin + Acid clavulanic', pack_size: 'Hộp 2 vỉ x 7 viên', info: 'Kháng sinh kế hợp, kê đơn.', form: 'Viên nén bao phim', category: 'rx', is_antibiotic: 1, med_group: 'Kháng sinh', reference_price: 138000 },
    { name: 'Omeprazol 20mg', active_ingredient: 'Omeprazol', pack_size: 'Hộp 2 vỉ x 14 viên', info: 'Ức chế bào chua, điều trị trào ngược, viêm dạ dày.', form: 'Viên nang', category: 'rx', is_antibiotic: 0, med_group: 'Dạ dày tá tràng', reference_price: 35000 },
    { name: 'Esomeprazol 40mg', active_ingredient: 'Esomeprazol', pack_size: 'Hộp 2 vỉ x 14 viên', info: 'Ức chế bào chua thế hệ mới, kê đơn.', form: 'Viên nén', category: 'rx', is_antibiotic: 0, med_group: 'Dạ dày tá tràng', reference_price: 65000 },
    { name: 'Domperidon 10mg', active_ingredient: 'Domperidon', pack_size: 'Hộp 10 vỉ x 10 viên', info: 'Giảm buồn nôn, hỗ trợ tiêu hóa.', form: 'Viên nén', category: 'otc', is_antibiotic: 0, med_group: 'Bù nước & tiêu hóa', reference_price: 14000 },
    { name: 'Berberin 100mg', active_ingredient: 'Berberin clorid', pack_size: 'Hộp 10 vỉ x 10 viên', info: 'Hỗ trợ tiêu hóa, tiêu chảy nhẹ.', form: 'Viên nén', category: 'otc', is_antibiotic: 0, med_group: 'Bù nước & tiêu hóa', reference_price: 9000 },
    { name: 'Vitamin C 500mg', active_ingredient: 'Acid ascorbic', pack_size: 'Hộp 10 vỉ x 10 viên', info: 'Bổ sung vitamin C, tăng đề kháng.', form: 'Viên sủi', category: 'otc', is_antibiotic: 0, med_group: 'Vitamin & bổ trợ', reference_price: 18000 },
  ]
  const medIds: number[] = []
  for (const m of medicines) {
    const r = await pool.query(
      `INSERT INTO medicines (name, active_ingredient, pack_size, info, form, category, is_antibiotic, med_group, reference_price)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
      [m.name, m.active_ingredient, m.pack_size, m.info, m.form, m.category, m.is_antibiotic, m.med_group, m.reference_price]
    )
    medIds.push(r.rows[0].id)
  }

  // ---------------- Tồn kho ----------------
  // Minh Châu (demo chính): đủ thuốc, Astex sắp hết, Amoxicillin hết hàng (để demo đổi hoạt chất)
  const minhChauStock: Array<[number, number, number, number]> = [
    [0, 33000, 80, 10], [1, 5000, 120, 20], [2, 29000, 40, 10], [3, 26000, 3, 10],
    [4, 22000, 25, 8], [5, 6000, 90, 20], [6, 13000, 50, 10], [7, 16000, 45, 10],
    [8, 50000, 0, 10], [9, 142000, 12, 5], [10, 36000, 60, 10], [11, 68000, 30, 5],
    [12, 15000, 70, 15], [13, 9500, 2, 15], [14, 19000, 100, 20],
  ]
  for (const [mi, price, stock, threshold] of minhChauStock) {
    await pool.query(
      'INSERT INTO inventory (pharmacy_id, medicine_id, sell_price, stock, low_stock_threshold) VALUES ($1,$2,$3,$4,$5)',
      [pharmacyIds[0], medIds[mi], price, stock, threshold]
    )
  }
  // Các nhà thuốc khác: tập con với tồn kho đa dạng
  const othersStock: Array<[number, Array<[number, number, number]>]> = [
    [1, [[0, 34000, 30], [3, 26000, 18], [5, 5500, 60], [8, 52000, 25], [10, 37000, 35], [14, 18000, 45], [6, 12000, 8], [2, 27000, 0]]],
    [2, [[0, 31000, 22], [1, 4500, 100], [3, 25000, 0], [5, 5500, 45], [7, 15000, 30], [10, 35000, 20], [13, 9000, 60]]],
    [3, [[0, 32500, 55], [2, 30000, 15], [3, 27000, 40], [4, 23000, 5], [5, 6000, 80], [9, 140000, 8], [12, 14000, 25], [14, 17500, 60]]],
    [4, [[0, 33000, 12], [3, 24000, 30], [5, 5500, 0], [6, 13000, 40], [8, 49000, 18], [10, 35500, 22], [11, 66000, 4]]],
    [5, [[1, 4800, 85], [3, 25500, 15], [5, 6000, 30], [8, 51000, 9], [13, 9000, 45], [14, 18500, 25], [12, 14500, 18], [4, 22000, 6]]],
  ]
  for (const [pi, list] of othersStock) {
    for (const [mi, price, stock] of list) {
      await pool.query(
        'INSERT INTO inventory (pharmacy_id, medicine_id, sell_price, stock, low_stock_threshold) VALUES ($1,$2,$3,$4,10)',
        [pharmacyIds[pi], medIds[mi], price, stock]
      )
    }
  }

  // ---------------- Tài khoản ----------------
  const pw = sha256('123456')
  const users: any[] = [
    { full_name: 'Nguyễn Thị Lan', phone: '0901234567', password_hash: pw, cccd: '031202001234', role: 'patient' },
    { full_name: 'Trần Văn Hùng', phone: '0902222333', password_hash: pw, cccd: '045203004567', role: 'patient' },
    { full_name: 'Lê Minh Tuấn', phone: '0903333444', password_hash: pw, cccd: '079204005678', role: 'patient' },
    { full_name: 'Phạm Thị Hồng', phone: '0904444555', password_hash: pw, cccd: '028197002345', role: 'patient' },
    { full_name: 'BS. Nguyễn Văn Minh', phone: '0908888881', password_hash: pw, cccd: '', role: 'doctor', avatar_url: '/assets/doctors/dr-minh.jpg', doctor_specialty: 'Nội tổng quát', doctor_license: 'BYT-BS-2011-00567', doctor_online: 1 },
    { full_name: 'BS. Trần Thị Thu Hà', phone: '0908888882', password_hash: pw, cccd: '', role: 'doctor', avatar_url: '/assets/doctors/dr-ha.jpg', doctor_specialty: 'Tai Mũi Họng', doctor_license: 'BYT-BS-2014-00231', doctor_online: 1 },
    { full_name: 'BS. Lê Hoàng Sơn', phone: '0908888883', password_hash: pw, cccd: '', role: 'doctor', avatar_url: '/assets/doctors/dr-son.jpg', doctor_specialty: 'Da Liễu', doctor_license: 'BYT-BS-2016-00893', doctor_online: 0 },
    { full_name: 'BS. Phạm Ngọc Anh', phone: '0908888884', password_hash: pw, cccd: '', role: 'doctor', avatar_url: '/assets/doctors/dr-anh.jpg', doctor_specialty: 'Nội tổng quát – Hô hấp', doctor_license: 'BYT-BS-2019-01120', doctor_online: 1 },
    { full_name: 'BS. Vũ Đình Phúc', phone: '0908888885', password_hash: pw, cccd: '', role: 'doctor', avatar_url: '/assets/doctors/dr-phuc.jpg', doctor_specialty: 'Tai Mũi Họng', doctor_license: 'BYT-BS-2021-01455', doctor_online: 0 },
    { full_name: 'QL Nhà thuốc Minh Châu', phone: '0907777771', password_hash: pw, cccd: '', role: 'pharmacy', pharmacy_id: pharmacyIds[0] },
    { full_name: 'QL Nhà thuốc An Khang', phone: '0907777772', password_hash: pw, cccd: '', role: 'pharmacy', pharmacy_id: pharmacyIds[1] },
    { full_name: 'QL Nhà thuốc Thanh Đạt', phone: '0907777773', password_hash: pw, cccd: '', role: 'pharmacy', pharmacy_id: pharmacyIds[2] },
    { full_name: 'Quản trị viên BriMed', phone: '0900000001', password_hash: sha256('admin@2026'), cccd: '', role: 'admin' },
  ]
  const userIds: number[] = []
  for (const u of users) {
    const r = await pool.query(
      `INSERT INTO users (full_name, phone, password_hash, cccd, role,
       avatar_url, doctor_specialty, doctor_license, doctor_online, last_seen_at, pharmacy_id, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
      [u.full_name, u.phone, u.password_hash, u.cccd ?? '', u.role,
        u.avatar_url ?? '', u.doctor_specialty ?? null, u.doctor_license ?? null,
        u.doctor_online ?? 0, u.doctor_online ? new Date().toISOString() : '', u.pharmacy_id ?? null, daysAgo(90)]
    )
    userIds.push(r.rows[0].id)
  }
  const [lanId, hungId, tuanId, hongId, , bsHaId, , bsAnhId, , mcId] = userIds

  // Slot mẫu cho BS Minh (hôm nay +2h, ngày mai) — nhóm "Có lịch đặt trước" luôn có dữ liệu khi demo
  await pool.query(
    `INSERT INTO doctor_slots (doctor_id, starts_at, duration_min, capacity, status, ack, created_at)
     VALUES ($1,$2,30,2,'open',0,$3), ($1,$4,30,2,'open',0,$3)`,
    [userIds[4], new Date(Date.now() + 2 * 3600_000).toISOString(), new Date().toISOString(), new Date(Date.now() + 26 * 3600_000).toISOString()]
  )

  // ---------------- Hồ sơ sức khỏe ----------------
  const profiles = [
    { user_id: lanId, dob: '1992-05-14', gender: 'Nữ', medical_history: 'Không có bệnh nền. Viêm mũi họng tái phát 2–3 lần/năm.', drug_allergies: 'Penicillin (mề đay toàn thân)', pregnant: 0, current_medicines: '', temperature: 37.2, spo2: 98, blood_pressure: '115/75', share_consent: 1 },
    { user_id: hungId, dob: '1985-11-02', gender: 'Nam', medical_history: 'Tăng huyết áp nhẹ, đang theo dõi.', drug_allergies: 'Không', pregnant: 0, current_medicines: 'Amlodipin 5mg (uống sáng)', temperature: 36.8, spo2: 97, blood_pressure: '135/85', share_consent: 1 },
    { user_id: tuanId, dob: '1998-03-21', gender: 'Nam', medical_history: 'Không', drug_allergies: 'Không rõ', pregnant: 0, current_medicines: '', temperature: 36.6, spo2: 99, blood_pressure: '118/76', share_consent: 0 },
    { user_id: hongId, dob: '1975-07-30', gender: 'Nữ', medical_history: 'Đái tháo đường type 2 (đang kiểm soát tốt).', drug_allergies: 'Sulfamid', pregnant: 0, current_medicines: 'Metformin 500mg (2 viên/ngày)', temperature: 37.5, spo2: 96, blood_pressure: '130/80', share_consent: 1 },
  ]
  for (const p of profiles) {
    await pool.query(
      `INSERT INTO health_profiles (user_id, dob, gender, medical_history, drug_allergies, pregnant,
       current_medicines, temperature, spo2, blood_pressure, share_consent) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [p.user_id, p.dob, p.gender, p.medical_history, p.drug_allergies, p.pregnant,
        p.current_medicines, p.temperature, p.spo2, p.blood_pressure, p.share_consent]
    )
  }

  // ---------------- Tư vấn ----------------
  const insConsult = async (c: any) => {
    const r = await pool.query(
      `INSERT INTO consultations (patient_id, doctor_id, disease_group, symptom, duration_days, fever, fever_days,
       shortness_of_breath, is_child, pregnancy, drug_allergies, current_medicines, consent_share,
       red_flag, red_flag_reasons, status, payment_status, paid_at, call_started_at, call_duration_sec, call_note, doctor_note, reject_reason, created_at, decided_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,'paid',$17,$18,$19,$20,$21,$22,$23,$24) RETURNING id`,
      [c.patient_id, c.doctor_id, c.disease_group, c.symptom, c.duration_days, c.fever, c.fever_days,
        c.shortness_of_breath, c.is_child, c.pregnancy, c.drug_allergies, c.current_medicines, c.consent_share,
        c.red_flag, c.red_flag_reasons, c.status, c.created_at, c.call_started_at, c.call_duration_sec, c.call_note, c.doctor_note, c.reject_reason, c.created_at, c.decided_at]
    )
    return r.rows[0].id
  }

  const c1 = await insConsult({
    patient_id: lanId, doctor_id: bsHaId, disease_group: 'Viêm mũi họng cấp', symptom: 'Đau rát họng, sổ mũi, ho khan nhẹ', duration_days: 2, fever: 1, fever_days: 1,
    shortness_of_breath: 0, is_child: 0, pregnancy: 0, drug_allergies: 'Penicillin', current_medicines: '', consent_share: 1,
    red_flag: 0, red_flag_reasons: '[]', status: 'approved', call_started_at: daysAgo(3), call_duration_sec: 95,
    call_note: 'Bệnh nhân xác nhận đau họng 2 ngày, sốt nhẹ hôm qua, đã hết. Không khó thở.',
    doctor_note: 'Viêm mũi họng cấp thể nhẹ, không chỉ định kháng sinh. Điều trị giảm triệu chứng.', reject_reason: '', created_at: daysAgo(3), decided_at: daysAgo(3),
  })
  const c2 = await insConsult({
    patient_id: hungId, doctor_id: userIds[4], disease_group: 'Đau đầu do căng thẳng', symptom: 'Đau đầu vùng trán, cổ vai gáy cứng, sau giờ làm việc căng thẳng', duration_days: 3, fever: 0, fever_days: 0,
    shortness_of_breath: 0, is_child: 0, pregnancy: 0, drug_allergies: 'Không', current_medicines: 'Amlodipin 5mg', consent_share: 1,
    red_flag: 0, red_flag_reasons: '[]', status: 'approved', call_started_at: daysAgo(2), call_duration_sec: 70,
    call_note: 'Đau đầu kiểu căng thẳng, không buồn nôn, không nhìn mờ.',
    doctor_note: 'Đau đầu do căng thẳng. Nghỉ ngơi, giảm đau khi cần.', reject_reason: '', created_at: daysAgo(2), decided_at: daysAgo(2),
  })
  const c3 = await insConsult({
    patient_id: tuanId, doctor_id: bsAnhId, disease_group: 'Trào ngược', symptom: 'Nóng rát sau xương ức, ợ chua sau ăn, về đêm', duration_days: 14, fever: 0, fever_days: 0,
    shortness_of_breath: 0, is_child: 0, pregnancy: 0, drug_allergies: 'Không rõ', current_medicines: '', consent_share: 1,
    red_flag: 0, red_flag_reasons: '[]', status: 'approved', call_started_at: daysAgo(1), call_duration_sec: 110,
    call_note: 'Trào ngược 2 tuần, chưa dùng thuốc ức chế acid. Không nuốt khó, không sụt cân.',
    doctor_note: 'Trào ngược dạ dày thực quản. Ức chế bào chua 2 tuần, điều chỉnh sinh hoạt.', reject_reason: '', created_at: daysAgo(1), decided_at: daysAgo(1),
  })
  await insConsult({
    patient_id: hongId, doctor_id: null, disease_group: 'Viêm mũi họng cấp', symptom: 'Đau họng, sổ mũi, sốt nhẹ 2 ngày, người mệt', duration_days: 2, fever: 1, fever_days: 2,
    shortness_of_breath: 0, is_child: 0, pregnancy: 0, drug_allergies: 'Sulfamid', current_medicines: 'Metformin 500mg', consent_share: 1,
    red_flag: 0, red_flag_reasons: '[]', status: 'pending', call_started_at: null, call_duration_sec: 0, call_note: '', doctor_note: '', reject_reason: '', created_at: hoursAgo(0.03), decided_at: null,
  })
  await insConsult({
    patient_id: tuanId, doctor_id: bsHaId, disease_group: 'Khác (ngoài danh mục)', symptom: 'Ho đàm nhiều, khò khè, sốt 4 ngày', duration_days: 4, fever: 1, fever_days: 4,
    shortness_of_breath: 1, is_child: 0, pregnancy: 0, drug_allergies: 'Không rõ', current_medicines: '', consent_share: 1,
    red_flag: 1, red_flag_reasons: '["Sốt cao kéo dài trên 3 ngày","Khó thở / thở khò khè","Triệu chứng ngoài danh mục khám từ xa"]',
    status: 'rejected', call_started_at: daysAgo(4), call_duration_sec: 140,
    call_note: 'Bệnh nhân thở khò khè, ho đàm xanh, sốt 4 ngày.',
    doctor_note: '', reject_reason: 'Nghi ngờ viêm phế quản/phổi – ngoài danh mục TT 30/2023. Chuyển khám trực tiếp tại cơ sở y tế gần nhất.',
    created_at: daysAgo(4), decided_at: daysAgo(4),
  })

  // ---------------- Đơn thuốc ----------------
  const insRx = async (p: any) => {
    const r = await pool.query(
      `INSERT INTO prescriptions (national_code, consultation_id, patient_id, doctor_id, items, digital_signature, status,
       has_antibiotic, reject_reason, note, issued_at, dispensed_at, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`,
      [p.national_code, p.consultation_id, p.patient_id, p.doctor_id, p.items, p.digital_signature, p.status,
        p.has_antibiotic, p.reject_reason, p.note, p.issued_at, p.dispensed_at, p.created_at]
    )
    return r.rows[0].id
  }

  const rx1Items = [
    { medicine_id: medIds[0], name: 'Efferalgan 500mg', active_ingredient: 'Paracetamol', dosage: '1 viên/lần', usage: 'Uống sau ăn, cách nhau ≥6 giờ', duration_days: 3, quantity: 9 },
    { medicine_id: medIds[3], name: 'Siro ho Astex', active_ingredient: 'Dextromethorphan', dosage: '10ml/lần', usage: 'Uống 3 lần/ngày sau ăn', duration_days: 4, quantity: 1 },
    { medicine_id: medIds[5], name: 'Oresol gói 20,5g', active_ingredient: 'ORS', dosage: '1 gói/lần', usage: 'Pha với 200ml nước, uống khi khát', duration_days: 3, quantity: 6 },
  ]
  const rx1 = await insRx({
    national_code: 'VN-Rx-2026-00001', consultation_id: c1, patient_id: lanId, doctor_id: bsHaId,
    items: JSON.stringify(rx1Items), digital_signature: 'SmartCA-BS.6012-20261012T1430Z', status: 'dispensed',
    has_antibiotic: 0, reject_reason: '', note: 'Tái khám nếu sốt cao kéo dài hoặc khó thở.', issued_at: daysAgo(3), dispensed_at: daysAgo(3), created_at: daysAgo(3),
  })

  const rx2Items = [
    { medicine_id: medIds[0], name: 'Efferalgan 500mg', active_ingredient: 'Paracetamol', dosage: '1 viên/lần', usage: 'Uống khi đau, tối đa 3 lần/ngày', duration_days: 2, quantity: 6 },
    { medicine_id: medIds[14], name: 'Vitamin C 500mg', active_ingredient: 'Acid ascorbic', dosage: '1 viên/lần', usage: 'Sủi 1 viên/ngày sau ăn sáng', duration_days: 7, quantity: 7 },
  ]
  const rx2 = await insRx({
    national_code: 'VN-Rx-2026-00002', consultation_id: c2, patient_id: hungId, doctor_id: userIds[4],
    items: JSON.stringify(rx2Items), digital_signature: 'SmartCA-BS.6005-20261013T0915Z', status: 'issued',
    has_antibiotic: 0, reject_reason: '', note: 'Giảm căng thẳng, ngủ đủ giấc.', issued_at: daysAgo(2), dispensed_at: null, created_at: daysAgo(2),
  })

  const rx3Items = [
    { medicine_id: medIds[10], name: 'Omeprazol 20mg', active_ingredient: 'Omeprazol', dosage: '1 viên/lần', usage: 'Uống trước ăn sáng 30 phút', duration_days: 14, quantity: 14 },
    { medicine_id: medIds[12], name: 'Domperidon 10mg', active_ingredient: 'Domperidon', dosage: '1 viên/lần', usage: 'Uống trước ăn 15 phút, 3 lần/ngày', duration_days: 7, quantity: 21 },
  ]
  await insRx({
    national_code: 'VN-Rx-2026-00003', consultation_id: c3, patient_id: tuanId, doctor_id: bsAnhId,
    items: JSON.stringify(rx3Items), digital_signature: 'SmartCA-BS.6008-20261014T1602Z', status: 'issued',
    has_antibiotic: 0, reject_reason: '', note: 'Tránh ăn cay, không nằm ngay sau ăn.', issued_at: daysAgo(1), dispensed_at: null, created_at: daysAgo(1),
  })

  // 2 đơn có kháng sinh đã hoàn tất trong tháng (cho KPI tỷ lệ kháng sinh)
  await insRx({
    national_code: 'VN-Rx-2026-00004', consultation_id: null, patient_id: hungId, doctor_id: userIds[4],
    items: JSON.stringify([{ medicine_id: medIds[8], name: 'Amoxicillin 500mg', active_ingredient: 'Amoxicillin', dosage: '1 viên/lần', usage: 'Uống 3 lần/ngày sau ăn', duration_days: 5, quantity: 15 }]),
    digital_signature: 'SmartCA-BS.6005-20261005T1110Z', status: 'dispensed', has_antibiotic: 1,
    reject_reason: '', note: 'Viêm họng có chỉ định kháng sinh sau đánh giá.', issued_at: daysAgo(10), dispensed_at: daysAgo(10), created_at: daysAgo(10),
  })
  await insRx({
    national_code: 'VN-Rx-2026-00005', consultation_id: null, patient_id: hongId, doctor_id: bsHaId,
    items: JSON.stringify([{ medicine_id: medIds[9], name: 'Augmentin 1g', active_ingredient: 'Amoxicillin + Acid clavulanic', dosage: '1 viên/lần', usage: 'Uống 2 lần/ngày sau ăn', duration_days: 7, quantity: 14 }]),
    digital_signature: 'SmartCA-BS.6012-20261007T0845Z', status: 'dispensed', has_antibiotic: 1,
    reject_reason: '', note: 'Dị ứng Penicillin? Đã xác minh: không dị ứng beta-lactam (chỉ dị ứng Sulfamid).', issued_at: daysAgo(8), dispensed_at: daysAgo(8), created_at: daysAgo(8),
  })
  await insRx({
    national_code: 'VN-Rx-2026-00006', consultation_id: null, patient_id: tuanId, doctor_id: bsHaId,
    items: '[]', digital_signature: '', status: 'rejected', has_antibiotic: 0,
    reject_reason: 'Nghi ngờ viêm phế quản/phổi – ngoài danh mục TT 30/2023. Chuyển khám trực tiếp.',
    note: '', issued_at: null, dispensed_at: null, created_at: daysAgo(4),
  })

  // ---------------- Đơn hàng ----------------
  await pool.query(
    `INSERT INTO orders (prescription_id, patient_id, pharmacy_id, items, quote, delivery_fee, receive_method,
     tokens_charged, is_free, status, created_at, updated_at, completed_at)
     VALUES ($1,$2,$3,$4,$5,$6,'pickup',$7,$8,'completed',$9,$10,$11)`,
    [rx1, lanId, pharmacyIds[0],
      JSON.stringify(rx1Items.map((it) => ({ ...it, unit_price: 33000, line_total: it.medicine_id === medIds[0] ? 33000 : it.medicine_id === medIds[3] ? 26000 : 6000 * 6 }))),
      JSON.stringify({ subtotal: 97000, delivery_fee: 0, total: 97000, quoted_at: daysAgo(3) }),
      0, 3, 1, daysAgo(3), daysAgo(3), daysAgo(3)]
  )
  await pool.query(
    `INSERT INTO orders (prescription_id, patient_id, pharmacy_id, items, quote, delivery_fee, receive_method,
     tokens_charged, is_free, status, created_at, updated_at, completed_at)
     VALUES ($1,$2,$3,$4,$5,$6,'delivery',$7,$8,'ready_or_shipping',$9,$10,NULL)`,
    [rx2, hungId, pharmacyIds[1],
      JSON.stringify(rx2Items.map((it) => ({ ...it, unit_price: 34000, line_total: it.medicine_id === medIds[0] ? 34000 * 6 : 18000 * 7 }))),
      JSON.stringify({ subtotal: 330000, delivery_fee: 15000, total: 345000, quoted_at: daysAgo(2) }),
      15000, 3, 0, daysAgo(2), daysAgo(1)]
  )

  // ---------------- Giao dịch ----------------
  // Mô hình mới: phí khám 25.000đ/lượt (bệnh nhân trả qua VietQR), thù lao bác sĩ 15.000đ/lượt đã xử lý,
  // doanh thu thuê bao nhà thuốc B2B. Không hoa hồng tiền thuốc, không token.
  const CONSULT_FEE = 25000
  const DOCTOR_FEE = 15000
  const paidConsults = [
    { id: c1, patient_id: lanId, doctor_id: bsHaId, code: 'CV-00001', at: daysAgo(3) },
    { id: c2, patient_id: hungId, doctor_id: userIds[4], code: 'CV-00002', at: daysAgo(2) },
    { id: c3, patient_id: tuanId, doctor_id: bsAnhId, code: 'CV-00003', at: daysAgo(1) },
  ]
  for (const pc of paidConsults) {
    await pool.query(
      `INSERT INTO transactions (user_id, type, amount_token, amount_vnd, description, consultation_id, created_at)
       VALUES ($1, 'consultation_fee', 0, $2, $3, $4, $5)`,
      [pc.patient_id, CONSULT_FEE, `Phí khám từ xa (${pc.code})`, pc.id, pc.at]
    )
  }
  const decidedConsults = [
    { doctor_id: bsHaId, consult_id: c1, code: 'CV-00001', at: daysAgo(3) },
    { doctor_id: userIds[4], consult_id: c2, code: 'CV-00002', at: daysAgo(2) },
    { doctor_id: bsAnhId, consult_id: c3, code: 'CV-00003', at: daysAgo(1) },
  ]
  for (const dc of decidedConsults) {
    await pool.query(
      `INSERT INTO transactions (user_id, type, amount_token, amount_vnd, description, consultation_id, created_at)
       VALUES ($1, 'doctor_fee', 0, $2, $3, $4, $5)`,
      [dc.doctor_id, DOCTOR_FEE, `Thù lao bác sĩ lượt khám ${dc.code}`, dc.consult_id, dc.at]
    )
  }
  const txs = [
    { user_id: mcId, type: 'b2b_subscription', amount_token: 0, amount_vnd: 1500000, description: 'Phí nhà thuốc 6 tháng đầu (3 tháng đã dùng) – Minh Châu', consultation_id: null, created_at: daysAgo(45) },
    { user_id: null, type: 'b2b_subscription', amount_token: 0, amount_vnd: 1000000, description: 'Phí nhà thuốc 6 tháng đầu (2 tháng đã dùng) – An Khang', consultation_id: null, created_at: daysAgo(30) },
    { user_id: null, type: 'b2b_subscription', amount_token: 0, amount_vnd: 500000, description: 'Phí nhà thuốc 6 tháng đầu (1 tháng đã dùng) – Thanh Đạt', consultation_id: null, created_at: daysAgo(12) },
  ]
  for (const t of txs) {
    await pool.query(
      `INSERT INTO transactions (user_id, type, amount_token, amount_vnd, description, consultation_id, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [t.user_id, t.type, t.amount_token, t.amount_vnd, t.description, t.consultation_id, t.created_at]
    )
  }

  // ---------------- Nhắc uống thuốc ----------------
  const reminders = [
    { patient_id: lanId, prescription_id: rx1, medicine_name: 'Efferalgan 500mg (khi sốt)', times: ['Sáng', 'Trưa', 'Tối'], note: 'Chỉ uống khi sốt > 38.5°C', created_at: daysAgo(3) },
    { patient_id: lanId, prescription_id: rx1, medicine_name: 'Siro ho Astex', times: ['Sáng', 'Tối'], note: '10ml/lần sau ăn', created_at: daysAgo(3) },
    { patient_id: hungId, prescription_id: rx2, medicine_name: 'Vitamin C 500mg', times: ['Sáng'], note: '1 viên sủi sau ăn sáng', created_at: daysAgo(2) },
  ]
  for (const rm of reminders) {
    await pool.query(
      `INSERT INTO reminders (patient_id, prescription_id, medicine_name, times, note, active, created_at)
       VALUES ($1,$2,$3,$4,$5,1,$6)`,
      [rm.patient_id, rm.prescription_id, rm.medicine_name, JSON.stringify(rm.times), rm.note, rm.created_at]
    )
  }

  // ---------------- Đăng ký đối tác (chỉ nạp mẫu khi bảng trống) ----------------
  const regCount = await pool.query('SELECT COUNT(*)::int AS c FROM partner_registrations')
  if (regCount.rows[0].c === 0) {
    await pool.query(
      `INSERT INTO partner_registrations (pharmacy_name, address, ward, district, owner_name, phone, license_number,
       pharmacist_name, software, csdl_synced, plan, agreed, status, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,1,'new',$12)`,
      ['Nhà thuốc Bình Dân', '35 Đường số 17, Gò Vấp', 'P.16', 'Gò Vấp', 'Hoàng Bình Dân', '0933111222',
        'GP-KD-2026-0412', 'DS. Hoàng Bình Dân', 'MShop (phần mềm nội bộ)', 0, '1_month', daysAgo(1)]
    )
  }

  // Khách hàng cá nhân quan tâm (chỉ nạp mẫu khi bảng trống)
  const leadCount = await pool.query('SELECT COUNT(*)::int AS c FROM patient_leads')
  if (leadCount.rows[0].c === 0) {
    const leads = [
      ['Trần Thị Bích', '0938555111', 'Muốn dùng BriMed cho viêm mũi họng', 'new', daysAgo(1)],
      ['Lê Quốc Cường', '0977444222', 'Hỏi về cách dùng cho cả gia đình', 'contacted', daysAgo(2)],
      ['Phan Nhật Minh', '0903332288', 'Muốn nạp token dùng tại quầy', 'new', hoursAgo(3)],
    ]
    for (const l of leads) {
      await pool.query(
        `INSERT INTO patient_leads (full_name, phone, interest, status, created_at) VALUES ($1,$2,$3,$4,$5)`,
        l
      )
    }
  }

  const counts = await pool.query(`
    SELECT
      (SELECT COUNT(*)::int FROM users) users,
      (SELECT COUNT(*)::int FROM pharmacies) pharmacies,
      (SELECT COUNT(*)::int FROM medicines) medicines,
      (SELECT COUNT(*)::int FROM inventory) inventory,
      (SELECT COUNT(*)::int FROM consultations) consultations,
      (SELECT COUNT(*)::int FROM prescriptions) prescriptions,
      (SELECT COUNT(*)::int FROM orders) orders`)
  const c = counts.rows[0]
  console.log(`Hoàn tất nạp dữ liệu mẫu: users=${c.users}, pharmacies=${c.pharmacies}, medicines=${c.medicines}, inventory=${c.inventory}, consultations=${c.consultations}, prescriptions=${c.prescriptions}, orders=${c.orders}`)
}
