// Bộ minh họa SVG cho landing — chủ đề nhà thuốc / chăm sóc sức khỏe.
// Vẽ tay bằng SVG để nhẹ, sắc nét mọi kích thước và đồng bộ bảng màu BriMed (xanh – hồng – giấy ấm).

const C = {
  paper: '#fbf8f3',
  sand: '#f1e9dc',
  sandDeep: '#e5d8c3',
  ink: '#10244b',
  blue: '#0d71e2',
  blueDark: '#0756AF',
  sky: '#a6d3fd',
  mist: '#e4effd',
  pink: '#e8408a',
  blush: '#FFC2DD',
  blushMist: '#fdeef4',
  sage: '#cfe3d6',
  sageDeep: '#7fae93',
}

// Tia nắng xiên dùng chung cho các khung minh họa
function Sunbeams({ id }: { id: string }) {
  return (
    <>
      <defs>
        <linearGradient id={`${id}-beam`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".75" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g className="ill-beams" opacity=".55">
        <path d="M40 -10 L95 -10 L230 250 L175 250 Z" fill={`url(#${id}-beam)`} />
        <path d="M120 -10 L148 -10 L283 250 L255 250 Z" fill={`url(#${id}-beam)`} />
      </g>
    </>
  )
}

function Leaf({ x, y, r = 0, s = 1, fill = C.sageDeep }: { x: number; y: number; r?: number; s?: number; fill?: string }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
      <path d="M0 0 C 12 -22, 34 -24, 44 -20 C 38 -6, 22 8, 0 0 Z" fill={fill} />
      <path d="M2 -1 C 16 -10, 28 -15, 40 -19" stroke={C.paper} strokeWidth="1.2" fill="none" opacity=".7" />
    </g>
  )
}

// 1) Khám nhanh tại quầy — điện thoại gọi video với bác sĩ, quầy thuốc phía sau
export function SceneConsult() {
  return (
    <svg viewBox="0 0 320 240" role="img" aria-label="Minh họa bác sĩ gọi video ngay tại quầy nhà thuốc">
      <rect width="320" height="240" fill={C.mist} />
      <Sunbeams id="sc" />
      {/* kệ thuốc */}
      <rect x="18" y="40" width="150" height="8" rx="3" fill={C.sandDeep} />
      <rect x="18" y="92" width="150" height="8" rx="3" fill={C.sandDeep} />
      {[24, 46, 64, 90, 112, 136].map((x, i) => (
        <g key={x}>
          <rect x={x} y={i % 2 ? 14 : 20} width={i % 3 === 0 ? 16 : 14} height={i % 2 ? 26 : 20} rx="3" fill={[C.blush, C.sky, C.paper, C.sage, C.blush, C.sky][i]} />
          <rect x={x} y={i % 2 ? 22 : 26} width={i % 3 === 0 ? 16 : 14} height="5" fill="#fff" opacity=".7" />
        </g>
      ))}
      {[26, 52, 80, 104, 132].map((x, i) => (
        <g key={x}>
          <rect x={x} y={70 - (i % 2) * 6} width="18" height={22 + (i % 2) * 6} rx="4" fill={[C.paper, C.blush, C.sky, C.sage, C.paper][i]} />
          <rect x={x + 3} y={66 - (i % 2) * 6} width="12" height="6" rx="2" fill={C.blueDark} opacity=".25" />
        </g>
      ))}
      {/* quầy */}
      <rect x="0" y="176" width="320" height="64" fill={C.sand} />
      <rect x="0" y="172" width="320" height="8" fill={C.sandDeep} />
      {/* chậu cây */}
      <path d="M262 176 L286 176 L282 150 L266 150 Z" fill={C.paper} />
      <Leaf x={274} y={150} r={-80} s={1.1} />
      <Leaf x={274} y={150} r={-130} s={0.9} />
      <Leaf x={274} y={152} r={-40} s={0.85} fill="#9cc4ab" />
      {/* điện thoại */}
      <g className="ill-float">
        <rect x="168" y="52" width="86" height="150" rx="16" fill={C.ink} />
        <rect x="174" y="60" width="74" height="134" rx="11" fill="#fff" />
        <rect x="180" y="68" width="62" height="70" rx="9" fill={C.blushMist} />
        <circle cx="211" cy="94" r="15" fill={C.blush} />
        <path d="M188 138 C 192 116, 230 116, 234 138 Z" fill={C.blue} />
        <circle cx="211" cy="92" r="11" fill="#f7d8c4" />
        <path d="M199 88 C 202 76, 222 76, 223 88 C 218 82, 205 82, 199 88 Z" fill={C.ink} />
        <path d="M203 128 L211 136 L219 128" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <rect x="182" y="146" width="40" height="6" rx="3" fill={C.mist} />
        <rect x="182" y="157" width="56" height="6" rx="3" fill={C.mist} />
        <circle cx="194" cy="178" r="9" fill={C.pink} />
        <path d="M190 178 L198 178" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
        <circle cx="228" cy="178" r="9" fill={C.blue} />
        <path d="M224 178 L232 178 M228 174 L228 182" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
        <circle className="ill-pulse" cx="236" cy="74" r="4" fill="#22c55e" />
      </g>
      {/* bong bóng chat */}
      <g className="ill-bob">
        <rect x="58" y="120" width="96" height="40" rx="14" fill="#fff" />
        <path d="M144 156 L156 168 L134 158 Z" fill="#fff" />
        <rect x="70" y="132" width="58" height="5" rx="2.5" fill={C.sky} />
        <rect x="70" y="143" width="40" height="5" rx="2.5" fill={C.blush} />
      </g>
    </svg>
  )
}

