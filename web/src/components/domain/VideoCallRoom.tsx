import { useEffect, useRef, useState } from 'react'
import { LiveKitRoom, VideoConference } from '@livekit/components-react'
import { Room } from 'livekit-client'
import '@livekit/components-styles'
import { Video, Loader2, AlertTriangle } from 'lucide-react'
import { api } from '../../api/client'
import { useUi } from '../../store/ui'

// Phòng gọi video 1-1 giữa bác sĩ và bệnh nhân (LiveKit Cloud).
// Giới hạn 7 phút/lượt — hết giờ tự ngắt kết thúc.
const MAX_SEC = 420

export function VideoCallRoom({ consultationId, role, peerName, onEnded }: {
  consultationId: number | string
  role: 'doctor' | 'patient'
  peerName?: string
  onEnded?: (sec: number, note: string) => void
}) {
  const toast = useUi((s) => s.toast)
  const [conn, setConn] = useState<{ url: string; token: string } | null>(null)
  const [err, setErr] = useState('')
  const [sec, setSec] = useState(0)
  const secRef = useRef(0)
  const endedRef = useRef(false)

  // Tự quản Room để chủ động ngắt kết nối khi hết 7 phút
  const [room] = useState(() => new Room({ adaptiveStream: true, dynacast: true }))

  // Lấy token khi vào phòng
  useEffect(() => {
    api(`/${role}/consultations/${consultationId}/call-token`, { method: 'POST' })
      .then((d) => setConn({ url: d.url, token: d.token }))
      .catch((e) => setErr(e.message))
  }, [consultationId, role])

  // Đồng hồ đếm giờ + tự ngắt ở 7 phút + dọn dẹp khi rời màn hình
  useEffect(() => {
    const t = window.setInterval(() => {
      secRef.current += 1
      setSec(secRef.current)
      if (secRef.current >= MAX_SEC) room.disconnect()
    }, 1000)
    return () => {
      window.clearInterval(t)
      room.disconnect()
    }
  }, [room])

  const finish = () => {
    if (endedRef.current) return
    endedRef.current = true
    const s = secRef.current
    onEnded?.(s, `Gọi video ${Math.floor(s / 60)}p${s % 60 < 10 ? '0' : ''}${s % 60}s`)
    if (s > 3) toast(`Cuộc gọi kết thúc sau ${Math.floor(s / 60)}p${s % 60 < 10 ? '0' : ''}${s % 60}s.`, 'success')
  }

  const mmss = `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`
  const remain = MAX_SEC - sec

  if (err) {
    return (
      <div className="card p-5 text-center">
        <AlertTriangle size={30} className="mx-auto text-amber-500" />
        <p className="mt-2 text-[14px] font-bold text-slate-700">Không mở được cuộc gọi video</p>
        <p className="mt-1 text-[13px] text-slate-500">{err}</p>
      </div>
    )
  }

  if (!conn) {
    return (
      <div className="card p-6 text-center text-slate-500">
        <Loader2 size={26} className="mx-auto animate-spin text-primary" />
        <p className="mt-2 text-[13.5px] font-semibold">Đang kết nối phòng gọi video…</p>
      </div>
    )
  }

  return (
    <div className="card overflow-hidden">
      {/* Thanh trạng thái */}
      <div className="flex items-center justify-between gap-2 bg-bluedark text-white px-4 py-2.5">
        <span className="flex items-center gap-2 text-[13px] font-bold">
          <Video size={16} /> {role === 'doctor' ? 'Đang gọi video bệnh nhân' : `Đang gọi video${peerName ? ' với ' + peerName : ' với bác sĩ'}`}
        </span>
        <span className="flex items-center gap-2 font-mono text-[15px] font-extrabold">
          <span className={remain <= 60 ? 'text-red-300' : 'text-white'}>{mmss}</span>
          <span className="text-[10.5px] font-semibold text-white/60">/ 07:00</span>
        </span>
      </div>

      <LiveKitRoom
        token={conn.token}
        serverUrl={conn.url}
        room={room}
        connect={true}
        onDisconnected={() => finish()}
        onError={(e) => { setErr(e.message || 'Lỗi kết nối phòng gọi.'); finish() }}
      >
        <VideoConference />
      </LiveKitRoom>
    </div>
  )
}
