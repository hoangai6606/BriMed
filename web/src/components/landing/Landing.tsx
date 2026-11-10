import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api/client'
import { CUSTOMER_FAQ, ELIGIBLE, CUSTOMER_LEAD_NOTE } from '../../data/constants'
import './landing.css'

// Icon set gốc của thiết kế (SVG inline, không phụ thuộc thư viện ngoài)
function Icon({ name }: { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    wallet: <><path d="M4 7.5h16v11H4z" /><path d="M4 9V6a2 2 0 0 1 2-2h11" /><path d="M15 13h3" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    shield: <><path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6z" /><path d="m9 12 2 2 4-4" /></>,
    phone: <><rect x="7" y="3" width="10" height="18" rx="2" /><path d="M10 6h4M11 18h2" /></>,
    scan: <><path d="M8 4H5a1 1 0 0 0-1 1v3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3" /><path d="M9 9h6v6H9z" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    arrow: <><path d="M5 12h14" /><path d="m15 8 4 4-4 4" /></>,
    back: <><path d="M19 12H5" /><path d="m9 16-4-4 4-4" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
    building: <><path d="M4 21V7l8-4 8 4v14" /><path d="M9 21v-5h6v5M8 9h.01M12 9h.01M16 9h.01M8 13h.01M12 13h.01M16 13h.01" /></>,
    pulse: <path d="M3 12h4l2-5 4 10 2-5h6" />,
    lock: <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
  }
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>
}

const benefits = [
  { icon: 'wallet', title: 'Tiết kiệm chi phí', text: 'Chỉ 25.000đ/lượt khám, thanh toán VietQR ngay trong web — minh bạch từng đồng.' },
  { icon: 'clock', title: 'Kết nối nhanh chóng', text: 'Gặp bác sĩ trực tuyến ngay tại nhà thuốc, không cần chờ đợi lâu.' },
  { icon: 'shield', title: 'Bác sĩ thật, an tâm thật', text: 'Đội ngũ bác sĩ có chuyên môn và thông tin hành nghề rõ ràng.' },
  { icon: 'phone', title: 'Dễ dàng sử dụng', text: 'Chỉ cần quét mã QR bằng điện thoại, không cần tải ứng dụng.' },
]

const steps = [
  ['01', 'Đến nhà thuốc', 'Tìm nhà thuốc đối tác BriMed gần bạn.'],
  ['02', 'Quét mã QR', 'Dùng camera điện thoại quét mã tại quầy.'],
  ['03', 'Chia sẻ triệu chứng', 'Điền nhanh thông tin để bác sĩ nắm tình trạng.'],
  ['04', 'Tư vấn cùng bác sĩ', 'Trao đổi trực tuyến và nhận hướng dẫn phù hợp.'],
  ['05', 'Nhận toa thuốc', 'Nhận toa điện tử và mua thuốc ngay tại quầy.'],
]

const SAFETY_TAGS = ['Cảm cúm, ho nhẹ', 'Viêm mũi họng', 'Dị ứng da, mề đay', 'Đau mắt đỏ', 'Đau đầu nhẹ', 'Trào ngược, táo bón']

function AmbientEffects() {
  return (
    <div className="ambient-effects" aria-hidden="true">
      <div className="ambient-orb orb-blue" />
      <div className="ambient-orb orb-pink" />
      <div className="energy-trail trail-one" />
      <div className="energy-trail trail-two" />
      <div className="perspective-grid" />
      <div className="particles">
        {Array.from({ length: 14 }, (_, index) => <span className={`particle particle-${index + 1}`} key={index} />)}
      </div>
    </div>
  )
}

