import { PiggyBank, Timer, Stethoscope, Smartphone } from 'lucide-react'

// Danh mục bệnh được phép khám từ xa theo TT 30/2023/TT-BYT
export const DISEASE_GROUPS = [
  'Cúm',
  'Viêm mũi họng cấp',
  'Viêm mũi họng mạn',
  'COVID-19',
  'Bệnh da dị ứng/nấm',
  'Viêm kết mạc',
  'Đau đầu do căng thẳng',
  'Đầu nửa đầu (Migraine)',
  'Viêm dạ dày – tá tràng',
  'Trào ngược',
  'Táo bón',
] as const

export const RED_FLAG_HINTS = [
  'Sốt cao kéo dài trên 3 ngày',
  'Khó thở, thở khò khè',
  'Trẻ nhỏ (dưới 6 tuổi)',
  'Thai phụ',
  'Triệu chứng ngoài danh mục: viêm phế quản, viêm phổi, tiêu chảy cấp…',
]

export const ORDER_STEPS = [
  { key: 'confirmed', label: 'Đã xác nhận' },
  { key: 'preparing', label: 'Đang chuẩn bị' },
  { key: 'ready_or_shipping', label: 'Đang giao / Sẵn sàng nhận' },
  { key: 'completed', label: 'Hoàn tất' },
] as const

export const RX_STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: 'Chờ xử lý', cls: 'bg-slate-100 text-slate-600' },
  issued: { label: 'Đã phát hành', cls: 'bg-mint-bg text-mint-fg' },
  rejected: { label: 'Từ chối kê đơn', cls: 'bg-redflag-bg text-redflag-fg' },
  dispensed: { label: 'Đã cấp phát', cls: 'bg-lightblue text-bluedark' },
}

export const CONSULT_STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: 'Đang chờ bác sĩ', cls: 'bg-amber-100 text-amber-700' },
  in_call: { label: 'Đang gọi ngắn', cls: 'bg-lightpink text-pink-dark' },
  approved: { label: 'Đã duyệt kê đơn', cls: 'bg-mint-bg text-mint-fg' },
  rejected: { label: 'Đã từ chối', cls: 'bg-redflag-bg text-redflag-fg' },
}

export const STEPS_FLOW = [
  { title: 'Quét mã QR', desc: 'Tại quầy nhà thuốc đối tác' },
  { title: 'Điền form triệu chứng', desc: 'Vài câu hỏi sàng lọc nhanh' },
  { title: 'Bác sĩ gọi ngắn & kê đơn', desc: 'Gọi 1–2 phút, ký số đơn điện tử' },
  { title: 'Nhận mã đơn', desc: 'Mã tra cứu quốc gia trên từng toa' },
  { title: 'Mua thuốc ngay tại quầy', desc: 'Tổng thời gian chờ ~6,5 phút' },
]

export const SEO = {
  pkg1: {
    title: 'Nhà Thuốc Đối Tác BriMed Gò Vấp | Tháng Đầu Miễn Phí, 500.000đ/tháng',
    h1: 'Nhà thuốc Gò Vấp dùng BriMed: tháng đầu miễn phí, sau đó 500.000đ/tháng',
    meta: 'Khách quét QR tại quầy, bác sĩ từ xa ký đơn điện tử hợp lệ. BriMed không thu hoa hồng tiền thuốc. Tháng đầu miễn phí, 500.000đ/tháng trong 6 tháng đầu. Đăng ký ngay.',
    slug: '/goi-1-thang-brimed-nha-thuoc',
  },
  pkg3: {
    title: 'BriMed Giai Đoạn Ổn Định Cho Nhà Thuốc | 900.000đ/tháng',
    h1: 'BriMed giai đoạn ổn định: 900.000đ/tháng cho nhà thuốc Gò Vấp',
    meta: 'Sau 6 tháng đầu, phí BriMed 900.000đ/tháng — tiếp nhận đơn, đối soát và mạng lưới bác sĩ ký đơn điện tử. Không hoa hồng tiền thuốc. Đăng ký ngay.',
    slug: '/goi-3-thang-brimed-nha-thuoc',
  },
}

export const ROLE_LABELS: Record<string, string> = {
  patient: 'Bệnh nhân',
  doctor: 'Bác sĩ',
  pharmacy: 'Nhà thuốc',
  admin: 'Quản trị viên',
}

export const TIME_SLOTS = ['Sáng', 'Trưa', 'Tối'] as const

