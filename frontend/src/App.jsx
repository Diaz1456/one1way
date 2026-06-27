import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import useStore from './store'
import api from './api'
import { connectSocket, disconnectSocket } from './socket'

const AuthContext = createContext(null)

export const useAuth = () => useContext(AuthContext)

/* Apply saved/system theme to <html> before React hydrates to avoid flash */
function applyInitialTheme() {
  const stored = localStorage.getItem('nightMode')
  const isDark = stored !== null
    ? stored === 'true'
    : window.matchMedia('(prefers-color-scheme: dark)').matches
  document.documentElement.classList.toggle('dark', isDark)
}
applyInitialTheme()

const AuthProvider = ({ children }) => {
  const { auth, preferences } = useStore()
  const [loading, setLoading] = useState(true)
  const systemPrefRef = useRef(null)

  useEffect(() => {
    async function init() {
      if (auth.accessToken) {
        try {
          const { data } = await api.get('/users/me')
          auth.restore(data)
          connectSocket(auth.accessToken)
        } catch {
          auth.logout()
        }
      }
      setLoading(false)
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.accessToken])

  useEffect(() => {
    if (!auth.accessToken) {
      disconnectSocket()
    }
  }, [auth.accessToken])

  /* Sync .dark class with store */
  useEffect(() => {
    document.documentElement.classList.toggle('dark', preferences.nightMode)
  }, [preferences.nightMode])

  /* Listen for OS-level theme changes (only when user hasn't manually overridden) */
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e) => {
      const stored = localStorage.getItem('nightMode')
      /* Only auto-follow system if user never made a manual choice */
      if (stored === null) {
        const store = useStore.getState()
        store.preferences.nightMode = e.matches
        document.documentElement.classList.toggle('dark', e.matches)
      }
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return (
    <AuthContext.Provider value={{ user: auth.user, isAuthenticated: !!auth.accessToken, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

const ProtectedRoute = ({ children, role }) => {
  const { isAuthenticated, loading, user } = useAuth()
  if (loading) return <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" /></div>
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
        className: '!bg-white dark:!bg-gray-800 !text-gray-900 dark:!text-white !shadow-lg',
        duration: 6000
      }} />
      <React.Suspense fallback={<div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" /></div>}>
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
