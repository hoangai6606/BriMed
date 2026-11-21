// =====================================================================
// Bộ biểu đồ SVG thuần (không thư viện ngoài) — phong cách Calm Care:
// đường cong mượt, gradient dịu, cột bo tròn, lưới chấm mảnh, tooltip
// tối màu viền tròn. Màu bám theo bảng BriMed trong tailwind.config.js.
// =====================================================================
import { useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { BarChart3, TrendingUp, TrendingDown } from 'lucide-react'

export const ROLE_COLORS: Record<string, string> = {
  patient: '#0d71e2', doctor: '#1E8E3E', pharmacy: '#e8408a', admin: '#64748b', guest: '#a6d3fd',
}

export const fmtCompact = (n: number) =>
  Intl.NumberFormat('vi-VN', { notation: 'compact', maximumFractionDigits: 1 }).format(n || 0)
export const fmtInt = (n: number) => (n || 0).toLocaleString('vi-VN')

// Đo chiều rộng container để SVG co giãn responsively
function useMeasure<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)
  const [w, setW] = useState(0)
  useLayoutEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver((es) => setW(es[0].contentRect.width))
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])
  return { ref, width: w }
}

// Đường mượt Catmull-Rom → Bezier
function smoothPath(pts: [number, number][], tension = 0.9): string {
  if (!pts.length) return ''
  if (pts.length < 3) return 'M' + pts.map((p) => p.join(',')).join(' L')
  let d = `M${pts[0][0]},${pts[0][1]}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)]
    const c1x = p1[0] + ((p2[0] - p0[0]) / 6) * tension, c1y = p1[1] + ((p2[1] - p0[1]) / 6) * tension
    const c2x = p2[0] - ((p3[0] - p1[0]) / 6) * tension, c2y = p2[1] - ((p3[1] - p1[1]) / 6) * tension
    d += ` C${c1x},${c1y} ${c2x},${c2y} ${p2[0]},${p2[1]}`
  }
  return d
}

function niceMax(v: number): number {
  if (v <= 5) return 5
  const pow = Math.pow(10, Math.floor(Math.log10(v)))
  const n = v / pow
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10
  return step * pow
}

function gradId(): string {
  return `g${Math.random().toString(36).slice(2, 9)}`
}

// ---------------------------------------------------------------------------
export interface Bucket {
  key: string
  label: string
}

// Tooltip dùng chung — thẻ tối màu, mượt, tự kẹp mép container
function Tooltip({ host, x, children }: { host: { width: number }; x: number; children: ReactNode }) {
  const left = Math.min(Math.max(x, 62), host.width - 62)
  return (
    <div className="pointer-events-none absolute top-1 z-10 -translate-x-1/2" style={{ left }}>
      <div className="rounded-xl bg-bluedark/95 px-3 py-2 text-white shadow-float backdrop-blur">{children}</div>
      <div className="mx-auto h-0 w-0 border-x-8 border-t-8 border-x-transparent border-t-bluedark/95" style={{ marginLeft: '-8px' }} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sparkline — đường mini kèm vùng gradient, chấm cuối
export function Sparkline({ values, color = '#0d71e2', height = 44, width = 120 }: { values: number[]; color?: string; height?: number; width?: number }) {
  const gid = useRef(gradId()).current
  const data = values.length ? values : [0, 0]
  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const span = max - min || 1
  const pad = 4
  const pts: [number, number][] = data.map((v, i) => [
    pad + (i / Math.max(1, data.length - 1)) * (width - pad * 2),
    height - pad - ((v - min) / span) * (height - pad * 2),
  ])
  const line = smoothPath(pts)
  const last = pts[pts.length - 1]
  return (
    <svg width={width} height={height} className="overflow-visible" aria-hidden>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L${last[0]},${height} L${pts[0][0]},${height} Z`} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r="3.2" fill="white" stroke={color} strokeWidth="2" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// LineChart — đa chuỗi, vùng gradient cho chuỗi đầu, ngưỡng nét đứt, hover
