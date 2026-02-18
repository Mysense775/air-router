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
import Docs from './pages/Docs'
import Transactions from './pages/Transactions'
import Layout from './components/Layout'
import InvestorLayout from './layouts/InvestorLayout'
import InvestorDashboard from './pages/InvestorDashboard'
import InvestorKeys from './pages/InvestorKeys'
import AddInvestorKey from './pages/AddInvestorKey'
import InvestorFlow from './pages/InvestorFlow'

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
        element={token ? <Navigate to={userRole === 'admin' ? "/admin" : userRole === 'investor' ? "/investor" : "/dashboard"} /> : <Login />} 
      />
      <Route 
        path="/register" 
        element={token ? <Navigate to={userRole === 'admin' ? "/admin" : userRole === 'investor' ? "/investor" : "/dashboard"} /> : <Register />} 
      />
      {/* Investor Routes */}
      <Route
        path="/investor/*"
        element={
          token && userRole === 'investor' ? (
            <InvestorLayout>
              <Routes>
                <Route path="/" element={<InvestorDashboard />} />
                <Route path="/keys" element={<InvestorKeys />} />
                <Route path="/keys/add" element={<AddInvestorKey />} />
                <Route path="/flow" element={<InvestorFlow />} />
                <Route path="*" element={<Navigate to="/investor" />} />
              </Routes>
            </InvestorLayout>
          ) : (
            <Navigate to={token ? "/dashboard" : "/login"} />
          )
        }
      />
      <Route 
        path="/*" 
        element={
          token ? (
            <Layout>
              <Routes>
                <Route path="/dashboard" element={userRole === 'investor' ? <Navigate to="/investor" /> : <Dashboard />} />
                <Route path="/deposit" element={<Deposit />} />
                <Route path="/api-keys" element={<ApiKeys />} />
                <Route path="/requests" element={<RequestHistory />} />
                <Route path="/models" element={<Models />} />
                <Route path="/docs" element={<Docs />} />
                <Route path="/admin" element={isAdmin ? <AdminDashboard /> : <Navigate to="/dashboard" />} />
                <Route path="/admin/users" element={isAdmin ? <Users /> : <Navigate to="/dashboard" />} />
                <Route path="/admin/transactions" element={isAdmin ? <Transactions /> : <Navigate to="/dashboard" />} />
                <Route path="/" element={<Navigate to={isAdmin ? "/admin" : userRole === 'investor' ? "/investor" : "/dashboard"} />} />
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
