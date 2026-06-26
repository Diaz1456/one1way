import { useState, useEffect, useCallback, useRef } from 'react'
import { Routes, Route, useNavigate, useLocation, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Toaster, toast } from 'react-hot-toast'
import {
  HiOutlineUser, HiOutlineStar, HiOutlineClipboardCheck,
  HiOutlineUsers, HiOutlineChatAlt2, HiOutlineCog,
  HiOutlineLogout, HiOutlineMoon, HiOutlineSun, HiOutlineVolumeUp, HiOutlineVolumeOff
} from 'react-icons/hi'
import api from '../api'
import useStore from '../store'
import { playClick } from '../sound'
import Profile from './player/Profile'
import PlayerAchievements from './player/PlayerAchievements'
import DailyTask from './player/DailyTask'
import TeamView from './player/TeamView'
import FeedbackForm from './player/FeedbackForm'
import Settings from './player/Settings'

const tabs = [
  { id: 'profile', label: 'My Profile', icon: HiOutlineUser, path: '/player/profile' },
  { id: 'achievements', label: 'Achievements', icon: HiOutlineStar, path: '/player/achievements' },
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

  if (!countdown.isActive || remaining <= 0) return null

  const h = Math.floor(remaining / 3600)
  const m = Math.floor((remaining % 3600) / 60)
  const s = remaining % 60
  const str = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`

  return (
    <span className="text-sm font-mono tabular-nums text-orange-500 dark:text-orange-400 font-semibold">
      {str}
    </span>
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
      className="bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col shrink-0 overflow-hidden"
    >
      <div className="p-3 flex items-center justify-between border-b border-gray-100 dark:border-gray-700">
        {!collapsed && <span className="text-sm font-bold text-gray-800 dark:text-white">Sections</span>}
        <button
          onClick={() => { playClick(); onToggle() }}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={collapsed ? 'M13 5l7 7-7 7M5 5l7 7-7 7' : 'M11 19l-7-7 7-7m8 14l-7-7 7-7'} />
          </svg>
        </button>
      </div>
      <nav className="flex-1 py-2 space-y-1 px-2">
        {tabs.map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => handleTab(tab)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                ${isActive
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              title={collapsed ? tab.label : undefined}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span>{tab.label}</span>}
            </button>
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
    auth.logout()
    navigate('/login')
  }

  const displayName = userDetails?.displayName || auth.user?.displayName || auth.user?.username || 'Player'
  const avatarUrl = userDetails?.avatar || auth.user?.avatar || ''
  const rank = userDetails?.rank || auth.user?.rank

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900 overflow-hidden">
      <Toaster position="top-right" toastOptions={{
        className: 'dark:bg-gray-800 dark:text-white',
        duration: 3000
      }} />

      <header className="h-14 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 shrink-0 z-30">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-extrabold tracking-tight bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            ONE WAY
          </h1>
          <div className="hidden sm:flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
            <LiveClock />
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <CountdownTimer />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {rank && (
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full text-xs font-semibold">
              #{rank}
            </span>
          )}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-700/50 rounded-full">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-6 h-6 rounded-full object-cover" />
            ) : (
              <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200 max-w-[120px] truncate">
              {displayName}
            </span>
          </div>

          <button
            onClick={() => { playClick(); toggleNightMode() }}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
            title="Toggle night mode"
          >
            {preferences.nightMode ? <HiOutlineSun className="w-5 h-5" /> : <HiOutlineMoon className="w-5 h-5" />}
          </button>

          <button
            onClick={() => { playClick(); toggleSound() }}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
            title="Toggle sound"
          >
            {preferences.soundEnabled ? <HiOutlineVolumeUp className="w-5 h-5" /> : <HiOutlineVolumeOff className="w-5 h-5" />}
          </button>

          <button
            onClick={handleLogout}
            className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400"
            title="Logout"
          >
            <HiOutlineLogout className="w-5 h-5" />
          </button>
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
            <Routes>
              <Route index element={<Profile userDetails={userDetails} />} />
              <Route path="profile" element={<Profile userDetails={userDetails} />} />
              <Route path="achievements" element={<PlayerAchievements userDetails={userDetails} />} />
              <Route path="daily-task" element={<DailyTask />} />
              <Route path="team" element={<TeamView />} />
              <Route path="feedback" element={<FeedbackForm />} />
              <Route path="settings" element={<Settings userDetails={userDetails} />} />
            </Routes>
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