export interface LineSeries {
  name: string
  color: string
  values: (number | null)[]
  area?: boolean
  dashed?: boolean
}

export function LineChart({
  buckets, series, height = 250, yFmt = fmtInt, threshold,
}: {
  buckets: Bucket[]
  series: LineSeries[]
  height?: number
  yFmt?: (n: number) => string
  threshold?: { value: number; label: string; color?: string }
}) {
  const { ref, width } = useMeasure<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const gid = useRef(gradId()).current
  const w = Math.max(width, 260)
  const padL = 40, padR = 10, padT = 14, padB = 26
  const iw = w - padL - padR, ih = height - padT - padB
  const allVals = series.flatMap((s) => s.values.filter((v): v is number => v != null))
  if (threshold) allVals.push(threshold.value)
  const max = niceMax(Math.max(...allVals, 1) * 1.08)
  const X = (i: number) => padL + (buckets.length <= 1 ? iw / 2 : (i / (buckets.length - 1)) * iw)
  const Y = (v: number) => padT + ih - (v / max) * ih
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(max * f))
  const labelEvery = Math.max(1, Math.ceil(buckets.length / 6))

  const onMove = (e: React.MouseEvent | React.TouchEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0]?.clientX ?? 0 : (e as React.MouseEvent).clientX
    const x = clientX - rect.left
    const i = Math.round(((x - padL) / iw) * (buckets.length - 1))
    setHover(Math.min(Math.max(i, 0), buckets.length - 1))
  }

  const isEmpty = !allVals.length || allVals.every((v) => !v)

  return (
    <div ref={ref} className="relative w-full select-none">
      <svg viewBox={`0 0 ${w} ${height}`} className="w-full" style={{ height }} onMouseMove={onMove} onMouseLeave={() => setHover(null)} onTouchStart={onMove} onTouchMove={onMove} onTouchEnd={() => setHover(null)}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={series[0]?.color || '#0d71e2'} stopOpacity="0.22" />
            <stop offset="100%" stopColor={series[0]?.color || '#0d71e2'} stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* lưới */}
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={w - padR} y1={Y(t)} y2={Y(t)} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="3 5" />
            <text x={padL - 7} y={Y(t) + 3.5} textAnchor="end" fontSize="10" fill="#94a3b8">{yFmt(t)}</text>
          </g>
        ))}
        {/* nhãn trục X */}
        {buckets.map((b, i) => (i % labelEvery === 0 || i === buckets.length - 1) && (
          <text key={b.key} x={X(i)} y={height - 8} textAnchor="middle" fontSize="10" fill="#94a3b8">{b.label}</text>
        ))}
        {/* ngưỡng */}
        {threshold && (
          <g>
            <line x1={padL} x2={w - padR} y1={Y(threshold.value)} y2={Y(threshold.value)} stroke={threshold.color || '#D93025'} strokeWidth="1.5" strokeDasharray="6 4" opacity="0.7" />
            <text x={w - padR - 2} y={Y(threshold.value) - 5} textAnchor="end" fontSize="9.5" fill={threshold.color || '#D93025'} fontWeight="700">{threshold.label}</text>
          </g>
        )}
        {/* các chuỗi */}
        {series.map((s, si) => {
          const pts: [number, number][] = []
          s.values.forEach((v, i) => { if (v != null) pts.push([X(i), Y(v)]) })
          if (pts.length === 1) pts.push([pts[0][0] + 0.5, pts[0][1]])
          const line = smoothPath(pts)
          return (
            <g key={s.name}>
              {s.area && !isEmpty && <path d={`${line} L${pts[pts.length - 1][0]},${padT + ih} L${pts[0][0]},${padT + ih} Z`} fill={`url(#${gid})`} />}
              <path d={line} fill="none" stroke={s.color} strokeWidth={si === 0 ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={s.dashed ? '5 5' : undefined} opacity={s.dashed ? 0.8 : 1} />
              {pts.length === 1 && <circle cx={pts[0][0]} cy={pts[0][1]} r="3" fill={s.color} />}
            </g>
          )
        })}
        {/* hover */}
        {hover != null && !isEmpty && (
          <g>
            <line x1={X(hover)} x2={X(hover)} y1={padT} y2={padT + ih} stroke="#0d71e2" strokeWidth="1" strokeDasharray="3 3" opacity="0.45" />
            {series.map((s) => s.values[hover] != null && (
              <circle key={s.name} cx={X(hover)} cy={Y(s.values[hover] as number)} r="4" fill="white" stroke={s.color} strokeWidth="2.2" />
            ))}
          </g>
        )}
      </svg>
      {hover != null && !isEmpty && (
        <Tooltip host={{ width: w }} x={X(hover)}>
          <div className="mb-1 text-[10.5px] font-semibold text-white/70">{buckets[hover].label}</div>
          {series.map((s) => s.values[hover] != null && (
            <div key={s.name} className="flex items-center gap-2 whitespace-nowrap text-[12px]">
              <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
              <span className="text-white/80">{s.name}</span>
              <span className="ml-auto font-bold">{yFmt(s.values[hover] as number)}</span>
            </div>
          ))}
        </Tooltip>
      )}
      {/* legend */}
      {series.length > 1 && (
        <div className="mt-1 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          {series.map((s) => (
            <span key={s.name} className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
              <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
              {s.name}
            </span>
          ))}
        </div>
      )}
      {isEmpty && <ChartEmpty />}
    </div>
  )
}

