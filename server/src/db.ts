import { Pool } from 'pg'
import crypto from 'node:crypto'

// Kết nối Neon Postgres — connection string lấy từ biến môi trường DATABASE_URL
const connectionString = process.env.DATABASE_URL || ''

export const pool = new Pool({
  connectionString: connectionString || undefined,
  ssl: connectionString ? { rejectUnauthorized: false } : undefined,
  max: 5,
})

export const nowIso = () => new Date().toISOString()
export const sha256 = (s: string) => crypto.createHash('sha256').update(s).digest('hex')

// Lược đồ đầy đủ của nền tảng (Giai đoạn 1 chỉ sử dụng: users, sessions,
// partner_registrations, patient_leads — các bảng còn lại chuẩn bị cho giai đoạn sau)
const DDL = `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  cccd TEXT DEFAULT '',
  role TEXT NOT NULL CHECK (role IN ('patient','doctor','pharmacy','admin')),
  doctor_specialty TEXT,
  doctor_license TEXT,
  doctor_online INTEGER NOT NULL DEFAULT 0,
  last_seen_at TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  pharmacy_id INTEGER,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS doctor_slots (
  id SERIAL PRIMARY KEY,
  doctor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  starts_at TEXT NOT NULL,
  duration_min INTEGER NOT NULL DEFAULT 30,
  capacity INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','cancelled')),
  ack INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS health_profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  dob TEXT DEFAULT '',
  gender TEXT DEFAULT '',
  medical_history TEXT DEFAULT '',
  drug_allergies TEXT DEFAULT '',
  pregnant INTEGER NOT NULL DEFAULT 0,
  current_medicines TEXT DEFAULT '',
  temperature DOUBLE PRECISION DEFAULT 36.5,
  spo2 INTEGER DEFAULT 98,
  blood_pressure TEXT DEFAULT '',
  share_consent INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS medicines (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  active_ingredient TEXT NOT NULL,
  pack_size TEXT DEFAULT '',
  info TEXT DEFAULT '',
  form TEXT DEFAULT '',
  category TEXT NOT NULL DEFAULT 'otc' CHECK (category IN ('rx','otc')),
  is_antibiotic INTEGER NOT NULL DEFAULT 0,
  med_group TEXT DEFAULT '',
  reference_price INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS pharmacies (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  ward TEXT DEFAULT '',
  district TEXT DEFAULT 'Gò Vấp',
  owner_name TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  license_number TEXT DEFAULT '',
  pharmacist_name TEXT DEFAULT '',
  csdl_synced INTEGER NOT NULL DEFAULT 1,
  subscription_plan TEXT DEFAULT '1_month' CHECK (subscription_plan IN ('1_month','3_months')),
  subscription_started_at TEXT,
  standee_code TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS inventory (
  id SERIAL PRIMARY KEY,
  pharmacy_id INTEGER NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
  medicine_id INTEGER NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
  sell_price INTEGER NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER NOT NULL DEFAULT 10,
  UNIQUE (pharmacy_id, medicine_id)
);

CREATE TABLE IF NOT EXISTS consultations (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  doctor_id INTEGER REFERENCES users(id),
  disease_group TEXT NOT NULL,
  symptom TEXT DEFAULT '',
  duration_days INTEGER NOT NULL DEFAULT 1,
  fever INTEGER NOT NULL DEFAULT 0,
  fever_days INTEGER NOT NULL DEFAULT 0,
  shortness_of_breath INTEGER NOT NULL DEFAULT 0,
  is_child INTEGER NOT NULL DEFAULT 0,
  pregnancy INTEGER NOT NULL DEFAULT 0,
  drug_allergies TEXT DEFAULT '',
  current_medicines TEXT DEFAULT '',
  consent_share INTEGER NOT NULL DEFAULT 1,
  red_flag INTEGER NOT NULL DEFAULT 0,
  red_flag_reasons TEXT DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_call','approved','rejected')),
  payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid','paid')),
  paid_at TEXT,
  call_started_at TEXT,
  call_duration_sec INTEGER DEFAULT 0,
  call_note TEXT DEFAULT '',
  doctor_note TEXT DEFAULT '',
  reject_reason TEXT DEFAULT '',
  created_at TEXT NOT NULL,
  decided_at TEXT
);

CREATE TABLE IF NOT EXISTS prescriptions (
  id SERIAL PRIMARY KEY,
  national_code TEXT NOT NULL UNIQUE,
  consultation_id INTEGER REFERENCES consultations(id),
  patient_id INTEGER NOT NULL REFERENCES users(id),
  doctor_id INTEGER NOT NULL REFERENCES users(id),
  items TEXT NOT NULL DEFAULT '[]',
  digital_signature TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'issued' CHECK (status IN ('pending','issued','rejected','dispensed')),
  has_antibiotic INTEGER NOT NULL DEFAULT 0,
  reject_reason TEXT DEFAULT '',
  note TEXT DEFAULT '',
  issued_at TEXT,
  dispensed_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  prescription_id INTEGER NOT NULL REFERENCES prescriptions(id),
  patient_id INTEGER NOT NULL REFERENCES users(id),
  pharmacy_id INTEGER NOT NULL REFERENCES pharmacies(id),
  items TEXT NOT NULL DEFAULT '[]',
  quote TEXT DEFAULT '',
  delivery_fee INTEGER NOT NULL DEFAULT 0,
  receive_method TEXT NOT NULL DEFAULT 'pickup' CHECK (receive_method IN ('pickup','delivery')),
  tokens_charged INTEGER NOT NULL DEFAULT 0,
  is_free INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed','preparing','ready_or_shipping','completed')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  type TEXT NOT NULL,
  amount_token INTEGER NOT NULL DEFAULT 0,
  amount_vnd INTEGER NOT NULL DEFAULT 0,
  description TEXT DEFAULT '',
  consultation_id INTEGER,
  prescription_id INTEGER,
  order_id INTEGER,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS substitution_requests (
  id SERIAL PRIMARY KEY,
  prescription_id INTEGER NOT NULL REFERENCES prescriptions(id),
  order_id INTEGER,
  pharmacy_id INTEGER NOT NULL REFERENCES pharmacies(id),
  medicine_id INTEGER NOT NULL REFERENCES medicines(id),
  substitute_medicine_id INTEGER REFERENCES medicines(id),
  reason TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  doctor_id INTEGER,
  created_at TEXT NOT NULL,
  decided_at TEXT
);

CREATE TABLE IF NOT EXISTS reminders (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  prescription_id INTEGER,
  medicine_name TEXT NOT NULL,
  times TEXT NOT NULL DEFAULT '[]',
  note TEXT DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS partner_registrations (
  id SERIAL PRIMARY KEY,
  pharmacy_name TEXT NOT NULL,
  address TEXT NOT NULL,
  ward TEXT DEFAULT '',
  district TEXT DEFAULT 'Gò Vấp',
  owner_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  license_number TEXT DEFAULT '',
  pharmacist_name TEXT DEFAULT '',
  software TEXT DEFAULT '',
  csdl_synced INTEGER NOT NULL DEFAULT 0,
  plan TEXT DEFAULT '1_month',
  agreed INTEGER NOT NULL DEFAULT 1,
  status TEXT DEFAULT 'new',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS patient_leads (
  id SERIAL PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  interest TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','converted')),
  created_at TEXT NOT NULL
);
`

