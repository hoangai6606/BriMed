import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight, Bell, BellOff, CalendarDays, Check, ChevronDown, Clock3, FileSignature, Leaf, MapPin,
  Phone, QrCode, Search, ShieldCheck, ShoppingBag, Sparkles, Stethoscope, Store, Users, Video, Pill,
} from 'lucide-react'
import { api } from '../../api/client'
import { CUSTOMER_FAQ, CUSTOMER_LEAD_NOTE } from '../../data/constants'
import { SceneConsult, SceneRx, SceneSearch, SceneReminder, Capsule, Tablet, CrossMark, LeafSprig, HeartbeatPath } from './Illustrations'
import './landing.css'

type LeadForm = { full_name: string; phone: string; interest?: string }
type Doctor = { id?: number; full_name: string; doctor_specialty: string; doctor_license?: string; avatar_url: string; doctor_online?: boolean; next_slot_at?: string | null }
type Slot = { id: number; starts_at: string; duration_min: number; capacity: number; booked: number; seats_left: number; doctor_name: string; doctor_specialty: string; doctor_license?: string; avatar_url: string }

export const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
export const v = (vars: Record<string, string | number>) => vars as CSSProperties

// ============================================================
// Nội dung
// ============================================================
const PRACTICES = [
  { key: 'consult', Scene: SceneConsult, tag: 'Gọi 1–2 phút', title: 'Khám nhanh ngay tại quầy', text: 'Quét mã QR ở nhà thuốc đối tác, bác sĩ thật gọi video hỏi bệnh — không xếp hàng, không cần cài app.', icon: Video },
  { key: 'rx', Scene: SceneRx, tag: 'TT 26/2025/TT-BYT', title: 'Toa điện tử có chữ ký số', text: 'Mỗi toa có mã tra cứu riêng. Dược sĩ đối chiếu mã trước khi cấp thuốc — đúng người, đúng thuốc.', icon: FileSignature },
  { key: 'search', Scene: SceneSearch, tag: 'Theo tồn kho thật', title: 'Tìm thuốc & so sánh giá', text: 'Xem nhà thuốc nào còn hàng, giá niêm yết bao nhiêu. BriMed không thu hoa hồng tiền thuốc.', icon: Search },
  { key: 'remind', Scene: SceneReminder, tag: 'Sáng · Trưa · Tối', title: 'Nhắc uống thuốc đúng giờ', text: 'Lịch nhắc tự tạo theo toa bác sĩ kê, kèm hồ sơ sức khỏe và lịch sử khám luôn trong tay bạn.', icon: Clock3 },
]

const STEPS = [
  { title: 'Đến nhà thuốc đối tác', text: 'Tìm nhà thuốc có standee BriMed gần bạn — dược sĩ luôn sẵn lòng hỗ trợ.' },
  { title: 'Kể bác sĩ nghe triệu chứng', text: 'Vài câu hỏi sàng lọc theo danh mục TT 30/2023. Dấu hiệu nguy hiểm sẽ được cảnh báo ngay.' },
  { title: 'Gọi ngắn cùng bác sĩ', text: 'Thanh toán 25.000đ qua VietQR, bác sĩ đang trực gọi video 1–2 phút để hỏi thêm.' },
  { title: 'Nhận toa điện tử ký số', text: 'Bác sĩ ký số và phát hành toa — hoặc từ chối kê đơn nếu bạn cần khám trực tiếp.' },
  { title: 'Mua thuốc, về nhà nghỉ ngơi', text: 'Dược sĩ cấp thuốc theo mã toa. Lịch nhắc uống thuốc được tạo sẵn cho bạn.' },
]

// "Vì sao tôi làm nghề" — lời chia sẻ của đội ngũ bác sĩ (theo tên trong hệ thống)
const DOCTOR_WHY: Record<string, string> = {
  'BS. Nguyễn Văn Minh': 'Tôi muốn người bệnh không phải bỏ nửa ngày công chỉ để nghe một lời dặn dò đúng.',
  'BS. Trần Thị Thu Hà': 'Một cơn viêm họng không đáng để bạn xếp hàng ba tiếng — nhưng luôn đáng được khám cho đúng.',
  'BS. Lê Hoàng Sơn': 'Da là thứ người ta hay tự chữa nhất. Tôi ở đây để bạn không phải tự đoán.',
  'BS. Phạm Ngọc Anh': 'Hỏi kỹ hai phút để bạn yên tâm cả tuần — đó là cách tôi hiểu nghề thầy thuốc.',
  'BS. Vũ Đình Phúc': 'Một toa thuốc đúng bắt đầu từ một câu hỏi đúng, và một người chịu lắng nghe.',
}
// Tiêu điểm khuôn mặt cho ảnh không căn giữa
const PHOTO_FOCUS: Record<string, string> = { '/assets/doctors/dr-ha.jpg': '92% 30%' }
const DEFAULT_WHY = 'Tôi chọn BriMed để người bệnh được khám đúng, ngay ở nơi gần nhà nhất.'

const FALLBACK_DOCTORS: Doctor[] = [
  { full_name: 'BS. Nguyễn Văn Minh', doctor_specialty: 'Nội tổng quát', avatar_url: '/assets/doctors/dr-minh.jpg' },
  { full_name: 'BS. Trần Thị Thu Hà', doctor_specialty: 'Tai Mũi Họng', avatar_url: '/assets/doctors/dr-ha.jpg' },
  { full_name: 'BS. Phạm Ngọc Anh', doctor_specialty: 'Nội tổng quát – Hô hấp', avatar_url: '/assets/doctors/dr-anh.jpg' },
  { full_name: 'BS. Lê Hoàng Sơn', doctor_specialty: 'Da Liễu', avatar_url: '/assets/doctors/dr-son.jpg' },
  { full_name: 'BS. Vũ Đình Phúc', doctor_specialty: 'Tai Mũi Họng', avatar_url: '/assets/doctors/dr-phuc.jpg' },
]

export const CONDITIONS = ['Cảm cúm', 'Viêm mũi họng', 'Dị ứng da · mề đay', 'Nấm da', 'Đau mắt đỏ', 'Đau đầu do căng thẳng', 'Đau nửa đầu', 'Viêm dạ dày', 'Trào ngược', 'Táo bón', 'COVID-19']

