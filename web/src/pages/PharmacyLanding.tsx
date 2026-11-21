import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Store, QrCode, FileSignature, PackageSearch, HandCoins, Check, ArrowRight, MapPin,
  CalendarCheck, ShieldCheck, Leaf, Phone, Timer, Boxes,
} from 'lucide-react'
import { SeoMeta } from '../components/common/SeoMeta'
import {
  SectionHead, SplitWords, CountUp, useReveal, TypeQuote, RoleSwitch, v,
} from '../components/landing/Landing'
import {
  SceneStandee, SceneConsult, SceneRx, SceneSearch, SceneReminder,
  Capsule, Tablet, CrossMark, LeafSprig,
} from '../components/landing/Illustrations'
import '../components/landing/landing.css'

// =====================================================================
// Landing dành cho NHÀ THUỐC ĐỐI TÁC — cùng master concept "Calm Care"
// với trang khách hàng: giấy ấm, nhịp thở 4s, Lora serif, ribbon, phone
// mockup dính cuộn, phí minh bạch, TypeQuote, FAQ xếp accordion.
// =====================================================================

const NAV = [
  ['#loi-ich', 'Lợi ích'], ['#quy-trinh', 'Quy trình'], ['#phi', 'Chi phí'],
  ['#dong-hanh', 'Đồng hành'], ['#faq', 'Hỏi đáp'],
]

const BENEFITS_RIBBON = [
  'Tháng đầu miễn phí', 'Không hoa hồng tiền thuốc', 'Khách mới từ luồng khám tại quầy',
  'Toa điện tử đối chiếu bằng mã', 'Liên thông CSDL dược quốc gia', 'Tồn kho tự trừ sau mỗi đơn',
  'Giá niêm yết của riêng bạn', 'Standee QR miễn phí',
]

const PRACTICES = [
  {
    key: 'flow', Scene: SceneConsult, tag: 'Luồng khách tại quầy', title: 'Khách bước vào quầy, không phải đi đâu xa',
    text: 'Bệnh nhân quét mã QR ngay tại standee của bạn — form sàng lọc, phí khám, cuộc gọi bác sĩ đều diễn ra bên trong quầy thuốc của bạn.',
    icon: Store,
  },
  {
    key: 'rx', Scene: SceneRx, tag: 'TT 26/2025/TT-BYT', title: 'Toa điện tử đối chiếu bằng mã',
    text: 'Dược sĩ nhập mã toa VN-Rx, hệ thống đối chiếu tự động — đúng người, đúng thuốc, đúng liều đã ký số trước khi cấp.',
    icon: FileSignature,
  },
  {
    key: 'stock', Scene: SceneSearch, tag: 'Theo tồn kho thật', title: 'Tồn kho minh bạch, hết hàng xin đổi hoạt chất',
    text: 'Bệnh nhân thấy giá niêm yết và tồn kho thật của bạn. Thiếu hàng, hệ thống tự xin bác sĩ duyệt hoạt chất tương đương còn hàng.',
    icon: PackageSearch,
  },
  {
    key: 'money', Scene: SceneReminder, tag: 'Không hoa hồng tiền thuốc', title: 'Tiền thuốc về thẳng quầy bạn',
    text: 'BriMed chỉ thu phí thuê bao cố định hàng tháng. Đồng tiền thuốc — từ giá niêm yết của chính bạn — thuộc hoàn toàn về nhà thuốc.',
    icon: HandCoins,
  },
]

const STEPS = [
  { title: 'Nhận standee & kích hoạt', text: 'BriMed gửi standee QR mang thương hiệu chung, kèm tài khoản quản lý nhà thuốc — lắp trong 5 phút.' },
  { title: 'Khách quét mã ngay tại quầy', text: 'Bệnh nhân tự điền form sàng lọc, thanh toán phí khám 25.000đ qua VietQR — dược sĩ chỉ cần hỗ trợ khi được hỏi.' },
  { title: 'Nhập mã toa điện tử', text: 'Sau 1–2 phút gọi video, toa ký số về hệ thống. Dược sĩ nhập mã VN-Rx để đối chiếu trước khi cấp.' },
  { title: 'Đối chiếu kho & báo giá', text: 'Hệ thống tự đối chiếu tồn kho, gợi ý thay thế cùng hoạt chất nếu thiếu hàng — báo giá hiển thị rõ cho khách.' },
  { title: 'Chốt đơn — kho tự trừ', text: 'Xác nhận hoàn tất: trừ kho, ghi giao dịch, cộng điểm dịch vụ. Toàn bộ mất khoảng 6–7 phút mỗi lượt.' },
]

