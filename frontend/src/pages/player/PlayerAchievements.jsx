import { useState, useEffect, useMemo, useRef } from 'react'
import { motion } from 'framer-motion'
import { HiOutlineChartBar } from 'react-icons/hi'
import toast from 'react-hot-toast'
import api from '../../api'
import useStore from '../../store'
import { playCoinUp } from '../../sound'

const easeOut = { type: 'spring', stiffness: 60, damping: 12 }

const ProgressBar = ({ value, max, color = 'bg-blue-500', label }) => {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div className="flex items-center gap-3">
      {label && <span className="text-xs font-medium text-gray-600 dark:text-gray-400 w-16 sm:w-20 lg:w-24 shrink-0 truncate">{label}</span>}
      <div className="flex-1 h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 w-12 sm:w-16 text-right shrink-0">
        {Number.isInteger(value) ? value.toLocaleString() : value.toFixed(1)}
      </span>
    </div>
  )
}

const PlayerAchievements = ({ userDetails }) => {
  const { auth } = useStore()
  const [achievements, setAchievements] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
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
      map[cat].points += parseFloat(ach.points || ach.score || 0)
      map[cat].count += 1
    })
    return Object.values(map).sort((a, b) => b.points - a.points)
  }, [achievements])

  const totalScore = useMemo(() => achievements.reduce((s, a) => s + parseFloat(a.points || a.score || 0), 0), [achievements])
  const maxCategoryPoints = categories.length > 0 ? Math.max(...categories.map(c => c.points)) : 1

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
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <HiOutlineChartBar className="w-6 h-6 text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Score by Category</h2>
          </div>
          <div className="text-right">
            <p className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white tabular-nums">
              {Number.isInteger(totalScore) ? totalScore.toLocaleString() : totalScore.toFixed(1)}
            </p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500">total</p>
          </div>
        </div>
        {categories.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-8">No achievements yet</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {categories.map((cat, i) => (
              <motion.div
                key={cat.name}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className={`relative p-4 rounded-xl border overflow-hidden ${
                  i === 0
                    ? 'bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/10 border-yellow-200 dark:border-yellow-700/40'
                    : 'bg-gray-50 dark:bg-gray-700/30 border-gray-100 dark:border-gray-700'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-gray-800 dark:text-white truncate">{cat.name}</p>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{cat.count} {cat.count === 1 ? 'entry' : 'entries'}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={`text-lg sm:text-xl font-black tabular-nums ${
                      i === 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-blue-600 dark:text-blue-400'
                    }`}>
                      {Number.isInteger(cat.points) ? cat.points.toLocaleString() : cat.points.toFixed(1)}
                    </p>
                  </div>
                </div>
                <div className="mt-2.5 w-full h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(cat.points / maxCategoryPoints) * 100}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut', delay: i * 0.06 + 0.2 }}
                    className={`h-full rounded-full ${
                      i === 0 ? 'bg-gradient-to-r from-yellow-400 to-amber-400' : 'bg-gradient-to-r from-blue-400 to-cyan-400'
                    }`}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default PlayerAchievements
