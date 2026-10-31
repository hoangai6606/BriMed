import { CheckCircle2, Info, X, AlertTriangle } from 'lucide-react'
import { useUi } from '../../store/ui'

export function Toasts() {
  const { toasts, dismiss } = useUi()
  if (!toasts.length) return null
  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[100] w-[92%] max-w-md space-y-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={`flex items-start gap-2 rounded-xl px-4 py-3 shadow-card text-[14px] font-medium ${
            t.type === 'success' ? 'bg-mint-bg text-mint-fg' : t.type === 'error' ? 'bg-redflag-bg text-redflag-fg' : 'bg-lightblue text-bluedark'
          }`}
        >
          {t.type === 'success' ? <CheckCircle2 size={18} className="shrink-0 mt-0.5" /> : t.type === 'error' ? <AlertTriangle size={18} className="shrink-0 mt-0.5" /> : <Info size={18} className="shrink-0 mt-0.5" />}
          <span className="flex-1">{t.message}</span>
          <button onClick={() => dismiss(t.id)} aria-label="Đóng thông báo" className="opacity-60 hover:opacity-100">
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  )
}