// 2) Toa điện tử ký số — tờ đơn, con dấu ký số, bút
export function SceneRx() {
  return (
    <svg viewBox="0 0 320 240" role="img" aria-label="Minh họa toa thuốc điện tử có chữ ký số">
      <rect width="320" height="240" fill={C.blushMist} />
      <Sunbeams id="rx" />
      <circle cx="262" cy="56" r="34" fill={C.blush} opacity=".55" />
      <g className="ill-float" style={{ animationDelay: '-1.2s' }}>
        <g transform="rotate(-6 150 128)">
          <rect x="82" y="30" width="146" height="184" rx="10" fill="#fff" />
          <rect x="82" y="30" width="146" height="34" rx="10" fill={C.blue} />
          <rect x="82" y="54" width="146" height="10" fill={C.blue} />
          <text x="96" y="52" fill="#fff" fontFamily="Lora, Georgia, serif" fontSize="15" fontStyle="italic">Rx</text>
          <rect x="122" y="42" width="70" height="5" rx="2.5" fill="#fff" opacity=".6" />
          {[78, 94, 110].map((y, i) => (
            <g key={y}>
              <circle cx="100" cy={y + 2} r="4" fill={[C.pink, C.blue, C.sageDeep][i]} />
              <rect x="110" y={y} width={[86, 70, 92][i]} height="5" rx="2.5" fill={C.mist} />
            </g>
          ))}
          <rect x="96" y="132" width="118" height="1.5" fill={C.mist} />
          <rect x="96" y="142" width="60" height="5" rx="2.5" fill={C.sand} />
          <rect x="96" y="153" width="44" height="5" rx="2.5" fill={C.sand} />
          <path className="ill-sign" d="M100 192 C 110 176, 118 198, 128 184 S 146 180, 152 190 S 168 186, 176 182" stroke={C.ink} strokeWidth="2" fill="none" strokeLinecap="round" />
        </g>
      </g>
      {/* con dấu ký số */}
      <g className="ill-stamp">
        <circle cx="222" cy="170" r="30" fill="none" stroke={C.pink} strokeWidth="3" strokeDasharray="4 4" />
        <circle cx="222" cy="170" r="22" fill={C.pink} opacity=".12" />
        <path d="M210 170 L219 179 L235 162" stroke={C.pink} strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      {/* bút */}
      <g transform="rotate(38 60 180)">
        <rect x="20" y="174" width="88" height="12" rx="6" fill={C.blueDark} />
        <path d="M108 174 L124 180 L108 186 Z" fill={C.sandDeep} />
        <rect x="30" y="174" width="8" height="12" fill={C.sky} />
      </g>
      <Leaf x={258} y={226} r={-70} s={1} />
      <Leaf x={260} y={228} r={-120} s={0.8} fill="#9cc4ab" />
    </svg>
  )
}

