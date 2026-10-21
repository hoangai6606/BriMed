import { create } from 'zustand'

export interface Toast {
  id: number
  message: string
  type: 'success' | 'error' | 'info'
}

interface UiState {
  toasts: Toast[]
  toast: (message: string, type?: Toast['type']) => void
  dismiss: (id: number) => void
}

let nextId = 1

export const useUi = create<UiState>((set) => ({
  toasts: [],
  toast: (message, type = 'info') => {
    const id = nextId++
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }))
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 4000)
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))
