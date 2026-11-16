import { Router } from 'express'
import { pool, ensureDb } from '../db'

// =====================================================================
// API "Phân tích & Theo dõi" cho quản trị viên — 8 trụ chỉ số:
//  1 Acquisition (truy cập, lead, signup)   2 Activation (phễu 7 bước)
//  3 Engagement (DAU/WAU/MAU/YAU theo vai trò) 4 Retention (quay lại)
//  5 Revenue (phí khám, B2B, ARPU, AOV)     6 Operations (SLA, gọi, kho)
//  7 Compliance (kháng sinh, ký số, CSDL)   8 Supply (pipeline nhà thuốc)
// North Star kép: toa cấp thành công/tuần + thời gian QR→nhận thuốc.
// =====================================================================

const r = Router()

const TZ = 'Asia/Ho_Chi_Minh'
// Chuyển cột ISO-UTC (TEXT) sang giờ Việt Nam để bucket ngày/tuần/tháng đúng lịch địa phương
const VN = (col: string) => `(${col}::timestamp AT TIME ZONE 'UTC' AT TIME ZONE '${TZ}')`

const q = async (sql: string, params: any[] = []) => pool.query(sql, params).then((x) => x.rows)
const num = (v: any) => (v == null ? 0 : Number(v))
const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 1000) / 10 : 0)
const deltaPct = (cur: number, prev: number) => (prev > 0 ? Math.round(((cur - prev) / prev) * 1000) / 10 : null)

// Khóa bucket theo giờ Việt Nam — thống nhất giữa SQL và JS
function bucketOf(days: number): 'day' | 'week' | 'month' {
  return days <= 30 ? 'day' : days <= 90 ? 'week' : 'month'
}
const FMT = { day: 'YYYY-MM-DD', week: 'YYYY-MM-DD', month: 'YYYY-MM' } as const

const dayFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' })
const parts = (d: Date) => {
  const p = Object.fromEntries(dayFmt.formatToParts(d).map((x) => [x.type, x.value]))
  return { y: Number(p.year), m: Number(p.month), d: Number(p.day) }
}
function dayKey(d: Date) {
  const { y, m, d: dd } = parts(d)
  return `${y}-${String(m).padStart(2, '0')}-${String(dd).padStart(2, '0')}`
}
// Thứ 2 của tuần chứa ngày d (theo lịch VN) — ISO: thứ 2 là ngày đầu tuần
const weekKey = (d: Date) => {
  const { y, m, d: dd } = parts(d)
  const utc = new Date(Date.UTC(y, m - 1, dd))
  const dow = utc.getUTCDay() // 0=Chủ nhật
  const monday = new Date(utc.getTime() - ((dow + 6) % 7) * 86400_000)
  return `${monday.getUTCFullYear()}-${String(monday.getUTCMonth() + 1).padStart(2, '0')}-${String(monday.getUTCDate()).padStart(2, '0')}`
}
const monthKey = (d: Date) => {
  const { y, m } = parts(d)
  return `${y}-${String(m).padStart(2, '0')}`
}
export function keyOf(d: Date, bucket: 'day' | 'week' | 'month') {
  return bucket === 'day' ? dayKey(d) : bucket === 'week' ? weekKey(d) : monthKey(d)
}

// Danh sách bucket liên tục từ `from` đến hiện tại (lấp khoảng trống = 0)
function allKeys(from: Date, bucket: 'day' | 'week' | 'month'): string[] {
  const keys: string[] = []
  const seen = new Set<string>()
  const stepMs = bucket === 'day' ? 86400_000 : 4 * 86400_000 // week/month duyệt theo 4 ngày cho đủ nhớ
  for (let t = from.getTime(); t <= Date.now(); t += stepMs) {
    const k = keyOf(new Date(t), bucket)
    if (!seen.has(k)) { seen.add(k); keys.push(k) }
  }
  return keys
}