// 3) Tìm thuốc & so sánh giá — hộp thuốc, kính lúp, nhãn giá
export function SceneSearch() {
  return (
    <svg viewBox="0 0 320 240" role="img" aria-label="Minh họa tìm thuốc và so sánh giá giữa các nhà thuốc">
      <rect width="320" height="240" fill="#eef5ef" />
      <Sunbeams id="se" />
      <rect x="0" y="182" width="320" height="58" fill={C.sand} />
      {/* hộp thuốc */}
      <g>
        <rect x="34" y="96" width="74" height="86" rx="6" fill="#fff" />
        <rect x="34" y="96" width="74" height="22" rx="6" fill={C.blue} />
        <rect x="44" y="132" width="40" height="6" rx="3" fill={C.mist} />
        <rect x="44" y="144" width="54" height="6" rx="3" fill={C.mist} />
        <rect x="118" y="118" width="62" height="64" rx="6" fill="#fff" />
        <rect x="118" y="118" width="62" height="18" rx="6" fill={C.pink} />
        <rect x="128" y="148" width="40" height="6" rx="3" fill={C.blushMist} />
        {/* lọ thuốc */}
        <rect x="190" y="112" width="44" height="70" rx="10" fill={C.sky} />
        <rect x="194" y="100" width="36" height="16" rx="4" fill={C.paper} />
        <rect x="190" y="134" width="44" height="24" fill="#fff" opacity=".85" />
        <path d="M206 146 L218 146 M212 140 L212 152" stroke={C.blue} strokeWidth="3" strokeLinecap="round" />
        {/* viên nang */}
        <g transform="rotate(-28 262 168)">
          <rect x="244" y="160" width="40" height="16" rx="8" fill={C.blush} />
          <rect x="264" y="160" width="20" height="16" rx="8" fill={C.pink} />
          <rect x="264" y="160" width="6" height="16" fill={C.pink} />
        </g>
      </g>
      {/* nhãn giá */}
      <g className="ill-bob" style={{ animationDelay: '-.8s' }}>
        <path d="M120 54 L176 54 L188 68 L176 82 L120 82 Z" fill="#fff" />
        <circle cx="176" cy="68" r="3" fill={C.sandDeep} />
        <rect x="130" y="64" width="34" height="8" rx="4" fill={C.pink} opacity=".75" />
      </g>
      {/* kính lúp */}
      <g className="ill-search">
        <circle cx="236" cy="66" r="30" fill="#fff" opacity=".55" stroke={C.ink} strokeWidth="7" />
        <rect x="256" y="88" width="14" height="40" rx="7" transform="rotate(-42 263 108)" fill={C.ink} />
        <path d="M220 54 C 226 46, 236 44, 244 46" stroke="#fff" strokeWidth="4" fill="none" strokeLinecap="round" />
      </g>
      <Leaf x={20} y={182} r={-60} s={0.9} />
    </svg>
  )
}

