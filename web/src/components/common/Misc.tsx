import type { ReactNode } from 'react'
import { ORDER_STEPS } from '../../data/constants'
import { CheckCircle2, Circle, Loader2 } from 'lucide-react'

export function StatusBadge({ label, cls }: { label: string; cls: string }) {
  return <span className={`badge ${cls}`}>{label}</span>
}

export function EmptyState({ icon, title, desc, action }: { icon?: ReactNode; title: string; desc?: string; action?: ReactNode }) {
  return (
    <div className="card p-8 text-center">
      <div className="mx-auto mb-3 w-14 h-14 rounded-full bg-lightblue/50 flex items-center justify-center text-primary">
        {icon ?? <Circle size={24} />}
      </div>
      <h3 className="font-bold text-slate-700">{title}</h3>
      {desc && <p className="text-[14px] text-slate-500 mt-1">{desc}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function PageLoading() {
  return (
    <div className="flex items-center justify-center py-20 text-primary">
      <Loader2 size={28} className="animate-spin" />
      <span className="ml-2 text-slate-500">Đang tải…</span>
    </div>
  )
}

export function SectionCard({ title, action, children, className = '' }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`card p-4 ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between mb-3">
          {title && <h2 className="section-title">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

// Timeline theo dõi trạng thái đơn hàng 4 bước
export function OrderTimeline({ status }: { status: string }) {
  const idx = ORDER_STEPS.findIndex((s) => s.key === status)
  return (
    <ol className="flex items-center">
      {ORDER_STEPS.map((step, i) => {
        const done = i < idx
        const active = i === idx
        return (
          <li key={step.key} className={`flex-1 flex flex-col items-center relative ${i > 0 ? 'before:absolute before:right-1/2 before:left-[-50%] before:top-[13px] before:h-0.5' : ''} ${done ? 'before:bg-mint-fg' : 'before:bg-slate-200'}`}>
            <span
              className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center ${
                done ? 'bg-mint-fg text-white' : active ? 'bg-primary text-white pulse-ring' : 'bg-slate-200 text-slate-400'
              }`}
            >
              {done ? <CheckCircle2 size={16} /> : <Circle size={12} />}
            </span>
            <span className={`mt-1.5 text-[11px] leading-tight text-center px-1 ${active ? 'font-bold text-primary' : done ? 'text-mint-fg font-medium' : 'text-slate-400'}`}>
              {step.label}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

// Stepper điều hướng 4 bước quy trình (mobile)
export function FlowStepper({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= current ? 'bg-primary' : 'bg-slate-200'}`} />
      ))}
    </div>
  )
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-slate-900/50 p-0 sm:p-4" onClick={onClose}>
      <div
        className={`bg-white w-full ${wide ? 'sm:max-w-2xl' : 'sm:max-w-md'} rounded-t-2xl sm:rounded-2xl shadow-card max-h-[88vh] overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="sticky top-0 bg-white/95 backdrop-blur px-4 py-3 border-b border-slate-100 flex items-center justify-between rounded-t-2xl">
          <h3 className="font-bold text-bluedark">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1" aria-label="Đóng">
            ✕
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  )
}
