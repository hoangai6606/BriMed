import {
  RefreshCw, ShieldCheck, Video, FileCheck2, Wallet, Lock, ArrowRight, TrendingDown, CheckCircle2, Sun, Sunset, Moon, Timer,
} from 'lucide-react'
import { SectionHeader } from './SectionHeader'
import { Reveal } from './Reveal'

const CARD_CLS =
  'group flex h-full flex-col rounded-3xl border border-blue-100/80 bg-white p-6 shadow-[0_16px_40px_rgba(37,99,235,0.06)] transition-all duration-300 hover:-translate-y-1.5 hover:border-cyan-200 sm:p-7'

function IconChip({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow-md transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 ${className}`}>
      {children}
    </span>
  )
}

function DetailList({ items }: { items: string[] }) {
  return (
    <ul className="mt-5 space-y-2 border-t border-dashed border-blue-100 pt-4">
      {items.map((it) => (
        <li key={it} className="flex items-start gap-2 text-[13px] font-medium leading-relaxed text-slate-600">
          <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-500" /> {it}
        </li>
      ))}
    </ul>
  )
}

// Section chi tiết: frame bác sĩ, đổi hoạt chất, đơn điện tử, ví token (chuyển từ Hero xuống) + bổ sung chi tiết
export default function BentoShowcase() {
  return (
    <section id="tinh-nang" className="scroll-mt-28 bg-slate-50/70 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4">
        <SectionHeader
          kicker="Trải nghiệm nổi bật"
          title={<>Mỗi tính năng đều <span className="text-blue-600">nhìn là hiểu</span></>}
          sub="Giao diện thật của BriMed — minh bạch từng bước, không chữ nhỏ chú thích."
        />

        <div className="grid grid-cols-1 items-stretch gap-5 sm:gap-6 lg:grid-cols-2">
          {/* Card 1 — Gặp bác sĩ 1-1 (frame tư vấn chuyển từ Hero xuống) */}
          <Reveal>
            <article className={CARD_CLS}>
              <IconChip className="bg-blue-600">
                <Video size={20} />
              </IconChip>
              <h3 className="text-[17px] font-extrabold text-slate-900">Gặp bác sĩ 1-1 trong vài phút</h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-slate-500">
                Kết nối nhanh, tâm sự thoải mái — kể cả những vấn đề sức khỏe nhạy cảm bạn ngại hỏi trực tiếp.
              </p>

              <div className="mt-5 rounded-2xl border border-blue-100 bg-slate-50 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-[14px] font-extrabold text-white">
                    TH
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14.5px] font-extrabold text-slate-800">BS. Trần Thị Thu Hà</div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[12px] font-semibold text-emerald-600">
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                      </span>
                      Tai Mũi Họng · Đang trực tuyến
                    </div>
                  </div>
                  <span className="flex shrink-0 items-center gap-1 rounded-full bg-cyan-50 px-2.5 py-1 text-[11px] font-bold text-cyan-700">
                    <Timer size={12} /> SLA &lt; 5 phút
                  </span>
                </div>

                <div className="mt-3.5 space-y-2">
                  <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-blue-50 px-3.5 py-2 text-[12.5px] text-slate-600">
                    Em bị đau họng 2 ngày rồi ạ, hơi khó nuốt 😢
                  </div>
                  <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md border border-cyan-100 bg-white px-3.5 py-2 text-[12.5px] text-slate-700 shadow-sm">
                    Để bác sĩ xem nhé — thể nhẹ chưa cần kháng sinh, giảm đau + súc họng 3 ngày là đỡ 👍
                  </div>
                </div>

                <div className="mt-3.5 flex flex-wrap gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                    <ShieldCheck size={12} /> Chữ ký số xác thực
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">
                    Kiểm soát kháng sinh an toàn
                  </span>
                </div>
              </div>

              <DetailList
                items={[
                  'Gọi ngắn 1–2 phút — không cần bật video nếu bạn ngại',
                  'Sàng lọc theo Thông tư 30/2023 trước khi kê đơn',
                  'Bác sĩ có chứng chỉ hành nghề, hồ sơ công khai',
                ]}
              />
            </article>
          </Reveal>

          {/* Card 2 — Đổi hoạt chất (chuyển từ Hero xuống) */}
          <Reveal delay={80}>
            <article className={CARD_CLS}>
              <IconChip className="bg-emerald-500">
                <RefreshCw size={20} />
              </IconChip>
              <h3 className="text-[17px] font-extrabold text-slate-900">Đổi hoạt chất — tiết kiệm đến 35%</h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-slate-500">
                Thuốc biệt dược gốc hết hàng hoặc quá giá? BriMed gợi ý thuốc <strong>cùng hoạt chất</strong> đang có ngay tại quầy.
              </p>

              <div className="mt-5 rounded-2xl border border-blue-100 bg-slate-50 p-4">
                <div className="flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
                  <div className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-center sm:w-36">
                    <div className="text-[11px] font-semibold text-slate-400">Biệt dược gốc</div>
                    <div className="mt-0.5 text-[15px] font-extrabold text-slate-700">185.000đ</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5 text-cyan-500">
                    <span className="h-0.5 w-5 rounded-full bg-cyan-200" />
                    <ArrowRight size={18} className="transition-transform duration-300 group-hover:translate-x-1.5" />
                  </div>
                  <div className="w-full rounded-xl border border-emerald-200 bg-white px-4 py-3 text-center sm:w-40">
                    <div className="text-[11px] font-semibold text-emerald-600">Cùng hoạt chất</div>
                    <div className="mt-0.5 flex items-center justify-center gap-1.5 text-[15px] font-extrabold text-emerald-700">
                      120.000đ
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                        <TrendingDown size={10} /> 35%
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-[12px] font-bold text-emerald-700">
                  <ShieldCheck size={14} className="shrink-0" /> Hiệu quả tương đương — dược sĩ đối chiếu chéo
                </div>
              </div>

              <DetailList
                items={[
                  'Cùng hoạt chất, cùng hàm lượng — chỉ khác hãng sản xuất',
                  'Bác sĩ duyệt và ký số lại đơn trước khi đổi',
                  'Bạn thấy bảng so sánh giá trước khi đồng ý',
                ]}
              />
            </article>
          </Reveal>

          {/* Card 3 — Đơn thuốc điện tử */}
          <Reveal>
            <article className={CARD_CLS}>
              <IconChip className="bg-violet-600">
                <FileCheck2 size={20} />
              </IconChip>
              <h3 className="text-[17px] font-extrabold text-slate-900">Đơn thuốc điện tử &amp; chữ ký số</h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-slate-500">
                Đơn số hóa chống giả mạo, xem lại mọi lúc và tự nhắc lịch uống thuốc đúng giờ.
              </p>

              <div className="mt-5 rounded-2xl border border-blue-100 bg-slate-50 p-4">
                <div className="rounded-xl border border-blue-100 bg-white p-3.5">
                  <div className="font-mono text-[12.5px] font-bold text-blue-700">VN-Rx-2026-00012</div>
                  <div className="mt-2 space-y-1 text-[12px] text-slate-500">
                    <div>Efferalgan 500mg · 1 viên × 3 lần/ngày</div>
                    <div>Siro ho Astex · 10ml × 3 lần/ngày</div>
                  </div>
                  <div className="mt-2.5 border-t border-dashed border-blue-100 pt-2 text-[11px] font-bold text-emerald-600">
                    Chữ ký số SmartCA · đã xác thực ✓
                  </div>
                  <div className="mt-2.5 flex gap-1.5">
                    {[
                      { icon: Sun, label: 'Sáng' },
                      { icon: Sunset, label: 'Trưa' },
                      { icon: Moon, label: 'Tối' },
                    ].map((r) => (
                      <span key={r.label} className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-[10.5px] font-bold text-violet-600">
                        <r.icon size={11} /> {r.label}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-blue-50 px-3 py-2 text-[12px] font-bold text-blue-700">
                  <ShieldCheck size={14} className="shrink-0" /> Nhà thuốc quét QR đối soát tự động
                </div>
              </div>

              <DetailList
                items={[
                  'Chữ ký số hợp lệ — tra cứu nguồn gốc từng đơn',
                  'Không làm giả được đơn, không phải chụp ảnh giấy',
                  'Nhắc uống thuốc đúng giờ qua Zalo/SMS',
                ]}
              />
            </article>
          </Reveal>

          {/* Card 4 — Ví token & bảo mật (chuyển từ Hero xuống) */}
          <Reveal delay={80}>
            <article className={CARD_CLS}>
              <IconChip className="bg-amber-500">
                <Wallet size={20} />
              </IconChip>
              <h3 className="text-[17px] font-extrabold text-slate-900">Ví Token &amp; hồ sơ bảo mật 2 lớp</h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-slate-500">
                Lịch sử khám của bạn thuộc về bạn — và thanh toán phí tư vấn thì hiện đại như ví điện tử bạn vẫn dùng.
              </p>

              <div className="mt-5 grid gap-3 rounded-2xl border border-blue-100 bg-slate-50 p-4 sm:grid-cols-2">
                <div className="rounded-xl border border-amber-100 bg-white p-3.5">
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-amber-600">🪙 Ví Token</div>
                  <div className="mt-1.5 flex items-baseline gap-2">
                    <span className="text-[24px] font-extrabold leading-none text-blue-700">20 token</span>
                  </div>
                  <div className="mt-1.5">
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10.5px] font-bold text-emerald-700">+ 2 toa miễn phí</span>
                  </div>
                  <div className="mt-2 text-[11.5px] font-semibold text-slate-500">Nạp thêm mọi lúc · không thời hạn</div>
                </div>
                <div className="rounded-xl border border-emerald-100 bg-white p-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-600">Riêng tư</span>
                    <span className="relative inline-flex h-6 w-11 items-center rounded-full bg-emerald-500 px-0.5">
                      <span className="ml-auto h-5 w-5 rounded-full bg-white shadow" />
                    </span>
                  </div>
                  <div className="mt-2 text-[12.5px] font-bold leading-snug text-slate-700">Bác sĩ chỉ xem hồ sơ khi bạn bật cho phép</div>
                  <div className="mt-2 flex items-center gap-1.5 text-[11.5px] font-semibold text-slate-500">
                    <Lock size={12} className="text-emerald-500" /> Ghi log mọi lượt truy cập
                  </div>
                </div>
              </div>

              <DetailList
                items={[
                  '1 token ≈ 5.000đ · 3 token cho 1 toa tại quầy đối tác',
                  'Tài khoản mới tặng 20 token và 2 toa miễn phí',
                  'Mã hóa hồ sơ, phân quyền đúng người đúng lúc',
                ]}
              />
            </article>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
