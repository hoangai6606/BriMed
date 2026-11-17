import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Stethoscope, CalendarClock, ShieldCheck, Check, ArrowRight, Video, Phone, Timer,
  ClipboardList, BadgeCheck, HandCoins, Leaf, Pill, Ban,
} from 'lucide-react'
import { SeoMeta } from '../components/common/SeoMeta'
import { SectionHead, SplitWords, CountUp, useReveal, TypeQuote, RoleSwitch, v } from '../components/landing/Landing'
import {
  SceneSchedule, SceneConsult, SceneRx, SceneSearch, Capsule, Tablet, CrossMark, LeafSprig,
} from '../components/landing/Illustrations'
import { CONDITIONS } from '../components/landing/Landing'
import '../components/landing/landing.css'

// =====================================================================
// Landing dành cho BÁC SĨ — cùng master concept "Calm Care" với trang
// khách hàng: ca trực theo slot, gọi ngắn 1–2 phút, thù lao minh bạch
// theo lượt khám, khám đúng danh mục TT 30/2023/TT-BYT.
// =====================================================================

const NAV = [
  ['#doiTac', 'Đồng hành'], ['#quy-trinh', 'Ca trực'], ['#thu-lao', 'Thù lao'],
  ['#dong-hanh', 'Lời ngành'], ['#faq', 'Hỏi đáp'],
]

const PRACTICES = [
  {
    key: 'slot', Scene: SceneSchedule, tag: 'Slot 30 phút, tự chọn', title: 'Trực theo khung giờ bạn chọn',
    text: 'Mở lịch trực 30 phút mỗi slot, nhận lượt ngay khi rảnh — không ca gác cứng, không phải trực cả buổi chỉ để chờ bệnh nhân.',
    icon: CalendarClock,
  },
  {
    key: 'call', Scene: SceneConsult, tag: 'Gọi ngắn 1–2 phút', title: 'Hỏi bệnh đủ — không kéo dài',
    text: 'Form sàng lọc TT 30/2023 đã lọc sẵn triệu chứng, cờ đỏ được cảnh báo trước khi bạn gọi. Mỗi lượt chỉ mất 1–2 phút của bạn.',
    icon: Video,
  },
  {
    key: 'rx', Scene: SceneRx, tag: 'Ký số TT 26/2025', title: 'Kê đơn có kiểm soát — được quyền từ chối',
    text: 'Toa ký số phát hành theo TT 26/2025/TT-BYT. Hệ thống cảnh báo kháng sinh ở ngưỡng 30% — và bạn luôn có quyền từ chối kê đơn vì an toàn.',
    icon: ShieldCheck,
  },
  {
    key: 'pay', Scene: SceneSearch, tag: 'Minh bạch từng lượt', title: 'Thù lao 15.000đ mỗi lượt thành công',
    text: 'Bệnh nhân trả 25.000đ/lượt: 15.000đ thuộc về bạn, ghi nhận ngay khi toa được cấp. Không phí tham gia, không giới hạn số lượt.',
    icon: HandCoins,
  },
]

const STEPS = [
  { title: 'Bật trạng thái trực tuyến', text: 'Đăng nhập, bật trực — tên và chuyên khoa của bạn hiển thị với bệnh nhân tại quầy thuốc.' },
  { title: 'Nhận lượt từ hàng đợi', text: 'Mỗi lượt đã thanh toán phí hiện trong hàng đợi kèm cam kết SLA ≤ 5 phút. Hồ sơ bệnh nhân chỉ hiển thị khi họ đồng ý.' },
  { title: 'Gọi video ngắn 1–2 phút', text: 'Form sàng lọc có sẵn: triệu chứng, thời gian mắc, cờ đỏ. Bạn hỏi thêm đúng điều cần — không paperwork.' },
  { title: 'Kê đơn ký số hoặc từ chối', text: 'Kê đơn trong danh mục cho phép, hệ thống cảnh báo kháng sinh tự động. Cần khám trực tiếp? Từ chối kèm lý do — hoàn phí cho bệnh nhân.' },
  { title: 'Thù lao tích lũy theo toa', text: '15.000đ/toa ghi nhận ngay khi phát hành. Đối soát trong tài khoản bác sĩ, chi trả định kỳ hàng tháng.' },
]

