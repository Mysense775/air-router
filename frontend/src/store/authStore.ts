import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'https://airouter.host/v1'

interface User {
  id: string
  email: string
  name: string | null
  role: string
}

interface AuthState {
  token: string | null
  refreshToken: string | null
  user: User | null
  isAuthenticated: boolean
  setAuth: (token: string, refreshToken: string, user: User) => void
  logout: () => void
  checkAuth: () => boolean
  refreshAccessToken: () => Promise<string | null>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,

      setAuth: (token, refreshToken, user) => {
        set({ token, refreshToken, user, isAuthenticated: true })
      },

      logout: () => {
        set({ token: null, refreshToken: null, user: null, isAuthenticated: false })
        localStorage.removeItem('auth-storage-v3')
        window.location.href = '/login'
      },

      checkAuth: () => {
        const state = get()
        const isValid = !!state.token && !!state.user
        if (!isValid && state.isAuthenticated) {
          set({ isAuthenticated: false, token: null, user: null, refreshToken: null })
        }
        return isValid
      },

      refreshAccessToken: async () => {
        const state = get()
        if (!state.refreshToken) {
          console.error('No refresh token available')
          get().logout()
          return null
        }

        try {
          console.log('Refreshing access token...')
          const response = await axios.post(
            `${API_URL}/auth/refresh`,
            {},
            { headers: { Authorization: `Bearer ${state.refreshToken}` } }
          )

          const { access_token } = response.data
          set({ token: access_token })
          console.log('Token refreshed successfully')
          return access_token
        } catch (error) {
          console.error('Failed to refresh token:', error)
          get().logout()
          return null
        }
      },
    }),
    {
      name: 'auth-storage-v3',
    }
  )
)
