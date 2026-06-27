import { useState, useEffect, useCallback, useRef } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Toaster, toast } from 'react-hot-toast'
import {
  HiOutlineUser, HiOutlineClipboardCheck,
  HiOutlineUsers, HiOutlineChatAlt2, HiOutlineCog,
  HiOutlineLogout, HiOutlineVolumeUp, HiOutlineVolumeOff, HiOutlineHome
} from 'react-icons/hi'
import { FiAward } from 'react-icons/fi'
import api from '../api'
import useStore from '../store'
import { playClick } from '../sound'
import { disconnectSocket } from '../socket'
import ThemeToggle from '../components/ThemeToggle'
import Profile from './player/Profile'
import DailyTask from './player/DailyTask'
import TeamView from './player/TeamView'
import FeedbackForm from './player/FeedbackForm'
import HallOfFameModal from '../components/HallOfFameModal'
import Settings from './player/Settings'

const tabs = [
  { id: 'profile', label: 'My Profile', icon: HiOutlineUser, path: '/player/profile' },
  { id: 'hall-of-fame', label: 'Hall of Fame', icon: FiAward, path: '/player/hall-of-fame' },
  { id: 'daily-task', label: 'Daily Task', icon: HiOutlineClipboardCheck, path: '/player/daily-task' },
  { id: 'team', label: 'My Team', icon: HiOutlineUsers, path: '/player/team' },
  { id: 'feedback', label: 'Feedback', icon: HiOutlineChatAlt2, path: '/player/feedback' },
  { id: 'settings', label: 'Settings', icon: HiOutlineCog, path: '/player/settings' }
]

const LiveClock = () => {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return (
    <span className="text-sm font-mono tabular-nums text-gray-600 dark:text-gray-400">
      {time.toLocaleTimeString()}
    </span>
  )
}