const DOCTOR_FAQ = [
  { q: 'Tôi cần gì để nhận ca trực?', a: 'CCHN còn hiệu lực thuộc chuyên khoa phù hợp danh mục khám từ xa (nội tổng quát, TMH, da liễu, hô hấp…). BriMed xác minh giấy phép trước khi mở tài khoản bác sĩ — phòng khám đối tác có giấy phép hoạt động.' },
  { q: 'Ca trực có bị ràng buộc thời gian không?', a: 'Không. Bạn tự mở khung slot 30 phút theo lịch của mình. Khi ngoài slot, trạng thái chuyển sang "ngoại tuyến" và không có lượt mới đến với bạn.' },
  { q: 'Thù lao chi trả như thế nào?', a: '15.000đ cho mỗi lượt khám thành công (bệnh nhân trả 25.000đ/lượt qua VietQR). Thù lao ghi nhận ngay khi toa ký số được phát hành, đối soát và chi trả định kỳ hàng tháng.' },
  { q: 'Trách nhiệm pháp lý của tôi ra sao?', a: 'Bạn chỉ khám trong danh mục bệnh được phép khám từ xa theo TT 30/2023/TT-BYT. Toa ký số theo TT 26/2025, mọi yêu cầu truy xuất có hồ sơ sàng lọc và ghi chú cuộc gọi kèm theo.' },
  { q: 'Khi nào tôi nên từ chối kê đơn?', a: 'Mọi dấu hiệu cờ đỏ: khó thở, sốt cao quá 3 ngày, trẻ dưới 6 tuổi, thai phụ… Hệ thống đã cảnh báo sẵn cho bạn. Từ chối kèm lý do — bệnh nhân được hoàn phí và hướng dẫn đến cơ sở y tế gần nhất.' },
  { q: 'Tôi cần thiết bị gì?', a: 'Một điện thoại hoặc laptop có camera, micro và kết nối ổn định. Toàn bộ diễn ra trong trình duyệt — không cần cài phần mềm quản lý nào.' },
]

function Header({ scrolled }: { scrolled: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <header className={`lp-header ${scrolled ? 'is-scrolled' : ''} ${open ? 'is-open' : ''}`}>
      <div className="lp-header-inner">
        <Link className="lp-brand" to="/" aria-label="BriMed - Trang chủ">
          <img src="/assets/brimed-icon.png" alt="" />
          <span>Bri<b>Med</b></span>
        </Link>
        <nav className="lp-nav" aria-label="Điều hướng bác sĩ">
          {NAV.map(([href, label]) => <a key={href} href={href} onClick={() => setOpen(false)}>{label}</a>)}
        </nav>
        <div className="lp-header-actions">
          <RoleSwitch current="doctor" />
          <Link className="lp-login" to="/auth">Đăng nhập</Link>
          <Link className="btn-soft btn-sm" to="/auth"><Stethoscope size={16} /> Nhận ca trực</Link>
          <button type="button" className="lp-burger" aria-label="Mở menu" aria-expanded={open} onClick={() => setOpen(!open)}><i /><i /></button>
        </div>
      </div>
    </header>
  )
}

