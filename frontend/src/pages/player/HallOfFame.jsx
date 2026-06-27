import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { HiOutlineUsers, HiOutlineCash, HiOutlineStar, HiOutlineRefresh } from 'react-icons/hi'
import { FiAward } from 'react-icons/fi'
import toast from 'react-hot-toast'
import api from '../../api'
import useStore from '../../store'
import { getSocket } from '../../socket'

const REVEAL_INTERVAL = 200
const RANK_COLORS = [
  { bg: 'from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20', border: 'border-yellow-300 dark:border-yellow-600', ring: 'ring-yellow-400/40', icon: '🥇', text: 'text-yellow-600 dark:text-yellow-400' },
  { bg: 'from-gray-50 to-slate-50 dark:from-gray-800/50 dark:to-slate-800/30', border: 'border-gray-300 dark:border-gray-600', ring: 'ring-gray-400/30', icon: '🥈', text: 'text-gray-500 dark:text-gray-400' },
  { bg: 'from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20', border: 'border-amber-300 dark:border-amber-600', ring: 'ring-amber-400/30', icon: '🥉', text: 'text-amber-600 dark:text-amber-400' },
]

function HallOfFameEntry({ entry, rank, maxValue, metricLabel }) {
  const cfg = RANK_COLORS[rank - 1] || RANK_COLORS[2]
  const isPodium = rank <= 3
  const pct = maxValue > 0 ? (entry.total_points ?? entry.cash ?? 0) / maxValue : 0
  const value = entry.total_points ?? entry.cash ?? 0
  const displayValue = metricLabel === 'Cash'
    ? `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : value.toLocaleString()
  const name = entry.username || entry.name || 'Unknown'
  const avatar = entry.avatar_url || ''

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 30, scale: 0.95, filter: 'blur(4px)' }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
      transition={{ type: 'spring', stiffness: 200, damping: 25 }}
      className={`relative rounded-2xl p-4 sm:p-5 bg-gradient-to-br ${cfg.bg} border-2 ${cfg.border} ${isPodium ? `ring-2 ${cfg.ring} shadow-xl` : 'shadow-md border-gray-100 dark:border-gray-700'}`}
    >
      <div className="flex items-center gap-4">
        <div className="shrink-0 w-12 sm:w-14 text-center">
          {isPodium ? (
            <motion.div
              animate={rank === 1 ? { scale: [1, 1.08, 1] } : {}}
              transition={{ repeat: Infinity, duration: 2 }}
              className="text-3xl sm:text-4xl"
            >
              {cfg.icon}
            </motion.div>
          ) : (
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center font-black text-lg sm:text-xl text-gray-500 dark:text-gray-400">
              #{rank}
            </div>
          )}
        </div>

        {avatar ? (
          <img src={avatar} alt="" className="w-11 h-11 sm:w-13 sm:h-13 rounded-full object-cover ring-2 ring-white dark:ring-gray-600 shadow-sm" />
        ) : (
          <div className={`w-11 h-11 sm:w-13 sm:h-13 rounded-full flex items-center justify-center text-white font-bold text-base shadow-sm ${
            isPodium
              ? `bg-gradient-to-br ${['from-yellow-400 to-amber-500', 'from-gray-300 to-slate-400', 'from-amber-500 to-orange-500'][rank - 1]}`
              : 'bg-gradient-to-br from-blue-400 to-purple-500'
          }`}>
            {name.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p className="text-sm sm:text-base font-bold text-gray-900 dark:text-white truncate">{name}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {metricLabel === 'Cash' ? 'Team' : 'Player'}
            {entry.team_name && <span> &middot; {entry.team_name}</span>}
            {entry.member_count != null && <span> &middot; {entry.member_count} {entry.member_count === 1 ? 'member' : 'members'}</span>}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <div className={`text-base sm:text-lg font-black tabular-nums flex items-center gap-1 ${cfg.text}`}>
            {metricLabel === 'Cash' ? <HiOutlineCash className="w-4 h-4 sm:w-5 sm:h-5" /> : <HiOutlineStar className="w-4 h-4 sm:w-5 sm:h-5" />}
            {displayValue}
          </div>
          <div className="mt-1.5 w-20 sm:w-24 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden ml-auto">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct * 100}%` }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
              className={`h-full rounded-full ${isPodium ? 'bg-gradient-to-r ' + ['from-yellow-400 to-amber-400', 'from-gray-400 to-slate-400', 'from-amber-400 to-orange-400'][rank - 1] : 'bg-gradient-to-r from-blue-400 to-purple-400'}`}
            />
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default function HallOfFame() {
  const storeTeams = useStore((s) => s.teams)
  const [mode, setMode] = useState('players')
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [revealedCount, setRevealedCount] = useState(0)

  const fetchData = useCallback(() => {
    setLoading(true)
    setRevealedCount(0)
    if (mode === 'teams') {
      const fromStore = useStore.getState().teams
      if (fromStore.length) {
        const sorted = [...fromStore].sort((a, b) => (a.rank || 99) - (b.rank || 99))
        setEntries(sorted)
        setLoading(false)
        return
      }
    }
    api.get(`/users/halloffame?type=${mode}&limit=10`)
      .then(({ data }) => setEntries(Array.isArray(data) ? data : []))
      .catch(() => toast.error('Failed to load hall of fame'))
      .finally(() => setLoading(false))
  }, [mode])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    if (loading || !entries.length) {
      setRevealedCount(0)
      return
    }
    if (revealedCount < entries.length) {
      const timer = setTimeout(() => setRevealedCount(c => c + 1), REVEAL_INTERVAL)
      return () => clearTimeout(timer)
    }
  }, [loading, entries.length, revealedCount])

  useEffect(() => {
    if (mode !== 'teams') return
    if (!storeTeams.length) return
    const sorted = [...storeTeams].sort((a, b) => (a.rank || 99) - (b.rank || 99))
    setEntries(sorted)
    setRevealedCount(0)
  }, [storeTeams, mode])

  useEffect(() => {
    if (mode !== 'players') return
    const socket = getSocket()
    if (!socket) return
    const handler = () => {
      api.get('/users/halloffame?type=players&limit=10')
        .then(({ data }) => {
          const list = Array.isArray(data) ? data : []
          setEntries(list)
          setRevealedCount(0)
        })
        .catch(() => {})
    }
    socket.on('achievement:new', handler)
    return () => socket.off('achievement:new', handler)
  }, [mode])

  const reversed = useMemo(() => {
    return [...entries].reverse()
  }, [entries])

  const maxValue = useMemo(() => {
    if (!entries.length) return 1
    return Math.max(...entries.map(e => e.total_points ?? e.cash ?? 0), 1)
  }, [entries])

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-md shadow-yellow-500/20">
            <FiAward className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-gray-900 dark:text-white">Hall of Fame</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">Top ranked players &amp; teams</p>
          </div>
        </div>
        <motion.button
          onClick={fetchData}
          whileTap={{ scale: 0.9 }}
          className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-blue-500 transition-colors"
          title="Refresh"
        >
          <HiOutlineRefresh className="w-5 h-5" />
        </motion.button>
      </div>

      <div className="flex bg-gray-100 dark:bg-gray-800 rounded-2xl p-1.5 shadow-inner">
        {[
          { id: 'players', label: 'Top Players', icon: HiOutlineStar },
          { id: 'teams', label: 'Top Teams', icon: HiOutlineUsers },
        ].map(({ id, label, icon: Icon }) => (
          <motion.button
            key={id}
            onClick={() => setMode(id)}
            whileTap={{ scale: 0.97 }}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all min-h-[44px] ${
              mode === id
                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm border border-gray-200 dark:border-gray-600'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{label}</span>
          </motion.button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="h-20 bg-gray-100 dark:bg-gray-700 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : !entries.length ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-16"
        >
          <div className="text-6xl mb-4">🏆</div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">No entries yet</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {mode === 'players' ? 'Players need to earn achievements to appear here.' : 'Teams need to be created and have cash balance.'}
          </p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {revealedCount > 0 && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-xs text-gray-400 dark:text-gray-500"
            >
              Revealing {revealedCount} of {entries.length}
            </motion.p>
          )}
          <AnimatePresence mode="popLayout">
            {reversed.slice(0, revealedCount).map((entry, i) => {
              const actualIndex = entries.length - 1 - i
              const rank = actualIndex + 1
              return (
                <HallOfFameEntry
                  key={entry.id || entry._id || rank}
                  entry={entry}
                  rank={rank}
                  maxValue={maxValue}
                  metricLabel={mode === 'teams' ? 'Cash' : 'Points'}
                />
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  )
}