const CountdownTimer = () => {
  const { countdown } = useStore()
  const [remaining, setRemaining] = useState(0)
  const [pulse, setPulse] = useState(false)

  useEffect(() => {
    if (!countdown.endTime) {
      setRemaining(0)
      return
    }
    const tick = () => {
      const diff = Math.max(0, Math.floor((new Date(countdown.endTime).getTime() - Date.now()) / 1000))
      setRemaining(diff)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [countdown.endTime])

  useEffect(() => {
    if (remaining <= 0 || remaining > 30) return
    const speed = remaining <= 10 ? 300 : 600
    const id = setInterval(() => setPulse(p => !p), speed)
    return () => clearInterval(id)
  }, [remaining])

  if (!countdown.endTime) return null

  const m = Math.floor(remaining / 60)
  const s = remaining % 60
  const str = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  const isUrgent = remaining <= 30
  const isExpired = remaining <= 0

  if (isExpired) {
    return (
      <motion.span
        animate={{ scale: [1, 1.12, 1] }}
        transition={{ duration: 1.5, repeat: Infinity }}
        className="font-mono tabular-nums font-bold text-lg tracking-wider text-red-500 animate-blink"
        style={{ textShadow: '0 0 12px rgba(239,68,68,0.7)' }}
      >
        TIME'S UP!
      </motion.span>
    )
  }

  if (!countdown.isActive) {
    return (
      <span className="font-mono tabular-nums text-sm text-gray-400 dark:text-gray-500">
        {str}
      </span>
    )
  }

  return (
    <motion.span
      animate={isUrgent ? {
        scale: pulse ? [1, 1.08, 1] : [1, 0.97, 1],
      } : {}}
      transition={{ duration: 0.3 }}
      className={`font-mono tabular-nums font-bold text-lg tracking-wider ${
        isUrgent ? 'text-red-500 animate-blink' : 'text-orange-500 dark:text-orange-400'
      }`}
      style={isUrgent ? { textShadow: pulse ? '0 0 8px rgba(239,68,68,0.6)' : 'none' } : {}}
    >
      {str}
    </motion.span>
  )
}

const CountdownWidget = () => {
  const { countdown } = useStore()
  const [remaining, setRemaining] = useState(0)
  const [pulse, setPulse] = useState(false)

  useEffect(() => {
    if (!countdown.endTime) {
      setRemaining(0)
      return
    }
    const tick = () => {
      const diff = Math.max(0, Math.floor((new Date(countdown.endTime).getTime() - Date.now()) / 1000))
      setRemaining(diff)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [countdown.endTime])

  useEffect(() => {
    if (remaining <= 0 || remaining > 30) return
    const speed = remaining <= 10 ? 300 : 600
    const id = setInterval(() => setPulse(p => !p), speed)
    return () => clearInterval(id)
  }, [remaining])

  if (!countdown.endTime) return null

  const m = Math.floor(remaining / 60)
  const s = remaining % 60
  const str = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  const isUrgent = remaining <= 30
  const isExpired = remaining <= 0

  if (!countdown.isActive) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Countdown Timer</span>
          <span className="font-mono tabular-nums text-lg text-gray-400 dark:text-gray-500">{str}</span>
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Waiting for admin to start...</p>
      </div>
    )
  }

  return (
    <div className={`rounded-2xl p-6 border shadow-lg ${
      isExpired
        ? 'bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 border-red-200 dark:border-red-800/50 shadow-red-500/10'
        : isUrgent
          ? 'bg-gradient-to-br from-red-50 via-rose-50 to-orange-50 dark:from-red-900/20 dark:via-rose-900/20 dark:to-orange-900/20 border-red-200 dark:border-red-800/50 shadow-red-500/10'
          : 'bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 dark:from-orange-900/10 dark:via-amber-900/10 dark:to-yellow-900/10 border-orange-200 dark:border-orange-800/50 shadow-orange-500/5'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <span className={`text-sm font-bold uppercase tracking-wider ${
          isExpired ? 'text-red-600 dark:text-red-400' : isUrgent ? 'text-red-600 dark:text-red-400' : 'text-orange-600 dark:text-orange-400'
        }`}>
          {isExpired ? 'Countdown Ended' : isUrgent ? 'Countdown Ending Soon!' : 'Countdown Timer'}
        </span>
        <span className={`text-xs ${
          isExpired ? 'text-red-400' : isUrgent ? 'text-red-400' : 'text-orange-400'
        }`}>
          {isExpired ? '⏰' : isUrgent ? '🔥' : '⏳'}
        </span>
      </div>
      <motion.div
        animate={isUrgent ? {
          scale: pulse ? [1, 1.05, 1] : [1, 0.97, 1],
        } : isExpired ? {
          scale: [1, 1.08, 1],
        } : {}}
        transition={isExpired ? { duration: 1.5, repeat: Infinity } : { duration: 0.3 }}
        className={`font-mono tabular-nums font-black text-5xl sm:text-6xl text-center tracking-widest ${
          isExpired
            ? 'text-red-500 animate-blink'
            : isUrgent
              ? 'text-red-500 animate-blink'
              : 'text-orange-500 dark:text-orange-400'
        }`}
        style={isUrgent ? { textShadow: pulse ? '0 0 20px rgba(239,68,68,0.5)' : 'none' } : isExpired ? { textShadow: '0 0 20px rgba(239,68,68,0.6)' } : {}}
      >
        {isExpired ? "TIME'S UP!" : str}
      </motion.div>
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

  useEffect(() => {
    if (achievements.length === 0) return
    const timers = achievements.map(ev =>
      setTimeout(() => dismissStockEvent(ev.id), 8000)
    )
    return () => timers.forEach(clearTimeout)
  }, [achievements.length])

  return (
    <div className="fixed top-20 right-4 z-50 flex flex-col gap-2 max-w-xs">
      <AnimatePresence>
        {achievements.slice(-3).map(ev => (
          <motion.div
            key={ev.id}
            initial={{ opacity: 0, x: 80, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 80, scale: 0.8 }}
            className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white rounded-xl shadow-xl overflow-hidden"
          >
            <div className="relative p-4 pr-8">
              <button
                onClick={() => dismissStockEvent(ev.id)}
                className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/40 text-white text-xs transition-colors"
              >
                ✕
              </button>
              <p className="font-bold text-sm">Achievement Unlocked!</p>
              <p className="text-xs mt-1">{ev.message || ev.title || 'New achievement!'}</p>
            </div>
            <motion.div
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: 8, ease: 'linear' }}
              style={{ transformOrigin: 'left' }}
              className="h-0.5 bg-white/40"
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

const OvertakeNotification = () => {
  const { stockEvents, dismissStockEvent } = useStore()
  const overtakes = stockEvents.filter(e => e.type === 'overtake')

  useEffect(() => {
    if (overtakes.length === 0) return
    const timers = overtakes.map(ev =>
      setTimeout(() => dismissStockEvent(ev.id), 8000)
    )
    return () => timers.forEach(clearTimeout)
  }, [overtakes.length])

  return (
    <div className="fixed top-20 left-4 z-50 flex flex-col gap-2 max-w-xs">
      <AnimatePresence>
        {overtakes.slice(-2).map(ev => (
          <motion.div
            key={ev.id}
            initial={{ opacity: 0, x: -80, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -80, scale: 0.8 }}
            className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl shadow-xl overflow-hidden"
          >
            <div className="relative p-4 pr-8">
              <button
                onClick={() => dismissStockEvent(ev.id)}
                className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/40 text-white text-xs transition-colors"
              >
                ✕
              </button>
              <p className="font-bold text-sm">Team Overtake!</p>
              <p className="text-xs mt-1">{ev.message || 'Your team has been overtaken!'}</p>
            </div>
            <motion.div
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: 8, ease: 'linear' }}
              style={{ transformOrigin: 'left' }}
              className="h-0.5 bg-white/40"
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

const OnlineCount = () => {
  const { onlineUsers } = useStore()
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-600 dark:text-green-400">
      <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
      {onlineUsers.length} online
    </span>
  )
}

const Sidebar = ({ activeTab, onTabChange, collapsed, onToggle, mobileOpen, onMobileClose, onOpenHallOfFame }) => {
  const navigate = useNavigate()

  const handleTab = (tab) => {
    playClick()
    onTabChange(tab.id)
    if (tab.id === 'hall-of-fame') {
      onOpenHallOfFame()
    } else {
      navigate(tab.path)
    }
    onMobileClose()
  }

  const sidebarContent = (
    <>
      <div className="p-3 flex items-center justify-between border-b border-gray-100 dark:border-gray-700">
        {!collapsed && <span className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Sections</span>}
        <motion.button
          onClick={() => { playClick(); onToggle() }}
          whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-all min-w-[36px] min-h-[36px]"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={collapsed ? 'M13 5l7 7-7 7M5 5l7 7-7 7' : 'M11 19l-7-7 7-7m8 14l-7-7 7-7'} />
          </svg>
        </motion.button>
      </div>
      <nav className="flex-1 py-3 space-y-1 px-2">
        {tabs.map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <motion.button
              key={tab.id}
              onClick={() => handleTab(tab)}
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.98 }}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all min-h-[44px]
                ${isActive
                  ? 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 text-blue-600 dark:text-blue-400 shadow-sm border border-blue-100 dark:border-blue-800/50'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              title={collapsed ? tab.label : undefined}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span>{tab.label}</span>}
            </motion.button>
          )
        })}
      </nav>
    </>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 64 : 220 }}
        className="hidden md:flex bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex-col shrink-0 overflow-hidden shadow-sm z-10"
      >
        {sidebarContent}
      </motion.aside>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 md:hidden"
              onClick={onMobileClose}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed left-0 top-16 bottom-0 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col z-50 md:hidden shadow-xl"
            >
              <div className="flex items-center justify-between p-3 border-b border-gray-100 dark:border-gray-700">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Sections</span>
                <motion.button onClick={onMobileClose}
                  whileTap={{ scale: 0.9 }}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 min-w-[36px] min-h-[36px]"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </motion.button>
              </div>
              <nav className="flex-1 py-3 space-y-1 px-2">
                {tabs.map(tab => {
                  const Icon = tab.icon
                  const isActive = activeTab === tab.id
                  return (
                    <motion.button
                      key={tab.id}
                      onClick={() => handleTab(tab)}
                      whileTap={{ scale: 0.98 }}
                      className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all min-h-[44px]
                        ${isActive
                          ? 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 text-blue-600 dark:text-blue-400 shadow-sm border border-blue-100 dark:border-blue-800/50'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                        }`}
                    >
                      <Icon className="w-5 h-5 shrink-0" />
                      <span>{tab.label}</span>
                    </motion.button>
                  )
                })}
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