// ===== Nội dung giới thiệu BriMed cho khách hàng (trang chủ) =====
export const CUSTOMER_BENEFITS = [
  {
    icon: PiggyBank,
    color: 'bg-lightpink text-pink-dark',
    title: 'Tiết kiệm tiền',
    desc: 'Chỉ 25.000đ/lượt khám, thanh toán VietQR ngay trong web — rẻ hơn nhiều lần so với đi khám.'
  },
  {
    icon: Timer,
    color: 'bg-lightblue text-bluedark',
    title: 'Nhanh gọn',
    desc: 'Chờ khoảng 10 phút ngay tại quầy thuốc gần nhà. Không đặt lịch, không phải đi xa.',
  },
  {
    icon: Stethoscope,
    color: 'bg-mint-bg text-mint-fg',
    title: 'Bác sĩ thật khám',
    desc: 'Bác sĩ gọi điện hỏi bệnh 1–2 phút rồi ký đơn thuốc điện tử hợp lệ cho bạn.',
  },
  {
    icon: Smartphone,
    color: 'bg-skyblue text-bluedark',
    title: 'Dễ sử dụng',
    desc: 'Không cần cài app. Chỉ cần quét mã QR — dược sĩ tại quầy sẵn sàng làm hộ bạn.',
  },
]

export const CUSTOMER_PRICING = [
  { label: 'Lượt khám từ xa', note: 'Bác sĩ thật ký đơn điện tử — thanh toán qua VietQR trong web', price: '25.000đ/lượt', highlight: true },
  { label: 'Thuốc tại nhà thuốc', note: 'BriMed không thu hoa hồng — bạn trả giá niêm yết tại quầy', price: 'Giá quầy', highlight: false },
  { label: 'Nhà thuốc đối tác', note: 'Tháng đầu miễn phí → 500.000đ/tháng (6 tháng đầu) → 900.000đ/tháng', price: 'Từ 500.000đ/tháng', highlight: false },
]

export const ELIGIBLE = [
  'Cảm cúm, viêm họng, sổ mũi, ho',
  'Dị ứng da, nấm da, mề đay',
  'Đau mắt đỏ (viêm kết mạc)',
  'Đau đầu, đau nửa đầu',
  'Đau dạ dày, trào ngược, táo bón',
  'Người bận rộn hoặc đi lại khó khăn, cần thuốc kê đơn cho bệnh nhẹ',
]

export const NOT_ELIGIBLE = [
  'Cấp cứu — hãy gọi ngay 115',
  'Trẻ nhỏ dưới 6 tuổi',
  'Phụ nữ đang mang thai',
  'Sốt cao kéo dài trên 3 ngày',
  'Khó thở, đau ngực, người mệt lả',
  'Bệnh nặng hoặc ngoài danh mục khám từ xa',
]

export const CUSTOMER_FAQ = [
  {
    q: 'Dùng BriMed có mất phí không?',
    a: 'Phí khám là 25.000đ mỗi lượt, thanh toán qua VietQR ngay trong web trước khi bác sĩ tiếp nhận. Tiền thuốc bạn trả trực tiếp tại quầy theo giá niêm yết — BriMed không thu hoa hồng tiền thuốc.',
  },
  {
    q: 'Tôi có phải cài app không?',
    a: 'Không cần. Bạn chỉ dùng điện thoại quét mã QR dán tại quầy thuốc, trả lời vài câu hỏi đơn giản là xong.',
  },
  {
    q: 'Khám kiểu gì? Có phải bác sĩ thật không?',
    a: 'Bác sĩ thật đang trực sẽ xem thông tin bạn điền, gọi điện hỏi thêm 1–2 phút rồi ký đơn thuốc điện tử hợp lệ. Đơn thuốc có mã tra cứu quốc gia riêng trên từng toa — nhà thuốc đối chiếu mã trước khi cấp thuốc.',
  },
  {
    q: 'Tôi không rành dùng điện thoại thì sao?',
    a: 'Dược sĩ tại quầy sẽ thao tác hộ bạn từ đầu đến cuối. Bạn chỉ cần nghe điện thoại và trả lời câu hỏi của bác sĩ.',
  },
  {
    q: 'Nếu bác sĩ thấy không nên kê đơn thì sao?',
    a: 'Bác sĩ sẽ hướng dẫn bạn đến cơ sở y tế gần nhất để khám trực tiếp. Phí khám đã bao gồm công đánh giá và tư vấn chuyển hướng của bác sĩ, nên không được hoàn lại — BriMed luôn yêu cầu bác sĩ xử lý từng lượt khám đã nhận.',
  },
  {
    q: 'Tôi dùng BriMed ở nhà thuốc nào?',
    a: 'Tại các nhà thuốc có dán mã QR BriMed (đang triển khai ở quận Gò Vấp, TP.HCM). Sau khi có đơn, bạn vẫn được quyền mang đơn sang nhà thuốc khác nếu muốn.',
  },
]

