import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import Login from './pages/Login'
import ChangePassword from './pages/ChangePassword'
import Dashboard from './pages/Dashboard'
import ApiKeysPage from './pages/ApiKeys'
import UsagePage from './pages/Usage'
import Models from './pages/Models'
import Deposit from './pages/Deposit'
import CryptoDeposit from './pages/CryptoDeposit'
import AdminDashboard from './pages/AdminDashboard'
import Users from './pages/Users'
import Layout from './components/Layout'

function App() {
  const { token, checkAuth, forcePasswordChange } = useAuthStore()

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  // Force password change page - accessible only when logged in and flag is set
  if (token && forcePasswordChange) {
    return (
      <Routes>
        <Route path="/change-password" element={<ChangePassword />} />
        <Route path="*" element={<Navigate to="/change-password" />} />
      </Routes>
    )
  }

  return (
    <Routes>
      <Route 
        path="/login" 
        element={token ? <Navigate to="/dashboard" /> : <Login />} 
      />
      <Route 
        path="/*" 
        element={
          token ? (
            <Layout>
              <Routes>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/api-keys" element={<ApiKeysPage />} />
                <Route path="/usage" element={<UsagePage />} />
                <Route path="/models" element={<Models />} />
                <Route path="/deposit" element={<Deposit />} />
                <Route path="/deposit/crypto" element={<CryptoDeposit />} />
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/users" element={<Users />} />
                <Route path="/" element={<Navigate to="/dashboard" />} />
              </Routes>
            </Layout>
          ) : (
            <Navigate to="/login" />
          )
        } 
      />
    </Routes>
  )
}

export default App
