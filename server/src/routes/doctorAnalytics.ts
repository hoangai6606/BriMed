import { Router } from 'express'
import { pool, ensureDb, nowIso } from '../db'
import { VN, bucketOf, keyOf, allKeys, q, num, pct } from './analytics'

// =====================================================================
// Analytics cho BÁC SĨ — "/api/doctor/analytics" (scope theo req.user.id):
// KPI hôm nay + SLA p50/p90, series ca/toa/thù lao theo ngày, cơ cấu nhóm
// bệnh, heatmap giờ bệnh nhân, tỷ lệ kháng sinh cá nhân, slot utilization.
// Tái dùng helper bucket theo giờ Việt Nam của analytics admin.
// =====================================================================

const r = Router()

r.get('/', async (req, res) => {
  try {
    await ensureDb()
    const me = req.user.id
    const days = [7, 30, 90].includes(Number(req.query.days)) ? Number(req.query.days) : 30
    const bucket = bucketOf(days)
    const from = new Date(Date.now() - days * 86400_000)
    const fromIso = from.toISOString()
    const monthStartIso = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
    const fmtKey = { day: 'YYYY-MM-DD', week: 'YYYY-MM-DD', month: 'YYYY-MM' }[bucket]
    const keyExpr = (col: string) => `to_char(date_trunc('${bucket}', ${VN(col)}), '${fmtKey}')`
    const todayKey = keyOf(new Date(), 'day')

    // Series + heatmap + nhóm bệnh (song song)
    const [csRows, rxRows, feeRows, waitRows, diseaseRows, hourRows] = await Promise.all([
      q(`SELECT ${keyExpr('created_at')} AS key, COUNT(*)::int AS consults,
          COUNT(*) FILTER (WHERE status = 'approved')::int AS approved,
          COUNT(*) FILTER (WHERE status = 'rejected')::int AS rejected
        FROM consultations WHERE doctor_id = $1 AND created_at >= $2 GROUP BY 1`, [me, fromIso]),
      q(`SELECT ${keyExpr('created_at')} AS key, COUNT(*)::int AS c
        FROM prescriptions WHERE doctor_id = $1 AND created_at >= $2 AND status IN ('issued','dispensed') GROUP BY 1`, [me, fromIso]),
      q(`SELECT ${keyExpr('created_at')} AS key, SUM(amount_vnd)::bigint AS v
        FROM transactions WHERE user_id = $1 AND type = 'doctor_fee' AND created_at >= $2 GROUP BY 1`, [me, fromIso]),
      q(`SELECT ${keyExpr('created_at')} AS key, ROUND(AVG(m)::numeric, 1)::float AS avg_m
        FROM (SELECT created_at, EXTRACT(EPOCH FROM (decided_at::timestamp - created_at::timestamp)) / 60 AS m
              FROM consultations WHERE doctor_id = $1 AND decided_at IS NOT NULL AND decided_at >= $2) t GROUP BY 1`, [me, fromIso]),
      q(`SELECT disease_group AS g, COUNT(*)::int AS c FROM consultations
        WHERE doctor_id = $1 AND created_at >= $2 GROUP BY 1 ORDER BY c DESC LIMIT 7`, [me, fromIso]),
      q(`SELECT EXTRACT(DOW FROM ${VN('created_at')})::int AS dow, EXTRACT(HOUR FROM ${VN('created_at')})::int AS h, COUNT(*)::int AS c
        FROM consultations WHERE doctor_id = $1 AND created_at >= $2 GROUP BY 1, 2`, [me, fromIso]),
    ])

    const keys = allKeys(from, bucket)
    const idx = new Map(keys.map((k, i) => [k, i]))
    const series = keys.map((key) => ({
      key, consults: 0, approved: 0, rejected: 0, rx: 0, earnings_vnd: 0, wait_avg: null as number | null,
    }))
    const add = (rows: any[], fn: (s: any, x: any) => void) => rows.forEach((row) => { const i = idx.get(row.key); if (i != null) fn(series[i], row) })
    add(csRows, (s, x) => { s.consults += num(x.consults); s.approved += num(x.approved); s.rejected += num(x.rejected) })
    add(rxRows, (s, x) => { s.rx += num(x.c) })
    add(feeRows, (s, x) => { s.earnings_vnd += num(x.v) })
    add(waitRows, (s, x) => { s.wait_avg = num(x.avg_m) })

    // KPI + chất lượng (song song)
    const [todayCs, todayRx, waitStats, monthFee, totalFee, abRow, callRow, callMonth, slotRow] = await Promise.all([
      q(`SELECT COUNT(*)::int AS c FROM consultations WHERE doctor_id = $1 AND to_char(${VN('created_at')}, 'YYYY-MM-DD') = $2`, [me, todayKey]),
      q(`SELECT COUNT(*)::int AS c FROM prescriptions WHERE doctor_id = $1 AND status IN ('issued','dispensed') AND to_char(${VN('created_at')}, 'YYYY-MM-DD') = $2`, [me, todayKey]),
      q(`SELECT ROUND(AVG(m)::numeric, 1)::float AS avg_m,
                ROUND((PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY m))::numeric, 1)::float AS p50,
                ROUND((PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY m))::numeric, 1)::float AS p90,
                COUNT(*)::int AS n, COUNT(*) FILTER (WHERE m <= 5)::int AS within
         FROM (SELECT EXTRACT(EPOCH FROM (decided_at::timestamp - created_at::timestamp)) / 60 AS m
               FROM consultations WHERE doctor_id = $1 AND decided_at IS NOT NULL AND decided_at >= $2) t`, [me, fromIso]),
      q(`SELECT COALESCE(SUM(amount_vnd), 0)::bigint AS v, COUNT(*)::int AS c FROM transactions
        WHERE user_id = $1 AND type = 'doctor_fee' AND created_at >= $2`, [me, monthStartIso]),
      q(`SELECT COALESCE(SUM(amount_vnd), 0)::bigint AS v, COUNT(*)::int AS c FROM transactions
        WHERE user_id = $1 AND type = 'doctor_fee'`, [me]),
      q(`SELECT COUNT(*)::int AS t, COUNT(*) FILTER (WHERE has_antibiotic = 1)::int AS a
        FROM prescriptions WHERE doctor_id = $1 AND created_at >= $2 AND status IN ('issued','dispensed')`, [me, fromIso]),
      q(`SELECT COUNT(*)::int AS started, COALESCE(ROUND((AVG(call_duration_sec) / 60)::numeric, 1), 0)::float AS avg_min
        FROM consultations WHERE doctor_id = $1 AND call_started_at >= $2`, [me, fromIso]),
      q(`SELECT COALESCE(ROUND((SUM(call_duration_sec) / 60.0)::numeric, 1), 0)::float AS m
        FROM consultations WHERE doctor_id = $1 AND call_started_at >= $2`, [me, monthStartIso]),
      q(`SELECT COALESCE(SUM(booked), 0)::int AS booked, COALESCE(SUM(capacity), 0)::int AS capacity, COUNT(*)::int AS slots
         FROM (SELECT ds.capacity, (SELECT COUNT(*)::int FROM consultations c WHERE c.slot_id = ds.id AND c.status != 'rejected') AS booked
               FROM doctor_slots ds WHERE ds.doctor_id = $1 AND ds.status = 'open' AND ds.starts_at > $2) t`, [me, nowIso()]),
    ])

    const heatmap: number[][] = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0))
    hourRows.forEach((x) => { heatmap[num(x.dow)][num(x.h)] += num(x.c) })

    res.json({
      generated_at: nowIso(),
      range: { days, bucket, from: fromIso },
      kpi: {
        today_consults: num(todayCs[0]?.c),
        today_rx: num(todayRx[0]?.c),
        wait: {
          avg_minutes: num(waitStats[0]?.avg_m), p50: num(waitStats[0]?.p50), p90: num(waitStats[0]?.p90),
          within_pct: pct(num(waitStats[0]?.within), num(waitStats[0]?.n)), target: 5,
        },
        month_earnings_vnd: num(monthFee[0]?.v), month_count: num(monthFee[0]?.c),
        total_earnings_vnd: num(totalFee[0]?.v), total_count: num(totalFee[0]?.c),
        antibiotic_pct: pct(num(abRow[0]?.a), num(abRow[0]?.t)), threshold: 30,
        avg_call_minutes: num(callRow[0]?.avg_min), call_minutes_month: num(callMonth[0]?.m),
        slots: {
          booked: num(slotRow[0]?.booked), capacity: num(slotRow[0]?.capacity), open_slots: num(slotRow[0]?.slots),
          utilization_pct: pct(num(slotRow[0]?.booked), num(slotRow[0]?.capacity)),
        },
      },
      series,
      disease_mix: diseaseRows.map((x) => ({ group: x.g, count: num(x.c) })),
      heatmap,
    })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Lỗi máy chủ, vui lòng thử lại.' })
  }
})

export default r
