import React, { useState, useEffect } from 'react'
import { Routes, Route, NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  FiUsers, FiAward, FiStar, FiClock, FiMessageSquare, FiUsers as FiGroup, FiClock as FiTimer,
  FiMenu, FiX, FiLogOut, FiBell, FiVolume2, FiVolumeX, FiSettings, FiTag
} from 'react-icons/fi'
import useStore from '../store'
import api from '../api'
import { disconnectSocket } from '../socket'
import RecentLogins from '../components/RecentLogins'
import ThemeToggle from '../components/ThemeToggle'
import TeamRankings from '../components/TeamRankings'
import Accounts from './admin/Accounts'
import Leaderboard from './admin/Leaderboard'
import Achievements from './admin/Achievements'
import Categories from './admin/Categories'
import History from './admin/History'
import Feedback from './admin/Feedback'
import Teams from './admin/Teams'
import Countdown from './admin/Countdown'
import AdminSettings from './admin/Settings'

const navItems = [
  { path: 'accounts', label: 'Accounts', icon: FiUsers },
  { path: 'leaderboard', label: 'Leaderboard', icon: FiAward },
  { path: 'achievements', label: 'Achievements', icon: FiStar },
  { path: 'categories', label: 'Categories', icon: FiTag },
  { path: 'history', label: 'History', icon: FiClock },
  { path: 'feedback', label: 'Feedback', icon: FiMessageSquare },
  { path: 'teams', label: 'Teams', icon: FiGroup },
  { path: 'countdown', label: 'Countdown Timer', icon: FiTimer },
  { path: 'settings', label: 'Settings', icon: FiSettings }
]

