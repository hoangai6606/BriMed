import { create } from 'zustand'
import { api, clearToken, getToken, setToken } from '../api/client'

export interface User {
  id: number
  full_name: string
  phone: string
  cccd?: string
  role: 'patient' | 'doctor' | 'pharmacy' | 'admin'
  token_balance: number
  free_prescriptions: number
  doctor_specialty?: string | null
  doctor_license?: string | null
  doctor_online?: boolean
  pharmacy_id?: number | null
}

interface AuthState {
  user: User | null
  pharmacy?: any
  loading: boolean
  refresh: () => Promise<void>
  login: (phone: string, password: string, role?: string) => Promise<void>
  register: (payload: any) => Promise<void>
  logout: () => void
}

export const homeByRole: Record<string, string> = {
  patient: '/patient/dashboard',
  doctor: '/doctor/dashboard',
  pharmacy: '/pharmacy/dashboard',
  admin: '/admin/dashboard',
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  pharmacy: null,
  loading: !!getToken(),

  refresh: async () => {
    if (!getToken()) {
      set({ user: null, pharmacy: null, loading: false })
      return
    }
    try {
      const d = await api('/auth/me')
      set({ user: d.user, pharmacy: d.pharmacy || null, loading: false })
    } catch {
      clearToken()
      set({ user: null, pharmacy: null, loading: false })
    }
  },

  login: async (phone, password, role) => {
    const d = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ phone, password, role }),
    })
    setToken(d.token)
    set({ user: d.user, pharmacy: d.pharmacy || null })
  },

  register: async (payload) => {
    const d = await api('/auth/register', { method: 'POST', body: JSON.stringify(payload) })
    setToken(d.token)
    set({ user: d.user, pharmacy: d.pharmacy || null })
  },

  logout: () => {
    api('/auth/logout', { method: 'POST' }).catch(() => {})
    clearToken()
    set({ user: null, pharmacy: null })
  },
}))