function Hero({ ready }: { ready: boolean }) {
  return (
    <section className={`hero ${ready ? 'is-ready' : ''}`} id="top">
      <div className="hero-beams" aria-hidden="true"><i /><i /><i /><i /></div>
      <div className="hero-motes" aria-hidden="true">{Array.from({ length: 14 }, (_, i) => <i key={i} style={v({ '--m': i })} />)}</div>

      <div className="hero-copy">
        <p className="hero-eyebrow">
          <span className="live-dot" />
          Dành cho bác sĩ · Trực theo khung giờ bạn chọn
          <span className="sep" /> Phòng khám từ xa BriMed
        </p>
        <h1 className="hero-title">
          <span className="line"><SplitWords text="Hai phút của bạn," start={250} /></span>
          <span className="line accent"><SplitWords text="an tâm của một người." start={560} /></span>
        </h1>
        <p className="hero-lede">
          Bệnh nhân tại quầy thuốc đã được sàng lọc, đã thanh toán, đang chờ — bạn chỉ cần
          một cuộc gọi ngắn và một toa ký số. Trực linh hoạt, thù lao minh bạch từng lượt.
        </p>
        <div className="hero-cta">
          <Link className="btn-breathe" to="/auth"><Stethoscope size={19} /> Đăng ký nhận ca trực <small>15.000đ/lượt</small></Link>
          <a className="btn-quiet" href="#quy-trinh"><Timer size={18} /> Xem một ca trực đi như thế nào</a>
        </div>
        <dl className="hero-stats">
          <div><dt><CountUp to={15} run={ready} /><small>.000đ</small></dt><dd>thù lao mỗi lượt khám thành công</dd></div>
          <div><dt>1–2 <small>phút</small></dt><dd>cho mỗi cuộc gọi hỏi bệnh</dd></div>
          <div><dt><CountUp to={5} run={ready} /><small> phút</small></dt><dd>cam kết SLA từ lúc nhận lượt đến khi gọi</dd></div>
        </dl>
      </div>

      <div className="hero-visual">
        <div className="breath" aria-hidden="true">
          <span className="breath-ring r1" /><span className="breath-ring r2" /><span className="breath-ring r3" />
        </div>
        <figure className="breath-window kb">
          <SceneSchedule />
          <span className="window-light" aria-hidden="true" />
        </figure>
        <div className="breath-guide" aria-hidden="true"><span className="in">Hít vào…</span><span className="out">Thở ra…</span></div>

        <div className="hero-chip chip-a"><span className="chip-ic"><ShieldCheck size={18} /></span><div><b>Khám đúng danh mục</b><small>TT 30/2023/TT-BYT</small></div></div>
        <div className="hero-chip chip-b"><span className="chip-ic pink"><BadgeCheck size={18} /></span><div><b>CCHN được xác minh</b><small>Phòng khám đối tác có giấy phép</small></div></div>

        <Capsule className="float-deco deco-capsule" />
        <Tablet className="float-deco deco-tablet" />
        <CrossMark className="float-deco deco-cross" />
        <LeafSprig className="float-deco deco-leaf" />
      </div>

      <a className="scroll-cue" href="#doiTac" aria-label="Cuộn xuống phần đồng hành"><span /> Cuộn nhẹ</a>
    </section>
  )
}

function ConditionRibbon() {
  const items = [...CONDITIONS, ...CONDITIONS]
  return (
    <div className="ribbon" aria-label="Nhóm bệnh được phép khám từ xa theo TT 30/2023">
      <div className="ribbon-track">
        {items.map((c, i) => <span key={i} aria-hidden={i >= CONDITIONS.length}><Leaf size={14} /> {c}</span>)}
      </div>
    </div>
  )
}

