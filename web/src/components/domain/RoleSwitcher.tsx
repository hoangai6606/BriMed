import { useState } from 'react'
import { Users, X } from 'lucide-react'
import { ROLE_LABELS } from '../../data/constants'

const PERSONAS = [
  { key: 'patient', name: 'Bệnh nhân', desc: 'Nguyễn Thị Lan', color: 'bg-primary' },
  { key: 'doctor', name: 'Bác sĩ', desc: 'BS. Nguyễn Văn Minh', color: 'bg-mint-fg' },
  { key: 'pharmacy', name: 'Nhà thuốc', desc: 'NT Minh Châu', color: 'bg-pink' },
  { key: 'admin', name: 'Quản trị', desc: 'Admin BriMed', color: 'bg-slate-700' },
]

export function RoleSwitcher({
  onSwitch,
  switching,
  currentRole,
}: {
  onSwitch: (persona: string) => void
  switching: boolean
  currentRole: string
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      {open && (
        <div className="fixed inset-0 z-[70] bg-slate-900/30" onClick={() => setOpen(false)} />
      )}
      <div className="fixed bottom-[74px] lg:bottom-5 right-4 z-[75] flex flex-col items-end gap-2">
        {open && (
          <div className="bg-white rounded-2xl shadow-card border border-slate-100 p-3 w-60 animate-in">
            <div className="text-[12px] font-bold text-slate-500 mb-2 px-1">Chuyển vai trò</div>
            <div className="space-y-1.5">
              {PERSONAS.map((p) => (
                <button
                  key={p.key}
                  disabled={switching || p.key === currentRole}
                  onClick={() => {
                    setOpen(false)
                    onSwitch(p.key)
                  }}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left ${
                    p.key === currentRole ? 'bg-lightblue/50 opacity-70 cursor-default' : 'hover:bg-slate-100'
                  }`}
                >
                  <span className={`w-8 h-8 rounded-full ${p.color} text-white flex items-center justify-center text-[11px] font-bold`}>
                    {p.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}
                  </span>
                  <span className="flex-1">
                    <span className="block text-[13px] font-bold text-slate-700">{p.name}</span>
                    <span className="block text-[11px] text-slate-500">{p.desc}</span>
                  </span>
                  {p.key === currentRole && <span className="text-[10px] font-bold text-primary">hiện tại</span>}
                </button>
              ))}
            </div>
          </div>
        )}
        <button
          onClick={() => setOpen((v) => !v)}
          className="w-12 h-12 rounded-full bg-pink text-white shadow-float flex items-center justify-center pulse-ring"
          aria-label={`Chuyển vai trò (hiện tại: ${ROLE_LABELS[currentRole]})`}
          title="Chuyển vai trò"
        >
          {open ? <X size={22} /> : <Users size={22} />}
        </button>
      </div>
    </>
  )
}
