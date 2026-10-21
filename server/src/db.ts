import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'

const dataDir = path.join(import.meta.dirname, '..', 'data')
fs.mkdirSync(dataDir, { recursive: true })

// Kiểu mở có chủ đích: better-sqlite3 v12 trả `unknown` cho .get()/.all(),
// trong khi toàn bộ route đã xử lý dữ liệu dạng row lỏng (any) — xem routes/*.
export const db: any = new Database(path.join(dataDir, 'brimed.db'))
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

export const nowIso = () => new Date().toISOString()

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  cccd TEXT DEFAULT '',
  role TEXT NOT NULL CHECK (role IN ('patient','doctor','pharmacy','admin')),
  token_balance INTEGER NOT NULL DEFAULT 20,
  free_prescriptions INTEGER NOT NULL DEFAULT 2,
  doctor_specialty TEXT,
  doctor_license TEXT,
  doctor_online INTEGER NOT NULL DEFAULT 0,
  pharmacy_id INTEGER,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS health_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  dob TEXT DEFAULT '',
  gender TEXT DEFAULT '',
  medical_history TEXT DEFAULT '',
  drug_allergies TEXT DEFAULT '',
  pregnant INTEGER NOT NULL DEFAULT 0,
  current_medicines TEXT DEFAULT '',
  temperature REAL DEFAULT 36.5,
  spo2 INTEGER DEFAULT 98,
  blood_pressure TEXT DEFAULT '',
  share_consent INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS medicines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
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
  id INTEGER PRIMARY KEY AUTOINCREMENT,
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
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pharmacy_id INTEGER NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
  medicine_id INTEGER NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
  sell_price INTEGER NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER NOT NULL DEFAULT 10,
  UNIQUE (pharmacy_id, medicine_id)
);

CREATE TABLE IF NOT EXISTS consultations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
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
  call_started_at TEXT,
  call_duration_sec INTEGER DEFAULT 0,
  call_note TEXT DEFAULT '',
  doctor_note TEXT DEFAULT '',
  reject_reason TEXT DEFAULT '',
  created_at TEXT NOT NULL,
  decided_at TEXT
);

CREATE TABLE IF NOT EXISTS prescriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
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
  id INTEGER PRIMARY KEY AUTOINCREMENT,
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
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id),
  type TEXT NOT NULL,
  amount_token INTEGER NOT NULL DEFAULT 0,
  amount_vnd INTEGER NOT NULL DEFAULT 0,
  description TEXT DEFAULT '',
  prescription_id INTEGER,
  order_id INTEGER,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS substitution_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
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
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  prescription_id INTEGER,
  medicine_name TEXT NOT NULL,
  times TEXT NOT NULL DEFAULT '[]',
  note TEXT DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS partner_registrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
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
`)

export function publicUser(u: any) {
  if (!u) return null
  return {
    id: u.id,
    full_name: u.full_name,
    phone: u.phone,
    cccd: u.cccd,
    role: u.role,
    token_balance: u.token_balance,
    free_prescriptions: u.free_prescriptions,
    doctor_specialty: u.doctor_specialty,
    doctor_license: u.doctor_license,
    doctor_online: !!u.doctor_online,
    pharmacy_id: u.pharmacy_id,
  }
}