function Practices() {
  return (
    <section className="sec practices" id="doiTac">
      <SectionHead
        kicker="Bốn cách BriMed đồng hành cùng bạn"
        title={<>Nghề của bạn,<br /><em>nhịp của riêng bạn.</em></>}
        text="Không thay đổi cách bạn khám — BriMed chỉ mang bệnh nhân đã được sàng lọc đến đúng lúc bạn rảnh."
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

// Màn hình điện thoại mô phỏng hành trình của BÁC SĨ
function PhoneScreens({ active }: { active: number }) {
  return (
    <div className="phone" aria-hidden="true">
      <div className="phone-notch" />
      <div className="phone-screen">
        <div className="phone-bar"><span>BriMed · BS</span><span>9:41</span></div>
        <div className={`ps ps-qr ${active === 0 ? 'on' : ''}`}>
          <div className="qr-frame"><span className="standee-mini"><Stethoscope size={44} strokeWidth={1.2} /></span><i className="scanline" /></div>
          <b>Bật trạng thái trực</b><small>BS. Nguyễn Văn Minh · Nội tổng quát</small>
        </div>
        <div className={`ps ps-form ${active === 1 ? 'on' : ''}`}>
          <b>Hàng đợi — SLA 5 phút</b>
          {[['Bệnh nhân', 'Nguyễn Thị Lan'], ['Nhóm bệnh', 'Viêm mũi họng'], ['Cờ đỏ', 'Không'], ['Phí khám', 'Đã thanh toán']].map(([k, val], i) => (
            <div className="field" key={k} style={v({ '--i': i })}><span>{k}</span><em>{val}</em><Check size={14} /></div>
          ))}
          <div className="ok-flag"><ClipboardList size={14} /> 2 lượt đang chờ nhận</div>
        </div>
        <div className={`ps ps-call ${active === 2 ? 'on' : ''}`}>
          <div className="call-avatar"><img src="/assets/doctors/dr-minh.jpg" alt="" /><i /><i /></div>
          <b>Đang gọi · 01:12</b><small>Viêm mũi họng 2 ngày · không sốt</small>
          <div className="call-timer"><span className="rec" /> 01:12</div>
          <div className="call-actions"><span className="end"><Phone size={16} /></span><span><Video size={16} /></span></div>
        </div>
        <div className={`ps ps-rx ${active === 3 ? 'on' : ''}`}>
          <div className="rx-card">
            <div className="rx-head"><span>Rx</span><em>VN-Rx-2026-08142</em></div>
            {[['Paracetamol 500mg', 'Sáng · Tối'], ['Loratadin 10mg', 'Tối']].map(([n, t], i) => (
              <div className="rx-line" key={n} style={v({ '--i': i })}><Pill size={14} /><span>{n}</span><small>{t}</small></div>
            ))}
            <div className="rx-signed"><ShieldCheck size={14} /> Đã ký số · +15.000đ</div>
          </div>
        </div>
        <div className={`ps ps-done ${active === 4 ? 'on' : ''}`}>
          <div className="done-bag"><HandCoins size={44} strokeWidth={1.4} /><i><Check size={14} /></i></div>
          <b>Hôm nay: 14 toa</b><small>Thù lao +210.000đ · đối soát cuối tháng</small>
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
          <SectionHead align="left" kicker="Một ca trực đi như thế nào" title={<>Năm bước,<br /><em>chưa kịp cạn chén trà.</em></>} text="Bệnh nhân đã được sàng lọc và thanh toán trước khi đến với bạn — phần còn lại chỉ là lắng nghe và quyết định nghề nghiệp." />
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

const DOCTOR_QUOTES = [
  {
    name: 'BS. Nguyễn Văn Minh', spec: 'Nội tổng quát · trực sáng', avatar: '/assets/doctors/dr-minh.jpg',
    why: 'Một lời dặn đúng đáng giá hơn nửa ngày xếp hàng. Ở đây tôi gặp đúng người, đúng triệu chứng, đúng hai phút — và toàn bộ hồ sơ có người giữ.',
  },
  {
    name: 'BS. Trần Thị Thu Hà', spec: 'Tai Mũi Họng · trực chiều', avatar: '/assets/doctors/dr-ha.jpg',
    why: 'Một cơn viêm họng không đáng để người bệnh xếp hàng ba tiếng — nhưng luôn đáng được khám cho đúng. BriMed giúp tôi giữ được điều đó mỗi ngày.',
  },
  {
    name: 'BS. Lê Hoàng Sơn', spec: 'Da Liễu · tối thứ 3 & 5', avatar: '/assets/doctors/dr-son.jpg',
    why: 'Da là thứ người ta hay tự chữa nhất. Tôi ở đây để bạn không phải tự đoán — hai buổi tối mỗi tuần, không ảnh hưởng giờ phòng khám của tôi.',
  },
]

function QuoteCard({ q, i }: { q: typeof DOCTOR_QUOTES[number]; i: number }) {
  const [active, setActive] = useState(false)
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    if (!window.matchMedia('(hover: none)').matches || !ref.current || !('IntersectionObserver' in window)) return
    const io = new IntersectionObserver(([e]) => setActive(e.isIntersecting), { threshold: 0.6 })
    io.observe(ref.current)
    return () => io.disconnect()
  }, [])
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
        <img src={q.avatar} alt={q.name} loading="lazy" />
      </figure>
      <div className="doctor-body">
        <h3>{q.name}</h3>
        <p className="doctor-spec"><Stethoscope size={14} /> {q.spec}</p>
        <TypeQuote text={q.why} active={active} />
      </div>
    </article>
  )
}

function Quotes() {
  return (
    <section className="sec doctors" id="dong-hanh">
      <SectionHead
        kicker="Lời ngành"
        title={<>Vì sao các thầy thuốc<br /><em>ở lại với BriMed.</em></>}
        text="Bác sĩ thật, có mã chứng chỉ hành nghề — và luôn có quyền từ chối kê đơn khi điều đó an toàn hơn cho người bệnh."
      />
      <div className="doctor-row">
        {DOCTOR_QUOTES.map((q, i) => <QuoteCard key={q.name} q={q} i={i} />)}
      </div>
    </section>
  )
}

function Fee() {
  return (
    <section className="sec pricing" id="thu-lao">
      <SectionHead kicker="Thù lao minh bạch" title={<>Mỗi lượt khám,<br /><em>một con số rõ ràng.</em></>} text="Không phí tham gia, không phí nền tảng — bạn chỉ nhận thù lao cho những lượt khám mình thực sự hoàn thành." />
      <div className="price-layout">
        <article className="price-main" data-reveal>
          <span className="price-label">Thù lao mỗi lượt khám thành công</span>
          <div className="price-num"><b>15.000</b><span>đ</span></div>
          <div className="price-split" aria-label="Phân bổ phí khám 25.000đ">
            <div style={v({ '--w': '60%' })}><i /><span>Bác sĩ 15.000đ</span></div>
            <div style={v({ '--w': '40%' })} className="pink"><i /><span>BriMed 10.000đ (gồm GTGT)</span></div>
          </div>
          <ul>
            <li><Check size={16} /> Ghi nhận ngay khi toa ký số được phát hành</li>
            <li><Check size={16} /> Không giới hạn số lượt nhận trong khung trực</li>
            <li><Check size={16} /> Đối soát chi tiết trong tài khoản bác sĩ</li>
          </ul>
          <div className="price-qr">
            <div className="qr-box"><span className="standee-mini"><Stethoscope size={56} strokeWidth={1} /></span><i className="scanline" /></div>
            <p><b>Mở tài khoản bác sĩ.</b><br />Xác minh CCHN trong 24 giờ, nhận ca trực đầu tiên trong tuần này.</p>
          </div>
        </article>
        <div className="safety-col">
          <article className="safe good" data-reveal style={v({ '--d': '120ms' })}>
            <h3><span><Check size={18} /></span> Được phép khám từ xa</h3>
            <p>Khám theo danh mục TT 30/2023/TT-BYT — triệu chứng nhẹ, mới xuất hiện, bệnh nhân ổn định.</p>
            <div className="tags">{CONDITIONS.slice(0, 7).map((t) => <span key={t}>{t}</span>)}</div>
          </article>
          <article className="safe alert" data-reveal style={v({ '--d': '220ms' })}>
            <h3><span><Ban size={18} /></span> Từ chối khi không an toàn</h3>
            <p>Khó thở, đau ngực, sốt cao &gt; 3 ngày, trẻ dưới 6 tuổi, thai phụ — từ chối kê đơn kèm lý do, bệnh nhân được hoàn phí và hướng dẫn đến bệnh viện.</p>
            <a className="sos" href="tel:115"><Phone size={16} /> Bệnh nhân khẩn cấp gọi <b>115</b></a>
          </article>
        </div>
      </div>
    </section>
  )
}

function Faq() {
  const [open, setOpen] = useState(0)
  return (
    <section className="sec faq" id="faq">
      <SectionHead kicker="Giải đáp nhanh" title={<>Bác sĩ hỏi,<br /><em>BriMed trả lời.</em></>} />
      <div className="faq-list">
        {DOCTOR_FAQ.map((f, i) => (
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
        <span className="kicker" data-reveal><i />Bắt đầu thật nhẹ nhàng</span>
        <h2 data-reveal style={v({ '--d': '100ms' })}>Những phút rảnh của bạn<br /><em>đáng giá hơn bạn nghĩ.</em></h2>
        <p data-reveal style={v({ '--d': '200ms' })}>Mở tài khoản bác sĩ hôm nay — nhận ca trực đầu tiên trong tuần này.</p>
        <div className="final-cta" data-reveal style={v({ '--d': '300ms' })}>
          <Link className="btn-breathe" to="/auth"><Stethoscope size={19} /> Đăng ký nhận ca trực</Link>
          <Link className="btn-quiet" to="/">Tôi là bệnh nhân <ArrowRight size={16} /></Link>
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
          <strong>Bác sĩ</strong>
          <Link to="/cho-bac-si">Trang dành cho bác sĩ</Link>
          <Link to="/auth">Mở tài khoản nhận ca trực</Link>
          <a href="#thu-lao">Thù lao minh bạch</a>
          <a href="#faq">Câu hỏi thường gặp</a>
        </div>
        <div>
          <strong>BriMed</strong>
          <Link to="/">Trang dành cho bệnh nhân</Link>
          <Link to="/cho-nha-thuoc">Trang dành cho nhà thuốc</Link>
          <Link to="/auth">Đăng nhập hệ thống</Link>
        </div>
        <div>
          <strong>Hỗ trợ</strong>
          <a href="tel:19002026">Hotline: 1900 2026</a>
          <a href="mailto:sharkvision.co.work@gmail.com">sharkvision.co.work@gmail.com</a>
          <span>Khẩn cấp gọi 115 — BriMed không thay thế cấp cứu</span>
        </div>
      </div>
      <div className="lp-copy">© 2026 BriMed. Khám từ xa theo danh mục TT 30/2023/TT-BYT · Toa ký số theo TT 26/2025/TT-BYT · Bác sĩ thật — luôn có quyền từ chối kê đơn.</div>
    </footer>
  )
}

export default function DoctorLanding() {
  const rootRef = useRef<HTMLDivElement>(null)
  const [scrolled, setScrolled] = useState(false)
  useReveal(rootRef)

  useEffect(() => {
    document.documentElement.style.scrollBehavior = 'smooth'
    return () => { document.documentElement.style.scrollBehavior = '' }
  }, [])

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
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf) }
  }, [])

  return (
    <div className="lp2 is-ready" ref={rootRef}>
      <SeoMeta
        title="BriMed Dành Cho Bác Sĩ | Trực Linh Hoạt, Thù Lao 15.000đ/Lượt Khám"
        description="Bác sĩ nhận ca trực từ xa theo khung slot 30 phút tự chọn: bệnh nhân đã sàng lọc TT 30/2023, gọi video 1–2 phút, toa ký số TT 26/2025, thù lao 15.000đ/lượt minh bạch."
      />
      <div className="scroll-progress" aria-hidden="true"><i /></div>
      <div className="paper" aria-hidden="true" />
      <Header scrolled={scrolled} />
      <main>
        <Hero ready />
        <ConditionRibbon />
        <Practices />
        <Process />
        <Quotes />
        <Fee />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </div>
  )
}