const PHARMACY_FAQ = [
  { q: 'Nhà thuốc của tôi cần gì để tham gia?', a: 'Giấy phép kinh doanh dược, dược sĩ phụ trách chuyên môn và một góc quầy đủ rộng đặt standee A5. BriMed lo phần còn lại: tài khoản, dữ liệu mẫu và hướng dẫn dành cho dược sĩ.' },
  { q: 'Phí thuê bao tính như thế nào?', a: 'Tháng đầu tiên hoàn toàn miễn phí để bạn thử. Sau đó 500.000đ/tháng trong 6 tháng đầu, và 900.000đ/tháng khi đã ổn định. Không phí setup, không phí theo từng đơn.' },
  { q: 'Tôi có phải nhập lại toàn bộ kho thuốc không?', a: 'Không. Bạn chỉ duy trì danh mục thuốc mình thực sự bán — hệ thống đối chiếu theo tồn kho bạn khai báo, và tự động gợi ý xin đổi hoạt chất tương đương khi thiếu hàng.' },
  { q: 'Tiền thuốc ai thu, có bị chia % không?', a: 'Tiền thuốc bệnh nhân trả trực tiếp tại quầy theo giá niêm yết của bạn. BriMed không thu hoa hồng tiền thuốc — chỉ có phí thuê bao cố định hàng tháng.' },
  { q: 'Khách hàng có cần cài app không?', a: 'Không cần. Toàn bộ hành trình diễn ra trong trình duyệt điện thoại sau khi quét mã QR — kể cả thanh toán phí khám qua VietQR.' },
  { q: 'Đơn thuốc điện tử có hợp lệ không?', a: 'Có. Toa được bác sĩ thật ký số theo Thông tư 26/2025/TT-BYT, có mã tra cứu riêng. Dược sĩ đối chiếu mã trước khi cấp — an toàn cho cả nhà thuốc và bệnh nhân.' },
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
        <nav className="lp-nav" aria-label="Điều hướng nhà thuốc">
          {NAV.map(([href, label]) => <a key={href} href={href} onClick={() => setOpen(false)}>{label}</a>)}
        </nav>
        <div className="lp-header-actions">
          <RoleSwitch current="pharmacy" />
          <Link className="lp-login" to="/auth">Đăng nhập</Link>
          <Link className="btn-soft btn-sm" to="/nha-thuoc-doi-tac"><Store size={16} /> Đăng ký đối tác</Link>
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
          Dành cho nhà thuốc đối tác
          <span className="sep" /> <MapPin size={14} /> Gò Vấp, TP.HCM
        </p>
        <h1 className="hero-title">
          <span className="line"><SplitWords text="Quầy nhỏ của bạn," start={250} /></span>
<span className="line accent"><SplitWords text={"cánh cửa đến bác\u00A0sĩ."} start={560} /></span>        </h1>
        <p className="hero-lede">
          Một chiếc standee, một mã QR — và quầy thuốc của bạn trở thành nơi bệnh nhân được bác sĩ thật
          kê toa điện tử trong vài phút. Không cần app, không cần thêm nhân sự.
        </p>
        <div className="hero-cta">
          <Link className="btn-breathe" to="/nha-thuoc-doi-tac"><Store size={19} /> Đăng ký đối tác <small>tháng đầu 0đ</small></Link>
          <a className="btn-quiet" href="#quy-trinh"><Timer size={18} /> Xem quy trình 5 bước</a>
        </div>
        <dl className="hero-stats">
          <div><dt><CountUp to={0} run={ready} prefix="" /> <small>đ</small></dt><dd>tháng đầu trải nghiệm — không ràng buộc</dd></div>
          <div><dt>0<small>%</small></dt><dd>hoa hồng trên tiền thuốc của bạn</dd></div>
          <div><dt><CountUp to={7} run={ready} prefix="~" /> <small>phút</small></dt><dd>mỗi lượt từ lúc quét mã đến khi khách cầm thuốc</dd></div>
        </dl>
      </div>

      <div className="hero-visual">
        <div className="breath" aria-hidden="true">
          <span className="breath-ring r1" /><span className="breath-ring r2" /><span className="breath-ring r3" />
        </div>
        <figure className="breath-window kb">
          <SceneStandee />
          <span className="window-light" aria-hidden="true" />
        </figure>
        <div className="breath-guide" aria-hidden="true"><span className="in">Hít vào…</span><span className="out">Thở ra…</span></div>

        <div className="hero-chip chip-a"><span className="chip-ic"><ShieldCheck size={18} /></span><div><b>Toa ký số hợp lệ</b><small>TT 26/2025/TT-BYT</small></div></div>
        <div className="hero-chip chip-b"><span className="chip-ic pink"><Boxes size={18} /></span><div><b>Kho tự trừ sau mỗi đơn</b><small>Đối soát nhẹ như thở</small></div></div>

        <Capsule className="float-deco deco-capsule" />
        <Tablet className="float-deco deco-tablet" />
        <CrossMark className="float-deco deco-cross" />
        <LeafSprig className="float-deco deco-leaf" />
      </div>

      <a className="scroll-cue" href="#loi-ich" aria-label="Cuộn xuống phần lợi ích"><span /> Cuộn nhẹ</a>
    </section>
  )
}

