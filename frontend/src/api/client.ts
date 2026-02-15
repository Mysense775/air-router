import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const API_URL = import.meta.env.VITE_API_URL || 'https://airouter.host/v1'

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout
})

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor to handle errors with retry logic and token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    
    // Log 404 errors for debugging
    if (error.response?.status === 404) {
      console.error('🚨 404 ERROR:', {
        url: originalRequest?.url,
        baseURL: originalRequest?.baseURL,
        method: originalRequest?.method,
        fullPath: `${originalRequest?.baseURL}${originalRequest?.url}`,
      })
    }
    
    // Handle 401 - try to refresh token
    if (error.response?.status === 401 && !originalRequest._retryAuth) {
      originalRequest._retryAuth = true
      
      try {
        const newToken = await useAuthStore.getState().refreshAccessToken()
        if (newToken) {
          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${newToken}`
          return api(originalRequest)
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError)
      }
      
      // If refresh failed, logout
      useAuthStore.getState().logout()
      window.location.href = '/login'
      return Promise.reject(error)
    }
    
    // Retry on network errors or 5xx errors (max 3 retries)
    if (!originalRequest._retry && (error.response?.status >= 500 || !error.response)) {
      originalRequest._retry = originalRequest._retry || 0
      originalRequest._retry++
      
      if (originalRequest._retry <= 3) {
        // Wait before retrying (exponential backoff)
        const delay = Math.pow(2, originalRequest._retry) * 500
        await new Promise(resolve => setTimeout(resolve, delay))
        return api(originalRequest)
      }
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
  
  getMe: (token?: string) => api.get('/auth/me', token ? { headers: { Authorization: `Bearer ${token}` } } : undefined),
  
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
  getDailyUsageForCharts: (days = 30) => api.get(`/client/daily-usage?days=${days}`),
}

// API Keys API
export const apiKeysApi = {
  getApiKeys: () => api.get('/auth/api-keys'),
  createApiKey: (name: string, modelId?: string) => api.post('/auth/api-keys', { name, model_id: modelId }),
  revokeApiKey: (keyId: string) => api.delete(`/auth/api-keys/${keyId}`),
}

// Admin API
export const adminApi = {
  getStats: () => api.get('/admin/stats'),
  getDashboardStats: (days = 30) => api.get(`/admin/dashboard-stats?days=${days}`),
  getMasterAccounts: () => api.get('/admin/master-accounts'),
  createMasterAccount: (data: { name: string; api_key: string; account_type: string; discount_percent: number; monthly_limit_usd?: number | null; priority?: number }) =>
    api.post('/admin/master-accounts', data),
  syncMasterAccount: (accountId: string) => api.post(`/admin/master-accounts/${accountId}/sync`),
  getClients: () => api.get('/admin/clients'),
  getLogs: (limit = 100) => api.get(`/admin/logs?limit=${limit}`),
  createUser: (data: { email: string; name?: string; role: string }) =>
    api.post('/admin/users', data),
  addUserBalance: (userId: string, amount: number, reason?: string) =>
    api.post(`/admin/users/${userId}/balance`, { amount, reason }),
  getDashboard: () => api.get('/admin/dashboard'),
  getMasterAccountPools: () => api.get('/admin/master-accounts/pools'),
  // Investor admin
  getInvestorAccounts: (params?: { status?: string; search?: string; min_balance?: number; skip?: number; limit?: number }) =>
    api.get('/admin/investor-accounts', { params }),
  pauseInvestorAccount: (accountId: string) =>
    api.post(`/admin/investor-accounts/${accountId}/pause`),
  activateInvestorAccount: (accountId: string) =>
    api.post(`/admin/investor-accounts/${accountId}/activate`),
  revokeInvestorAccount: (accountId: string) =>
    api.post(`/admin/investor-accounts/${accountId}/revoke`),
  getCryptoCurrencies: () => api.get('/payments/currencies'),
  createCryptoPayment: (amount_usd: number, currency: string) =>
    api.post('/payments/create', { amount_usd, currency }),
  getPaymentHistory: () => api.get('/payments/history'),
  // Transactions admin
  getTransactions: (params?: { status?: string; method?: string; search?: string; from_date?: string; to_date?: string; skip?: number; limit?: number }) =>
    api.get('/admin/transactions', { params }),
  confirmTransaction: (transactionId: string) =>
    api.post(`/admin/transactions/${transactionId}/confirm`),
  failTransaction: (transactionId: string, reason?: string) =>
    api.post(`/admin/transactions/${transactionId}/fail`, { reason }),
  // User admin
  getUserDetails: (userId: string) =>
    api.get(`/admin/users/${userId}/details`),
  updateUserRole: (userId: string, role: string) =>
    api.put(`/admin/users/${userId}/role`, { role }),
  impersonateUser: (userId: string) =>
    api.post(`/admin/users/${userId}/impersonate`),
  addUserBalance: (userId: string, amount: number, reason?: string) =>
    api.post(`/admin/users/${userId}/balance/add`, null, { params: { amount, reason } }),
}