// Thứ 2 tuần này (VN) đổi về mốc UTC — VN = UTC+7 cố định
function mondayVnAsUtc(offsetWeeks = 0): Date {
  const { y, m, d } = parts(new Date())
  const utc = new Date(Date.UTC(y, m - 1, d))
  const dow = utc.getUTCDay()
  const monday = new Date(utc.getTime() - ((dow + 6) % 7) * 86400_000 - offsetWeeks * 7 * 86400_000)
  return new Date(monday.getTime() - 7 * 3600_000)
}

r.get('/', async (req, res) => {
  try {
    await ensureDb()
    const days = [7, 30, 90, 365].includes(Number(req.query.days)) ? Number(req.query.days) : 30
    const bucket = bucketOf(days)
    const from = new Date(Date.now() - days * 86400_000)
    const fromIso = from.toISOString()
    const monthStartIso = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
    const truncExpr = (col: string) => `date_trunc('${bucket}', ${VN(col)})`
    const keyExpr = (col: string) => `to_char(${truncExpr(col)}, '${FMT[bucket]}')`

    const keys = allKeys(from, bucket)
    const emptySeries = () => keys.map((key) => ({
      key, visits: 0, visitors: 0, active_users: 0, logins: 0,
      by_role: { patient: 0, doctor: 0, pharmacy: 0, admin: 0, guest: 0 } as Record<string, number>,
      consults: 0, paid: 0, approved: 0, rejected: 0, issued: 0, dispensed: 0, antibiotic: 0,
      orders: 0, orders_completed: 0,
      revenue: { consult: 0, b2b: 0, doctor_fee: 0 } as Record<string, number>,
      new_users: 0, wait_avg: null as number | null,
    }))

    // ---------------- Nhóm query song song 1: series theo bucket ----------------
    const [evRows, consultRows, rxRows, orderRows, txRows, userRows] = await Promise.all([
      q(`SELECT ${keyExpr('e.created_at')} AS key,
          COUNT(*) FILTER (WHERE e.event = 'visit')::int AS visits,
          COUNT(DISTINCT e.visitor_id) FILTER (WHERE e.event = 'visit')::int AS visitors,
          COUNT(DISTINCT e.user_id)::int AS active_users,
          COUNT(*) FILTER (WHERE e.event = 'login')::int AS logins,
          COUNT(*) FILTER (WHERE e.event = 'visit' AND e.role = 'patient')::int AS r_patient,
          COUNT(*) FILTER (WHERE e.event = 'visit' AND e.role = 'doctor')::int AS r_doctor,
          COUNT(*) FILTER (WHERE e.event = 'visit' AND e.role = 'pharmacy')::int AS r_pharmacy,
          COUNT(*) FILTER (WHERE e.event = 'visit' AND e.role = 'admin')::int AS r_admin,
          COUNT(*) FILTER (WHERE e.event = 'visit' AND e.role = 'guest')::int AS r_guest
        FROM activity_events e WHERE e.created_at >= $1 GROUP BY 1`, [fromIso]),
      q(`SELECT ${keyExpr('c.created_at')} AS key, COUNT(*)::int AS consults,
          COUNT(*) FILTER (WHERE c.payment_status = 'paid')::int AS paid,
          COUNT(*) FILTER (WHERE c.status = 'approved')::int AS approved,
          COUNT(*) FILTER (WHERE c.status = 'rejected')::int AS rejected
        FROM consultations c WHERE c.created_at >= $1 GROUP BY 1`, [fromIso]),
      q(`SELECT ${keyExpr('p.created_at')} AS key,
          COUNT(*) FILTER (WHERE p.status IN ('issued','dispensed'))::int AS issued,
          COUNT(*) FILTER (WHERE p.status = 'dispensed')::int AS dispensed,
          COUNT(*) FILTER (WHERE p.has_antibiotic = 1 AND p.status IN ('issued','dispensed'))::int AS antibiotic
        FROM prescriptions p WHERE p.created_at >= $1 GROUP BY 1`, [fromIso]),
      q(`SELECT ${keyExpr('o.created_at')} AS key, COUNT(*)::int AS orders,
          COUNT(*) FILTER (WHERE o.status = 'completed')::int AS orders_completed
        FROM orders o WHERE o.created_at >= $1 GROUP BY 1`, [fromIso]),
      q(`SELECT ${keyExpr('t.created_at')} AS key, t.type, SUM(t.amount_vnd)::bigint AS v
        FROM transactions t WHERE t.created_at >= $1 AND t.amount_vnd != 0 GROUP BY 1, 2`, [fromIso]),
      q(`SELECT ${keyExpr('u.created_at')} AS key, COUNT(*)::int AS c
        FROM users u WHERE u.created_at >= $1 GROUP BY 1`, [fromIso]),
    ])

    const series = emptySeries()
    const idx = new Map(series.map((s, i) => [s.key, i]))
    const add = (rows: any[], fn: (s: any, row: any) => void) => rows.forEach((row) => { const i = idx.get(row.key); if (i != null) fn(series[i], row) })
    add(evRows, (s, x) => {
      s.visits += num(x.visits); s.visitors += num(x.visitors); s.active_users += num(x.active_users); s.logins += num(x.logins)
      s.by_role.patient += num(x.r_patient); s.by_role.doctor += num(x.r_doctor); s.by_role.pharmacy += num(x.r_pharmacy)
      s.by_role.admin += num(x.r_admin); s.by_role.guest += num(x.r_guest)
    })
    add(consultRows, (s, x) => { s.consults += num(x.consults); s.paid += num(x.paid); s.approved += num(x.approved); s.rejected += num(x.rejected) })
    add(rxRows, (s, x) => { s.issued += num(x.issued); s.dispensed += num(x.dispensed); s.antibiotic += num(x.antibiotic) })
    add(orderRows, (s, x) => { s.orders += num(x.orders); s.orders_completed += num(x.orders_completed) })
    add(txRows, (s, x) => {
      const v = num(x.v)
      if (x.type === 'consultation_fee') s.revenue.consult += v
      else if (x.type === 'b2b_subscription') s.revenue.b2b += v
      else if (x.type === 'doctor_fee') s.revenue.doctor_fee += v
    })
    add(userRows, (s, x) => { s.new_users += num(x.c) })

    // SLA chờ khám theo bucket ( trung bình phút quyết định)
    const waitRows = await q(
      `SELECT ${keyExpr('created_at')} AS key, ROUND(AVG(m)::numeric, 1)::float AS avg_m
       FROM (SELECT created_at, EXTRACT(EPOCH FROM (decided_at::timestamp - created_at::timestamp)) / 60 AS m
             FROM consultations WHERE decided_at IS NOT NULL AND decided_at >= $1) t GROUP BY 1`, [fromIso])
    add(waitRows, (s, x) => { s.wait_avg = num(x.avg_m) })

    // ---------------- Nhóm query song song 2: AU + North Star ----------------
    const d1 = new Date(Date.now() - 1 * 86400_000).toISOString()
    const d7 = new Date(Date.now() - 7 * 86400_000).toISOString()
    const d30 = new Date(Date.now() - 30 * 86400_000).toISOString()
    const d365 = new Date(Date.now() - 365 * 86400_000).toISOString()
    const [auCur, auPrev, sinceRow, dispWeekSeries, dispWeek, qrMed] = await Promise.all([
      q(`SELECT COUNT(DISTINCT user_id) FILTER (WHERE created_at >= $1)::int AS d1,
                COUNT(DISTINCT user_id) FILTER (WHERE created_at >= $2)::int AS d7,
                COUNT(DISTINCT user_id) FILTER (WHERE created_at >= $3)::int AS d30,
                COUNT(DISTINCT user_id) FILTER (WHERE created_at >= $4)::int AS d365
         FROM activity_events WHERE user_id IS NOT NULL AND created_at >= $4`, [d1, d7, d30, d365]),
      q(`SELECT COUNT(DISTINCT user_id) FILTER (WHERE created_at >= $1 AND created_at < $2)::int AS d1,
                COUNT(DISTINCT user_id) FILTER (WHERE created_at >= $3 AND created_at < $4)::int AS d7,
                COUNT(DISTINCT user_id) FILTER (WHERE created_at >= $5 AND created_at < $6)::int AS d30,
                COUNT(DISTINCT user_id) FILTER (WHERE created_at >= $7 AND created_at < $8)::int AS d365
         FROM activity_events WHERE user_id IS NOT NULL`,
        [new Date(Date.now() - 2 * 86400_000).toISOString(), d1,
         new Date(Date.now() - 14 * 86400_000).toISOString(), d7,
         new Date(Date.now() - 60 * 86400_000).toISOString(), d30,
         new Date(Date.now() - 730 * 86400_000).toISOString(), d365]),
      q(`SELECT MIN(created_at) AS since FROM activity_events`),
      q(`SELECT to_char(date_trunc('week', ${VN('dispensed_at')}), 'YYYY-MM-DD') AS key, COUNT(*)::int AS c
         FROM prescriptions WHERE dispensed_at IS NOT NULL AND dispensed_at >= $1 GROUP BY 1 ORDER BY 1`,
        [new Date(Date.now() - 12 * 7 * 86400_000).toISOString()]),
      q(`SELECT COUNT(*) FILTER (WHERE dispensed_at >= $1)::int AS cur,
                COUNT(*) FILTER (WHERE dispensed_at >= $2 AND dispensed_at < $1)::int AS prev
         FROM prescriptions WHERE dispensed_at IS NOT NULL`,
        [mondayVnAsUtc(0).toISOString(), mondayVnAsUtc(1).toISOString()]),
      q(`SELECT ROUND(AVG(m)::numeric, 1)::float AS avg_m,
                ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY m)::numeric, 1)::float AS p50,
                ROUND(PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY m)::numeric, 1)::float AS p90,
                COUNT(*)::int AS n
         FROM (SELECT EXTRACT(EPOCH FROM (o.completed_at::timestamp - c.created_at::timestamp)) / 60 AS m
               FROM orders o JOIN prescriptions p ON p.id = o.prescription_id
                    JOIN consultations c ON c.id = p.consultation_id
               WHERE o.completed_at IS NOT NULL AND o.completed_at >= $1) t`, [fromIso]),
    ])

    const auC = auCur[0] || {}
    const auP = auPrev[0] || {}
    const active = {
      dau: num(auC.d1), wau: num(auC.d7), mau: num(auC.d30), yau: num(auC.d365),
      dau_delta: deltaPct(num(auC.d1), num(auP.d1)), wau_delta: deltaPct(num(auC.d7), num(auP.d7)),
      mau_delta: deltaPct(num(auC.d30), num(auP.d30)), yau_delta: deltaPct(num(auC.d365), num(auP.d365)),
      stickiness: pct(num(auC.d1), num(auC.d30)),
    }

    const northStar = {
      dispensed_week: { current: num(dispWeek[0]?.cur), previous: num(dispWeek[0]?.prev), delta: deltaPct(num(dispWeek[0]?.cur), num(dispWeek[0]?.prev)) },
      qr_to_medicine: {
        avg_minutes: num(qrMed[0]?.avg_m), p50: num(qrMed[0]?.p50), p90: num(qrMed[0]?.p90), samples: num(qrMed[0]?.n),
      },
      dispensed_trend: dispWeekSeries.map((x) => ({ key: x.key, value: num(x.c) })),
    }

    // ---------------- Nhóm query song song 3: phễu + vai trò + bản đồ giờ ----------------
    const [funnelVisitors, rolesAccounts, rolesActive, rolesVisits, rolesLogins, rolesNew, hourly, topPaths, visitorsNewOld] = await Promise.all([
      q(`SELECT COUNT(DISTINCT visitor_id)::int AS c FROM activity_events WHERE event = 'visit' AND created_at >= $1`, [fromIso]),
      q(`SELECT role, COUNT(*)::int AS c FROM users GROUP BY role`),
      q(`SELECT role, COUNT(DISTINCT user_id)::int AS c FROM activity_events WHERE user_id IS NOT NULL AND created_at >= $1 GROUP BY role`, [fromIso]),
      q(`SELECT role, COUNT(*)::int AS visits, COUNT(DISTINCT visitor_id)::int AS uniques FROM activity_events WHERE event = 'visit' AND created_at >= $1 GROUP BY role`, [fromIso]),
      q(`SELECT role, COUNT(*)::int AS c FROM activity_events WHERE event = 'login' AND created_at >= $1 GROUP BY role`, [fromIso]),
      q(`SELECT role, COUNT(*)::int AS c FROM users WHERE created_at >= $1 GROUP BY role`, [fromIso]),
      q(`SELECT EXTRACT(DOW FROM ${VN('created_at')})::int AS dow, EXTRACT(HOUR FROM ${VN('created_at')})::int AS h, COUNT(*)::int AS c
         FROM activity_events WHERE event = 'visit' AND created_at >= $1 GROUP BY 1, 2`, [fromIso]),
      q(`SELECT path, COUNT(*)::int AS visits, COUNT(DISTINCT visitor_id)::int AS uniques
         FROM activity_events WHERE event = 'visit' AND created_at >= $1 GROUP BY path ORDER BY visits DESC LIMIT 10`, [fromIso]),
      q(`SELECT COUNT(*) FILTER (WHERE first_seen < $1)::int AS returning, COUNT(*) FILTER (WHERE first_seen >= $1)::int AS new_v
         FROM (SELECT visitor_id, MIN(created_at) AS first_seen FROM activity_events WHERE visitor_id != '' GROUP BY 1) t
         WHERE visitor_id IN (SELECT DISTINCT visitor_id FROM activity_events WHERE event = 'visit' AND created_at >= $1)`, [fromIso]),
    ])

    const countByRole = (rows: any[]) => {
      const m: Record<string, number> = {}
      rows.forEach((x) => { m[x.role] = num(x.c) })
      return m
    }
    const acc = countByRole(rolesAccounts)
    const act = countByRole(rolesActive)
    const log = countByRole(rolesLogins)
    const nw = countByRole(rolesNew)
    const visByRole: Record<string, any> = {}
    rolesVisits.forEach((x) => { visByRole[x.role] = { visits: num(x.visits), uniques: num(x.uniques) } })
    const roles = (['patient', 'doctor', 'pharmacy', 'admin', 'guest'] as const).map((role) => ({
      role,
      accounts: acc[role] || 0,
      active: act[role] || 0,
      active_pct: acc[role] ? pct(act[role] || 0, acc[role]) : null,
      visits: visByRole[role]?.visits || 0,
      visitors: visByRole[role]?.uniques || 0,
      logins: log[role] || 0,
      new_accounts: nw[role] || 0,
    }))

    const funnel = {
      visitors: num(funnelVisitors[0]?.c),
      signups: series.reduce((s, x) => s + x.new_users, 0),
      forms: series.reduce((s, x) => s + x.consults, 0),
      paid: series.reduce((s, x) => s + x.paid, 0),
      called: 0, // điền dưới bằng query riêng
      prescribed: series.reduce((s, x) => s + x.issued, 0),
      purchased: series.reduce((s, x) => s + x.orders_completed, 0),
      new_visitors: num(visitorsNewOld[0]?.new_v),
      returning_visitors: num(visitorsNewOld[0]?.returning),
    }

    const heatmap: number[][] = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0))
    hourly.forEach((x) => { heatmap[num(x.dow)][num(x.h)] += num(x.c) })

    // ---------------- Nhóm query song song 4: vận hành + tuân thủ + doanh thu + nguồn cung ----------------
    const [calledRow, waitStats, stuckRow, callRow, videoMonth, fulfillRow, substRow, stockRow, doctorRows, slotRow,
      abTrendRows, abDoctor, sigRow, dispRow, csdlRow, txSums, aovRows, pickupRows, pipelineRows, pharmMonths, planMixRows, repeatRow, retRows] = await Promise.all([
      q(`SELECT COUNT(*)::int AS c FROM consultations WHERE call_started_at >= $1`, [fromIso]),
      q(`SELECT ROUND(AVG(m)::numeric, 1)::float AS avg_m, ROUND((PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY m))::numeric, 1)::float AS p50,
                ROUND((PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY m))::numeric, 1)::float AS p90, COUNT(*)::int AS n,
                COUNT(*) FILTER (WHERE m <= 5)::int AS within
         FROM (SELECT EXTRACT(EPOCH FROM (decided_at::timestamp - created_at::timestamp)) / 60 AS m
               FROM consultations WHERE decided_at IS NOT NULL AND decided_at >= $1) t`, [fromIso]),
      q(`SELECT COUNT(*)::int AS c FROM consultations WHERE status = 'pending' AND payment_status = 'paid' AND created_at < $1`,
        [new Date(Date.now() - 15 * 60000).toISOString()]),
      q(`SELECT COUNT(*)::int AS started, COALESCE(ROUND((AVG(call_duration_sec) / 60)::numeric, 1), 0)::float AS avg_min
         FROM consultations WHERE call_started_at >= $1`, [fromIso]),
      q(`SELECT COALESCE(SUM(call_duration_sec), 0)::int AS s FROM consultations WHERE call_started_at >= $1`, [monthStartIso]),
      q(`SELECT COALESCE(ROUND((AVG(EXTRACT(EPOCH FROM (completed_at::timestamp - created_at::timestamp)) / 60) FILTER (WHERE completed_at >= $1))::numeric, 1), 0)::float AS avg_min,
                COUNT(*) FILTER (WHERE created_at >= $1)::int AS total,
                COUNT(*) FILTER (WHERE created_at >= $1 AND status = 'completed')::int AS completed,
                COUNT(*) FILTER (WHERE created_at >= $1 AND status = 'confirmed')::int AS confirmed,
                COUNT(*) FILTER (WHERE created_at >= $1 AND status = 'preparing')::int AS preparing,
                COUNT(*) FILTER (WHERE created_at >= $1 AND status = 'ready_or_shipping')::int AS ready
         FROM orders`, [fromIso]),
      q(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
                COALESCE(ROUND((AVG(EXTRACT(EPOCH FROM (decided_at::timestamp - created_at::timestamp)) / 60) FILTER (WHERE decided_at IS NOT NULL))::numeric, 1), 0)::float AS avg_min
         FROM substitution_requests WHERE created_at >= $1`, [fromIso]),
      q(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE stock = 0)::int AS out, COUNT(*) FILTER (WHERE stock > 0 AND stock <= low_stock_threshold)::int AS low FROM inventory`),
      q(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE doctor_online = 1 AND last_seen_at != '' AND last_seen_at >= $1)::int AS online FROM users WHERE role = 'doctor'`,
        [new Date(Date.now() - 10 * 60000).toISOString()]),
      q(`SELECT COALESCE(SUM(booked), 0)::int AS booked, COALESCE(SUM(capacity), 0)::int AS capacity
         FROM (SELECT ds.capacity, (SELECT COUNT(*)::int FROM consultations c WHERE c.slot_id = ds.id AND c.status != 'rejected') AS booked
               FROM doctor_slots ds WHERE ds.starts_at >= $1 AND ds.status = 'open') t`,
        [new Date().toISOString()]),
      q(`SELECT ${keyExpr('created_at')} AS key, COUNT(*)::int AS issued, COUNT(*) FILTER (WHERE has_antibiotic = 1)::int AS ab
         FROM prescriptions WHERE created_at >= $1 AND status IN ('issued','dispensed') GROUP BY 1`, [fromIso]),
      q(`SELECT u.full_name AS name, COUNT(*)::int AS total, COUNT(*) FILTER (WHERE p.has_antibiotic = 1)::int AS ab
         FROM prescriptions p JOIN users u ON u.id = p.doctor_id
         WHERE p.created_at >= $1 AND p.status IN ('issued','dispensed') GROUP BY 1 ORDER BY total DESC LIMIT 8`, [fromIso]),
      q(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE digital_signature != '')::int AS signed FROM prescriptions WHERE created_at >= $1 AND status IN ('issued','dispensed')`, [fromIso]),
      q(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status = 'dispensed')::int AS dispensed FROM prescriptions WHERE created_at >= $1 AND status IN ('issued','dispensed')`, [fromIso]),
      q(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE csdl_synced = 1)::int AS synced FROM pharmacies`),
      q(`SELECT type, SUM(amount_vnd)::bigint AS v FROM transactions WHERE created_at >= $1 GROUP BY type`, [fromIso]),
      q(`SELECT quote FROM orders WHERE status = 'completed' AND completed_at >= $1`, [fromIso]),
      q(`SELECT receive_method, COUNT(*)::int AS c FROM orders WHERE created_at >= $1 GROUP BY 1`, [fromIso]),
      q(`SELECT status, COUNT(*)::int AS c FROM partner_registrations GROUP BY 1`),
      q(`SELECT to_char(date_trunc('month', ${VN('subscription_started_at')}), 'YYYY-MM') AS key, COUNT(*)::int AS c
         FROM pharmacies WHERE subscription_started_at >= $1 GROUP BY 1 ORDER BY 1`,
        [new Date(Date.now() - 365 * 86400_000).toISOString()]),
      q(`SELECT subscription_plan AS plan, COUNT(*)::int AS c FROM pharmacies GROUP BY 1`),
      q(`SELECT (SELECT COUNT(DISTINCT patient_id)::int FROM consultations WHERE created_at >= $1) AS with1,
                (SELECT COUNT(*)::int FROM (SELECT patient_id FROM consultations WHERE created_at >= $1 GROUP BY patient_id HAVING COUNT(*) >= 2) t) AS with2`, [fromIso]),
      q(`SELECT COUNT(*)::int AS active_p, COUNT(*) FILTER (WHERE c >= 2)::int AS ret FROM (SELECT patient_id, COUNT(*)::int AS c FROM consultations GROUP BY patient_id) t`, []),
    ])

    funnel.called = num(calledRow[0]?.c)

    const consultsInRange = series.reduce((s, x) => s + x.consults, 0)
    const decidedInRange = series.reduce((s, x) => s + x.approved + x.rejected, 0)
    const issuedInRange = series.reduce((s, x) => s + x.issued, 0)
    const abInRange = series.reduce((s, x) => s + x.antibiotic, 0)
    const redFlags = await q(`SELECT COUNT(*)::int AS c FROM consultations WHERE red_flag = 1 AND created_at >= $1`, [fromIso])

    const tx: Record<string, number> = {}
    txSums.forEach((x) => { tx[x.type] = num(x.v) })
    const consultVnd = tx['consultation_fee'] || 0
    const b2bVnd = tx['b2b_subscription'] || 0
    const doctorFeeVnd = Math.abs(tx['doctor_fee'] || 0)
    const refundVnd = Math.abs(Object.entries(tx).filter(([k]) => k.includes('refund')).reduce((s, [, v]) => s + v, 0))
    let aovSum = 0, aovN = 0
    aovRows.forEach((x) => { try { const j = JSON.parse(x.quote || '{}'); if (j.total) { aovSum += Number(j.total); aovN++ } } catch { /* quote lỗi định dạng */ } })
    const paidPatients = await q(`SELECT COUNT(DISTINCT patient_id)::int AS c FROM consultations WHERE payment_status = 'paid' AND created_at >= $1`, [fromIso])

    const ops = {
      wait: {
        avg_minutes: num(waitStats[0]?.avg_m), p50: num(waitStats[0]?.p50), p90: num(waitStats[0]?.p90),
        samples: num(waitStats[0]?.n), within_target_pct: pct(num(waitStats[0]?.within), num(waitStats[0]?.n)),
        target: 5, stuck15: num(stuckRow[0]?.c),
      },
      calls: {
        started: num(callRow[0]?.started), avg_minutes: num(callRow[0]?.avg_min),
        video_minutes_month: Math.round((num(videoMonth[0]?.s) / 60) * 10) / 10, free_quota_minutes: 10000,
      },
      rx: {
        per_day: Math.round((issuedInRange / days) * 10) / 10,
        reject_pct: pct(series.reduce((s, x) => s + x.rejected, 0), decidedInRange),
        red_flag_pct: pct(num(redFlags[0]?.c), consultsInRange),
      },
      fulfillment: {
        avg_minutes: num(fulfillRow[0]?.avg_min),
        total: num(fulfillRow[0]?.total), completed: num(fulfillRow[0]?.completed),
        confirmed: num(fulfillRow[0]?.confirmed), preparing: num(fulfillRow[0]?.preparing), ready: num(fulfillRow[0]?.ready),
      },
      substitution: { total: num(substRow[0]?.total), pending: num(substRow[0]?.pending), avg_decide_minutes: num(substRow[0]?.avg_min) },
      stock: {
        total: num(stockRow[0]?.total), out: num(stockRow[0]?.out), low: num(stockRow[0]?.low),
        stockout_pct: pct(num(stockRow[0]?.out), num(stockRow[0]?.total)),
      },
      doctors: {
        total: num(doctorRows[0]?.total), online: num(doctorRows[0]?.online),
        rx_per_doctor_day: num(doctorRows[0]?.total) ? Math.round((issuedInRange / num(doctorRows[0]?.total) / days) * 100) / 100 : 0,
        slot_utilization_pct: pct(num(slotRow[0]?.booked), num(slotRow[0]?.capacity)),
      },
    }

    const compliance = {
      antibiotic_pct: pct(abInRange, issuedInRange), threshold: 30,
      antibiotic_trend: series.map((s) => ({ key: s.key, rate: pct(s.antibiotic, s.issued), issued: s.issued })),
      per_doctor: abDoctor.map((x) => ({ name: x.name, total: num(x.total), rate: pct(num(x.ab), num(x.total)) })),
      digital_signature_pct: pct(num(sigRow[0]?.signed), num(sigRow[0]?.total)),
      dispensed_pct: pct(num(dispRow[0]?.dispensed), num(dispRow[0]?.total)),
      csdl_pct: pct(num(csdlRow[0]?.synced), num(csdlRow[0]?.total)),
    }

    const revenue = {
      consult_vnd: consultVnd, b2b_vnd: b2bVnd, doctor_fee_vnd: doctorFeeVnd, refund_vnd: refundVnd,
      total_vnd: consultVnd + b2bVnd,
      arpu_vnd: num(paidPatients[0]?.c) ? Math.round(consultVnd / num(paidPatients[0]?.c)) : 0,
      aov_vnd: aovN ? Math.round(aovSum / aovN) : null,
      pickup: num(pickupRows.find((x) => x.receive_method === 'pickup')?.c),
      delivery: num(pickupRows.find((x) => x.receive_method === 'delivery')?.c),
    }

    const pipeline: Record<string, number> = { new: 0, contacted: 0, signed: 0, converted: 0 }
    pipelineRows.forEach((x) => { pipeline[x.status] = num(x.c) })
    const supply = {
      pipeline,
      new_per_month: pharmMonths.map((x) => ({ key: x.key, value: num(x.c) })),
      plan_mix: planMixRows.map((x) => ({ plan: x.plan, count: num(x.c) })),
    }

    const retention = {
      overall_pct: pct(num(retRows[0]?.ret), num(retRows[0]?.active_p)),
      repeat_in_range_pct: pct(num(repeatRow[0]?.with2), num(repeatRow[0]?.with1)),
      new_visitors: funnel.new_visitors, returning_visitors: funnel.returning_visitors,
    }

    res.json({
      generated_at: new Date().toISOString(),
      range: { days, bucket, from: fromIso },
      tracking_since: sinceRow[0]?.since || null,
      north_star: northStar,
      active,
      series,
      funnel, roles, heatmap, top_paths: topPaths,
      ops, compliance, revenue, supply, retention,
    })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Lỗi máy chủ, vui lòng thử lại.' })
  }
})

export default r