function BenefitRibbon() {
  const items = [...BENEFITS_RIBBON, ...BENEFITS_RIBBON]
  return (
    <div className="ribbon" aria-label="Lợi ích dành cho nhà thuốc đối tác">
      <div className="ribbon-track">
        {items.map((c, i) => <span key={i} aria-hidden={i >= BENEFITS_RIBBON.length}><Leaf size={14} /> {c}</span>)}
      </div>
    </div>
  )
}

function Practices() {
  return (
    <section className="sec practices" id="loi-ich">
      <SectionHead
        kicker="Bốn lý do nhà thuốc tin BriMed"
        title={<>Quầy thuốc nhỏ,<br /><em>vòng tay rất rộng.</em></>}
        text="Bạn giữ nguyên cách bán thuốc của mình — BriMed chỉ thêm một luồng khách mới được bác sĩ thật đứng phía sau."
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

// Màn hình điện thoại mô phỏng hành trình của DƯỢC SĨ tại quầy
function PhoneScreens({ active }: { active: number }) {
  return (
    <div className="phone" aria-hidden="true">
      <div className="phone-notch" />
      <div className="phone-screen">
        <div className="phone-bar"><span>BriMed · NT</span><span>9:41</span></div>
        <div className={`ps ps-qr ${active === 0 ? 'on' : ''}`}>
          <div className="qr-frame"><span className="standee-mini"><QrCode size={44} strokeWidth={1.2} /></span><i className="scanline" /></div>
          <b>Standee đã sẵn sàng</b><small>NT Minh Châu · 128 Nguyễn Oanh</small>
        </div>
        <div className={`ps ps-call ${active === 1 ? 'on' : ''}`}>
          <div className="call-avatar"><img src="/assets/doctors/dr-minh.jpg" alt="" /><i /><i /></div>
          <b>Khách đang gặp bác sĩ</b><small>BS. Nguyễn Văn Minh · 01:24</small>
          <div className="call-timer"><span className="rec" /> Đang gọi</div>
          <div className="call-actions"><span className="end"><Phone size={16} /></span><span><Timer size={16} /></span></div>
        </div>
        <div className={`ps ps-rx ${active === 2 ? 'on' : ''}`}>
          <div className="rx-card">
            <div className="rx-head"><span>Rx</span><em>VN-Rx-2026-08142</em></div>
            {[['Paracetamol 500mg', 'Còn 24 vỉ'], ['Loratadin 10mg', 'Còn 9 vỉ']].map(([n, t], i) => (
              <div className="rx-line" key={n} style={v({ '--i': i })}><Check size={14} /><span>{n}</span><small>{t}</small></div>
            ))}
            <div className="rx-signed"><FileSignature size={14} /> Mã toa hợp lệ — đã ký số</div>
          </div>
        </div>
        <div className={`ps ps-form ${active === 3 ? 'on' : ''}`}>
          <b>Đối chiếu &amp; báo giá</b>
          {[['Paracetamol 500mg', '32.000đ'], ['Loratadin 10mg', '12.000đ'], ['Phí giao hàng', 'Miễn phí tại quầy']].map(([k, val], i) => (
            <div className="field" key={k} style={v({ '--i': i })}><span>{k}</span><em>{val}</em><Check size={14} /></div>
          ))}
          <div className="ok-flag"><ShieldCheck size={14} /> Đã đối chiếu tồn kho</div>
        </div>
        <div className={`ps ps-done ${active === 4 ? 'on' : ''}`}>
          <div className="done-bag"><CalendarCheck size={44} strokeWidth={1.4} /><i><Check size={14} /></i></div>
          <b>Hoàn tất đơn #128</b><small>Kho đã trừ · Giao dịch đã ghi</small>
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
          <SectionHead align="left" kicker="Quy trình 5 bước" title={<>Một chiếc standee,<br /><em>một nhịp làm việc mới.</em></>} text="Dược sĩ không học thêm phần mềm phức tạp — mọi bước đều quen như quy trình bán thuốc hằng ngày của bạn." />
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

function Quote() {
  const [active, setActive] = useState(false)
  return (
    <section className="sec doctors" id="dong-hanh">
      <SectionHead
        kicker="Người trong nghề nói"
        title={<>Dược sĩ đối tác<br /><em>chia sẻ trải nghiệm.</em></>}
        text="Nhà thuốc đầu tiên của BriMed tại Gò Vấp — nơi tất cả bắt đầu bằng một chiếc standee nhỏ."
      />
      <div className="doctor-row" onMouseEnter={() => setActive(true)} onMouseLeave={() => setActive(false)}>
        <article className={`doctor ${active ? 'is-active' : ''}`} data-reveal tabIndex={0} onFocus={() => setActive(true)} onBlur={() => setActive(false)}>
          <figure className="doctor-photo kb">
            <img src="/assets/doctors/dr-minh.jpg" alt="DS. Nguyễn Minh Châu — Nhà thuốc Minh Châu" loading="lazy" />
            <span className="doctor-status on">Đang mở quầy</span>
          </figure>
          <div className="doctor-body">
            <h3>DS. Nguyễn Minh Châu</h3>
            <p className="doctor-spec"><Store size={14} /> Nhà thuốc Minh Châu · P.17, Gò Vấp</p>
            <TypeQuote
              text="Tôi không cần bán thuốc online — khách vào quầy, quét mã, có toa bác sĩ trong vài phút. Phần đối chiếu kho hệ thống lo, tôi chỉ làm đúng nghề dược sĩ: đọc toa, tư vấn, trao thuốc."
              active={active}
            />
          </div>
        </article>
      </div>
    </section>
  )
}
function Fee() {
  const pharmacyPlans = [
    {
      name: "HÀNG THÁNG",
      desc: "Linh hoạt, trả từng tháng",
      price: "900.000",
      unit: "đ/tháng",
      note: "Thanh toán mỗi tháng",
      features: [
        "Điểm tư vấn bác sĩ trực tuyến",
        "Bảng QR mica tại quầy",
        "Huy hiệu nhà thuốc đối tác",
        "Hướng dẫn sử dụng online",
      ],
      footer: "Không ràng buộc thời hạn",
    },
    {
      name: "GÓI 3 THÁNG",
      desc: "Trả trước 2.550.000 đ",
      price: "850.000",
      unit: "đ/tháng",
      note: "Giảm 50.000 đ mỗi tháng",
      saving: "Tiết kiệm 150.000 đ",
      features: [
        "Toàn bộ quyền lợi gói Hằng tháng",
        "Standee và tờ rơi tại quầy",
        "Tập huấn trực tiếp tại nhà thuốc",
        "Hiện trên bản đồ nhà thuốc BriMed",
      ],
      footer: "Thanh toán một lần cho 3 tháng",
    },
    {
      name: "GÓI 6 THÁNG",
      desc: "Trả trước 4.500.000 đ",
      price: "750.000",
      unit: "đ/tháng",
      note: "Giảm 150.000 đ mỗi tháng",
      saving: "Tiết kiệm 900.000 đ",
      popular: true,
      features: [
        "Toàn bộ quyền lợi gói 3 tháng",
        "Chăm sóc nhà thuốc hàng tháng",
        "Báo cáo lượt khám hàng tháng",
        "Giữ giá đến hết gói",
      ],
      footer: "Thanh toán một lần cho 6 tháng",
    },
    {
      name: "GÓI 1 NĂM",
      desc: "Trả trước 7.800.000 đ",
      price: "650.000",
      unit: "đ/tháng",
      note: "Giá tốt nhất",
      saving: "Tiết kiệm 3.000.000 đ",
      best: true,
      features: [
        "Toàn bộ quyền lợi gói 6 tháng",
        "Ưu tiên hỗ trợ trong 2 giờ",
        "Ấn phẩm in logo nhà thuốc",
        "Quảng bá trên fanpage BriMed",
      ],
      footer: "Thanh toán một lần cho 12 tháng",
    },
  ];

  return (
    <section className="sec pricing brimed-pricing" id="phi">
      <div className="bp-heading">
        <span className="bp-brand">
          <span className="bp-logo">✚</span> BRIMED
        </span>
        <span className="bp-label">● Bảng giá minh bạch</span>
      </div>

      <div className="bp-intro">
        <h2>
          Gói dành cho <span>nhà thuốc đối tác.</span>
        </h2>
        <p>
          Chọn thời hạn phù hợp — gắn bó càng lâu, chi phí mỗi tháng càng tốt.
        </p>
      </div>

      <div className="bp-subheading">
        <h3>Bảng giá dành cho nhà thuốc</h3>
        <p>Chọn gói phù hợp với hoạt động kinh doanh của bạn.</p>
      </div>

      <div className="bp-pharmacy-grid">
        {pharmacyPlans.map((plan) => (
          <article
            className={`bp-card ${plan.popular ? "bp-featured" : ""}`}
            key={plan.name}
          >
            {plan.popular && <span className="bp-ribbon">Phổ biến</span>}
            {plan.best && (
              <span className="bp-ribbon bp-pink">Tiết kiệm nhất</span>
            )}

            <h4>{plan.name}</h4>
            <p className="bp-desc">{plan.desc}</p>

            <div className="bp-price">
              <strong>{plan.price}</strong>
              <span>{plan.unit}</span>
            </div>

            <p className="bp-note">{plan.note}</p>
            {plan.saving && (
              <span className="bp-saving">{plan.saving}</span>
            )}

            <ul className="bp-bullets">
              <li>Khách quét QR, không cần tải app</li>
              <li>Bác sĩ kê toa, khách mua tại quầy</li>
            </ul>

            <div className="bp-divider" />
            <h5>Quyền lợi gói</h5>

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
          <strong>Miễn phí phần mềm tháng đầu tiên</strong> cho mọi nhà thuốc
          mới — trải nghiệm đầy đủ trước khi chọn gói.
        </p>
      </div>
    </section>
  );
}

function Faq() {
  const [open, setOpen] = useState(0)
  return (
    <section className="sec faq" id="faq">
      <SectionHead kicker="Giải đáp nhanh" title={<>Nhà thuốc hỏi,<br /><em>BriMed trả lời.</em></>} />
      <div className="faq-list">
        {PHARMACY_FAQ.map((f, i) => (
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
        <h2 data-reveal style={v({ '--d': '100ms' })}>Một standee,<br /><em>cả một vòng quay mới.</em></h2>
        <p data-reveal style={v({ '--d': '200ms' })}>Đăng ký hôm nay — tháng đầu tiên miễn phí, BriMed lo phần còn lại.</p>
        <div className="final-cta" data-reveal style={v({ '--d': '300ms' })}>
          <Link className="btn-breathe" to="/nha-thuoc-doi-tac"><Store size={19} /> Đăng ký nhà thuốc đối tác</Link>
          <Link className="btn-quiet" to="/goi-1-thang-brimed-nha-thuoc">Xem gói phí chi tiết <ArrowRight size={16} /></Link>
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
          <strong>Nhà thuốc</strong>
          <Link to="/cho-nha-thuoc">Trang dành cho nhà thuốc</Link>
          <Link to="/nha-thuoc-doi-tac">Đăng ký đối tác</Link>
          <Link to="/goi-1-thang-brimed-nha-thuoc">Gói 6 tháng đầu — 500.000đ</Link>
          <Link to="/goi-3-thang-brimed-nha-thuoc">Gói ổn định — 900.000đ</Link>
        </div>
        <div>
          <strong>BriMed</strong>
          <Link to="/">Trang dành cho bệnh nhân</Link>
          <Link to="/cho-bac-si">Trang dành cho bác sĩ</Link>
          <Link to="/auth">Đăng nhập hệ thống</Link>
        </div>
        <div>
          <strong>Hỗ trợ</strong>
          <a href="tel:19002026">Hotline: 1900 2026</a>
          <a href="mailto:sharkvision.co.work@gmail.com">sharkvision.co.work@gmail.com</a>
          <span>Khẩn cấp gọi 115 — BriMed không thay thế cấp cứu</span>
        </div>
      </div>
      <div className="lp-copy">© 2026 BriMed. Mọi toa thuốc đều do bác sĩ thật ký số theo TT 26/2025/TT-BYT · Không cấp thuốc không có mã toa hợp lệ.</div>
    </footer>
  )
}

export default function PharmacyLanding() {
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
        title="BriMed Dành Cho Nhà Thuốc | Tháng Đầu Miễn Phí, Không Hoa Hồng Tiền Thuốc"
        description="Nhà thuốc đối tác BriMed: khách quét QR tại quầy, bác sĩ từ xa ký đơn điện tử hợp lệ (TT 26/2025). Tháng đầu miễn phí, 500.000đ/tháng 6 tháng đầu, không hoa hồng tiền thuốc."
      />
      <div className="scroll-progress" aria-hidden="true"><i /></div>
      <div className="paper" aria-hidden="true" />
      <Header scrolled={scrolled} />
      <main>
        <Hero ready />
        <BenefitRibbon />
        <Practices />
        <Process />
        <Quote />
        <Fee />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </div>
  )
}
