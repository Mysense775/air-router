import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import Login from './pages/Login'
import ChangePassword from './pages/ChangePassword'
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
        element={token ? <Navigate to="/admin" /> : <Login />} 
      />
      <Route 
        path="/*" 
        element={
          token ? (
            <Layout>
              <Routes>
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/users" element={<Users />} />
                <Route path="/" element={<Navigate to="/admin" />} />
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