// Hero carousel 3 màn: Tư vấn ngay / Đăng nhập bệnh nhân / Nhà thuốc đối tác
function HeroCarousel() {
  const [activeSlide, setActiveSlide] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [onlineCount, setOnlineCount] = useState<number | null>(null)

  useEffect(() => {
    api('/auth/doctors').then((d) => {
      setOnlineCount((d.doctors || []).filter((x: any) => x.doctor_online).length)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (isPaused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const interval = window.setInterval(() => setActiveSlide((current) => (current + 1) % 3), 6000)
    return () => window.clearInterval(interval)
  }, [isPaused, activeSlide])

  const previousSlide = () => setActiveSlide((current) => (current + 2) % 3)
  const nextSlide = () => setActiveSlide((current) => (current + 1) % 3)

  const handleKeyboard = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === 'ArrowLeft') { event.preventDefault(); previousSlide() }
    if (event.key === 'ArrowRight') { event.preventDefault(); nextSlide() }
    if (event.key === 'Home') setActiveSlide(0)
    if (event.key === 'End') setActiveSlide(2)
  }

  return (
    <section
      className={`hero-carousel active-slide-${activeSlide}`}
      aria-roledescription="carousel"
      aria-label="Các dịch vụ BriMed"
      tabIndex={0}
      onKeyDown={handleKeyboard}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) setIsPaused(false)
      }}
    >
      <div className={`carousel-track slide-${activeSlide}`}>
        {/* Slide 1 — Tư vấn ngay */}
        <article className={`carousel-panel hero consultation-panel ${activeSlide === 0 ? 'is-active' : ''}`} aria-hidden={activeSlide !== 0} {...(activeSlide !== 0 ? ({ inert: '' } as any) : {})}>
          <div className="panel-ambient" aria-hidden="true"><i /><i /><i /></div>
          <div className="hero-copy carousel-copy">
            <div className="eyebrow"><span className="status-dot" /> Bác sĩ trực tuyến, ngay tại nhà thuốc</div>
            <h1>
              <span className="headline-line">Tư vấn bác sĩ,</span>
              <span className="headline-line gradient-text">an tâm dùng thuốc.</span>
            </h1>
            <p>Quét mã QR tại nhà thuốc để kết nối với bác sĩ, nhận tư vấn và toa thuốc phù hợp — nhanh chóng, thuận tiện và minh bạch.</p>
            <div className="hero-actions">
              <Link className="button hero-primary-cta" to="/auth"><Icon name="scan" />&nbsp;&nbsp;Tư vấn ngay</Link>
              <Link className="login-link patient-login-button" to="/auth">Đăng Nhập</Link>
              <Link className="text-link pharmacy-link" to="/nha-thuoc-doi-tac">Dành cho nhà thuốc <Icon name="arrow" /></Link>
            </div>
            <div className="trust-row">
              <span><Icon name="check" /> Không cần tải app</span>
              <span><Icon name="check" /> Bảo mật thông tin</span>
            </div>
          </div>
          <div className="hero-visual" aria-label="Đội ngũ chuyên môn y tế BriMed">
            <img className="hero-team-photo" src="/assets/brimed-medical-team.webp" alt="Đội ngũ chuyên môn y tế BriMed" />
            <div className="floating-note note-one"><span><Icon name="shield" /></span><div><b>Thông tin bảo mật</b><small>Tiêu chuẩn y tế</small></div></div>
            <div className="floating-note note-two"><span><Icon name="clock" /></span><div><b>Kết nối nhanh</b><small>Chỉ trong vài phút</small></div></div>
          </div>
        </article>

        {/* Slide 2 — Đăng nhập bệnh nhân */}
        <article className={`carousel-panel patient-carousel-panel ${activeSlide === 1 ? 'is-active' : ''}`} aria-hidden={activeSlide !== 1} {...(activeSlide !== 1 ? ({ inert: '' } as any) : {})}>
          <div className="panel-ambient patient-ambient" aria-hidden="true"><i /><i /><i /></div>
          <div className="carousel-story">
            <span className="carousel-kicker"><Icon name="user" /> Đăng nhập bệnh nhân</span>
            <h2><span>Kết nối an tâm,</span><span>chăm sóc chủ động.</span></h2>
            <p>Đăng nhập để tiếp tục phiên tư vấn và theo dõi thông tin toa thuốc điện tử của bạn.</p>
            <div className="carousel-feature-row"><span><Icon name="lock" /> Bảo mật</span><span><Icon name="pulse" /> Nhanh chóng</span></div>
            <div className="patient-care-visual" aria-label="Minh họa chăm sóc bệnh nhân BriMed">
              <div className="care-orbit orbit-outer" />
              <div className="care-orbit orbit-inner" />
              <div className="care-avatar"><Icon name="user" /><i><Icon name="check" /></i></div>
              <span className="care-chip care-chip-one"><Icon name="pulse" /> Theo dõi sức khỏe</span>
              <span className="care-chip care-chip-two"><Icon name="shield" /> Bảo mật thông tin</span>
            </div>
            <button className="carousel-home-control" type="button" onClick={() => setActiveSlide(0)}><Icon name="back" /> Về màn hình tư vấn</button>
          </div>
          <div className="carousel-auth-card">
            <div className="auth-icon"><Icon name="user" /></div>
            <span className="card-overline">Cổng bệnh nhân</span>
            <h3>Đăng nhập an toàn</h3>
            <p>Truy cập hồ sơ sức khỏe, phiên tư vấn và toa thuốc điện tử của bạn.</p>
            <div className="slide-perks">
              <span><Icon name="check" /> Hồ sơ bảo mật 2 lớp</span>
              <span><Icon name="check" /> Phí khám minh bạch 25.000đ/lượt — thanh toán VietQR trong web</span>
            </div>
            <Link className="button neon-button full-button" to="/auth">Đăng nhập ngay <Icon name="arrow" /></Link>
            <Link className="text-link slide-alt-link" to="/auth">Chưa có tài khoản? Đăng ký ngay <Icon name="arrow" /></Link>
          </div>
        </article>

        {/* Slide 3 — Nhà thuốc đối tác */}
        <article className={`carousel-panel pharmacy-carousel-panel ${activeSlide === 2 ? 'is-active' : ''}`} aria-hidden={activeSlide !== 2} {...(activeSlide !== 2 ? ({ inert: '' } as any) : {})}>
          <div className="panel-ambient pharmacy-ambient" aria-hidden="true"><i /><i /><i /></div>
          <div className="carousel-pharmacy-dashboard">
            <div className="carousel-dashboard-head">
              <div>
                <span className="carousel-kicker"><Icon name="building" /> Nhà thuốc đối tác</span>
                <h2><span className="pharmacy-title-line">Đồng hành cùng</span><span>nhà thuốc.</span></h2>
              </div>
              <i>LIVE</i>
            </div>
            <div className="carousel-metrics">
              <article><span>Phiên hôm nay</span><strong>24</strong><small>+18%</small></article>
              <article><span>Kết nối TB</span><strong>02:14</strong><small>phút</small></article>
              <article className="metric-chart"><span>Bác sĩ trực tuyến</span><strong>{onlineCount != null ? String(onlineCount).padStart(2, '0') : '—'}</strong><div>{Array.from({ length: 12 }, (_, index) => <i key={index} />)}</div></article>
            </div>
            <button className="carousel-home-control light-control" type="button" onClick={() => setActiveSlide(0)}><Icon name="back" /> Về màn hình tư vấn</button>
          </div>
          <div className="carousel-auth-card pharmacy-carousel-login">
            <div className="auth-icon"><Icon name="building" /></div>
            <span className="card-overline">Đối tác BriMed</span>
            <h3>Đăng nhập nhà thuốc</h3>
            <p>Truy cập bảng điều phối tư vấn và quản lý toa thuốc tại quầy của bạn.</p>
            <Link className="button pharmacy-button full-button" to="/auth">Đăng nhập <Icon name="arrow" /></Link>
            <Link className="text-link slide-alt-link" to="/nha-thuoc-doi-tac">Chưa hợp tác? Tìm hiểu mô hình <Icon name="arrow" /></Link>
          </div>
        </article>
      </div>

      <button className="carousel-arrow carousel-previous" type="button" onClick={previousSlide} aria-label="Màn hình trước"><Icon name="back" /></button>
      <button className="carousel-arrow carousel-next" type="button" onClick={nextSlide} aria-label="Màn hình tiếp theo"><Icon name="arrow" /></button>
      <div className="carousel-navigation" role="tablist" aria-label="Chọn màn hình">
        {['Tư vấn ngay', 'Đăng nhập bệnh nhân', 'Nhà thuốc'].map((label, index) => (
          <button className={activeSlide === index ? 'active' : ''} type="button" role="tab" aria-selected={activeSlide === index} aria-label={`Mở màn hình ${label}`} onClick={() => setActiveSlide(index)} key={label}><i /><span>{label}</span></button>
        ))}
      </div>
      <span className="carousel-status" aria-live="polite">Màn hình {activeSlide + 1} / 3</span>
    </section>
  )
}