// ---------------------------------------------------------------------------
// StackedBarChart — cột chồng theo vai trò, đỉnh bo tròn
export function StackedBarChart({
  buckets, series, height = 250, yFmt = fmtInt,
}: {
  buckets: Bucket[]
  series: { name: string; color: string; values: number[] }[]
  height?: number
  yFmt?: (n: number) => string
}) {
  const { ref, width } = useMeasure<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const w = Math.max(width, 260)
  const padL = 40, padR = 10, padT = 14, padB = 26
  const iw = w - padL - padR, ih = height - padT - padB
  const totals = buckets.map((_, i) => series.reduce((s, x) => s + (x.values[i] || 0), 0))
  const max = niceMax(Math.max(...totals, 1) * 1.08)
  const slot = iw / Math.max(1, buckets.length)
  const bw = Math.min(30, Math.max(7, slot * 0.62))
  const X = (i: number) => padL + slot * i + slot / 2
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(max * f))
  const labelEvery = Math.max(1, Math.ceil(buckets.length / 6))
  const isEmpty = totals.every((t) => !t)

  return (
    <div ref={ref} className="relative w-full select-none">
      <svg viewBox={`0 0 ${w} ${height}`} className="w-full" style={{ height }} onMouseLeave={() => setHover(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={w - padR} y1={padT + ih - (t / max) * ih} y2={padT + ih - (t / max) * ih} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="3 5" />
            <text x={padL - 7} y={padT + ih - (t / max) * ih + 3.5} textAnchor="end" fontSize="10" fill="#94a3b8">{yFmt(t)}</text>
          </g>
        ))}
        {buckets.map((b, i) => (i % labelEvery === 0 || i === buckets.length - 1) && (
          <text key={b.key} x={X(i)} y={height - 8} textAnchor="middle" fontSize="10" fill="#94a3b8">{b.label}</text>
        ))}
        {buckets.map((_, i) => {
          let acc = 0
          const segs = series.map((s) => {
            const v = s.values[i] || 0
            const y0 = acc
            acc += v
            return { s, v, y0 }
          }).filter((x) => x.v > 0)
          return (
            <g key={i} onMouseEnter={() => setHover(i)}>
              <rect x={X(i) - slot / 2} y={padT} width={slot} height={ih} fill="transparent" />
              {hover === i && <rect x={X(i) - slot / 2 + 1} y={padT} width={slot - 2} height={ih} rx="6" fill="#0d71e2" opacity="0.05" />}
              {segs.map(({ s, v, y0 }) => {
                const yTop = padT + ih - ((y0 + v) / max) * ih
                const hgt = (v / max) * ih
                const isTop = segs[segs.length - 1].s === s
                return <rect key={s.name} x={X(i) - bw / 2} y={yTop} width={bw} height={Math.max(hgt, v ? 2 : 0)} rx={isTop ? Math.min(4, bw / 2.4) : 1.5} fill={s.color} opacity={hover == null || hover === i ? 0.92 : 0.45} style={{ transition: 'opacity .15s' }} />
              })}
            </g>
          )
        })}
      </svg>
      {hover != null && !isEmpty && (
        <Tooltip host={{ width: w }} x={X(hover)}>
          <div className="mb-1 text-[10.5px] font-semibold text-white/70">{buckets[hover].label}</div>
          {series.filter((s) => s.values[hover] > 0).map((s) => (
            <div key={s.name} className="flex items-center gap-2 whitespace-nowrap text-[12px]">
              <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
              <span className="text-white/80">{s.name}</span>
              <span className="ml-auto font-bold">{fmtInt(s.values[hover])}</span>
            </div>
          ))}
          <div className="mt-1 flex items-center gap-2 border-t border-white/15 pt-1 text-[12px]">
            <span className="text-white/80">Tổng</span>
            <span className="ml-auto font-extrabold">{fmtInt(totals[hover])}</span>
          </div>
        </Tooltip>
      )}
      <div className="mt-1 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
        {series.map((s) => (
          <span key={s.name} className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
            <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
            {s.name}
          </span>
        ))}
      </div>
      {isEmpty && <ChartEmpty />}
    </div>
  )
}

