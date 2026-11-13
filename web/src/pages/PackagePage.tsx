import { Link } from 'react-router-dom'
import { CheckCircle2, Phone, ShieldCheck, QrCode, Clock, Pill, FileCheck2, Store, AlertTriangle } from 'lucide-react'
import { SeoMeta } from '../components/common/SeoMeta'
import { SEO } from '../data/constants'
import { PublicHeader, PublicFooter } from './Home'

const BENEFITS = [
  'Standee và mã QR đặt tại quầy',
  'Bác sĩ từ xa kê đơn điện tử ký số, mã tra cứu quốc gia trên từng đơn',
  'Bán thuốc theo mã đơn; khách giữ quyền mang toa đi nơi khác',
  'Không kho, không giao hàng: thuốc có sẵn tại nhà thuốc',
  'Giảm rủi ro bị phạt 10–20 triệu đồng khi bán thuốc kê đơn không có đơn (Nghị định 90/2026)',
]

const SCOPE =
  'Cúm, viêm mũi họng cấp/mạn, COVID-19, bệnh da dị ứng/nấm, viêm kết mạc, đau đầu do căng thẳng, đau nửa đầu, viêm dạ dày – tá tràng, trào ngược, táo bón. Không nhận: viêm phế quản, viêm phổi, tiêu chảy, sốt cao kéo dài, trẻ nhỏ, thai phụ, thuốc gây nghiện/hướng thần. Bác sĩ có quyền từ chối kê đơn. Kháng sinh theo chính sách riêng và báo cáo tỷ lệ; nhà thuốc không hứa hay quảng cáo "có kháng sinh".'

