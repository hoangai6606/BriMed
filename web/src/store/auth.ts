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
  login: (phone: string, password: string) => Promise<void>
  logout: () => void
}

export const homeByRole: Record<string, string> = {
  patient: '/',
  doctor: '/',
  pharmacy: '/',
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

  login: async (phone, password) => {
    const d = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ phone, password }),
    })
    setToken(d.token)
    set({ user: d.user, pharmacy: d.pharmacy || null })
  },

  logout: () => {
    api('/auth/logout', { method: 'POST' }).catch(() => {})
    clearToken()
    set({ user: null, pharmacy: null })
  },
}))
