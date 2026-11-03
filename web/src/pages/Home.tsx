import { Link } from 'react-router-dom'
import { QrCode, Clock, ShieldCheck, Pill, Stethoscope, CheckCircle2, XCircle, Store, Ban, Wallet, Star, UserX, AlertTriangle } from 'lucide-react'
import { SeoMeta } from '../components/common/SeoMeta'
import Landing from '../components/landing/Landing'
import { api } from '../api/client'
import { SEO } from '../data/constants'

// ===== Các component dùng chung với trang đối tác & landing gói (giữ nguyên hành vi) =====
export function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2.5">
          <img src="/assets/logo.png" alt="BriMed" className="h-10 w-10 rounded-full" />
          <div className="leading-tight">
            <div className="text-[17px] font-extrabold text-bluedark">BriMed</div>
            <div className="hidden text-[10.5px] text-slate-500 sm:block">Đơn thuốc an toàn cho bạn an tâm</div>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <Link to="/auth" className="btn-ghost !px-3 text-[14px]">
            Đăng nhập
          </Link>
          <Link to="/auth" className="btn-primary !px-3 text-[13px]">
            <QrCode size={17} /> <span className="hidden sm:inline">Toa thuốc nhanh</span>
          </Link>
        </div>
      </div>
    </header>
  )
}

export function PublicFooter() {
  return (
    <footer className="mt-14 bg-bluedark text-white">
      <div className="mx-auto grid max-w-5xl gap-6 px-4 py-10 text-[13.5px] sm:grid-cols-3">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <img src="/assets/logo.png" alt="BriMed" className="h-9 w-9 rounded-full" />
            <span className="text-[16px] font-extrabold">BriMed</span>
          </div>
          <p className="leading-relaxed text-white/70">
            Đơn thuốc an toàn cho bạn an tâm. Kết nối Bệnh nhân – Bác sĩ – Nhà thuốc với toa thuốc điện tử nhanh tại quầy (TT 26/2025).
          </p>
        </div>
        <div>
          <h3 className="mb-2.5 font-bold">Dành cho nhà thuốc</h3>
          <ul className="space-y-1.5 text-white/70">
            <li><Link className="hover:text-white" to={SEO.pkg1.slug}>Nhà thuốc: tháng đầu miễn phí, 500.000đ/tháng</Link></li>
            <li><Link className="hover:text-white" to={SEO.pkg3.slug}>Phí ổn định: 900.000đ/tháng</Link></li>
            <li><Link className="hover:text-white" to="/nha-thuoc-doi-tac">Đăng ký nhà thuốc đối tác</Link></li>
            <li>Hotline: 1900 2026</li>
          </ul>
        </div>
        <div>
          <h3 className="mb-2.5 font-bold">Pháp lý &amp; an toàn</h3>
          <ul className="space-y-1.5 text-white/70">
            <li>Bệnh theo danh mục TT 30/2023/TT-BYT</li>
            <li>Đơn điện tử số hóa theo TT 26/2025/TT-BYT</li>
            <li>Bác sĩ thật – đơn thật – có quyền từ chối</li>
            <li>Không dành cho cấp cứu. Khẩn cấp gọi 115.</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-[12px] text-white/60">
        © 2026 BriMed. Phòng khám đối tác có giấy phép · Giấy phép số ……………
      </div>
    </footer>
  )
}

// Icon map cho các card nỗi đau (dữ liệu mock)
export const PAIN_ICONS: Record<string, any> = {
  clock: Clock, ban: Ban, wallet: Wallet, 'user-x': UserX, alert: AlertTriangle, store: Store,
}

// Card lời khen dùng chung cho trang khách hàng & nhà thuốc (dữ liệu mock minh họa)
export function TestimonialCard({ name, meta, quote }: { name: string; meta: string; quote: string }) {
  const initials = name.replace('DS. ', '').split(' ').slice(-2).map((w) => w[0]).join('')
  return (
    <figure className="card flex flex-col p-4">
      <div className="flex gap-0.5 text-amber-400" aria-label="Đánh giá 5/5 sao">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} size={16} fill="currentColor" />
        ))}
      </div>
      <blockquote className="mt-2.5 flex-1 text-[14px] leading-relaxed text-slate-600">“{quote}”</blockquote>
      <figcaption className="mt-3 flex items-center gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-lightblue text-[13px] font-bold text-bluedark">
          {initials}
        </span>
        <div>
          <div className="text-[13.5px] font-bold text-slate-700">{name}</div>
          <div className="text-[12px] text-slate-400">{meta}</div>
        </div>
      </figcaption>
    </figure>
  )
}

// ===== Customer Landing Page theo thiết kế Figma Make =====
// Form đăng ký lưu về server (patient_leads) cho bảng điều khiển quản trị
export default function Home() {
  return (
    <>
      <SeoMeta
        title="BriMed – Khám bác sĩ online & mua thuốc an toàn, minh bạch"
        description="BriMed: kết nối bác sĩ thật ngay tại quầy thuốc — phí khám 25.000đ/lượt thanh toán VietQR trong web, đơn điện tử ký số, nhận thuốc sau ~10 phút. Không cần cài app."
      />
      <Landing
        submitLead={async (form) => {
          const d = await api('/catalog/patient-leads', { method: 'POST', body: JSON.stringify(form) })
          return d.message as string
        }}
      />
    </>
  )
}
