import { useState, useEffect, useCallback, useRef } from 'react'
import { Routes, Route, useNavigate, useLocation, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Toaster, toast } from 'react-hot-toast'
import {
  HiOutlineUser, HiOutlineStar, HiOutlineClipboardCheck,
  HiOutlineUsers, HiOutlineChatAlt2, HiOutlineCog,
  HiOutlineLogout, HiOutlineVolumeUp, HiOutlineVolumeOff
} from 'react-icons/hi'
import api from '../api'
import useStore from '../store'
import { playClick } from '../sound'
import { disconnectSocket } from '../socket'
import ThemeToggle from '../components/ThemeToggle'
import TeamRankings from '../components/TeamRankings'
import Profile from './player/Profile'
import DailyTask from './player/DailyTask'
import TeamView from './player/TeamView'
import FeedbackForm from './player/FeedbackForm'
import Settings from './player/Settings'

const tabs = [
  { id: 'profile', label: 'My Profile', icon: HiOutlineUser, path: '/player/profile' },
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
    if (!countdown.endTime || !countdown.isActive) {
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
  }, [countdown.endTime, countdown.isActive])

  useEffect(() => {
    if (!countdown.isActive || remaining <= 0 || remaining > 30) return
    const speed = remaining <= 10 ? 300 : 600
    const id = setInterval(() => setPulse(p => !p), speed)
    return () => clearInterval(id)
  }, [countdown.isActive, remaining])

  if (!countdown.isActive || remaining <= 0) return null

  const m = Math.floor(remaining / 60)
  const s = remaining % 60
  const str = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  const isUrgent = remaining <= 30

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

const OnlineCount = () => {
  const { onlineUsers } = useStore()
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-600 dark:text-green-400">
      <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
      {onlineUsers.length} online
    </span>
  )
}

const Sidebar = ({ activeTab, onTabChange, collapsed, onToggle }) => {
  const navigate = useNavigate()

  const handleTab = (tab) => {
    playClick()
    onTabChange(tab.id)
    navigate(tab.path)
  }

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 64 : 220 }}
      className="bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col shrink-0 overflow-hidden shadow-sm z-10"
    >
      <div className="p-3 flex items-center justify-between border-b border-gray-100 dark:border-gray-700">
        {!collapsed && <span className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Sections</span>}
        <motion.button
          onClick={() => { playClick(); onToggle() }}
          whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-all"
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
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
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
    </motion.aside>
  )
}

const PlayerDashboard = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { auth, preferences, toggleNightMode, toggleSound } = useStore()
  const [userDetails, setUserDetails] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

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
        duration: 3000
      }} />

      <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 sm:px-6 shrink-0 z-30 shadow-sm">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 bg-clip-text text-transparent">
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
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-500 border-t-transparent" />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50 dark:from-yellow-900/10 dark:via-amber-900/10 dark:to-orange-900/10 rounded-3xl p-4 sm:p-6 border border-yellow-100 dark:border-yellow-900/20 shadow-lg shadow-yellow-500/5">
                <h2 className="text-base font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
                  <span className="text-xl">🏆</span>
                  Team Rankings &amp; Cash
                </h2>
                <TeamRankings />
              </div>
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

      <StockTicker />
      <AchievementPopup />
      <OvertakeNotification />
    </div>
  )
}

export default PlayerDashboard
