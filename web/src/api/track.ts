import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { getToken } from './client'

// Trình ghi lượt truy cập cho trang "Phân tích & Theo dõi" của quản trị viên.
// Mỗi lần điều hướng route (kể cả trang công khai) gửi 1 sự kiện /api/track/visit;
// server tự dedupe 10 giây nên StrictMode chạy effect 2 lần vẫn chỉ ghi 1 lượt.

const VID_KEY = 'brimed_vid'
let lastPath = ''

function visitorId(): string {
  let v = ''
  try {
    v = localStorage.getItem(VID_KEY) || ''
    if (!v) {
      v = crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
      localStorage.setItem(VID_KEY, v)
    }
  } catch { /* trình duyệt chặn localStorage — vẫn track nhưng không đếm khách riêng biệt */ }
  return v
}

export function trackVisit(path: string) {
  if (!path || path === lastPath) return
  lastPath = path
  const headers: any = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  fetch('/api/track/visit', {
    method: 'POST',
    headers,
    keepalive: true,
    body: JSON.stringify({ path, referrer: document.referrer || '', visitor_id: visitorId() }),
  }).catch(() => { /* tracking lỗi thì thôi — không ảnh hưởng UX */ })
}

// Gắn vào cây Router: tự ghi mỗi khi pathname thay đổi
export function VisitTracker() {
  const location = useLocation()
  useEffect(() => {
    trackVisit(location.pathname + location.search)
  }, [location.pathname, location.search])
  return null
}