// =====================================================================
// MOCKUP MARKETING — dữ liệu minh họa tĩnh cho trang giới thiệu (không
// lấy từ hệ thống thật; thay bằng số liệu thực khi có dữ liệu vận hành).
// =====================================================================

// Section 2 (AIDA): Problem & Agitate
export const CUSTOMER_PAIN_POINTS = [
  {
    icon: 'clock',
    title: 'Đi khám chỉ để lấy đơn — mất nửa ngày',
    desc: 'Xếp hàng lấy số từ sáng, xin phép sếp, đi lại tốn kém… chỉ để bác sĩ ghi vài dòng toa cho bệnh cảm thông thường.',
  },
  {
    icon: 'ban',
    title: 'Đến quầy thuốc thì bị từ chối',
    desc: 'Cảm, ho, viêm họng nhưng muốn mua thuốc kê đơn thì nhà thuốc không được bán khi chưa có toa — đành về nhà chờ bệnh nặng thêm.',
  },
  {
    icon: 'wallet',
    title: 'Mỗi lần cần toa tốn ~450.000đ',
    desc: 'Phí khám cộng nửa ngày công cộng chi phí đi lại — chi phí thật cho một bệnh nhẹ vài ngày khỏi.',
  },
]

export const PARTNER_PAIN_POINTS = [
  {
    icon: 'user-x',
    title: 'Khách cầm tiền bỏ về vì thiếu toa',
    desc: 'Mỗi ngày có khách đến mua kháng sinh, thuốc dạ dày… nhưng không có đơn. Bạn buộc phải từ chối — khách sang tiệm khác và thường không quay lại.',
  },
  {
    icon: 'alert',
    title: 'Rủi ro phạt 10–20 triệu đồng',
    desc: 'Từ 15/5/2026, bán thuốc kê đơn không có đơn hợp lệ bị xử phạt nặng (Nghị định 90/2026) — trong khi nhu cầu của khách thì vẫn ở đó.',
  },
  {
    icon: 'store',
    title: 'Chuỗi lớn có "bác sĩ riêng", tiệm mình thì không',
    desc: 'Khách quen dần với việc được kết nối bác sĩ tại chuỗi. Nhà thuốc nhỏ cần cùng công cụ đó để giữ khách — với chi phí phù hợp.',
  },
]

// Section 4 (AIDA): Social Proof
export const HOME_STATS = [
  { value: '6', label: 'nhà thuốc Gò Vấp đã có BriMed' },
  { value: '500+', label: 'toa điện tử đã cấp' },
  { value: '~7 phút', label: 'thời gian chờ trung bình' },
  { value: '98%', label: 'khách đánh giá hài lòng' },
]

export const PARTNER_STATS = [
  { value: '6', label: 'nhà thuốc Gò Vấp đang hợp tác' },
  { value: '15', label: 'toa/ngày mỗi nhà thuốc (dự kiến)' },
  { value: '+4,05trđ', label: 'lãi gộp thêm mỗi tháng (kịch bản 15 toa/ngày)' },
]

export const CUSTOMER_TESTIMONIALS = [
  {
    name: 'Chị Ngọc Lan',
    meta: '42 tuổi · Gò Vấp',
    quote: 'Con tôi viêm họng mà bận quá không đưa đi khám được. Ra nhà thuốc gần nhà, quét mã chừng 10 phút là có đơn bác sĩ kê — tiện thật sự.',
  },
  {
    name: 'Chú Văn Hùng',
    meta: '58 tuổi · Gò Vấp',
    quote: 'Tôi không rành điện thoại nên dược sĩ làm giúp từ đầu đến cuối. Bác sĩ gọi hỏi vài câu rồi cho thuốc. Khỏi phải xếp hàng bệnh viện.',
  },
  {
    name: 'Chị Thanh Mai',
    meta: '35 tuổi · Tân Bình',
    quote: 'Trào ngược tái phát mà toa cũ hết hạn. Dùng BriMed có đơn ngay tại quầy, chỉ 25.000đ phí khám — rẻ hơn đi khám cả chục lần.',
  },
]

