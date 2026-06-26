import React, { createContext, useContext, useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import useStore from './store'
import { connectSocket, disconnectSocket } from './socket'

const AuthContext = createContext(null)

export const useAuth = () => useContext(AuthContext)

const AuthProvider = ({ children }) => {
  const { auth, preferences } = useStore()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (auth.accessToken) {
      connectSocket(auth.accessToken)
    }
    setLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!auth.accessToken) {
      disconnectSocket()
    }
  }, [auth.accessToken])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', preferences.nightMode)
  }, [preferences.nightMode])

  return (
    <AuthContext.Provider value={{ user: auth.user, isAuthenticated: !!auth.accessToken, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

const ProtectedRoute = ({ children, role }) => {
  const { isAuthenticated, loading, user } = useAuth()
  if (loading) return <div className="flex items-center justify-center min-h-screen bg-white dark:bg-gray-900"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" /></div>
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (role && user?.role !== role) {
    return <Navigate to={user?.role === 'admin' ? '/admin' : '/player'} replace />
  }
  return children
}

const LoginPage = React.lazy(() => import('./pages/Login'))
const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard'))
const PlayerDashboard = React.lazy(() => import('./pages/PlayerDashboard'))

const App = () => {
  const { auth } = useStore()

  return (
    <AuthProvider>
      <Toaster position="top-right" toastOptions={{
        className: 'dark:bg-gray-800 dark:text-white',
        duration: 3000
      }} />
      <React.Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-white dark:bg-gray-900"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" /></div>}>
        <Routes>
          <Route path="/login" element={
            auth.accessToken
              ? <Navigate to={auth.user?.role === 'admin' ? '/admin' : '/player'} replace />
              : <LoginPage />
          } />
          <Route path="/admin/*" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
          <Route path="/player/*" element={<ProtectedRoute role="player"><PlayerDashboard /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </React.Suspense>
    </AuthProvider>
  )
}

export default App