export default function PackagePage({ pkg }: { pkg: '1' | '3' }) {
  const is3 = pkg === '3'
  const seo = is3 ? SEO.pkg3 : SEO.pkg1
  return (
    <div className="min-h-screen bg-slate-50">
      <SeoMeta title={seo.title} description={seo.meta} />
      <PublicHeader />

      <main className="max-w-3xl mx-auto px-4 py-8">
        <nav className="text-[12.5px] text-slate-400 mb-4" aria-label="Breadcrumb">
          <Link to="/" className="hover:text-primary">Trang chủ</Link> <span className="mx-1">/</span>
          <span className="text-slate-600">{is3 ? 'Phí giai đoạn ổn định' : 'Phí 6 tháng đầu'}</span>
        </nav>

        <article>
          <h1 className="text-[24px] sm:text-[30px] font-extrabold text-bluedark leading-tight">{seo.h1}</h1>

          <div className="card p-5 mt-5 border-2 border-primary/25">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="text-[28px] font-extrabold text-primary">{is3 ? '900.000đ' : '500.000đ'}</div>
                <div className="text-[13px] text-slate-500">{is3 ? 'mỗi tháng · áp dụng từ tháng thứ 7' : 'mỗi tháng · áp dụng 6 tháng đầu (tháng đầu miễn phí)'}</div>
              </div>
              <span className={`badge ${is3 ? 'bg-pink text-white' : 'bg-lightblue text-bluedark'}`}>
                {is3 ? 'Giá ổn định dài hạn' : 'Tháng đầu miễn phí'}
              </span>
            </div>
            <a href="#dang-ky" className={`${is3 ? 'btn-pink' : 'btn-primary'} w-full mt-4`}>
              Đăng ký BriMed cho nhà thuốc ngay
            </a>
          </div>

          <section className="mt-7">
            <h2 className="font-bold text-[19px] text-bluedark mb-3">
              {is3 ? 'Đừng từ chối khách, hãy gọi bác sĩ: phí ổn định 900.000đ/tháng' : 'Khách không có toa? Gọi bác sĩ ngay tại quầy'}
            </h2>
            <p className="text-[15px] text-slate-600 leading-relaxed">
              {is3
                ? 'Nhà thuốc nhỏ chưa có "bác sĩ trực" như chuỗi lớn. Gói 3 tháng BriMed giúp nhà thuốc của bạn có sẵn bác sĩ từ xa ngay tại quầy: khách quét QR, bác sĩ kê đơn điện tử hợp lệ, bạn bán thuốc theo mã đơn. Khách chờ khoảng 7 phút, không cần cài app.'
                : 'Khách đến nhà thuốc mua thuốc cảm cúm, viêm họng nhưng không có toa? Với BriMed, khách quét mã QR, trả lời vài câu hỏi, bác sĩ từ xa kê đơn điện tử hợp lệ trong vài phút, và khách mua thuốc ngay tại quầy của bạn. Khách chờ khoảng 7 phút, không cần cài app.'}
            </p>
          </section>

          <section className="mt-7">
            <h2 className="font-bold text-[19px] text-bluedark mb-3">Nhà thuốc nhận được</h2>
            <ul className="space-y-2.5">
              {BENEFITS.map((b) => (
                <li key={b} className="flex gap-2.5 text-[14.5px] text-slate-700 card p-3.5">
                  <CheckCircle2 size={19} className="text-mint-fg shrink-0 mt-0.5" /> {b}
                </li>
              ))}
            </ul>
          </section>

          {is3 && (
            <section className="mt-7 card p-4 bg-lightblue/25">
              <h2 className="font-bold text-[16px] text-bluedark mb-1.5">Hiệu quả ước tính</h2>
              <p className="text-[14px] text-slate-600 leading-relaxed">
                Phí BriMed ở giai đoạn ổn định là <strong>900.000đ/tháng</strong>. Lợi ích thực tế của nhà thuốc (lượng khách tăng nhờ có bác sĩ từ xa tại quầy) sẽ được BriMed và nhà thuốc cùng đo đếm bằng số liệu thật trong quá trình vận hành — BriMed không thu bất kỳ hoa hồng nào trên tiền thuốc bán được.
              </p>
            </section>
          )}

          <section className="mt-7 card p-4">
            <h2 className="font-bold text-[16px] text-bluedark mb-2">Khách của tiệm trả bao nhiêu?</h2>
            <p className="text-[14px] text-slate-600 leading-relaxed">
              Khách tự trả <strong>25.000đ/lượt khám</strong> qua VietQR ngay trong web BriMed — nhà thuốc không thu hộ, không tất toán.
              BriMed không thu hoa hồng tiền thuốc: khách mua thuốc tại quầy theo đúng giá niêm yết của tiệm.
            </p>
          </section>

          <section className="mt-7 card p-4">
            <div className="flex gap-2.5">
              <AlertTriangle size={19} className="text-pink shrink-0 mt-0.5" />
              <div>
                <h2 className="font-bold text-[16px] text-bluedark mb-2">Phạm vi bệnh & giới hạn an toàn</h2>
                <p className="text-[13.5px] text-slate-600 leading-relaxed">{SCOPE}</p>
                <p className="text-[13.5px] text-slate-600 mt-2 leading-relaxed">
                  Điều kiện: nhà thuốc có phần mềm bán thuốc liên thông Cơ sở dữ liệu dược (bắt buộc từ 01/01/2026); điện thoại khách hoặc máy tính bảng của nhà thuốc.
                </p>
              </div>
            </div>
          </section>

          <section className="mt-7 grid sm:grid-cols-3 gap-3">
            {[
              { icon: Clock, t: 'Khách chờ ~7 phút', d: 'Quy trình 5 bước tối ưu' },
              { icon: ShieldCheck, t: 'Bác sĩ thật, đơn thật', d: 'Ký số theo TT 26/2025' },
              { icon: FileCheck2, t: 'Đơn liên thông quốc gia', d: 'Số định danh từng đơn' },
            ].map((x) => (
              <div key={x.t} className="card p-4 text-center">
                <x.icon size={24} className="mx-auto text-primary mb-2" />
                <div className="font-bold text-[14px] text-bluedark">{x.t}</div>
                <div className="text-[12px] text-slate-500 mt-0.5">{x.d}</div>
              </div>
            ))}
          </section>

          <section id="dang-ky" className="mt-8 card p-5 border-2 border-pink/30 text-center">
            <Store size={30} className="mx-auto text-pink mb-2" />
            <h2 className="font-extrabold text-[19px] text-bluedark">
              Đăng ký {is3 ? 'gói 3 tháng' : 'gói 1 tháng'} ngay
            </h2>
            <p className="text-[14px] text-slate-600 mt-1.5">
              Để BriMed hẹn lắp standee và mã QR tại nhà thuốc của bạn.
            </p>
            <div className="flex flex-col sm:flex-row gap-2.5 justify-center mt-4">
              <Link to="/nha-thuoc-doi-tac#dang-ky" className="btn-pink">
                <QrCode size={17} /> Điền form đăng ký đối tác
              </Link>
              <a href="tel:19002026" className="btn-outline">
                <Phone size={17} /> Hotline 1900 2026
              </a>
            </div>
          </section>

          <p className="text-[12.5px] text-slate-400 mt-6 leading-relaxed">
            Thông tin cơ sở khám: Phòng khám đối tác …………… | Giấy phép số …………… · Thuốc chỉ bán khi có đơn hợp lệ; người bệnh có quyền lựa chọn nơi mua thuốc.
          </p>
        </article>
      </main>
      <PublicFooter />
    </div>
  )
}