// ---------------------------------------------------------------------------
// BarChart — cột dọc đơn chuỗi, bo tròn đỉnh, hover tooltip
export function BarChart({
  buckets, values, color = '#0d71e2', height = 220, yFmt = fmtInt,
}: {
  buckets: Bucket[]
  values: number[]
  color?: string
  height?: number
  yFmt?: (n: number) => string
}) {
  const { ref, width } = useMeasure<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const w = Math.max(width, 260)
  const padL = 40, padR = 10, padT = 14, padB = 26
  const iw = w - padL - padR, ih = height - padT - padB
  const max = niceMax(Math.max(...values, 1) * 1.08)
  const slot = iw / Math.max(1, buckets.length)
  const bw = Math.min(26, Math.max(6, slot * 0.55))
  const X = (i: number) => padL + slot * i + slot / 2
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(max * f))
  const labelEvery = Math.max(1, Math.ceil(buckets.length / 6))
  const isEmpty = values.every((v) => !v)

  return (
    <div ref={ref} className="relative w-full select-none">
      <svg viewBox={`0 0 ${w} ${height}`} className="w-full" style={{ height }} onMouseLeave={() => setHover(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={w - padR} y1={padT + ih - (t / max) * ih} y2={padT + ih - (t / max) * ih} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="3 5" />
            <text x={padL - 7} y={padT + ih - (t / max) * ih + 3.5} textAnchor="end" fontSize="10" fill="#94a3b8">{yFmt(t)}</text>
          </g>
        ))}
        {buckets.map((b, i) => (i % labelEvery === 0 || i === buckets.length - 1) && (
          <text key={b.key} x={X(i)} y={height - 8} textAnchor="middle" fontSize="10" fill="#94a3b8">{b.label}</text>
        ))}
        {buckets.map((_, i) => {
          const v = values[i] || 0
          const h = (v / max) * ih
          return (
            <g key={i} onMouseEnter={() => setHover(i)}>
              <rect x={X(i) - slot / 2} y={padT} width={slot} height={ih} fill="transparent" />
              {hover === i && <rect x={X(i) - slot / 2 + 1} y={padT} width={slot - 2} height={ih} rx="6" fill="#0d71e2" opacity="0.05" />}
              {v > 0 && (
                <rect x={X(i) - bw / 2} y={padT + ih - h} width={bw} height={Math.max(h, 2)}
                  rx={Math.min(4, bw / 2.4)} fill={color} opacity={hover == null || hover === i ? 0.9 : 0.45} style={{ transition: 'opacity .15s' }} />
              )}
            </g>
          )
        })}
      </svg>
      {hover != null && !isEmpty && (
        <Tooltip host={{ width: w }} x={X(hover)}>
          <div className="mb-1 text-[10.5px] font-semibold text-white/70">{buckets[hover].label}</div>
          <div className="flex items-center gap-2 whitespace-nowrap text-[12px]">
            <span className="h-2 w-2 rounded-full" style={{ background: color }} />
            <span className="text-white/80">{buckets[hover].label}</span>
            <span className="ml-auto font-bold">{yFmt(values[hover])}</span>
          </div>
        </Tooltip>
      )}
      {isEmpty && <ChartEmpty />}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Donut — vành khuyên bo tròn, nhãn trung tâm
