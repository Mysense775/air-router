import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import ApiKeysPage from './pages/ApiKeys'
import UsagePage from './pages/Usage'
import Models from './pages/Models'
import Deposit from './pages/Deposit'
import Admin from './pages/Admin'
import Layout from './components/Layout'

function App() {
  const { token, checkAuth } = useAuthStore()

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

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
                <Route path="/admin" element={<Admin />} />
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