const LEAD_INTERESTS = ['Muốn dùng BriMed', 'Tìm nhà thuốc gần nhà', 'Hỏi về chi phí khám']

// ============================================================
// Hiệu ứng dùng chung
// ============================================================

// Fade-up 600ms cho mọi phần tử [data-reveal] khi vào khung nhìn (tự bắt cả phần tử render sau)
export function useReveal(root: React.RefObject<HTMLElement>) {
  useEffect(() => {
    const el = root.current
    if (!el) return
    const show = (n: Element) => n.classList.add('is-in')
    if (reducedMotion() || !('IntersectionObserver' in window)) {
      el.querySelectorAll('[data-reveal]').forEach(show)
      const mo = new MutationObserver(() => el.querySelectorAll('[data-reveal]:not(.is-in)').forEach(show))
      mo.observe(el, { childList: true, subtree: true })
      return () => mo.disconnect()
    }
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { show(e.target); io.unobserve(e.target) } }),
      { threshold: 0.14, rootMargin: '0px 0px -8% 0px' },
    )
    const scan = () => el.querySelectorAll('[data-reveal]:not(.is-in)').forEach((n) => io.observe(n))
    scan()
    const mo = new MutationObserver(scan)
    mo.observe(el, { childList: true, subtree: true })
    // Dự phòng cho webview chặn observer
    const fallback = window.setTimeout(() => {
      el.querySelectorAll('[data-reveal]:not(.is-in)').forEach((n) => { if (n.getBoundingClientRect().top < window.innerHeight) show(n) })
    }, 2500)
    return () => { io.disconnect(); mo.disconnect(); window.clearTimeout(fallback) }
  }, [root])
}

// Chuông nhẹ tổng hợp bằng WebAudio — không cần file âm thanh
export function playChime() {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const now = ctx.currentTime
    const notes: [number, number, number][] = [[1046.5, 0, 0.07], [1568, 0.11, 0.05], [2093, 0.22, 0.035]]
    notes.forEach(([freq, at, vol]) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0, now + at)
      gain.gain.linearRampToValueAtTime(vol, now + at + 0.012)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + at + 2.2)
      osc.connect(gain).connect(ctx.destination)
      osc.start(now + at)
      osc.stop(now + at + 2.3)
    })
    window.setTimeout(() => ctx.close().catch(() => {}), 2800)
  } catch { /* trình duyệt không hỗ trợ âm thanh — bỏ qua */ }
}

export function SplitWords({ text, start = 0, step = 70 }: { text: string; start?: number; step?: number }) {
  return (
    <>
      {text.split(' ').map((w, i) => (
        <Fragment key={i}>
          <span className="word" style={v({ '--wd': `${start + i * step}ms` })}><span>{w}</span></span>{' '}
        </Fragment>
      ))}
    </>
  )
}

