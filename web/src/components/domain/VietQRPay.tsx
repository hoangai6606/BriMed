import { useEffect, useMemo, useState } from 'react'
import { BadgeCheck, Copy, Landmark } from 'lucide-react'
import { api, fmtVnd } from '../../api/client'
import { useUi } from '../../store/ui'

// Mã QR mẫu hiển thị trong bước thanh toán — thay bằng QR VietQR thật khi kích hoạt cổng thanh toán
function QrPlaceholder({ seed }: { seed: number }) {
  const cells = useMemo(() => {
    let s = seed || 1
    const rand = () => {
      s = (s * 1664525 + 1013904223) % 4294967296
      return s / 4294967296
    }
    const n = 21
    const grid: boolean[][] = Array.from({ length: n }, () => Array.from({ length: n }, () => rand() > 0.52))
    // Ba ô định vị (finder pattern) như QR thật
    const finder = (r0: number, c0: number) => {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          const edge = r === 0 || r === 6 || c === 0 || c === 6
          const core = r >= 2 && r <= 4 && c >= 2 && c <= 4
          grid[r0 + r][c0 + c] = edge || core
        }
      }
    }
    finder(0, 0)
    finder(0, n - 7)
    finder(n - 7, 0)
    return grid
  }, [seed])

  const n = 21
  const size = 5
  return (
    <svg viewBox={`0 0 ${n * size} ${n * size}`} className="w-full h-full" role="img" aria-label="Mã QR thanh toán VietQR">
      <rect width={n * size} height={n * size} fill="white" />
      {cells.map((row: boolean[], r: number) =>
        row.map((on: boolean, c: number) =>
          on ? <rect key={`${r}-${c}`} x={c * size} y={r * size} width={size} height={size} fill="#0f2440" /> : null
        )
      )}
    </svg>
  )
}

// Bước thanh toán phí khám 25.000đ/lượt qua VietQR — hiện sau khi gửi khai triệu chứng
export function VietQRPay({ consultation, payment, onPaid, onLater }: {
  consultation: any
  payment: { consultation_id: number; amount_vnd: number; content: string }
  onPaid: () => void
  onLater?: () => void
}) {
  const toast = useUi((s) => s.toast)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    setDone(false)
    setCopied(false)
  }, [consultation?.id])

  const confirm = async () => {
    setBusy(true)
    try {
      const d = await api(`/patient/consultations/${payment.consultation_id}/pay`, { method: 'POST' })
      toast(d.message || 'Đã xác nhận thanh toán!', 'success')
      setDone(true)
      setTimeout(onPaid, 900)
    } catch (e: any) {
      toast(e.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const copyContent = () => {
    navigator.clipboard?.writeText(payment.content).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="card p-4 max-w-md mx-auto text-center">
      {done ? (
        <>
          <BadgeCheck size={44} className="mx-auto text-mint-fg" />
          <h2 className="text-[17px] font-extrabold text-bluedark mt-2">Đã xác nhận thanh toán!</h2>
          <p className="text-[13.5px] text-slate-500 mt-1">Bác sĩ đang tiếp nhận yêu cầu của bạn…</p>
        </>
      ) : (
        <>
          <span className="badge bg-lightblue text-bluedark !px-3 !py-1">Bước 2 · Thanh toán phí khám</span>
          <h2 className="text-[18px] font-extrabold text-bluedark mt-2">Quét VietQR để tiếp tục</h2>
          <p className="text-[13px] text-slate-500 mt-1">
            Bác sĩ bắt đầu xử lý sau khi nhận phí khám <strong className="text-bluedark">{fmtVnd(payment.amount_vnd)}</strong>.
          </p>

          <div className="mt-3 mx-auto w-[210px] rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <QrPlaceholder seed={payment.consultation_id * 7919} />
          </div>

          <div className="mt-3 rounded-xl bg-slate-50 px-3.5 py-3 text-left text-[13px] space-y-1.5">
            <div className="flex justify-between gap-2">
              <span className="text-slate-500">Số tiền</span>
              <strong className="text-bluedark">{fmtVnd(payment.amount_vnd)}</strong>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-500">Nội dung</span>
              <button onClick={copyContent} className="flex items-center gap-1 font-bold text-bluedark hover:text-primary">
                {payment.content} <Copy size={13} className={copied ? 'text-mint-fg' : ''} />
              </button>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-500 flex items-center gap-1"><Landmark size={13} /> Quét bằng</span>
              <span className="font-semibold text-slate-700">App ngân hàng (VietQR)</span>
            </div>
          </div>

          <button onClick={confirm} disabled={busy} className="btn-pink w-full mt-3">
            {busy ? 'Đang xác nhận…' : 'Tôi đã chuyển khoản — Xác nhận'}
          </button>
          {onLater && (
            <button onClick={onLater} className="text-[12.5px] font-semibold text-slate-400 hover:text-slate-600 mt-2">
              Thanh toán sau — yêu cầu được lưu trong mục Tổng quan
            </button>
          )}
          <p className="text-[11.5px] text-slate-400 mt-2 flex items-center justify-center gap-1">
            <BadgeCheck size={13} /> Lượt khám #{consultation?.id} · Bác sĩ nhận thù lao sau khi xử lý
          </p>
        </>
      )}
    </div>
  )
}