export function Donut({
  slices, size = 168, thickness = 20, center,
}: {
  slices: { label: string; value: number; color: string }[]
  size?: number
  thickness?: number
  center?: { value: string; label: string }
}) {
  const total = slices.reduce((s, x) => s + x.value, 0)
  const R = (size - thickness) / 2
  const C = 2 * Math.PI * R
  const gap = total > 0 && slices.filter((s) => s.value > 0).length > 1 ? 2.5 : 0
  let acc = 0
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={R} fill="none" stroke="#f1f5f9" strokeWidth={thickness} />
          {total > 0 && slices.map((s) => {
            if (s.value <= 0) return null
            const frac = s.value / total
            const dash = Math.max(frac * C - gap, 1)
            const el = (
              <circle key={s.label} cx={size / 2} cy={size / 2} r={R} fill="none" stroke={s.color} strokeWidth={thickness}
                strokeDasharray={`${dash} ${C - dash}`} strokeDashoffset={-acc * C} strokeLinecap="round" />
            )
            acc += frac
            return el
          })}
        </svg>
        {center && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-[24px] font-extrabold leading-none text-bluedark">{center.value}</div>
            <div className="mt-1 max-w-[86%] text-center text-[10.5px] font-medium leading-tight text-slate-400">{center.label}</div>
          </div>
        )}
      </div>
      <div className="flex w-full flex-col gap-1.5">
        {slices.filter((s) => s.value > 0).map((s) => (
          <div key={s.label} className="flex items-center gap-2 text-[12px]">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
            <span className="truncate text-slate-500">{s.label}</span>
            <span className="ml-auto shrink-0 font-bold text-bluedark">{fmtInt(s.value)}</span>
            <span className="w-10 shrink-0 text-right text-[11px] font-semibold text-slate-400">{total ? Math.round((s.value / total) * 100) : 0}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Heatmap — 7 ngày × 24 giờ, thang xanh BriMed
const DOW_VI = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
export function Heatmap({ matrix }: { matrix: number[][] }) {
  const [hover, setHover] = useState<{ d: number; h: number } | null>(null)
  const max = Math.max(...matrix.flat(), 1)
  const opacity = (v: number) => (v === 0 ? 0 : 0.12 + (v / max) * 0.88)
  return (
    <div className="relative">
      <div className="overflow-x-auto pb-1">
        <div className="min-w-[540px]">
          <div className="mb-1 grid grid-cols-[26px_repeat(24,1fr)] gap-[3px]">
            <span />
            {[0, 3, 6, 9, 12, 15, 18, 21].map((h) => (
              <span key={h} className="col-span-3 -ml-[2px] text-[9px] font-semibold text-slate-400" style={{ gridColumn: `${h + 2} / span 3` }}>{h}h</span>
            ))}
          </div>
          {matrix.map((row, d) => (
            <div key={d} className="mb-[3px] grid grid-cols-[26px_repeat(24,1fr)] items-center gap-[3px]">
              <span className="text-[9.5px] font-bold text-slate-400">{DOW_VI[d]}</span>
              {row.map((v, h) => (
                <button
                  key={h}
                  type="button"
                  onMouseEnter={() => setHover({ d, h })}
                  onMouseLeave={() => setHover(null)}
                  className="aspect-square w-full rounded-[3.5px] transition-transform hover:scale-125"
                  style={{ background: v ? `rgba(13,113,226,${opacity(v)})` : '#f1f5f9' }}
                  aria-label={`${DOW_VI[d]} ${h}h: ${v} lượt`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-2 flex items-center justify-end gap-1.5 text-[10px] font-semibold text-slate-400">
        Ít
        {[0.15, 0.35, 0.6, 0.85, 1].map((o) => (
          <span key={o} className="h-2.5 w-2.5 rounded-[3px]" style={{ background: `rgba(13,113,226,${o})` }} />
        ))}
        Nhiều
      </div>
      {hover && (
        <div className="pointer-events-none absolute right-2 top-0 rounded-xl bg-bluedark/95 px-3 py-1.5 text-[11.5px] font-semibold text-white shadow-float">
          {DOW_VI[hover.d]} · {hover.h}h — {fmtInt(matrix[hover.d][hover.h])} lượt truy cập
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// HBars — thanh ngang cho bảng xếp hạng (top trang, BS theo tỷ lệ kháng sinh…)
export function HBars({
  items, fmt = fmtInt, threshold, max,
}: {
  items: { label: string; value: number; color?: string; hint?: string }[]
  fmt?: (n: number) => string
  threshold?: { value: number; label: string }
  max?: number
}) {
  const top = max ?? Math.max(...items.map((x) => x.value), threshold?.value ?? 0, 1)
  const thrX = threshold ? (threshold.value / top) * 100 : null
  return (
    <div className="space-y-2.5">
      {items.map((it) => (
        <div key={it.label}>
          <div className="mb-1 flex items-baseline justify-between gap-3">
            <span className="truncate text-[12.5px] font-semibold text-slate-600">{it.label}</span>
            <span className="shrink-0 text-[12.5px] font-extrabold text-bluedark">{fmt(it.value)}{it.hint ? <span className="ml-1.5 text-[11px] font-medium text-slate-400">{it.hint}</span> : null}</span>
          </div>
          <div className="relative h-2.5 overflow-visible rounded-full bg-slate-100">
            <div className="h-full rounded-full transition-all" style={{ width: `${Math.max((it.value / top) * 100, it.value ? 2 : 0)}%`, background: it.color || '#0d71e2' }} />
            {thrX != null && (
              <span className="absolute -top-1 h-[18px] w-[2px] rounded bg-redflag-fg" style={{ left: `calc(${thrX}% - 1px)` }} title={threshold?.label} />
            )}
          </div>
        </div>
      ))}
      {threshold && (
        <div className="flex items-center gap-1.5 text-[10.5px] font-semibold text-redflag-fg">
          <span className="inline-block h-[2px] w-4 rounded bg-redflag-fg" /> {threshold.label}: {fmt(threshold.value)}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Funnel — phễu ngang với tỷ lệ chuyển đổi giữa các bước
export function Funnel({ steps }: { steps: { label: string; value: number; color: string }[] }) {
  const top = Math.max(steps[0]?.value ?? 0, 1)
  return (
    <div className="space-y-1.5">
      {steps.map((s, i) => {
        const prev = i > 0 ? steps[i - 1].value : null
        const conv = prev ? Math.round((s.value / prev) * 1000) / 10 : null
        // Kẹp 3–100%: các bước đếm độc lập trong kỳ (không bắt buộc lồng nhau)
        // nên bước giữa có thể lớn hơn bước đầu — không để thanh tràn khỏi card.
        const widthPct = Math.min(Math.max((s.value / top) * 100, 3), 100)
        return (
          <div key={s.label} className="flex items-center gap-2.5">
            <div className="w-[118px] shrink-0 text-right text-[11.5px] font-semibold leading-tight text-slate-500">{s.label}</div>
            <div className="relative h-9 flex-1 overflow-hidden">
              <div className="absolute inset-y-0 left-0 rounded-lg transition-all" style={{ width: `${widthPct}%`, background: `linear-gradient(90deg, ${s.color}e6, ${s.color}b3)` }} />
              <span className="absolute inset-y-0 left-3 flex items-center text-[13px] font-extrabold text-white drop-shadow">{fmtInt(s.value)}</span>
            </div>
            <div className="w-[52px] shrink-0 text-left text-[11px] font-bold text-slate-400">
              {conv != null && <span className={conv >= 50 ? 'text-mint-fg' : conv >= 25 ? 'text-amber-600' : 'text-redflag-fg'}>{conv}%</span>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// RingStat — vòng tròn phần trăm cho các chỉ số tuân thủ
export function RingStat({ pct, color = '#0d71e2', label, sub }: { pct: number; color?: string; label: string; sub?: string }) {
  const size = 92, thickness = 9
  const R = (size - thickness) / 2
  const C = 2 * Math.PI * R
  const shown = Math.min(Math.max(pct, 0), 100)
  return (
    <div className="flex items-center gap-3.5">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={R} fill="none" stroke="#f1f5f9" strokeWidth={thickness} />
          <circle cx={size / 2} cy={size / 2} r={R} fill="none" stroke={color} strokeWidth={thickness} strokeLinecap="round"
            strokeDasharray={`${(shown / 100) * C} ${C}`} style={{ transition: 'stroke-dasharray .6s ease' }} />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[15px] font-extrabold text-bluedark">{Math.round(shown)}%</span>
      </div>
      <div className="min-w-0">
        <div className="text-[13px] font-bold text-slate-700">{label}</div>
        {sub && <div className="mt-0.5 text-[11.5px] leading-snug text-slate-400">{sub}</div>}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
export function DeltaPill({ value, invert = false }: { value: number | null; invert?: boolean }) {
  if (value == null) return null
  const up = value >= 0
  const good = invert ? !up : up
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10.5px] font-extrabold ${good ? 'bg-mint-bg text-mint-fg' : 'bg-redflag-bg text-redflag-fg'}`}>
      {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
      {up ? '+' : ''}{value}%
    </span>
  )
}

export function ChartCard({ title, sub, icon, right, children, className = '' }: { title: ReactNode; sub?: ReactNode; icon?: ReactNode; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`card p-4 sm:p-5 ${className}`}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          {icon && <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-lightblue/50 text-primary">{icon}</span>}
          <div className="min-w-0">
            <h2 className="section-title !text-[15.5px] leading-tight">{title}</h2>
            {sub && <p className="mt-0.5 text-[11.5px] leading-snug text-slate-400">{sub}</p>}
          </div>
        </div>
        {right}
      </div>
      {children}
    </section>
  )
}

export function ChartEmpty({ note = 'Chưa có dữ liệu trong kỳ này' }: { note?: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-[5] flex flex-col items-center justify-center gap-2 rounded-2xl bg-white/60 backdrop-blur-[1px]">
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-300">
        <BarChart3 size={22} />
      </span>
      <p className="max-w-[240px] text-center text-[11.5px] font-medium leading-snug text-slate-400">{note}</p>
    </div>
  )
}