export function CountUp({ to, run, prefix = '', suffix = '' }: { to: number; run: boolean; prefix?: string; suffix?: string }) {
  const [n, setN] = useState(reducedMotion() ? to : 0)
  useEffect(() => {
    if (!run || reducedMotion()) { if (reducedMotion()) setN(to); return }
    let raf = 0
    const t0 = performance.now()
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / 1400)
      setN(Math.round(to * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    const delay = window.setTimeout(() => { raf = requestAnimationFrame(tick) }, 700)
    return () => { window.clearTimeout(delay); cancelAnimationFrame(raf) }
  }, [run, to])
  return <>{prefix}{n.toLocaleString('vi-VN')}{suffix}</>
}

export function SectionHead({ kicker, title, text, align = 'center' }: { kicker: string; title: ReactNode; text?: string; align?: 'center' | 'left' }) {
  return (
    <div className={`sec-head ${align === 'left' ? 'is-left' : ''}`}>
      <span className="kicker" data-reveal><i />{kicker}</span>
      <h2 data-reveal style={v({ '--d': '90ms' })}>{title}</h2>
      {text && <p data-reveal style={v({ '--d': '180ms' })}>{text}</p>}
    </div>
  )
}

// ============================================================
// Màn mở đầu — nhịp tim vẽ thành logo, rèm giấy mở ra
// ============================================================
function Intro({ onReveal, onDone }: { onReveal: () => void; onDone: () => void }) {
  const [leaving, setLeaving] = useState(false)
  const finished = useRef(false)
  const leave = useCallback(() => {
    if (finished.current) return
    finished.current = true
    setLeaving(true)
    onReveal()
    window.setTimeout(onDone, 1100)
  }, [onReveal, onDone])

  useEffect(() => {
    const t = window.setTimeout(leave, 2600)
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') leave() }
    window.addEventListener('keydown', onKey)
    return () => { window.clearTimeout(t); window.removeEventListener('keydown', onKey) }
  }, [leave])

  return (
    <div className={`intro ${leaving ? 'is-leaving' : ''}`} onClick={leave} role="presentation">
      <div className="intro-curtain intro-curtain-top" />
      <div className="intro-curtain intro-curtain-bottom" />
      <div className="intro-stage">
        <div className="intro-mark">
          <span className="intro-ring" /><span className="intro-ring r2" />
          <img src="/assets/brimed-icon.png" alt="" />
        </div>
        <HeartbeatPath className="intro-beat" />
        <div className="intro-word" aria-label="BriMed">
          {'BriMed'.split('').map((c, i) => <span key={i} style={v({ '--i': i })}>{c}</span>)}
        </div>
        <p className="intro-tag">Đơn thuốc an toàn cho bạn an tâm</p>
      </div>
      <button className="intro-skip" type="button" onClick={(e) => { e.stopPropagation(); leave() }}>Bỏ qua</button>
    </div>
  )
}

// ============================================================
// Header
// ============================================================

// Pill chuyển giữa 3 trang vai trò: Bệnh nhân · Nhà thuốc · Bác sĩ
export function RoleSwitch({ current }: { current: 'patient' | 'pharmacy' | 'doctor' }) {
  const items = [
    { key: 'patient', to: '/', label: 'Dành cho bệnh nhân', Icon: Users },
    { key: 'pharmacy', to: '/cho-nha-thuoc', label: 'Dành cho nhà thuốc', Icon: Store },
    { key: 'doctor', to: '/cho-bac-si', label: 'Dành cho bác sĩ', Icon: Stethoscope },
  ] as const
  return (
    <div className="role-switch" role="navigation" aria-label="Chọn trang theo vai trò">
      {items.map(({ key, to, label, Icon }) => (
        <Link key={key} to={to} className={current === key ? 'on' : ''} title={label} aria-label={label} aria-current={current === key ? 'page' : undefined}>
          <Icon size={16} />
        </Link>
      ))}
    </div>
  )
}

function Header({ scrolled, soundOn, onToggleSound }: { scrolled: boolean; soundOn: boolean; onToggleSound: () => void }) {
  const [open, setOpen] = useState(false)
  const links = [['#dich-vu', 'Dịch vụ'], ['#quy-trinh', 'Cách hoạt động'], ['#bac-si', 'Bác sĩ'], ['#lich-truc', 'Lịch trực'], ['#chi-phi', 'Chi phí'], ['#faq', 'Hỏi đáp']]
  return (
    <header className={`lp-header ${scrolled ? 'is-scrolled' : ''} ${open ? 'is-open' : ''}`}>
      <div className="lp-header-inner">
        <Link className="lp-brand" to="/" aria-label="BriMed - Trang chủ">
          <img src="/assets/brimed-icon.png" alt="" />
<span>Bri<b>Med</b></span>
        </Link>
        <nav className="lp-nav" aria-label="Điều hướng chính">
          {links.map(([href, label]) => <a key={href} href={href} onClick={() => setOpen(false)}>{label}</a>)}
        </nav>
        <div className="lp-header-actions">
          <RoleSwitch current="patient" />
          <button
            type="button"
            className={`sound-toggle ${soundOn ? 'is-on' : ''}`}
            onClick={onToggleSound}
            aria-pressed={soundOn}
            title={soundOn ? 'Tắt chuông nhẹ' : 'Bật chuông nhẹ khi bắt đầu cuộn'}
          >
            {soundOn ? <Bell size={17} /> : <BellOff size={17} />}
            <span>{soundOn ? 'Chuông bật' : 'Chuông'}</span>
          </button>
          <Link className="lp-login" to="/auth">Đăng nhập</Link>
          <Link className="btn-soft btn-sm" to="/auth"><QrCode size={16} /> Tư vấn ngay</Link>
          <button type="button" className="lp-burger" aria-label="Mở menu" aria-expanded={open} onClick={() => setOpen(!open)}><i /><i /></button>
        </div>
      </div>
    </header>
  )
}

// ============================================================
// Hero — hình ảnh "thở" theo chu kỳ 4 giây
// ============================================================
function Hero({ ready, onlineCount }: { ready: boolean; onlineCount: number | null }) {
  return (
    <section className={`hero ${ready ? 'is-ready' : ''}`} id="top">
      <div className="hero-beams" aria-hidden="true"><i /><i /><i /><i /></div>
      <div className="hero-motes" aria-hidden="true">{Array.from({ length: 14 }, (_, i) => <i key={i} style={v({ '--m': i })} />)}</div>

      <div className="hero-copy">
        <p className="hero-eyebrow">
          <span className="live-dot" />
          {onlineCount != null && onlineCount > 0 ? `${onlineCount} bác sĩ đang trực tuyến` : 'Bác sĩ trực tuyến mỗi ngày'}
          <span className="sep" /> <MapPin size={14} /> Gò Vấp, TP.HCM
        </p>
        <h1 className="hero-title">
          <span className="line"><SplitWords text="Chậm lại một nhịp," start={250} /></span>
          <span className="line accent"><SplitWords text="bác sĩ đã ở ngay quầy thuốc." start={560} /></span>
        </h1>
        <p className="hero-lede">
          Quét mã QR tại nhà thuốc đối tác, kể bác sĩ nghe điều bạn đang gặp. Một cuộc gọi ngắn, một toa thuốc điện tử ký số —
          và bạn về nhà với đúng loại thuốc mình cần.
        </p>
        <div className="hero-cta">
          <Link className="btn-breathe" to="/auth"><QrCode size={19} /> Tư vấn ngay <small>25.000đ/lượt</small></Link>
          <a className="btn-quiet" href="#lich-truc"><CalendarDays size={18} /> Xem lịch bác sĩ trực</a>
        </div>
        <dl className="hero-stats">
          <div><dt><CountUp to={10} run={ready} prefix="~" /> <small>phút</small></dt><dd>chờ tại quầy thay vì nửa ngày ở bệnh viện</dd></div>
          <div><dt>1–2 <small>phút</small></dt><dd>bác sĩ gọi ngắn hỏi bệnh</dd></div>
          <div><dt><CountUp to={25000} run={ready} /><small>đ</small></dt><dd>một lượt khám, không phí ẩn</dd></div>
        </dl>
      </div>

      <div className="hero-visual">
        <div className="breath" aria-hidden="true">
          <span className="breath-ring r1" /><span className="breath-ring r2" /><span className="breath-ring r3" />
        </div>
        <figure className="breath-window kb">
          <img src="/assets/brimed-medical-team.webp" alt="Đội ngũ bác sĩ và dược sĩ đồng hành cùng BriMed" />
          <span className="window-light" aria-hidden="true" />
        </figure>
        <div className="breath-guide" aria-hidden="true"><span className="in">Hít vào…</span><span className="out">Thở ra…</span></div>

        <div className="hero-chip chip-a"><span className="chip-ic"><ShieldCheck size={18} /></span><div><b>Toa ký số hợp lệ</b><small>TT 26/2025/TT-BYT</small></div></div>
        <div className="hero-chip chip-b"><span className="chip-ic pink"><Stethoscope size={18} /></span><div><b>Bác sĩ thật</b><small>Có mã chứng chỉ hành nghề</small></div></div>

        <Capsule className="float-deco deco-capsule" />
        <Tablet className="float-deco deco-tablet" />
        <CrossMark className="float-deco deco-cross" />
        <LeafSprig className="float-deco deco-leaf" />
      </div>

      <a className="scroll-cue" href="#dich-vu" aria-label="Cuộn xuống phần dịch vụ"><span /> Cuộn nhẹ</a>
    </section>
  )
}

function ConditionRibbon() {
  const items = [...CONDITIONS, ...CONDITIONS]
  return (
    <div className="ribbon" aria-label="Các bệnh thông thường có thể khám từ xa theo TT 30/2023">
      <div className="ribbon-track">
        {items.map((c, i) => <span key={i} aria-hidden={i >= CONDITIONS.length}><Leaf size={14} /> {c}</span>)}
      </div>
    </div>
  )
}

// ============================================================
// Dịch vụ (tương ứng "Practices")
// ============================================================
function Practices() {
  return (
    <section className="sec practices" id="dich-vu">
      <SectionHead
        kicker="Bốn cách BriMed chăm sóc bạn"
        title={<>Nhẹ nhàng, đúng lúc,<br /><em>ngay gần nhà.</em></>}
        text="Từ lúc bạn bước vào nhà thuốc đến khi uống liều thuốc cuối cùng — mỗi bước đều có người thật đứng phía sau."
      />
      <div className="practice-grid">
        {PRACTICES.map(({ key, Scene, tag, title, text, icon: Icon }, i) => (
          <article className={`practice tone-${i + 1}`} key={key} data-reveal style={v({ '--d': `${i * 110}ms` })}>
            <figure className="practice-art kb"><Scene /></figure>
            <div className="practice-body">
              <div className="practice-meta"><span className="practice-no">0{i + 1}</span><span className="practice-tag"><Icon size={14} /> {tag}</span></div>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

// ============================================================
// Quy trình — danh sách bước + điện thoại dính theo cuộn
// ============================================================
function PhoneScreens({ active }: { active: number }) {
  return (
    <div className="phone" aria-hidden="true">
      <div className="phone-notch" />
      <div className="phone-screen">
        <div className="phone-bar"><span>BriMed</span><span>9:41</span></div>
        <div className={`ps ps-qr ${active === 0 ? 'on' : ''}`}>
          <div className="qr-frame"><VietQrArt /><i className="scanline" /></div>
          <b>Quét mã tại quầy</b><small>NT Minh Châu · 128 Nguyễn Oanh</small>
        </div>
        <div className={`ps ps-form ${active === 1 ? 'on' : ''}`}>
          <b>Bạn đang gặp gì?</b>
          {[['Triệu chứng', 'Ho, sổ mũi'], ['Đã bao lâu', '2 ngày'], ['Sốt cao > 3 ngày', 'Không'], ['Khó thở', 'Không']].map(([k, val], i) => (
            <div className="field" key={k} style={v({ '--i': i })}><span>{k}</span><em>{val}</em><Check size={14} /></div>
          ))}
          <div className="ok-flag"><ShieldCheck size={14} /> Không có dấu hiệu cờ đỏ</div>
        </div>
        <div className={`ps ps-call ${active === 2 ? 'on' : ''}`}>
          <div className="call-avatar"><img src="/assets/doctors/dr-minh.jpg" alt="" /><i /><i /></div>
          <b>BS. Nguyễn Văn Minh</b><small>Nội tổng quát · đang gọi</small>
          <div className="call-timer"><span className="rec" /> 01:24</div>
          <div className="call-actions"><span className="end"><Phone size={16} /></span><span><Video size={16} /></span></div>
        </div>
        <div className={`ps ps-rx ${active === 3 ? 'on' : ''}`}>
          <div className="rx-card">
            <div className="rx-head"><span>Rx</span><em>VN-Rx-2026-08142</em></div>
            {[['Paracetamol 500mg', 'Sáng · Tối'], ['Loratadin 10mg', 'Tối']].map(([n, t], i) => (
              <div className="rx-line" key={n} style={v({ '--i': i })}><Pill size={14} /><span>{n}</span><small>{t}</small></div>
            ))}
            <div className="rx-signed"><FileSignature size={14} /> Đã ký số</div>
          </div>
        </div>
        <div className={`ps ps-done ${active === 4 ? 'on' : ''}`}>
          <div className="done-bag"><ShoppingBag size={44} strokeWidth={1.4} /><i><Check size={14} /></i></div>
          <b>Nhận thuốc tại quầy</b><small>Đã tạo lịch nhắc: Sáng · Tối</small>
          <div className="done-bar"><i /></div>
        </div>
      </div>
    </div>
  )
}

function Process() {
  const [active, setActive] = useState(0)
  const refs = useRef<(HTMLLIElement | null)[]>([])
  useEffect(() => {
    if (!('IntersectionObserver' in window)) return
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.idx)) }),
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 },
    )
    refs.current.forEach((r) => r && io.observe(r))
    return () => io.disconnect()
  }, [])

  return (
    <section className="sec process" id="quy-trinh">
      <div className="process-layout">
        <div className="process-head">
          <SectionHead align="left" kicker="Cách hoạt động" title={<>Năm bước,<br /><em>một hơi thở.</em></>} text="Toàn bộ hành trình chỉ khoảng 10 phút — đủ để bạn ngồi xuống, uống ngụm nước và nghe lời dặn của bác sĩ." />
        </div>
        <div className="process-copy">
          <ol className="steps" style={v({ '--p': active / (STEPS.length - 1) })}>
            <span className="steps-line" aria-hidden="true"><i /></span>
            {STEPS.map((s, i) => (
              <li
                key={s.title}
                ref={(el) => { refs.current[i] = el }}
                data-idx={i}
                className={i === active ? 'is-active' : i < active ? 'is-past' : ''}
                onMouseEnter={() => setActive(i)}
              >
                <span className="step-dot">{i < active ? <Check size={14} /> : i + 1}</span>
                <div><h3>{s.title}</h3><p>{s.text}</p></div>
              </li>
            ))}
          </ol>
        </div>
        <div className="process-phone">
          <div className="phone-sticky">
            <div className="phone-halo" aria-hidden="true" />
            <div className="phone-scale"><PhoneScreens active={active} /></div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ============================================================
// Bác sĩ — lời "vì sao tôi làm nghề" gõ từng ký tự khi rê chuột
// ============================================================
export function TypeQuote({ text, active }: { text: string; active: boolean }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!active) { setN(0); return }
    if (reducedMotion()) { setN(text.length); return }
    let i = 0
    const t = window.setInterval(() => { i += 1; setN(i); if (i >= text.length) window.clearInterval(t) }, 26)
    return () => window.clearInterval(t)
  }, [active, text])
  return (
    <blockquote className={`type-quote ${active ? 'is-typing' : ''}`} aria-label={text}>
      <span aria-hidden="true">{active ? text.slice(0, n) : ''}</span>
      <i className={`caret ${n >= text.length && active ? 'done' : ''}`} aria-hidden="true" />
      {!active && <span className="quote-hint" aria-hidden="true">Rê chuột để nghe bác sĩ chia sẻ</span>}
    </blockquote>
  )
}

