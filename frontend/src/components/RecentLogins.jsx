import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useStore from '../store'

const RecentLogins = () => {
  const { recentLogins } = useStore()
  const [expanded, setExpanded] = useState(true)

  const grouped = useMemo(() => {
    if (!recentLogins || !recentLogins.length) return []
    const map = {}
    recentLogins.forEach(r => {
      const key = r.username
      if (!map[key]) map[key] = { username: key, count: 0, latest: r.timestamp }
      map[key].count++
      if (new Date(r.timestamp) > new Date(map[key].latest)) map[key].latest = r.timestamp
    })
    return Object.values(map).sort((a, b) => new Date(b.latest) - new Date(a.latest))
  }, [recentLogins])

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-5"
    >
      <button onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full group"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Recent Logins</span>
          {grouped.length > 0 && (
            <span className="text-[10px] font-bold text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded-full tabular-nums">
              {grouped.length}
            </span>
          )}
        </div>
        <svg className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-3 space-y-1 max-h-48 overflow-y-auto">
              {grouped.length === 0 ? (
                <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">No recent logins</p>
              ) : (
                grouped.map((r, i) => (
                  <motion.div
                    key={r.username}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                      <span className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">{r.username}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {r.count > 1 && (
                        <span className="text-[9px] text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded tabular-nums">x{r.count}</span>
                      )}
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 tabular-nums">
                        {new Date(r.latest).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default RecentLogins