const PlayerDashboard = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { auth, preferences, toggleNightMode, toggleSound } = useStore()
  const [userDetails, setUserDetails] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [hallOfFameOpen, setHallOfFameOpen] = useState(false)
  const isSubPage = location.pathname !== '/player' && location.pathname !== '/player/'

  const activeTab = tabs.find(t => location.pathname.startsWith(t.path))?.id || 'profile'

  useEffect(() => {
    if (!auth.user?.id) {
      setLoading(false)
      return
    }
    api.get(`/users/${auth.user.id}/details`)
      .then(({ data }) => setUserDetails(data))
      .catch(err => toast.error(err.response?.data?.error || 'Failed to load user details'))
      .finally(() => setLoading(false))
  }, [auth.user?.id])

  const handleLogout = () => {
    playClick()
    disconnectSocket()
    auth.logout()
    navigate('/login')
  }

  const displayName = userDetails?.username || auth.user?.username || 'Player'
  const avatarUrl = userDetails?.avatar_url || auth.user?.avatar_url || ''
  const rank = userDetails?.rank || auth.user?.rank

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900 overflow-hidden">
      <Toaster position="top-right" toastOptions={{
        className: 'dark:bg-gray-800 dark:text-white',
        duration: 6000
      }} />

      <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-3 sm:px-6 shrink-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <motion.button
            onClick={() => setMobileSidebarOpen(true)}
            whileTap={{ scale: 0.9 }}
            className="md:hidden p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 min-w-[44px] min-h-[44px] flex items-center justify-center"
            title="Open menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </motion.button>
          {isSubPage && (
            <motion.button onClick={() => navigate('/player')}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
              className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all min-w-[44px] min-h-[44px] flex items-center justify-center shadow-sm"
              title="Main Menu">
              <HiOutlineHome className="w-5 h-5" />
            </motion.button>
          )}
          <h1 className="text-lg sm:text-xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 bg-clip-text text-transparent">
            ONE WAY
          </h1>
          <div className="hidden md:flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
            <LiveClock />
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <CountdownTimer />
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <OnlineCount />
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {rank && (
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
              className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/30 dark:to-blue-900/30 text-purple-600 dark:text-purple-400 rounded-full text-xs font-bold shadow-sm">
              #{rank}
            </motion.span>
          )}
          <motion.div whileHover={{ scale: 1.02 }}
            className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 bg-gray-50 dark:bg-gray-700/50 rounded-full border border-gray-100 dark:border-gray-600/50">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover ring-2 ring-white dark:ring-gray-600" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold ring-2 ring-white dark:ring-gray-600">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200 max-w-[120px] truncate">
              {displayName}
            </span>
          </motion.div>

          <ThemeToggle />

          <motion.button
            onClick={() => { playClick(); toggleSound() }}
            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-all"
            title="Toggle sound"
          >
            {preferences.soundEnabled ? <HiOutlineVolumeUp className="w-5 h-5" /> : <HiOutlineVolumeOff className="w-5 h-5" />}
          </motion.button>

          <motion.button
            onClick={handleLogout}
            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
            className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-all"
            title="Logout"
          >
            <HiOutlineLogout className="w-5 h-5" />
          </motion.button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          activeTab={activeTab}
          onTabChange={() => {}}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          mobileOpen={mobileSidebarOpen}
          onMobileClose={() => setMobileSidebarOpen(false)}
          onOpenHallOfFame={() => setHallOfFameOpen(true)}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-500 border-t-transparent" />
            </div>
          ) : (
            <div className="space-y-6">
              <CountdownWidget />
              <Routes>
                <Route index element={<Profile userDetails={userDetails} />} />
                <Route path="profile" element={<Profile userDetails={userDetails} />} />
                <Route path="daily-task" element={<DailyTask />} />
                <Route path="team" element={<TeamView />} />
                <Route path="feedback" element={<FeedbackForm />} />
                <Route path="settings" element={<Settings userDetails={userDetails} />} />
              </Routes>
            </div>
          )}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden flex items-center justify-around bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-1 py-1 z-30 shrink-0">
        {tabs.map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <motion.button
              key={tab.id}
              onClick={() => { playClick(); tab.id === 'hall-of-fame' ? setHallOfFameOpen(true) : navigate(tab.path) }}
              whileTap={{ scale: 0.9 }}
              className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all min-w-[44px] min-h-[44px] ${
                isActive
                  ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium leading-tight">{tab.label}</span>
            </motion.button>
          )
        })}
        <motion.button
          onClick={handleLogout}
          whileTap={{ scale: 0.9 }}
          className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all min-w-[44px] min-h-[44px] text-gray-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 dark:hover:text-red-400"
        >
          <HiOutlineLogout className="w-5 h-5" />
          <span className="text-[10px] font-medium leading-tight">Logout</span>
        </motion.button>
      </nav>

      <HallOfFameModal open={hallOfFameOpen} onClose={() => setHallOfFameOpen(false)} />
      <StockTicker />
      <AchievementPopup />
      <OvertakeNotification />
    </div>
  )
}

export default PlayerDashboard