function DoctorCard({ d, i, live }: { d: Doctor; i: number; live: boolean }) {
  const [active, setActive] = useState(false)
  const ref = useRef<HTMLElement>(null)
  // Thiết bị cảm ứng không có hover: tự gõ khi thẻ vào khung nhìn
  useEffect(() => {
    if (!window.matchMedia('(hover: none)').matches || !ref.current || !('IntersectionObserver' in window)) return
    const io = new IntersectionObserver(([e]) => setActive(e.isIntersecting), { threshold: 0.6 })
    io.observe(ref.current)
    return () => io.disconnect()
  }, [])
  const why = DOCTOR_WHY[d.full_name] || DEFAULT_WHY
  return (
    <article
      ref={ref}
      className={`doctor ${active ? 'is-active' : ''}`}
      data-reveal
      style={v({ '--d': `${i * 100}ms` })}
      tabIndex={0}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      onFocus={() => setActive(true)}
      onBlur={() => setActive(false)}
    >
      <figure className="doctor-photo kb">
        <img src={d.avatar_url || '/assets/doctors/dr-minh.jpg'} alt={d.full_name} loading="lazy" style={{ objectPosition: PHOTO_FOCUS[d.avatar_url] }} />
        {live && <span className={`doctor-status ${d.doctor_online ? 'on' : ''}`}>{d.doctor_online ? 'Đang trực' : 'Ngoài ca'}</span>}
      </figure>
      <div className="doctor-body">
        <h3>{d.full_name}</h3>
        <p className="doctor-spec"><Stethoscope size={14} /> {d.doctor_specialty}</p>
        <TypeQuote text={why} active={active} />
      </div>
    </article>
  )
}