export const PARTNER_TESTIMONIALS = [
  {
    name: 'DS. Nguyễn Minh Châu',
    meta: 'Nhà thuốc Minh Châu · P.17, Gò Vấp',
    quote: 'Trước cứ khách cần kháng sinh là chịu. Giữ khách bằng BriMed, trung bình thêm hơn chục đơn mỗi ngày mà không phải thuê người.',
  },
  {
    name: 'DS. Trần An Khang',
    meta: 'Nhà thuốc An Khang · Lê Đức Thọ',
    quote: 'Khách đứng tại quầy được bác sĩ gọi xác nhận trong vài phút, ai cũng bất ngờ vì nhanh. Standee dựng lên là khách tự hỏi.',
  },
  {
    name: 'DS. Phạm Phúc An',
    meta: 'Nhà thuốc Phúc An · P.4, Gò Vấp',
    quote: 'Lo nhất là vụ phạt thuốc kê đơn không đơn. Có mã đơn điện tử rõ ràng, bán đúng luật, mình cũng yên tâm hơn nhiều.',
  },
]

// Section 5 (AIDA): Urgency
export const PARTNER_URGENCY = {
  badge: 'Ưu đãi khai trương Gò Vấp',
  title: 'Miễn phí standee + tặng thêm 2 tuần sử dụng',
  desc: 'Dành cho 20 nhà thuốc đầu tiên đăng ký gói 3 tháng tại Gò Vấp. BriMed lắp đặt standee và mã QR tận quầy trong 48 giờ.',
  taken: 14,
  total: 20,
  cta: 'Giữ suất của bạn',
}

// Form action mock (trang chủ)
export const CUSTOMER_LEAD_NOTE = {
  title: 'Nhận danh sách nhà thuốc có BriMed gần bạn',
  desc: 'Để lại số điện thoại — BriMed gửi qua tin nhắn trong web danh sách nhà thuốc gần nhất có mã QR và hướng dẫn sử dụng từ A đến Z.',
}

export const PAYMENT_METHODS = ['Chuyển khoản ngân hàng', 'Ví điện tử (Momo/ZaloPay)', 'Tiền mặt tại nhà thuốc']

// FAQ nhà thuốc
export const PARTNER_FAQ = [
  {
    q: 'Ngoài phí thuê bao còn phát sinh chi phí nào không?',
    a: 'Không. Phí thuê bao đã bao gồm standee, mã QR, mạng lưới bác sĩ và hệ thống đơn điện tử. Khách của tiệm tự trả phí khám 25.000đ/lượt qua VietQR trong web — nhà thuốc không thu hộ, không tất toán thêm. BriMed không thu hoa hồng tiền thuốc.',
  },
  {
    q: 'Sau khi đăng ký, bao lâu thì lắp đặt xong?',
    a: 'BriMed liên hệ trong 24 giờ làm việc và hẹn lắp standee cùng mã QR tận quầy trong 48 giờ. Bạn chỉ cần một góc mặt tiền nhỏ để đặt standee.',
  },
  {
    q: 'Nhà thuốc tôi cần chuẩn bị gì để dùng BriMed?',
    a: 'Cần phần mềm bán thuốc đã liên thông Cơ sở dữ liệu Dược quốc gia (bắt buộc từ 01/01/2026) và điện thoại/máy tính bảng cho khách không dùng smartphone. Không cần thiết bị đắt tiền nào khác.',
  },
  {
    q: 'Khách của tiệm trả tiền thế nào? Tôi có phải thu tiền giúp không?',
    a: 'Khách tự trả phí khám 25.000đ/lượt qua VietQR ngay trên BriMed — nhà thuốc không thu hộ, không tất toán thêm. Bạn chỉ bán thuốc theo mã đơn và thu tiền thuốc như bình thường.',
  },
  {
    q: 'Nếu thuốc trong đơn hết hàng hoặc bác sĩ từ chối kê đơn thì sao?',
    a: 'Hết hàng: bạn bấm "Yêu cầu đổi hoạt chất tương đương", bác sĩ duyệt thuốc thay thế còn trong kho và ký số cấp lại đơn trong vài phút. Bác sĩ có quyền từ chối ca nặng và hướng dẫn khách đi khám trực tiếp — cả hai đều được hệ thống ghi nhận minh bạch.',
  },
]