let ready: Promise<void> | null = null

// Khởi tạo lược đồ + dữ liệu nền (chạy đúng một lần cho mỗi tiến trình)
export function ensureDb(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await pool.query(DDL)

      // Migration cho cơ sở dữ liệu tạo từ phiên bản trước (bỏ token, thêm phí khám)
      await pool.query(`ALTER TABLE users DROP COLUMN IF EXISTS token_balance`)
      await pool.query(`ALTER TABLE users DROP COLUMN IF EXISTS free_prescriptions`)
      await pool.query(`ALTER TABLE consultations ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'unpaid'`)
      await pool.query(`ALTER TABLE consultations ADD COLUMN IF NOT EXISTS paid_at TEXT`)
      await pool.query(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS consultation_id INTEGER`)
      await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT ''`)
      await pool.query(`ALTER TABLE consultations ADD COLUMN IF NOT EXISTS preferred_doctor_id INTEGER`)
      await pool.query(`ALTER TABLE consultations ADD COLUMN IF NOT EXISTS slot_id INTEGER`)
      await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_at TEXT DEFAULT ''`)
      await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_address TEXT DEFAULT ''`)
      await pool.query(`ALTER TABLE doctor_slots ADD COLUMN IF NOT EXISTS ack INTEGER NOT NULL DEFAULT 0`)
      await pool.query(`ALTER TABLE consultations DROP CONSTRAINT IF EXISTS consultations_status_check`)
      await pool.query(`ALTER TABLE consultations ADD CONSTRAINT consultations_status_check CHECK (status IN ('pending','in_call','approved','rejected','cancelled')) NOT VALID`)
      await pool.query(`ALTER TABLE consultations DROP CONSTRAINT IF EXISTS consultations_payment_status_check`)
      await pool.query(`ALTER TABLE consultations ADD CONSTRAINT consultations_payment_status_check CHECK (payment_status IN ('unpaid','paid','refunded')) NOT VALID`)
      // Các tư vấn cũ đã đi vào vận hành coi như đã thanh toán
      await pool.query(`UPDATE consultations SET payment_status = 'paid', paid_at = COALESCE(paid_at, created_at) WHERE payment_status = 'unpaid' AND status IN ('in_call','approved','rejected')`)

      // Cơ sở dữ liệu trống (lần đầu chạy) — nạp toàn bộ dữ liệu mẫu
      // (tài khoản 4 vai trò, nhà thuốc, thuốc, tồn kho, tư vấn, đơn thuốc...)
      const users = await pool.query(`SELECT COUNT(*)::int AS c FROM users`)
      if (users.rows[0].c === 0) {
        const { seedDb } = await import('./seed.js')
        await seedDb()
        return
      }

      // Tài khoản quản trị viên duy nhất của Giai đoạn 1
      const admin = await pool.query(`SELECT COUNT(*)::int AS c FROM users WHERE role = 'admin'`)
      if (admin.rows[0].c === 0) {
        await pool.query(
          `INSERT INTO users (full_name, phone, password_hash, role, token_balance, free_prescriptions, created_at)
           VALUES ($1, $2, $3, 'admin', 0, 0, $4)`,
          ['Quản trị viên BriMed', '0900000001', sha256('admin@2026'), nowIso()]
        )
      }

      // Khách hàng quan tâm mẫu (form đăng ký trên trang chủ)
      const leads = await pool.query(`SELECT COUNT(*)::int AS c FROM patient_leads`)
      if (leads.rows[0].c === 0) {
        await pool.query(
          `INSERT INTO patient_leads (full_name, phone, interest, status, created_at) VALUES
           ($1, $2, $3, 'new', $4), ($5, $6, $7, 'contacted', $8), ($9, $10, $11, 'new', $12)`,
          [
            'Trần Thị Bích', '0938555111', 'Muốn dùng BriMed cho viêm mũi họng', nowIso(),
            'Lê Quốc Cường', '0977444222', 'Hỏi về cách dùng cho cả gia đình', nowIso(),
            'Phan Nhật Minh', '0903332288', 'Muốn nạp token dùng tại quầy', nowIso(),
          ]
        )
      }

      // Nhà thuốc đối tác mẫu (form đăng ký hợp tác)
      const regs = await pool.query(`SELECT COUNT(*)::int AS c FROM partner_registrations`)
      if (regs.rows[0].c === 0) {
        await pool.query(
          `INSERT INTO partner_registrations (pharmacy_name, address, ward, district, owner_name, phone, license_number, pharmacist_name, software, csdl_synced, plan, agreed, status, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 1, '3_months', 1, 'new', $10),
                  ($11, $12, $13, $14, $15, $16, $17, $18, $19, 0, '1_month', 1, 'new', $20)`,
          [
            'Nhà thuốc Minh Châu', '128 Nguyễn Oanh', 'P.17', 'Gò Vấp', 'Nguyễn Minh Châu', '0903777001', 'GP-KD-2026-0123', 'DS. Nguyễn Minh Châu', 'MShop', nowIso(),
            'Nhà thuốc Bình Dân', '35 Đường số 17', 'P.16', 'Gò Vấp', 'Hoàng Bình Dân', '0933111222', 'GP-KD-2026-0412', 'DS. Hoàng Bình Dân', 'MShop', nowIso(),
          ]
        )
      }
    })().catch((e) => {
      ready = null
      throw e
    })
  }
  return ready
}