// 4) Nhắc uống thuốc — hộp chia thuốc Sáng/Trưa/Tối, đồng hồ, thông báo
export function SceneReminder() {
  return (
    <svg viewBox="0 0 320 240" role="img" aria-label="Minh họa hộp chia thuốc và nhắc uống thuốc sáng, trưa, tối">
      <rect width="320" height="240" fill={C.sand} />
      <Sunbeams id="re" />
      <circle cx="74" cy="66" r="40" fill="#fff" />
      <circle cx="74" cy="66" r="40" fill="none" stroke={C.sandDeep} strokeWidth="5" />
      <g className="ill-clock-hand" style={{ transformOrigin: '74px 66px' }}>
        <path d="M74 66 L74 40" stroke={C.ink} strokeWidth="4" strokeLinecap="round" />
      </g>
      <path d="M74 66 L92 74" stroke={C.pink} strokeWidth="4" strokeLinecap="round" />
      <circle cx="74" cy="66" r="4" fill={C.ink} />
      {/* hộp chia thuốc */}
      <rect x="40" y="140" width="240" height="64" rx="14" fill="#fff" />
      {['Sáng', 'Trưa', 'Tối'].map((t, i) => (
        <g key={t}>
          <rect x={50 + i * 76} y="150" width="68" height="44" rx="10" fill={[C.mist, C.blushMist, '#eef5ef'][i]} />
          <text x={84 + i * 76} y="186" textAnchor="middle" fontFamily="Be Vietnam Pro, sans-serif" fontSize="10" fontWeight="700" fill={C.ink} opacity=".55">{t}</text>
          <circle cx={74 + i * 76} cy="166" r="6" fill={[C.blue, C.pink, C.sageDeep][i]} />
          <rect x={84 + i * 76} y="161" width="18" height="10" rx="5" fill={[C.sky, C.blush, C.sage][i]} />
        </g>
      ))}
      {/* thông báo */}
      <g className="ill-notify">
        <rect x="150" y="42" width="140" height="58" rx="14" fill="#fff" />
        <circle cx="174" cy="71" r="12" fill={C.blue} />
        <path d="M168 71 L173 76 L181 66" stroke="#fff" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="194" y="60" width="78" height="7" rx="3.5" fill={C.ink} opacity=".75" />
        <rect x="194" y="74" width="56" height="6" rx="3" fill={C.mist} />
      </g>
      <Leaf x={290} y={140} r={-100} s={0.9} />
      <Leaf x={292} y={140} r={-150} s={0.7} fill="#9cc4ab" />
    </svg>
  )
}

// Họa tiết trang trí bay nhẹ trong hero
export function Capsule({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 28" aria-hidden="true">
      <rect x="1" y="1" width="62" height="26" rx="13" fill={C.blush} />
      <path d="M32 1 H50 A13 13 0 0 1 50 27 H32 Z" fill={C.pink} />
      <rect x="8" y="6" width="16" height="4" rx="2" fill="#fff" opacity=".7" />
    </svg>
  )
}

export function Tablet({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" aria-hidden="true">
      <circle cx="20" cy="20" r="18" fill="#fff" stroke={C.sky} strokeWidth="3" />
      <path d="M8 20 H32" stroke={C.sky} strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

export function CrossMark({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" aria-hidden="true">
      <rect x="14" y="2" width="12" height="36" rx="5" fill={C.blue} opacity=".85" />
      <rect x="2" y="14" width="36" height="12" rx="5" fill={C.blue} opacity=".85" />
    </svg>
  )
}

export function LeafSprig({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 80 90" aria-hidden="true">
      <path d="M40 88 C 40 60, 42 34, 50 6" stroke={C.sageDeep} strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <Leaf x={42} y={62} r={-150} s={0.75} />
      <Leaf x={44} y={44} r={-30} s={0.7} fill="#9cc4ab" />
      <Leaf x={46} y={28} r={-160} s={0.6} fill="#9cc4ab" />
      <Leaf x={49} y={12} r={-50} s={0.5} />
    </svg>
  )
}

// Đường nhịp tim (ECG) — dùng trong màn mở đầu & thanh tiến trình
export function HeartbeatPath({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 600 80" preserveAspectRatio="none" aria-hidden="true">
      <path
        d="M0 40 H170 L190 40 L204 14 L220 66 L236 6 L252 58 L264 40 H340 C 352 40, 356 26, 368 26 C 380 26, 384 40, 396 40 H600"
        pathLength={1}
        fill="none"
        stroke="url(#hb-grad)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient id="hb-grad" x1="0" x2="1">
          <stop offset="0" stopColor={C.sky} />
          <stop offset=".45" stopColor={C.blue} />
          <stop offset=".75" stopColor={C.pink} />
          <stop offset="1" stopColor={C.blush} />
        </linearGradient>
      </defs>
    </svg>
  )
}
