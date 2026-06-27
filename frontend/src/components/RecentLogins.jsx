import { useState } from 'react'
import useStore from '../store'

const RecentLogins = () => {
  const { recentLogins } = useStore()
  const [expanded, setExpanded] = useState(false)
  if (!recentLogins || recentLogins.length === 0) return null
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full"
      >
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Recent Logins</span>
        <span className={`text-xs text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}>▼</span>
      </button>
      {expanded && (
        <div className="mt-3 space-y-1.5 max-h-48 overflow-y-auto">
          {recentLogins.map((r, i) => (
            <div key={i} className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 py-1">
              <span className="font-medium text-gray-800 dark:text-gray-200">{r.username}</span>
              <span className="tabular-nums">{new Date(r.timestamp).toLocaleTimeString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default RecentLogins
