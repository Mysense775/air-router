import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/v1'

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  
  register: (email: string, password: string, name?: string) =>
    api.post('/auth/register', { email, password, name }),
  
  getMe: () => api.get('/auth/me'),
  
  refresh: (refreshToken: string) =>
    api.post('/auth/refresh', {}, { headers: { Authorization: `Bearer ${refreshToken}` } }),
}

// Client API
export const clientApi = {
  getBalance: () => api.get('/client/balance'),
  getUsage: (days = 7) => api.get(`/client/usage?days=${days}`),
  getDailyUsage: (days = 30) => api.get(`/client/usage/daily?days=${days}`),
  getModelsUsage: (days = 30) => api.get(`/client/models/usage?days=${days}`),
  getRecentRequests: (limit = 50) => api.get(`/client/recent-requests?limit=${limit}`),
}

// API Keys API
export const apiKeysApi = {
  getApiKeys: () => api.get('/auth/api-keys'),
  createApiKey: (name: string) => api.post('/auth/api-keys', { name }),
  revokeApiKey: (keyId: string) => api.delete(`/auth/api-keys/${keyId}`),
}