function DigitalClock() {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return (
    <span className="font-mono text-lg tabular-nums">
      {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
    </span>
  )
}

function CountdownDisplay() {
  const { countdown } = useStore()
  const [remaining, setRemaining] = useState('')

  useEffect(() => {
    if (!countdown.isActive || !countdown.endTime) {
      setRemaining('')
      return
    }
    const update = () => {
      const diff = new Date(countdown.endTime).getTime() - Date.now()
      if (diff <= 0) { setRemaining('00:00'); return }
      const m = Math.floor(diff / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setRemaining(`${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`)
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [countdown])

  if (!remaining) return null
  return (
    <span className={`font-mono text-xl font-bold tabular-nums ${remaining === '00:00' ? 'text-red-500 animate-blink' : 'text-orange-400'}`}>
      {remaining}
    </span>
  )
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const { auth, preferences, toggleSound } = useStore()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [rightPanelOpen, setRightPanelOpen] = useState(false)
  const [feedbackList, setFeedbackList] = useState([])
  const [presenceUsers, setPresenceUsers] = useState([])
  const { onlineUsers, socket } = useStore()

  useEffect(() => {
    api.get('/feedback').then(({ data }) => setFeedbackList(data)).catch(() => {})
    api.get('/users').then(({ data }) => setPresenceUsers(data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (!socket) return
    const handler = (data) => {
      setFeedbackList(prev => [{ ...data, id: Date.now(), timestamp: new Date().toISOString() }, ...prev])
      toast('New feedback received!', { icon: '💬' })
    }
    socket.on('feedback:new', handler)
    return () => socket.off('feedback:new', handler)
  }, [socket])

  useEffect(() => {
    setPresenceUsers(onlineUsers)
  }, [onlineUsers])

  const handleLogout = () => {
    disconnectSocket()
    auth.logout()
    toast.success('Logged out')
    navigate('/login')
  }

  const dismissFeedback = async (id) => {
    try {
      await api.delete(`/feedback/${id}`)
      setFeedbackList(prev => prev.filter(f => f.id !== id))
      toast.success('Feedback dismissed')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to dismiss')
    }
  }

  const user = auth.user || {}

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 sm:px-6 shrink-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <motion.button onClick={() => setSidebarOpen(o => !o)}
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-all">
            <FiMenu size={20} />
          </motion.button>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">One Way</h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
            <DigitalClock />
            <CountdownDisplay />
          </div>
          <motion.div whileHover={{ scale: 1.02 }}
            className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-full border border-blue-100 dark:border-blue-800/50">
            <span className="font-medium text-sm text-gray-900 dark:text-white">{user.username || 'Admin'}</span>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 uppercase tracking-wider">{user.role || 'admin'}</span>
          </motion.div>
          <ThemeToggle />
          <motion.button onClick={toggleSound}
            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-300 transition-all" title="Toggle Sound">
            {preferences.soundEnabled ? <FiVolume2 size={18} /> : <FiVolumeX size={18} />}
          </motion.button>
          <motion.button onClick={() => setRightPanelOpen(o => !o)}
            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-300 relative transition-all" title="Presence & Feedback">
            <FiBell size={18} />
            {feedbackList.length > 0 && (
              <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold shadow-md shadow-red-500/30">{feedbackList.length}</motion.span>
            )}
          </motion.button>
          <motion.button onClick={handleLogout}
            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
            className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-all" title="Logout">
            <FiLogOut size={18} />
          </motion.button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <motion.aside
          animate={{ width: sidebarOpen ? 256 : 0 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          className="bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col shrink-0 overflow-hidden shadow-sm z-10">
          <nav className="flex-1 py-4 overflow-y-auto">
            {navItems.map(({ path, label, icon: Icon }) => (
              <NavLink
                key={path}
                to={path}
                className={({ isActive }) =>
                  `flex items-center gap-3 mx-2 px-4 py-3 text-sm font-medium rounded-xl transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 text-blue-700 dark:text-blue-300 shadow-sm border border-blue-100 dark:border-blue-800/50'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`
                }
              >
                <Icon size={18} />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
        </motion.aside>

        <main className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            <Routes>
              <Route index element={
                <motion.div key="dashboard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                  <div className="space-y-8">
                    <div className="bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50 dark:from-yellow-900/10 dark:via-amber-900/10 dark:to-orange-900/10 rounded-3xl p-6 sm:p-8 border border-yellow-100 dark:border-yellow-900/20 shadow-lg shadow-yellow-500/5">
                      <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-6 flex items-center gap-2">
                        <span className="text-2xl">🏆</span>
                        Team Rankings &amp; Cash
                      </h2>
                      <TeamRankings />
                    </div>
                    <div className="text-center py-8">
                      <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Welcome, {user.username || 'Admin'}!</h2>
                      <p className="text-gray-500 dark:text-gray-400">Select a section from the sidebar to manage your application.</p>
                    </div>
                  </div>
                </motion.div>
              } />
              <Route path="accounts" element={<motion.div key="accounts" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}><Accounts /></motion.div>} />
              <Route path="leaderboard" element={<motion.div key="leaderboard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}><Leaderboard /></motion.div>} />
              <Route path="achievements" element={<motion.div key="achievements" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}><Achievements /></motion.div>} />
              <Route path="categories" element={<motion.div key="categories" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}><Categories /></motion.div>} />
              <Route path="history" element={<motion.div key="history" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}><History /></motion.div>} />
              <Route path="feedback" element={<motion.div key="feedback" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}><Feedback /></motion.div>} />
              <Route path="teams" element={<motion.div key="teams" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}><Teams /></motion.div>} />
              <Route path="countdown" element={<motion.div key="countdown" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}><Countdown /></motion.div>} />
              <Route path="settings" element={<motion.div key="settings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}><AdminSettings /></motion.div>} />
            </Routes>
          </AnimatePresence>
        </main>

        <AnimatePresence>
          {rightPanelOpen && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 overflow-hidden shrink-0"
            >
              <div className="w-80 p-4 space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Online Players</h3>
                  {presenceUsers.length === 0 ? (
                    <p className="text-sm text-gray-400 dark:text-gray-500">No players online</p>
                  ) : (
                    <div className="space-y-2">
                      {presenceUsers.map((u, i) => (
                        <div key={u.id || i} className="flex items-center gap-2 text-sm">
                          <span className="w-2 h-2 rounded-full bg-green-400" />
                          <span className="text-gray-700 dark:text-gray-300">{u.username}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Recent Feedback</h3>
                  {feedbackList.length === 0 ? (
                    <p className="text-sm text-gray-400 dark:text-gray-500">No feedback yet</p>
                  ) : (
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {feedbackList.slice(0, 20).map((f) => (
                        <div key={f.id} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-sm">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-gray-900 dark:text-white">{f.sender_user_id?.username || f.sender_username || 'Anonymous'}</span>
                            <button onClick={() => dismissFeedback(f.id)} className="text-gray-400 hover:text-red-400 text-xs">&times;</button>
                          </div>
                          <p className="text-gray-600 dark:text-gray-400">{f.message || f.text}</p>
                          {f.timestamp && <p className="text-xs text-gray-400 mt-1">{new Date(f.timestamp).toLocaleString()}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      <StockTicker />
      <AchievementPopup />
      <OvertakeNotification />
    </div>
  )
}

const StockTickerItem = ({ event, onDismiss }) => (
  <motion.span
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: 20 }}
    transition={{ duration: 0.4 }}
    onClick={() => onDismiss(event.id)}
    className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs cursor-pointer whitespace-nowrap shrink-0"
  >
    {event.type === 'achievement' ? '⭐' : event.type === 'overtake' ? '🚀' : '📊'}
    {event.message || event.title || 'Update'}
  </motion.span>
)

const StockTicker = () => {
  const { stockEvents, dismissStockEvent } = useStore()
  return (
    <AnimatePresence>
      {stockEvents.length > 0 && (
        <motion.div
          initial={{ y: 40 }}
          animate={{ y: 0 }}
          exit={{ y: 40 }}
          className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-t border-gray-200 dark:border-gray-700 overflow-hidden"
        >
          <div className="flex gap-3 px-4 py-2 overflow-x-auto scrollbar-hide">
            {stockEvents.map(ev => (
              <StockTickerItem key={ev.id} event={ev} onDismiss={dismissStockEvent} />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

const AchievementPopup = () => {
  const { stockEvents, dismissStockEvent } = useStore()
  const achievements = stockEvents.filter(e => e.type === 'achievement')

  return (
    <div className="fixed top-20 right-4 z-50 flex flex-col gap-2 max-w-xs">
      <AnimatePresence>
        {achievements.slice(-3).map(ev => (
          <motion.div
            key={ev.id}
            initial={{ opacity: 0, x: 80, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 80, scale: 0.8 }}
            onClick={() => dismissStockEvent(ev.id)}
            className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white rounded-xl shadow-xl p-4 cursor-pointer"
          >
            <p className="font-bold text-sm">Achievement Unlocked!</p>
            <p className="text-xs mt-1">{ev.message || ev.title || 'New achievement!'}</p>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

const OvertakeNotification = () => {
  const { stockEvents, dismissStockEvent } = useStore()
  const overtakes = stockEvents.filter(e => e.type === 'overtake')

  return (
    <div className="fixed top-20 left-4 z-50 flex flex-col gap-2 max-w-xs">
      <AnimatePresence>
        {overtakes.slice(-2).map(ev => (
          <motion.div
            key={ev.id}
            initial={{ opacity: 0, x: -80, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -80, scale: 0.8 }}
            onClick={() => dismissStockEvent(ev.id)}
            className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl shadow-xl p-4 cursor-pointer"
          >
            <p className="font-bold text-sm">Team Overtake!</p>
            <p className="text-xs mt-1">{ev.message || 'Your team has been overtaken!'}</p>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