// Form đăng ký nhận thông tin — logic gửi dữ liệu được inject từ từng phiên bản (server thật hoặc client-side)
function LeadForm({ submitLead }: { submitLead: (form: { full_name: string; phone: string }) => Promise<string> }) {
  const [form, setForm] = useState({ full_name: '', phone: '' })
  const [done, setDone] = useState<string | null>(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setErr('')
    try {
      const message = await submitLead(form)
      setDone(message)
      setForm({ full_name: '', phone: '' })
    } catch (e: any) {
      setErr(e.message || 'Không gửi được thông tin, bạn thử lại giúp mình nhé.')
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <div className="lead-card">
        <div className="lead-success">
          <div className="lead-success-ic"><Icon name="check" /></div>
          <h3>Đã nhận thông tin!</h3>
          <p>{done}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="lead-card">
      <div className="lead-copy">
        <span className="kicker">{CUSTOMER_LEAD_NOTE.title}</span>
        <h3>Để lại thông tin, BriMed đồng hành cùng bạn</h3>
        <p>{CUSTOMER_LEAD_NOTE.desc}</p>
      </div>
      <form className="lead-form" onSubmit={submit}>
        <input required placeholder="Họ tên của bạn" aria-label="Họ tên" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        <input required placeholder="Số điện thoại / Zalo" inputMode="tel" aria-label="Số điện thoại hoặc Zalo" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <button className="button neon-button" type="submit" disabled={busy}>{busy ? 'Đang gửi…' : 'Đăng ký ngay'}</button>
        {err && <p className="lead-err">{err}</p>}
        <p className="lead-note">Thông tin chỉ dùng để liên hệ hướng dẫn sử dụng — không quảng cáo spam.</p>
      </form>
    </div>
  )
}


// Khối QR thanh toán VietQR trên landing — QR mẫu, thay bằng QR thật khi kích hoạt cổng thanh toán
function QrShowcase() {
  const [copied, setCopied] = useState(false)
  const cells = useMemo(() => {
    let s = 7919
    const rand = () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296 }
    const n = 21
    const grid: boolean[][] = Array.from({ length: n }, () => Array.from({ length: n }, () => rand() > 0.52))
    const finder = (r0: number, c0: number) => {
      for (let r = 0; r < 7; r++) for (let c = 0; c < 7; c++) {
        const edge = r === 0 || r === 6 || c === 0 || c === 6
        const core = r >= 2 && r <= 4 && c >= 2 && c <= 4
        grid[r0 + r][c0 + c] = edge || core
      }
    }
    finder(0, 0); finder(0, 14); finder(14, 0)
    return grid
  }, [])
  const n = 21, size = 5

  return (
    <div className="qr-showcase">
      <div className="qr-showcase-qr">
        <svg viewBox={`0 0 ${n * size} ${n * size}`} role="img" aria-label="Mã QR thanh toán phí khám qua VietQR">
          <rect width={n * size} height={n * size} fill="white" />
          {cells.map((row, r) => row.map((on, c) => on
            ? <rect key={`${r}-${c}`} x={c * size} y={r * size} width={size} height={size} fill="#10244b" />
            : null))}
        </svg>
      </div>
      <div className="qr-showcase-copy">
        <span className="kicker">Thanh toán trong 30 giây</span>
        <h3>Quét VietQR — khám ngay.</h3>
        <ul>
          <li><Icon name="check" /> Phí khám 25.000đ/lượt — không phí ẩn</li>
          <li><Icon name="check" /> Quét bằng app ngân hàng bất kỳ (VietQR)</li>
          <li><Icon name="check" /> Bác sĩ tiếp nhận ngay sau khi nhận phí</li>
        </ul>
        <button
          className="text-link"
          type="button"
          onClick={() => { navigator.clipboard?.writeText('BRIMED-VIETQR').catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
        >
          {copied ? 'Đã sao chép nội dung chuyển khoản' : 'Xem nội dung chuyển khoản mẫu'} <Icon name="arrow" />
        </button>
      </div>
    </div>
  )
}

// Landing khách hàng theo thiết kế Figma Make — mọi CTA điều hướng routes thật của app
export default function Landing({ submitLead }: { submitLead: (form: { full_name: string; phone: string }) => Promise<string> }) {
  const [openFaq, setOpenFaq] = useState(0)

  // Cuộn mượt cho anchor nội bộ + hiệu ứng reveal cho từng section (có dự phòng nếu observer không chạy)
  useEffect(() => {
    document.documentElement.style.scrollBehavior = 'smooth'
    return () => { document.documentElement.style.scrollBehavior = '' }
  }, [])

  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>('.lp main > section'))
    sections.forEach((section) => section.classList.add('section-reveal'))

    const show = (el: HTMLElement) => el.classList.add('is-visible')
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reducedMotion || !('IntersectionObserver' in window)) {
      sections.forEach(show)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            show(entry.target as HTMLElement)
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
    )
    sections.forEach((section) => observer.observe(section))

    // Dự phòng: nếu observer bị chặn (webview ẩn), hiện section khi đã vào/cuộn qua khung nhìn
    const fallback = window.setInterval(() => {
      sections.forEach((section) => {
        if (!section.classList.contains('is-visible') && section.getBoundingClientRect().top < window.innerHeight) {
          show(section)
          observer.unobserve(section)
        }
      })
    }, 350)
    const stopFallback = window.setTimeout(() => window.clearInterval(fallback), 20000)

    return () => {
      observer.disconnect()
      window.clearInterval(fallback)
      window.clearTimeout(stopFallback)
    }
  }, [])

  return (
    <div className="lp">
      <AmbientEffects />
      <header className="header">
        <Link className="brand" to="/" aria-label="BriMed - Trang chủ">
          <img src="/assets/brimed-icon.png" alt="" />
          <span>BRI<span>MED</span></span>
        </Link>
        <nav className="nav" aria-label="Điều hướng chính">
          <a href="#loi-ich">Lợi ích</a>
          <a href="#quy-trinh">Cách hoạt động</a>
          <a href="#chi-phi">Chi phí</a>
          <a href="#faq">Câu hỏi</a>
        </nav>
        <Link className="button button-small" to="/auth"><Icon name="scan" /> Quét QR</Link>
      </header>

      <main>
        <HeroCarousel />

        <section className="benefits section" id="loi-ich">
          <div className="section-heading">
            <span>Đơn giản hơn mỗi ngày</span>
            <h2>Chăm sóc sức khỏe ngay nơi bạn tin tưởng</h2>
            <p>BriMed kết nối công nghệ, bác sĩ và nhà thuốc để mỗi lần mua thuốc đều an tâm hơn.</p>
          </div>
          <div className="benefit-grid">
            {benefits.map((item, index) => (
              <article className={`benefit-card tone-${index + 1}`} key={item.title}>
                <div className="icon-wrap"><Icon name={item.icon} /></div>
                <h3>{item.title}</h3><p>{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="process section" id="quy-trinh">
          <div className="section-heading">
            <span>5 bước dễ dàng</span>
            <h2>Từ nhà thuốc đến bác sĩ trong vài phút</h2>
          </div>
          <div className="steps">
            {steps.map(([number, title, text], index) => (
              <article className="step" key={number}>
                <div className="step-number">{number}</div>
                <div className="step-icon"><Icon name={index === 0 ? 'shield' : index === 1 ? 'scan' : index === 2 ? 'phone' : index === 3 ? 'clock' : 'check'} /></div>
                <h3>{title}</h3><p>{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="pricing section" id="chi-phi">
          <div className="price-copy">
            <span className="kicker">Chi phí rõ ràng</span>
            <h2>Nhẹ gánh chi phí,<br />vẹn tròn an tâm</h2>
            <p>Bạn luôn biết trước chi phí trước khi bắt đầu. Không phí ẩn, không điều kiện khó hiểu.</p>
            <ul>
              <li><Icon name="check" /> Tư vấn trực tiếp với bác sĩ</li>
              <li><Icon name="check" /> Nhận toa điện tử sau tư vấn</li>
              <li><Icon name="check" /> Hỗ trợ ngay tại nhà thuốc</li>
            </ul>
          </div>
          <div className="price-side">
            <div className="price-cards">
              <article className="price-card featured"><span>Người bệnh</span><div><strong>25.000đ</strong><small>/ lượt khám</small></div><p>Thanh toán qua VietQR ngay trong web. Bác sĩ nhận 15.000đ, BriMed giữ 10.000đ (gồm GTGT).</p></article>
              <article className="price-card"><span>Nhà thuốc đối tác</span><div><strong>500.000đ</strong><small>/ tháng</small></div><p>Tháng đầu miễn phí. Sau 6 tháng đầu là 900.000đ/tháng. Không hoa hồng tiền thuốc.</p></article>
            </div>
            <QrShowcase />
          </div>
        </section>

        <section className="safety section">
          <div className="section-heading"><span>Tư vấn đúng lúc</span><h2>Khi nào BriMed phù hợp với bạn?</h2></div>
          <div className="safety-grid">
            <article className="safe-card good">
              <h3><span><Icon name="check" /></span> Có thể tư vấn trực tuyến</h3>
              <p>Các triệu chứng nhẹ, mới xuất hiện và tình trạng sức khỏe ổn định — bác sĩ sàng lọc theo danh mục TT 30/2023 trước khi kê đơn.</p>
              <div className="tag-row">{SAFETY_TAGS.map((t) => <span key={t}>{t}</span>)}</div>
            </article>
            <article className="safe-card alert">
              <h3><span>!</span> Cần khám trực tiếp ngay</h3>
              <p>Khó thở, đau ngực, mất ý thức, chảy máu nhiều hoặc triệu chứng nghiêm trọng — bác sĩ sẽ hướng dẫn bạn đến cơ sở y tế gần nhất.</p>
              <div className="emergency">Trong trường hợp khẩn cấp, gọi <strong>115</strong></div>
            </article>
          </div>
        </section>

        <section className="faq section" id="faq">
          <div className="section-heading"><span>Giải đáp nhanh</span><h2>Câu hỏi thường gặp</h2></div>
          <div className="faq-list">
            {CUSTOMER_FAQ.map((f, index) => (
              <article className={`faq-item ${openFaq === index ? 'open' : ''}`} key={f.q}>
                <button onClick={() => setOpenFaq(openFaq === index ? -1 : index)} aria-expanded={openFaq === index}>
                  <span>{f.q}</span><b>{openFaq === index ? '−' : '+'}</b>
                </button>
                {openFaq === index && <p>{f.a}</p>}
              </article>
            ))}
          </div>
        </section>

        <section className="section" id="nhan-danh-sach">
          <LeadForm submitLead={submitLead} />
        </section>

        <section className="cta section" id="bat-dau">
          <div>
            <span>Bắt đầu thật dễ dàng</span>
            <h2>Quét QR, gặp bác sĩ ngay.</h2>
            <p>Mở camera điện thoại và quét mã BriMed tại nhà thuốc đối tác.</p>
          </div>
          <Link className="button button-light" to="/auth"><Icon name="scan" /> Bắt đầu tư vấn</Link>
        </section>
      </main>

      <footer id="doi-tac">
        <div>
          <Link className="footer-logo-link" to="/" aria-label="BriMed - Trang chủ">
            <img className="footer-logo" src="/assets/brimed-logo.png" alt="BriMed — Since 2026" />
          </Link>
          <p>Đơn thuốc an toàn cho bạn an tâm — kết nối Bệnh nhân, Bác sĩ và Nhà thuốc với toa thuốc điện tử nhanh tại quầy.</p>
        </div>
        <div>
          <strong>Dịch vụ</strong>
          <a href="#quy-trinh">Cách hoạt động</a>
          <a href="#chi-phi">Chi phí</a>
          <a href="#faq">Câu hỏi thường gặp</a>
        </div>
        <div>
          <strong>Nhà thuốc</strong>
          <Link to="/nha-thuoc-doi-tac">Đăng ký nhà thuốc đối tác</Link>
          <Link to="/goi-1-thang-brimed-nha-thuoc">6 tháng đầu — 500.000đ/tháng</Link>
          <Link to="/goi-3-thang-brimed-nha-thuoc">Sau 6 tháng đầu — 900.000đ/tháng</Link>
        </div>
        <div>
          <strong>Hỗ trợ</strong>
          <a href="tel:19002026">Hotline: 1900 2026</a>
          <a href="mailto:sharkvision.co.work@gmail.com">sharkvision.co.work@gmail.com</a>
          <span className="foot-item">Khẩn cấp gọi 115 — BriMed không thay thế cấp cứu</span>
        </div>
      </footer>
      <div className="copyright">© 2026 BriMed. Tư vấn trực tuyến không thay thế chăm sóc y tế khẩn cấp. · Bác sĩ thật — đơn thật — luôn có quyền từ chối kê đơn vì an toàn của bạn.</div>
    </div>
  )
}
