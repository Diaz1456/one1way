import { useState, useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { HiOutlineStar, HiOutlineChartBar, HiOutlineFilter } from 'react-icons/hi'
import toast from 'react-hot-toast'
import api from '../../api'
import useStore from '../../store'
import { playCoinUp } from '../../sound'

const easeOut = { type: 'spring', stiffness: 60, damping: 12 }

const ProgressBar = ({ value, max, color = 'bg-blue-500', label }) => {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div className="flex items-center gap-3">
      {label && <span className="text-xs font-medium text-gray-600 dark:text-gray-400 w-24 shrink-0 truncate">{label}</span>}
      <div className="flex-1 h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 w-16 text-right shrink-0">
        {value.toLocaleString()}
      </span>
    </div>
  )
}

const PlayerAchievements = ({ userDetails }) => {
  const { auth } = useStore()
  const [achievements, setAchievements] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all')
  const hasPlayed = useRef(false)

  const userId = userDetails?.id || auth.user?.id

  useEffect(() => {
    if (!userId) { setLoading(false); return }
    api.get(`/users/${userId}/achievements`)
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : data.achievements || data.results || []
        setAchievements(list)
        if (!hasPlayed.current && list.length > 0) {
          playCoinUp()
          hasPlayed.current = true
        }
      })
      .catch(err => {
        const msg = err.response?.data?.error || 'Failed to load achievements'
        setError(msg)
        toast.error(msg)
      })
      .finally(() => setLoading(false))
  }, [userId])

  const categories = useMemo(() => {
    const map = {}
    achievements.forEach(ach => {
      const cat = ach.category || ach.type || 'General'
      if (!map[cat]) map[cat] = { name: cat, points: 0, count: 0 }
      map[cat].points += ach.points || ach.score || 0
      map[cat].count += 1
    })
    return Object.values(map).sort((a, b) => b.points - a.points)
  }, [achievements])

  const totalScore = useMemo(() => achievements.reduce((s, a) => s + (a.points || a.score || 0), 0), [achievements])
  const maxCategoryPoints = categories.length > 0 ? Math.max(...categories.map(c => c.points)) : 1

  const categoryColors = [
    'bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500',
    'bg-rose-500', 'bg-cyan-500', 'bg-pink-500', 'bg-lime-500'
  ]

  const uniqueCategories = ['all', ...categories.map(c => c.name)]
  const filtered = filter === 'all' ? achievements : achievements.filter(a => (a.category || a.type || 'General') === filter)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-500 border-t-transparent" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-500 dark:text-red-400 font-medium">{error}</p>
          <button onClick={() => window.location.reload()} className="mt-3 text-sm text-blue-500 hover:underline">
            Try again
          </button>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto space-y-6"
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <HiOutlineChartBar className="w-6 h-6 text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Score by Category</h2>
          </div>
          <div className="text-right">
            <p className="text-2xl font-extrabold text-gray-900 dark:text-white">{totalScore.toLocaleString()}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Total Score</p>
          </div>
        </div>
        <div className="mt-5 space-y-3">
          {categories.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-6">No achievements yet</p>
          ) : (
            categories.map((cat, i) => (
              <ProgressBar
                key={cat.name}
                label={cat.name}
                value={cat.points}
                max={maxCategoryPoints}
                color={categoryColors[i % categoryColors.length]}
              />
            ))
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <HiOutlineStar className="w-6 h-6 text-yellow-500" />
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">All Achievements</h2>
          </div>
          <div className="flex items-center gap-2">
            <HiOutlineFilter className="w-4 h-4 text-gray-400" />
            <select
              value={filter}
              onChange={e => setFilter(e.target.value)}
              className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {uniqueCategories.map(cat => (
                <option key={cat} value={cat}>{cat === 'all' ? 'All Categories' : cat}</option>
              ))}
            </select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-6">No achievements to show</p>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {filtered.map((ach, i) => (
                <motion.div
                  key={ach.id || i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/30 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <HiOutlineStar className="w-5 h-5 text-yellow-500 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-gray-800 dark:text-white">
                        {ach.title || ach.name || 'Achievement'}
                      </p>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium">
                        {ach.category || ach.type || 'General'}
                      </span>
                    </div>
                    {ach.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{ach.description}</p>
                    )}
                    {(ach.date_earned || ach.dateEarned) && (
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                        {new Date(ach.date_earned || ach.dateEarned).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                      +{ach.points || ach.score || 0}
                    </span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default PlayerAchievements