function Doctors({ doctors, live }: { doctors: Doctor[]; live: boolean }) {
  return (
    <section className="sec doctors" id="bac-si">
      <SectionHead
        kicker="Đội ngũ bác sĩ"
        title={<>Những thầy thuốc<br /><em>phía sau mỗi toa thuốc.</em></>}
        text="Bác sĩ thật, có mã chứng chỉ hành nghề, luôn có quyền từ chối kê đơn khi điều đó an toàn hơn cho bạn."
      />
      <div className="doctor-row">
        {doctors.slice(0, 5).map((d, i) => <DoctorCard key={d.full_name} d={d} i={i} live={live} />)}
      </div>
    </section>
  )
}

// ============================================================
// Lịch bác sĩ trực — lịch 7 ngày + số chỗ còn trống
// ============================================================
const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
const WEEKDAY = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })

function demoSlots(): Slot[] {
  // Lịch minh họa khi không kết nối được máy chủ — hiển thị rõ nhãn "minh họa"
  const base = new Date()
  const plan: [number, number, number, number, number][] = [[0, 19, 0, 2, 1], [1, 8, 0, 0, 3], [1, 14, 4, 3, 2], [2, 9, 1, 1, 2], [3, 18, 2, 2, 2], [4, 8, 3, 0, 3], [5, 10, 0, 1, 2], [6, 15, 1, 2, 2]]
  return plan.map(([day, hour, di, booked, cap], idx) => {
    const d = new Date(base)
    d.setDate(d.getDate() + day)
    d.setHours(hour, 30, 0, 0)
    if (d < base) d.setHours(base.getHours() + 2, 0, 0, 0)
    const doc = FALLBACK_DOCTORS[di]
    return { id: -idx - 1, starts_at: d.toISOString(), duration_min: 30, capacity: cap, booked: Math.min(booked, cap), seats_left: Math.max(0, cap - booked), doctor_name: doc.full_name, doctor_specialty: doc.doctor_specialty, avatar_url: doc.avatar_url }
  })
}

function Seats({ cap, left }: { cap: number; left: number }) {
  return (
    <span className={`seats ${left === 0 ? 'full' : left === 1 ? 'low' : ''}`}>
      <span className="seat-dots">{Array.from({ length: cap }, (_, i) => <i key={i} className={i < cap - left ? 'taken' : ''} />)}</span>
      {left === 0 ? 'Hết chỗ' : `Còn ${left}/${cap} chỗ`}
    </span>
  )
}

