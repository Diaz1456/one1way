import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import useStore from '../store'
import api from '../api'
import { connectSocket } from '../socket'
import { playWhoosh } from '../sound'

function Particles({ count = 20 }) {
  return Array.from({ length: count }, (_, i) => (
    <motion.div
      key={i}
      className="absolute w-1 h-1 bg-white rounded-full"
      initial={{
        x: Math.random() * 100 - 50 + '%',
        y: Math.random() * 100 - 50 + '%',
        opacity: 0,
        scale: 0,
      }}
      animate={{
        x: Math.random() * 200 - 100 + '%',
        y: Math.random() * 200 - 100 + '%',
        opacity: [0, 1, 0],
        scale: [0, 1.5, 0],
      }}
      transition={{
        duration: 2 + Math.random() * 3,
        repeat: Infinity,
        delay: Math.random() * 2,
        ease: 'easeOut',
      }}
    />
  ))
}

function VortexRing({ size, duration, reverse, delay = 0 }) {
  return (
    <motion.div
      className="absolute border border-blue-500/20 rounded-full"
      style={{ width: size, height: size }}
      initial={{ rotate: 0, scale: 0, opacity: 0 }}
      animate={{
        rotate: reverse ? -360 : 360,
        scale: [0, 1, 1],
        opacity: [0, 0.6, 0.15],
      }}
      transition={{
        rotate: { duration, repeat: Infinity, ease: 'linear' },
        scale: { duration: 1.5, delay, ease: 'easeOut' },
        opacity: { duration: 1.5, delay, ease: 'easeOut' },
      }}
    />
  )
}

function VortexTunnel({ playing }) {
  const rings = [
    { size: 600, duration: 20, reverse: false },
    { size: 500, duration: 15, reverse: true },
    { size: 400, duration: 12, reverse: false },
    { size: 300, duration: 10, reverse: true },
    { size: 200, duration: 8, reverse: false },
    { size: 120, duration: 6, reverse: true },
  ]

  return (
    <AnimatePresence>
      {playing && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 3, opacity: 0 }}
          transition={{ duration: 1.2, ease: 'easeInOut' }}
        >
          <div className="relative flex items-center justify-center" style={{ perspective: '800px' }}>
            <motion.div
              className="absolute"
              style={{ transformStyle: 'preserve-3d' }}
              animate={{ rotateX: [0, 15, 0], rotateY: [0, -15, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            >
              {rings.map((ring, i) => (
                <div key={i} className="absolute flex items-center justify-center" style={{ left: '50%', top: '50%', marginLeft: -ring.size / 2, marginTop: -ring.size / 2 }}>
                  <VortexRing size={ring.size} duration={ring.duration} reverse={ring.reverse} delay={i * 0.15} />
                </div>
              ))}
            </motion.div>
            <Particles />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default function Login() {
  const navigate = useNavigate()
  const auth = useStore((s) => s.auth)
  const preferences = useStore((s) => s.preferences)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [vortexActive, setVortexActive] = useState(false)
  const [reversing, setReversing] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    setVortexActive(true)
    const t1 = setTimeout(() => setShowForm(true), 800)
    if (preferences.soundEnabled) playWhoosh()

    return () => {
      mountedRef.current = false
      clearTimeout(t1)
    }
  }, [preferences.soundEnabled])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password')
      return
    }

    setLoading(true)

    try {
      const { data } = await api.post('/auth/login', { username, password })

      if (preferences.soundEnabled) playWhoosh()

      auth.login(data.user || { username }, data.accessToken, data.refreshToken)
      connectSocket(data.accessToken)

      setReversing(true)
      setShowForm(false)

      setTimeout(() => {
        if (mountedRef.current) {
          if (data.user?.role === 'admin') {
            navigate('/admin', { replace: true })
          } else {
            navigate('/player', { replace: true })
          }
        }
      }, 1200)
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Login failed. Please try again.'
      setError(msg)
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black overflow-hidden flex items-center justify-center">
      <VortexTunnel playing={!reversing} />

      {reversing && (
        <motion.div
          className="fixed inset-0 z-40 bg-black"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
        />
      )}

      <div className="relative z-30 flex flex-col items-center">
        <motion.h1
          className="text-6xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-cyan-400 mb-2 tracking-tight"
          initial={{ opacity: 0, y: -40, scale: 0.8 }}
          animate={showForm ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: -40, scale: 0.8 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          ONE WAY
        </motion.h1>

        <motion.p
          className="text-gray-500 text-sm mb-8 tracking-widest uppercase"
          initial={{ opacity: 0 }}
          animate={showForm ? { opacity: 1 } : { opacity: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          Enter the Vortex
        </motion.p>

        <AnimatePresence>
          {showForm && (
            <motion.form
              key="login-form"
              onSubmit={handleSubmit}
              initial={{ opacity: 0, y: 40, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -40, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 200, damping: 25 }}
              className="w-full max-w-sm px-4 sm:px-0 space-y-4"
            >
              <div>
                <input
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50"
                  autoComplete="username"
                />
              </div>
              <div>
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50"
                  autoComplete="current-password"
                />
              </div>

              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-red-400 text-sm text-center"
                >
                  {error}
                </motion.p>
              )}

              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Entering...
                  </span>
                ) : (
                  'Enter the Vortex'
                )}
              </motion.button>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
