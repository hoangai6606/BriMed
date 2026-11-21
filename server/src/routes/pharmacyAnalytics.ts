import { Router } from 'express'
import { pool, ensureDb, nowIso } from '../db'
import { VN, bucketOf, keyOf, allKeys, q, num, pct } from './analytics'

// =====================================================================
// Analytics cho NHÀ THUỐC — "/api/pharmacy/analytics" (scope myPharmacy):
// KPI đơn/doanh thu tiền thuốc/giá trị kho, series đơn theo trạng thái,
// doanh thu + tốc độ chốt đơn theo ngày, pickup/delivery, top thuốc bán
// chạy (items JSON: name/quantity/line_total), tồn kho, đổi hoạt chất.
// =====================================================================

const r = Router()

r.get('/', async (req, res) => {
  try {
    await ensureDb()
    const p = (await pool.query('SELECT * FROM pharmacies WHERE id = $1', [req.user.pharmacy_id])).rows[0]
    if (!p) return res.status(400).json({ error: 'Tài khoản chưa được gắn với nhà thuốc.' })
    const days = [7, 30, 90].includes(Number(req.query.days)) ? Number(req.query.days) : 30
    const bucket = bucketOf(days)
    const from = new Date(Date.now() - days * 86400_000)
    const fromIso = from.toISOString()
    const fmtKey = { day: 'YYYY-MM-DD', week: 'YYYY-MM-DD', month: 'YYYY-MM' }[bucket]
    const keyExpr = (col: string) => `to_char(date_trunc('${bucket}', ${VN(col)}), '${fmtKey}')`
    const todayKey = keyOf(new Date(), 'day')

    const [orderRows, doneRows, mixRows, invRow, subRow] = await Promise.all([
      // Đơn tạo theo trạng thái trong kỳ
      q(`SELECT ${keyExpr('created_at')} AS key,
          COUNT(*) FILTER (WHERE status = 'confirmed')::int AS confirmed,
          COUNT(*) FILTER (WHERE status = 'preparing')::int AS preparing,
          COUNT(*) FILTER (WHERE status = 'ready_or_shipping')::int AS ready,
          COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
          COUNT(*)::int AS total
        FROM orders WHERE pharmacy_id = $1 AND created_at >= $2 GROUP BY 1`, [p.id, fromIso]),
      // Đơn hoàn tất trong kỳ: lấy row thô (quote parse từng đơn) — gom bucket bằng JS
      q(`SELECT created_at, completed_at, quote FROM orders
        WHERE pharmacy_id = $1 AND completed_at IS NOT NULL AND completed_at >= $2`, [p.id, fromIso]),
      // Hình thức nhận trong kỳ (donut pickup/delivery)
      q(`SELECT receive_method, COUNT(*)::int AS c FROM orders WHERE pharmacy_id = $1 AND created_at >= $2 GROUP BY 1`, [p.id, fromIso]),
      // Tồn kho: giá trị + hết/sắp hết + top giá trị
      q(`SELECT i.stock, i.sell_price, i.low_stock_threshold, m.name,
            (i.sell_price * i.stock)::bigint AS value,
            COUNT(*) OVER ()::int AS lines
         FROM inventory i JOIN medicines m ON m.id = i.medicine_id
         WHERE i.pharmacy_id = $1 ORDER BY value DESC`, [p.id]),
      // Đổi hoạt chất
      q(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
            COALESCE(ROUND((AVG(EXTRACT(EPOCH FROM (decided_at::timestamp - created_at::timestamp)) / 60) FILTER (WHERE decided_at IS NOT NULL))::numeric, 1), 0)::float AS avg_min
         FROM substitution_requests WHERE pharmacy_id = $1 AND created_at >= $2`, [p.id, fromIso]),
    ])

    const keys = allKeys(from, bucket)
    const idx = new Map(keys.map((k, i) => [k, i]))
    const series = keys.map((key) => ({
      key, orders: 0, confirmed: 0, preparing: 0, ready: 0, completed: 0,
      revenue_vnd: 0, done: 0, fulfill_avg: null as number | null,
    }))
    orderRows.forEach((row) => {
      const i = idx.get(row.key); if (i == null) return
      const s = series[i]
      s.orders += num(row.total); s.confirmed += num(row.confirmed); s.preparing += num(row.preparing)
      s.ready += num(row.ready); s.completed += num(row.completed)
    })
    let revTotal = 0, revDone = 0, fulfillSum = 0, fulfillN = 0
    const doneAgg = new Map<string, { rev: number; count: number; mins: number }>()
    doneRows.forEach((row: any) => {
      let total = 0
      try { total = Number(JSON.parse(row.quote || '{}').total) || 0 } catch { /* quote lỗi định dạng */ }
      const mins = (new Date(row.completed_at).getTime() - new Date(row.created_at).getTime()) / 60000
      const key = keyOf(new Date(row.completed_at), bucket)
      revTotal += total; revDone += 1; fulfillSum += mins; fulfillN += 1
      const cur = doneAgg.get(key) || { rev: 0, count: 0, mins: 0 }
      cur.rev += total; cur.count += 1; cur.mins += mins
      doneAgg.set(key, cur)
    })
    doneAgg.forEach((v, k) => {
      const i = idx.get(k); if (i == null) return
      series[i].revenue_vnd += v.rev
      series[i].done += v.count
      series[i].fulfill_avg = Math.round((v.mins / v.count) * 10) / 10
    })

    // KPI hôm nay + top thuốc bán chạy (items JSON của đơn hoàn tất trong kỳ)
    const [todayRows, topRows] = await Promise.all([
      q(`SELECT COUNT(*) FILTER (WHERE to_char(${VN('created_at')}, 'YYYY-MM-DD') = $2)::int AS created_today,
                COUNT(*) FILTER (WHERE status = 'completed' AND to_char(${VN('completed_at')}, 'YYYY-MM-DD') = $2)::int AS done_today
         FROM orders WHERE pharmacy_id = $1`, [p.id, todayKey]),
      q(`SELECT items FROM orders WHERE pharmacy_id = $1 AND status = 'completed' AND completed_at >= $2`, [p.id, fromIso]),
    ])
    const medMap = new Map<string, { qty: number; revenue: number }>()
    topRows.forEach((row: any) => {
      let items: any[] = []
      try { items = JSON.parse(row.items || '[]') } catch { /* bỏ qua */ }
      items.forEach((it) => {
        const key = it.name || 'Không rõ'
        const cur = medMap.get(key) || { qty: 0, revenue: 0 }
        cur.qty += Number(it.quantity) || 0
        cur.revenue += Number(it.line_total) || 0
        medMap.set(key, cur)
      })
    })
    const top_medicines = [...medMap.entries()]
      .sort((a, b) => b[1].qty - a[1].qty).slice(0, 8)
      .map(([name, v]) => ({ name, qty: v.qty, revenue: v.revenue }))

    const lines = invRow.length ? num(invRow[0].lines) : 0
    const outCount = invRow.filter((x: any) => num(x.stock) <= 0).length
    const lowCount = invRow.filter((x: any) => num(x.stock) > 0 && num(x.stock) <= num(x.low_stock_threshold)).length
    const invValue = invRow.reduce((s: number, x: any) => s + num(x.value), 0)

    res.json({
      generated_at: nowIso(),
      range: { days, bucket, from: fromIso },
      kpi: {
        orders_today: num(todayRows[0]?.created_today), done_today: num(todayRows[0]?.done_today),
        revenue_vnd: revTotal, orders_done: revDone,
        aov_vnd: revDone ? Math.round(revTotal / revDone) : 0,
        fulfill_avg_minutes: fulfillN ? Math.round((fulfillSum / fulfillN) * 10) / 10 : 0,
        inventory: { lines, out: outCount, low: lowCount, value_vnd: invValue, stockout_pct: pct(outCount, lines) },
        substitutions: { total: num(subRow[0]?.total), pending: num(subRow[0]?.pending), avg_decide_minutes: num(subRow[0]?.avg_min) },
      },
      series,
      pickup: num(mixRows.find((x) => x.receive_method === 'pickup')?.c),
      delivery: num(mixRows.find((x) => x.receive_method === 'delivery')?.c),
      status_mix: {
        confirmed: series.reduce((s, x) => s + x.confirmed, 0),
        preparing: series.reduce((s, x) => s + x.preparing, 0),
        ready: series.reduce((s, x) => s + x.ready, 0),
        completed: series.reduce((s, x) => s + x.completed, 0),
      },
      top_medicines,
      top_inventory_value: invRow.slice(0, 5).map((x: any) => ({ name: x.name, value: num(x.value) })),
      subscription: {
        plan: p.subscription_plan, started_at: p.subscription_started_at,
        csdl_synced: !!p.csdl_synced, standee_code: p.standee_code,
      },
    })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Lỗi máy chủ, vui lòng thử lại.' })
  }
})

export default r