function Schedule({ onlineCount }: { onlineCount: number | null }) {
  const [slots, setSlots] = useState<Slot[] | null>(null)
  const [demo, setDemo] = useState(false)
  const [day, setDay] = useState(0)
  const [open, setOpen] = useState<number | null>(null)

  useEffect(() => {
    api('/catalog/schedule')
      .then((d) => setSlots(d.slots || []))
      .catch(() => { setSlots(demoSlots()); setDemo(true) })
  }, [])

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() + i); return d }), [])
  const byDay = useMemo(() => {
    const m = new Map<string, Slot[]>()
    ;(slots || []).forEach((s) => { const k = dayKey(new Date(s.starts_at)); m.set(k, [...(m.get(k) || []), s]) })
    return m
  }, [slots])
  const list = byDay.get(dayKey(days[day])) || []

  return (
    <section className="sec schedule" id="lich-truc">
      <SectionHead
        kicker="Lịch bác sĩ trực"
        title={<>Chọn một khung giờ<br /><em>thật thong thả.</em></>}
        text="Khám ngay khi có bác sĩ trực tuyến, hoặc đặt trước khung giờ hẹn — lượt hẹn luôn được ưu tiên trước lượt chờ tại quầy."
      />
      <div className="cal" data-reveal>
        <div className="cal-days" role="tablist" aria-label="Chọn ngày">
          {days.map((d, i) => {
            const count = (byDay.get(dayKey(d)) || []).length
            return (
              <button key={i} role="tab" type="button" aria-selected={i === day} className={i === day ? 'on' : ''} onClick={() => { setDay(i); setOpen(null) }}>
                <span>{i === 0 ? 'Hôm nay' : WEEKDAY[d.getDay()]}</span>
                <b>{d.getDate()}</b>
                <small>{String(d.getMonth() + 1).padStart(2, '0')}</small>
                <em className="cal-dots">{Array.from({ length: Math.min(count, 3) }, (_, k) => <i key={k} />)}</em>
              </button>
            )
          })}
        </div>

        <div className="cal-body" key={day}>
          {day === 0 && (
            <div className="slot walkin">
              <div className="slot-row static">
                <span className="slot-time"><b>Ngay</b><small>không cần hẹn</small></span>
                <span className="slot-doc"><span className="walkin-ic"><Users size={18} /></span><span><b>Khám ngay tại quầy</b><small>Bác sĩ đang trực tuyến nhận lượt theo thứ tự</small></span></span>
                <span className={`seats ${onlineCount ? '' : 'full'}`}><span className="live-dot" />{onlineCount ? `${onlineCount} bác sĩ trực tuyến` : 'Chưa có bác sĩ trực'}</span>
                <Link className="slot-cta" to="/auth">Bắt đầu <ArrowRight size={15} /></Link>
              </div>
            </div>
          )}

          {slots == null && <div className="cal-empty"><span className="loader" /> Đang tải lịch trực…</div>}
          {slots != null && list.length === 0 && (
            <div className="cal-empty"><CalendarDays size={20} /> Chưa có khung giờ hẹn trong ngày này. {day === 0 ? 'Bạn vẫn có thể khám ngay khi có bác sĩ trực tuyến.' : 'Hãy chọn ngày khác hoặc khám ngay tại quầy.'}</div>
          )}

          {list.map((s) => {
            const isOpen = open === s.id
            return (
              <div className={`slot ${isOpen ? 'is-open' : ''} ${s.seats_left === 0 ? 'is-full' : ''}`} key={s.id}>
                <button type="button" className="slot-row" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : s.id)}>
                  <span className="slot-time"><b>{fmtTime(s.starts_at)}</b><small>{s.duration_min} phút</small></span>
                  <span className="slot-doc">
                    <img src={s.avatar_url || '/assets/doctors/dr-minh.jpg'} alt="" />
                    <span><b>{s.doctor_name}</b><small>{s.doctor_specialty}</small></span>
                  </span>
                  <Seats cap={s.capacity} left={s.seats_left} />
                  <ChevronDown className="slot-chev" size={18} />
                </button>
                <div className="slot-more">
                  <div className="slot-more-inner">
                    <div><span className="lbl"><MapPin size={14} /> Phòng khám</span><p>Phòng khám từ xa BriMed — gọi video ngắn ngay tại quầy nhà thuốc đối tác bạn chọn.</p></div>
                    <div>
                      <span className="lbl"><ShieldCheck size={14} /> Điều kiện đặt chỗ</span>
                      <ul>
                        <li>Triệu chứng thuộc danh mục khám từ xa TT 30/2023</li>
                        <li>Không có dấu hiệu cờ đỏ (khó thở, sốt cao &gt; 3 ngày…)</li>
                        <li>Thanh toán 25.000đ qua VietQR — chỗ được giữ 15 phút</li>
                      </ul>
                    </div>
                    <div className="slot-more-cta">
                      {s.doctor_license && <small>CCHN: {s.doctor_license}</small>}
                      {s.seats_left > 0
                        ? <Link className="btn-soft btn-sm" to="/auth">Đặt chỗ <ArrowRight size={15} /></Link>
                        : <span className="full-note">Khung giờ đã kín — chọn khung khác nhé</span>}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
          {demo && <p className="cal-note"><Sparkles size={14} /> Lịch minh họa — kết nối máy chủ để xem lịch trực thời gian thực.</p>}
        </div>
      </div>
    </section>
  )
}

// ============================================================
// Lần đầu dùng BriMed — form thu thông tin nổi bật
// ============================================================
function FirstVisit({ submitLead }: { submitLead: (form: LeadForm) => Promise<string> }) {
  const [form, setForm] = useState({ full_name: '', phone: '', interest: LEAD_INTERESTS[0] })
  const [done, setDone] = useState<string | null>(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setErr('')
    try {
      setDone(await submitLead(form))
      setForm({ full_name: '', phone: '', interest: LEAD_INTERESTS[0] })
    } catch (ex: any) {
      setErr(ex.message || 'Không gửi được thông tin, bạn thử lại giúp mình nhé.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="sec first" id="lan-dau">
      <div className="first-card" data-reveal>
        <div className="first-glow" aria-hidden="true"><i /><i /></div>
        <div className="first-copy">
          <span className="kicker light"><i />Lần đầu dùng BriMed?</span>
          <h2>Để BriMed cùng bạn<br /><em>bước đầu tiên.</em></h2>
          <p>{CUSTOMER_LEAD_NOTE.desc}</p>
          <ul>
            <li><Check size={16} /> Danh sách nhà thuốc gần nhất có mã QR BriMed</li>
            <li><Check size={16} /> Hướng dẫn sử dụng từ A đến Z — hoàn toàn miễn phí</li>
            <li><Check size={16} /> Không quảng cáo, không spam</li>
          </ul>
        </div>
        <div className="first-form-wrap">
          {done ? (
            <div className="first-done" role="status">
              <svg viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="24" /><path d="M15 27 L23 35 L38 18" /></svg>
              <h3>Đã nhận thông tin!</h3>
              <p>{done}</p>
              <button type="button" className="btn-quiet" onClick={() => setDone(null)}>Gửi thêm thông tin</button>
            </div>
          ) : (
            <form className="first-form" onSubmit={submit}>
              <h3>{CUSTOMER_LEAD_NOTE.title}</h3>
              <label>
                <span>Họ tên</span>
                <input required placeholder="Nguyễn Thị Lan" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
              </label>
              <label>
                <span>Số điện thoại / Zalo</span>
                <input required placeholder="09xx xxx xxx" inputMode="tel" pattern="0\d{9}" title="10 số, bắt đầu bằng 0" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\s/g, '') })} />
              </label>
              <fieldset>
                <legend>Bạn quan tâm</legend>
                <div className="chips">
                  {LEAD_INTERESTS.map((it) => (
                    <button type="button" key={it} className={form.interest === it ? 'on' : ''} aria-pressed={form.interest === it} onClick={() => setForm({ ...form, interest: it })}>{it}</button>
                  ))}
                </div>
              </fieldset>
              <button className="btn-breathe full" type="submit" disabled={busy}>{busy ? 'Đang gửi…' : <>Nhận hướng dẫn miễn phí <ArrowRight size={17} /></>}</button>
              {err && <p className="form-err">{err}</p>}
            </form>
          )}
        </div>
      </div>
    </section>
  )
}

