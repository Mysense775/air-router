import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import Login from './pages/Login'
import Register from './pages/Register'
import ChangePassword from './pages/ChangePassword'
import AdminDashboard from './pages/AdminDashboard'
import Dashboard from './pages/Dashboard'
import Users from './pages/Users'
import Deposit from './pages/Deposit'
import ApiKeys from './pages/ApiKeys'
import RequestHistory from './pages/RequestHistory'
import Models from './pages/Models'
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

  // Get user role for role-based routing
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin'
  const userRole = user?.role

  return (
    <Routes>
      <Route 
        path="/login" 
        element={token ? <Navigate to={userRole === 'admin' ? "/admin" : "/dashboard"} /> : <Login />} 
      />
      <Route 
        path="/register" 
        element={token ? <Navigate to={userRole === 'admin' ? "/admin" : "/dashboard"} /> : <Register />} 
      />
      <Route 
        path="/*" 
        element={
          token ? (
            <Layout>
              <Routes>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/deposit" element={<Deposit />} />
                <Route path="/api-keys" element={<ApiKeys />} />
                <Route path="/requests" element={<RequestHistory />} />
                <Route path="/models" element={<Models />} />
                <Route path="/admin" element={isAdmin ? <AdminDashboard /> : <Navigate to="/dashboard" />} />
                <Route path="/admin/users" element={isAdmin ? <Users /> : <Navigate to="/dashboard" />} />
                <Route path="/" element={<Navigate to={isAdmin ? "/admin" : "/dashboard"} />} />
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
