import { Link } from 'react-router-dom'
import { LogIn, Stethoscope } from 'lucide-react'

const NAV_LINKS = [
  { href: '#tinh-nang', label: 'Tính năng' },
  { href: '#3-buoc', label: 'Cách hoạt động' },
  { href: '#gia', label: 'Giá' },
  { href: '#faq', label: 'Hỏi đáp' },
]

// Navbar viên nang nổi — riêng cho Customer Landing Page
// Giữ nguyên điều hướng hiện hữu: Đăng nhập & vào luồng khám đều về /auth
export default function LandingNavbar() {
  return (
    <div className="sticky top-4 z-50 mx-auto max-w-6xl px-4">
      <nav className="flex items-center justify-between gap-3 rounded-full border border-blue-100/80 bg-white/75 px-4 py-2.5 shadow-[0_8px_30px_rgba(37,99,235,0.10)] backdrop-blur-md sm:px-6">
        <Link to="/" className="flex shrink-0 items-center gap-2.5">
          <img src="/assets/logo.png" alt="BriMed" className="h-9 w-9 rounded-full ring-2 ring-cyan-100" />
          <div className="hidden leading-tight sm:block">
            <div className="text-[15px] font-extrabold text-blue-900">BriMed</div>
            <div className="text-[9.5px] font-bold uppercase tracking-wider text-violet-500">GenZ Care · Safe Meds</div>
          </div>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-full px-3.5 py-2 text-[13.5px] font-semibold text-slate-600 transition-colors hover:bg-blue-50 hover:text-blue-700"
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Link
            to="/auth"
            className="hidden items-center gap-1.5 rounded-full px-4 py-2 text-[13.5px] font-bold text-blue-700 transition-colors hover:bg-blue-50 sm:inline-flex"
          >
            <LogIn size={15} /> Đăng nhập
          </Link>
          <Link
            to="/auth"
            className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-4 py-2.5 text-[13.5px] font-bold text-white shadow-[0_8px_20px_rgba(37,99,235,0.35)] transition-all hover:-translate-y-0.5 hover:bg-blue-700 sm:px-5"
          >
            <Stethoscope size={15} /> Bắt đầu khám
          </Link>
        </div>
      </nav>
    </div>
  )
}
