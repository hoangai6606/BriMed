import { useEffect, useRef, type ReactNode } from 'react'

// Scroll-reveal tuần tự bằng IntersectionObserver (thuần CSS keyframes, không lib ngoài)
// Kèm dự phòng: nếu observer không kích hoạt (webview ẩn/bị throttle), phần tử đã nằm
// trong khung nhìn vẫn được hiện sau một khoảng ngắn — nội dung không bao giờ mất hẳn.
export function Reveal({ children, delay = 0, className = '' }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let shown = false
    const show = () => {
      if (shown) return
      shown = true
      el.classList.add('is-visible')
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          show()
          io.disconnect()
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    )
    io.observe(el)

    const fallback = window.setInterval(() => {
      const r = el.getBoundingClientRect()
      // đã vào khung nhìn hoặc đã bị cuộn qua (ở phía trên) thì hiện ngay
      if (r.top < window.innerHeight) {
        show()
        window.clearInterval(fallback)
      }
    }, 350)
    const stopFallback = window.setTimeout(() => window.clearInterval(fallback), 15000)

    return () => {
      io.disconnect()
      window.clearInterval(fallback)
      window.clearTimeout(stopFallback)
    }
  }, [])

  return (
    <div ref={ref} className={`reveal ${className}`} style={delay ? { transitionDelay: `${delay}ms` } : undefined}>
      {children}
    </div>
  )
}
