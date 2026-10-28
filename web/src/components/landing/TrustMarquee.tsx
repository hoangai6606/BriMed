import { ShieldCheck, Pill, PenLine, Lock, Zap } from 'lucide-react'

const ITEMS = [
  { icon: ShieldCheck, text: '100% Bác sĩ có chứng chỉ hành nghề' },
  { icon: Pill, text: 'Minh bạch hoạt chất – Không lạm dụng kháng sinh' },
  { icon: PenLine, text: 'Đơn thuốc điện tử chữ ký số' },
  { icon: Lock, text: 'Bảo mật hồ sơ sức khỏe cá nhân' },
  { icon: Zap, text: 'Kết nối nhà thuốc đối soát tự động' },
]

// Dải băng chuyền cam kết an toàn chạy vô hạn, tạm dừng khi hover
export default function TrustMarquee() {
  const row = [...ITEMS, ...ITEMS]
  return (
    <div className="marquee-wrap relative overflow-hidden border-y border-blue-100/70 bg-blue-50/80 py-4">
      <div className="animate-marquee flex w-max items-center gap-10 pr-10">
        {row.map((it, i) => (
          <span key={i} className="flex items-center whitespace-nowrap text-[13.5px] font-bold text-blue-900/80">
            <it.icon size={17} className="mr-2.5 text-cyan-500" />
            {it.text}
            <span className="ml-10 h-1.5 w-1.5 rounded-full bg-blue-200" aria-hidden="true" />
          </span>
        ))}
      </div>
    </div>
  )
}