// ============================================================
// Chi phí & an toàn
// ============================================================
function VietQrArt() {
  const cells = useMemo(() => {
    let s = 7919
    const rand = () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296 }
    const n = 21
    const g: boolean[][] = Array.from({ length: n }, () => Array.from({ length: n }, () => rand() > 0.52))
    const finder = (r0: number, c0: number) => {
      for (let r = 0; r < 7; r++) for (let c = 0; c < 7; c++) g[r0 + r][c0 + c] = r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4)
    }
    finder(0, 0); finder(0, 14); finder(14, 0)
    return g
  }, [])
  return (
    <svg viewBox="0 0 105 105" role="img" aria-label="Mã VietQR mẫu thanh toán phí khám">
      <rect width="105" height="105" fill="#fff" />
      {cells.map((row, r) => row.map((on, c) => on ? <rect key={`${r}-${c}`} x={c * 5} y={r * 5} width="5" height="5" fill="#10244b" /> : null))}
    </svg>
  )
}

function Pricing() {
  const patientPlans = [
    {
      name: "LƯỢT LẺ",
      desc: "Khám khi cần",
      price: "25.000",
      unit: "đ/lượt",
      note: "Trả theo từng lượt khám",
      bullets: [
        "Quét mã QR ngay tại nhà thuốc",
        "Không cần tải app",
      ],
      features: [
        "Tư vấn với bác sĩ trực tuyến",
        "Nhận toa thuốc điện tử",
        "Lưu lịch sử khám và toa thuốc",
        "Bảo mật thông tin sức khỏe",
      ],
      footer: "1 lượt khám · thanh toán nhanh qua QR",
    },
    {
      name: "COMBO 3 LƯỢT",
      desc: "Tiết kiệm cho cả gia đình",
      price: "69.000",
      unit: "đ/combo",
      note: "Chỉ 23.000 đ/lượt",
      saving: "Tiết kiệm 6.000 đ",
      popular: true,
      bullets: [
        "Quét mã QR ngay tại nhà thuốc",
        "Không cần tải app",
      ],
      features: [
        "Toàn bộ quyền lợi của lượt lẻ",
        "Dùng cho bản thân và người thân",
        "Ưu tiên gặp bác sĩ, ít chờ hơn",
        "Nhắc uống thuốc và tái khám qua Zalo",
        "Hạn sử dụng 12 tháng",
      ],
      footer: "3 lượt khám · hạn dùng 12 tháng",
    },
  ];

  return (
    <section className="sec pricing brimed-pricing" id="chi-phi">
      <div className="bp-patient-intro">
        <h2>
          Tư vấn bác sĩ, <span>an tâm dùng thuốc.</span>
        </h2>
        <p>
          Quét mã QR tại nhà thuốc đối tác để gặp bác sĩ trực tuyến, nhận tư
          vấn và toa thuốc phù hợp.
        </p>
      </div>

      <div className="bp-subheading">
        <h3>Bảng giá dành cho người bệnh</h3>
        <p>Chọn lượt khám riêng lẻ hoặc combo tiết kiệm.</p>
      </div>

      <div className="bp-patient-grid">
        {patientPlans.map((plan) => (
          <article
            className={`bp-card bp-patient-card ${
              plan.popular ? "bp-featured" : ""
            }`}
            key={plan.name}
          >
            {plan.popular && <span className="bp-ribbon">Phổ biến</span>}

            <h4>{plan.name}</h4>
            <p className="bp-desc">{plan.desc}</p>

            <div className="bp-price">
              <strong>{plan.price}</strong>
              <span>{plan.unit}</span>
            </div>

            <p className="bp-note">{plan.note}</p>
            {plan.saving && <span className="bp-saving">{plan.saving}</span>}

            <ul className="bp-bullets">
              {plan.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>

            <div className="bp-divider" />
            <h5>Bao gồm</h5>
            <ul className="bp-features">
              {plan.features.map((feature) => (
                <li key={feature}>
                  <span>✓</span> {feature}
                </li>
              ))}
            </ul>

            <p className="bp-card-footer">{plan.footer}</p>
          </article>
        ))}
      </div>

      <div className="bp-promo">
        <span className="bp-percent">%</span>
        <p>
          <strong>Khách mới được miễn phí lượt khám đầu tiên</strong> trong 2
          tháng đầu khi nhà thuốc bắt đầu hợp tác với BriMed.
        </p>
      </div>

      <div className="bp-trust">
        <span>✓ Không cần tải app</span>
        <span>✓ Bảo mật thông tin</span>
        <span>✓ Nhanh chóng, minh bạch</span>
      </div>
    </section>
  );
}


function Faq() {
  const [open, setOpen] = useState(0)
  return (
    <section className="sec faq" id="faq">
      <SectionHead kicker="Giải đáp nhanh" title={<>Bạn hỏi,<br /><em>BriMed trả lời.</em></>} />
      <div className="faq-list">
        {CUSTOMER_FAQ.map((f, i) => (
          <article className={`faq-item ${open === i ? 'open' : ''}`} key={f.q} data-reveal style={v({ '--d': `${i * 70}ms` })}>
            <button type="button" onClick={() => setOpen(open === i ? -1 : i)} aria-expanded={open === i}>
              <span>{f.q}</span><i aria-hidden="true" />
            </button>
            <div className="faq-a"><div><p>{f.a}</p></div></div>
          </article>
        ))}
      </div>
    </section>
  )
}

function FinalCta() {
  return (
    <section className="sec final">
      <div className="final-orb" aria-hidden="true"><i /><i /><i /></div>
      <div className="final-inner">
        <span className="kicker" data-reveal><i />Bắt đầu thật dễ dàng</span>
        <h2 data-reveal style={v({ '--d': '100ms' })}>Hít một hơi thật sâu.<br /><em>Phần còn lại, để BriMed lo.</em></h2>
        <p data-reveal style={v({ '--d': '200ms' })}>Mở camera điện thoại và quét mã BriMed tại nhà thuốc đối tác gần bạn.</p>
        <div className="final-cta" data-reveal style={v({ '--d': '300ms' })}>
          <Link className="btn-breathe" to="/auth"><QrCode size={19} /> Bắt đầu tư vấn</Link>
          <Link className="btn-quiet" to="/cho-nha-thuoc">Dành cho nhà thuốc <ArrowRight size={16} /></Link>
          <Link className="btn-quiet" to="/cho-bac-si">Dành cho bác sĩ <ArrowRight size={16} /></Link>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="lp-footer">
      <div className="lp-footer-grid">
        <div>
          <Link to="/" aria-label="BriMed - Trang chủ"><img className="footer-logo" src="/assets/brimed-logo.png" alt="BriMed — Since 2026" /></Link>
          <p>Đơn thuốc an toàn cho bạn an tâm — kết nối Bệnh nhân, Bác sĩ và Nhà thuốc với toa thuốc điện tử nhanh tại quầy.</p>
        </div>
        <div>
          <strong>Dịch vụ</strong>
          <a href="#quy-trinh">Cách hoạt động</a>
          <a href="#lich-truc">Lịch bác sĩ trực</a>
          <a href="#chi-phi">Chi phí</a>
          <a href="#faq">Câu hỏi thường gặp</a>
        </div>
        <div>
          <strong>Nhà thuốc</strong>
          <Link to="/cho-nha-thuoc">Trang dành cho nhà thuốc</Link>
          <Link to="/nha-thuoc-doi-tac">Đăng ký đối tác</Link>
          <Link to="/goi-1-thang-brimed-nha-thuoc">6 tháng đầu — 500.000đ/tháng</Link>
          <Link to="/goi-3-thang-brimed-nha-thuoc">Sau 6 tháng đầu — 900.000đ/tháng</Link>
        </div>
        <div>
          <strong>Bác sĩ</strong>
          <Link to="/cho-bac-si">Trang dành cho bác sĩ</Link>
          <Link to="/auth">Mở tài khoản nhận ca trực</Link>
          <span>Thù lao 15.000đ/lượt khám</span>
        </div>
        <div>
          <strong>Hỗ trợ</strong>
          <a href="tel:19002026">Hotline: 1900 2026</a>
          <a href="mailto:sharkvision.co.work@gmail.com">sharkvision.co.work@gmail.com</a>
          <span>Khẩn cấp gọi 115 — BriMed không thay thế cấp cứu</span>
        </div>
      </div>
      <div className="lp-copy">© 2026 BriMed. Tư vấn trực tuyến không thay thế chăm sóc y tế khẩn cấp. · Bác sĩ thật — đơn thật — luôn có quyền từ chối kê đơn vì an toàn của bạn.</div>
    </footer>
  )
}

// ============================================================
// Trang
// ============================================================
const INTRO_KEY = 'brimed_intro_seen'
const SOUND_KEY = 'brimed_chime'

export default function Landing({ submitLead }: { submitLead: (form: LeadForm) => Promise<string> }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const skipIntro = useMemo(() => reducedMotion() || sessionStorage.getItem(INTRO_KEY) === '1', [])
  const [showIntro, setShowIntro] = useState(!skipIntro)
  const [ready, setReady] = useState(skipIntro)
  const [scrolled, setScrolled] = useState(false)
  const [soundOn, setSoundOn] = useState(() => localStorage.getItem(SOUND_KEY) === 'on')
  const chimed = useRef(false)
  const [doctors, setDoctors] = useState<Doctor[]>(FALLBACK_DOCTORS)
  const [live, setLive] = useState(false)
  const [onlineCount, setOnlineCount] = useState<number | null>(null)

  useReveal(rootRef)

  useEffect(() => {
    api('/auth/doctors')
      .then((d) => {
        const list: Doctor[] = (d.doctors || []).map((x: any) => ({ ...x, avatar_url: x.avatar_url || '' }))
        if (list.length) { setDoctors(list); setLive(true) }
        setOnlineCount(list.filter((x) => x.doctor_online).length)
      })
      .catch(() => {})
  }, [])

  // Khóa cuộn trong màn mở đầu
  useEffect(() => {
    if (!showIntro) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [showIntro])

  useEffect(() => {
    document.documentElement.style.scrollBehavior = 'smooth'
    return () => { document.documentElement.style.scrollBehavior = '' }
  }, [])

  // Tiến trình cuộn + parallax tia nắng + chuông lần cuộn đầu
  useEffect(() => {
    let raf = 0
    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        const y = window.scrollY
        const max = document.documentElement.scrollHeight - window.innerHeight
        rootRef.current?.style.setProperty('--progress', String(max > 0 ? y / max : 0))
        rootRef.current?.style.setProperty('--sy', `${Math.min(y, 1200)}`)
        setScrolled(y > 24)
      })
      if (!chimed.current && localStorage.getItem(SOUND_KEY) === 'on' && window.scrollY > 40) {
        chimed.current = true
        playChime()
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf) }
  }, [])

  const toggleSound = () => {
    const next = !soundOn
    setSoundOn(next)
    localStorage.setItem(SOUND_KEY, next ? 'on' : 'off')
    if (next && !chimed.current) { chimed.current = true; playChime() }
  }

  const onReveal = useCallback(() => setReady(true), [])
  const onIntroDone = useCallback(() => { setShowIntro(false); sessionStorage.setItem(INTRO_KEY, '1') }, [])

  return (
    <div className={`lp2 ${ready ? 'is-ready' : ''}`} ref={rootRef}>
      {showIntro && <Intro onReveal={onReveal} onDone={onIntroDone} />}
      <div className="scroll-progress" aria-hidden="true"><i /></div>
      <div className="paper" aria-hidden="true" />
      <Header scrolled={scrolled} soundOn={soundOn} onToggleSound={toggleSound} />
      <main>
        <Hero ready={ready} onlineCount={onlineCount} />
        <ConditionRibbon />
        <Practices />
        <Process />
        <Doctors doctors={doctors} live={live} />
        <Schedule onlineCount={onlineCount} />
        <FirstVisit submitLead={submitLead} />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </div>
  )
}
  
