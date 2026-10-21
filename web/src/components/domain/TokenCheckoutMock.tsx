import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Coins, CheckCircle2, ChevronLeft, CreditCard, ShieldCheck, Sparkles, ArrowRight } from 'lucide-react'
import { TOKEN_PACKAGES, PAYMENT_METHODS } from '../../data/constants'
import { fmtVnd } from '../../api/client'

const STEPS = ['Chọn gói', 'Thông tin', 'Xác nhận'] as const

// Luồng checkout nạp token — xử lý phía client; tích hợp cổng thanh toán + API khi kết nối backend.
export function TokenCheckoutMock() {
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0)
  const [pkgId, setPkgId] = useState('popular')
  const [form, setForm] = useState({ name: '', phone: '' })
  const [pay, setPay] = useState(PAYMENT_METHODS[0])
  const [orderCode, setOrderCode] = useState('')

  const pkg = TOKEN_PACKAGES.find((p) => p.id === pkgId)!
  const canContinue = form.name.trim().length > 0 && /^0\d{9}$/.test(form.phone)

  const submit = () => {
    setOrderCode('TT-2026-' + String(Math.floor(10000 + Math.random() * 90000)))
    setStep(3)
  }

  const reset = () => {
    setStep(0)
    setForm({ name: '', phone: '' })
    setOrderCode('')
  }

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-bluedark px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-white">
          <span className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center">
            <Coins size={16} />
          </span>
          <span className="font-bold text-[15px]">Nạp token BriMed</span>
        </div>
        <span className="badge bg-white/15 text-white !text-[10.5px]">Thanh toán an toàn</span>
      </div>

      {/* Stepper */}
      {step < 3 && (
        <div className="px-4 pt-4 pb-1">
          <div className="flex items-start">
            {STEPS.map((label, i) => {
              const done = i < step
              const active = i === step
              return (
                <div key={label} className="flex-1 flex flex-col items-center relative">
                  {i > 0 && (
                    <span
                      className={`absolute right-1/2 left-[-50%] top-[13px] h-0.5 ${i <= step ? 'bg-primary' : 'bg-slate-200'}`}
                      aria-hidden="true"
                    />
                  )}
                  <span
                    className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold ${
                      done ? 'bg-mint-fg text-white' : active ? 'bg-primary text-white' : 'bg-slate-200 text-slate-400'
                    }`}
                  >
                    {done ? <CheckCircle2 size={15} /> : i + 1}
                  </span>
                  <span className={`mt-1 text-[11px] font-semibold ${active ? 'text-primary' : done ? 'text-mint-fg' : 'text-slate-400'}`}>
                    {label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="p-4">
        {/* Bước 1 — chọn gói */}
        {step === 0 && (
          <div className="space-y-2.5">
            {TOKEN_PACKAGES.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPkgId(p.id)}
                aria-pressed={pkgId === p.id}
                className={`w-full text-left rounded-xl border-2 px-3.5 py-3 transition relative ${
                  pkgId === p.id ? 'border-primary bg-lightblue/30' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {p.popular && (
                  <span className="absolute -top-2.5 right-3 badge bg-pink text-white !text-[10px]">Phổ biến nhất</span>
                )}
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="font-bold text-[14.5px] text-bluedark">{p.name}</div>
                    <div className="text-[12.5px] text-slate-500">{p.tokens} token · {p.per}</div>
                    <div className="text-[11.5px] text-slate-400">{p.note}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-extrabold text-[16px] text-primary">{fmtVnd(p.price)}</div>
                    {p.save && <div className="text-[11px] text-pink-dark font-semibold">{p.save}</div>}
                  </div>
                </div>
              </button>
            ))}
            <p className="text-[11.5px] text-slate-400 flex items-center gap-1">
              <Sparkles size={12} /> 2 toa đầu tiên vẫn miễn phí — token chỉ dùng sau đó.
            </p>
            <button type="button" onClick={() => setStep(1)} className="btn-primary w-full">
              Tiếp tục <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* Bước 2 — thông tin */}
        {step === 1 && (
          <div className="space-y-3">
            <div>
              <label className="label" htmlFor="co-name">Họ và tên</label>
              <input
                id="co-name"
                className="input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="VD: Nguyễn Thị Lan"
              />
            </div>
            <div>
              <label className="label" htmlFor="co-phone">Số điện thoại / Zalo</label>
              <input
                id="co-phone"
                className="input"
                inputMode="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="09xx xxx xxx"
              />
              {form.phone.length > 0 && !/^0\d{9}$/.test(form.phone) && (
                <p className="mt-1 text-[11.5px] text-redflag-fg">Số điện thoại cần 10 chữ số, bắt đầu bằng 0.</p>
              )}
            </div>
            <div className="rounded-xl bg-lightblue/30 px-3 py-2.5 text-[12.5px] text-bluedark flex items-center justify-between">
              <span>{pkg.name} · {pkg.tokens} token</span>
              <strong>{fmtVnd(pkg.price)}</strong>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setStep(0)} className="btn-outline !text-[13.5px]">
                <ChevronLeft size={15} /> Quay lại
              </button>
              <button type="button" onClick={() => setStep(2)} disabled={!canContinue} className="btn-primary !text-[13.5px]">
                Tiếp tục
              </button>
            </div>
            <p className="text-[11px] text-slate-400">Thông tin của bạn được bảo mật và chỉ dùng để cộng token vào tài khoản.</p>
          </div>
        )}

        {/* Bước 3 — xác nhận & thanh toán */}
        {step === 2 && (
          <div className="space-y-3">
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 text-[13px] space-y-1.5">
              <div className="flex justify-between gap-2"><span className="text-slate-500">Người nhận</span><span className="font-semibold text-slate-700 text-right">{form.name}</span></div>
              <div className="flex justify-between gap-2"><span className="text-slate-500">SĐT / Zalo</span><span className="font-semibold text-slate-700">{form.phone}</span></div>
              <div className="flex justify-between gap-2"><span className="text-slate-500">Gói</span><span className="font-semibold text-slate-700 text-right">{pkg.name} · {pkg.tokens} token</span></div>
              <div className="flex justify-between items-center border-t border-slate-200 pt-1.5">
                <span className="font-bold text-bluedark">Tổng thanh toán</span>
                <span className="font-extrabold text-[16px] text-pink">{fmtVnd(pkg.price)}</span>
              </div>
            </div>
            <div>
              <span className="label">Hình thức thanh toán</span>
              <div className="space-y-1.5">
                {PAYMENT_METHODS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPay(m)}
                    aria-pressed={pay === m}
                    className={`w-full flex items-center gap-2.5 rounded-xl border-2 px-3 py-2.5 text-[13px] font-semibold text-left transition ${
                      pay === m ? 'border-primary bg-lightblue/30 text-bluedark' : 'border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    <span className={`w-[18px] h-[18px] rounded-full border-2 shrink-0 flex items-center justify-center ${pay === m ? 'border-primary' : 'border-slate-300'}`}>
                      {pay === m && <span className="w-2.5 h-2.5 rounded-full bg-primary" />}
                    </span>
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setStep(1)} className="btn-outline !text-[13.5px]">
                <ChevronLeft size={15} /> Quay lại
              </button>
              <button type="button" onClick={submit} className="btn-pink !text-[13.5px]">
                <CreditCard size={15} /> Thanh toán
              </button>
            </div>
            <p className="text-[11px] text-slate-400 flex items-start gap-1">
              <ShieldCheck size={13} className="shrink-0 mt-0.5" /> Giao dịch được mã hóa an toàn — token cộng vào tài khoản ngay sau khi thanh toán.
            </p>
          </div>
        )}

        {/* Bước 4 — thành công */}
        {step === 3 && (
          <div className="text-center py-2">
            <div className="mx-auto w-14 h-14 rounded-full bg-mint-bg flex items-center justify-center mb-3">
              <CheckCircle2 size={30} className="text-mint-fg" />
            </div>
            <h3 className="font-extrabold text-[17px] text-bluedark">Nạp token thành công!</h3>
            <p className="text-[13px] text-slate-500 mt-1">
              Mã giao dịch <strong className="text-bluedark">{orderCode}</strong> · +{pkg.tokens} token
            </p>
            <div className="mt-3 rounded-xl bg-mint-bg/60 px-3 py-2 text-[12.5px] text-mint-fg font-semibold">
              Số dư hiện tại: {pkg.tokens} token ≈ {pkg.per}
            </div>
            <p className="mt-2 text-[12px] text-slate-500">Đã thanh toán qua {pay}.</p>
            <button type="button" onClick={reset} className="btn-outline w-full mt-3 !text-[13px]">
              Làm lại
            </button>
            <Link to="/auth" className="btn-primary w-full mt-2 !text-[13.5px]">
              Tạo tài khoản để dùng thật
            </Link>
            <p className="text-[11px] text-slate-400 mt-2">Biên nhận điện tử đã được gửi qua Zalo/SMS.</p>
          </div>
        )}
      </div>
    </div>
  )
}
