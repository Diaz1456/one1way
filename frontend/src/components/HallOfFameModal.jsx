import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { HiOutlineUsers, HiOutlineStar, HiOutlineX } from 'react-icons/hi'
import { FiAward } from 'react-icons/fi'
import toast from 'react-hot-toast'
import api from '../api'
import useStore from '../store'
import { getSocket } from '../socket'

const REVEAL_DELAYS = [600, 1200, 2000]
const RANK_CONFIG = [
  { medal: '🥇', label: '1st', color: 'from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20', border: 'border-yellow-300 dark:border-yellow-600', ring: 'ring-yellow-400/40', bar: 'from-yellow-400 to-amber-500', text: 'text-yellow-600 dark:text-yellow-400', scale: 1.08 },
  { medal: '🥈', label: '2nd', color: 'from-gray-50 to-slate-50 dark:from-gray-800/50 dark:to-slate-800/30', border: 'border-gray-300 dark:border-gray-600', ring: 'ring-gray-400/30', bar: 'from-gray-300 to-slate-400', text: 'text-gray-500 dark:text-gray-400', scale: 1 },
  { medal: '🥉', label: '3rd', color: 'from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20', border: 'border-amber-300 dark:border-amber-600', ring: 'ring-amber-400/30', bar: 'from-amber-500 to-orange-500', text: 'text-amber-600 dark:text-amber-400', scale: 1 },
]

function EntryCard({ entry, rank, maxValue, metricLabel, visible }) {
  const cfg = RANK_CONFIG[rank - 1]
  const value = entry.total_points ?? entry.cash ?? 0
  const pct = maxValue > 0 ? value / maxValue : 0
  const displayValue = metricLabel === 'Cash'
    ? `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : value.toLocaleString()
  const name = entry.username || entry.name || 'Unknown'
  const avatar = entry.avatar_url || ''

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.9, filter: 'blur(6px)' }}
      animate={visible
        ? { opacity: 1, y: 0, scale: cfg.scale, filter: 'blur(0px)' }
        : { opacity: 0, y: 40, scale: 0.9, filter: 'blur(6px)' }
      }
      transition={{ type: 'spring', stiffness: 200, damping: 22 }}
      className={`relative rounded-2xl p-4 sm:p-5 bg-gradient-to-br ${cfg.color} border-2 ${cfg.border} ${rank === 1 ? `ring-2 ${cfg.ring} shadow-2xl` : 'shadow-lg'}`}
    >
      {rank === 1 && (
        <motion.div
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{ repeat: Infinity, duration: 3 }}
          className="absolute -top-3 -right-3 text-2xl sm:text-3xl drop-shadow-lg"
        >
          👑
        </motion.div>
      )}
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="shrink-0 text-center w-12 sm:w-14">
          <motion.div
            animate={rank === 1 && visible ? { scale: [1, 1.1, 1] } : {}}
            transition={{ repeat: Infinity, duration: 2 }}
            className="text-2xl sm:text-3xl"
          >
            {cfg.medal}
          </motion.div>
        </div>

        {avatar ? (
          <img src={avatar} alt="" className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover ring-2 ring-white dark:ring-gray-600 shadow-sm" />
        ) : (
          <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-base shadow-sm bg-gradient-to-br ${cfg.bar}`}>
            {name.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p className={`text-sm sm:text-base font-bold truncate ${cfg.text}`}>{name}</p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
            {metricLabel === 'Cash' ? 'Team' : 'Player'}
            {entry.team_name && <span> &middot; {entry.team_name}</span>}
            {entry.member_count != null && <span> &middot; {entry.member_count} {entry.member_count === 1 ? 'member' : 'members'}</span>}
          </p>
        </div>

        <div className="shrink-0 text-right min-w-0">
          <motion.p
            initial={{ scale: 0 }}
            animate={visible ? { scale: 1 } : { scale: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.2 }}
            className={`text-base sm:text-lg font-black tabular-nums ${cfg.text}`}
          >
            {displayValue}
          </motion.p>
          <div className="mt-1.5 w-16 sm:w-20 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden ml-auto">
            <motion.div
              initial={{ width: 0 }}
              animate={visible ? { width: `${pct * 100}%` } : { width: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
              className={`h-full rounded-full bg-gradient-to-r ${cfg.bar}`}
            />
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default function HallOfFameModal({ open, onClose }) {
  const storeTeams = useStore((s) => s.teams)
  const [mode, setMode] = useState('players')
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [revealed, setRevealed] = useState([false, false, false])

  const fetchData = () => {
    setLoading(true)
    setRevealed([false, false, false])
    if (mode === 'teams') {
      const fromStore = useStore.getState().teams
      if (fromStore.length) {
        const sorted = [...fromStore].sort((a, b) => (a.rank || 99) - (b.rank || 99)).slice(0, 3)
        setEntries(sorted)
        setLoading(false)
        return
      }
    }
    api.get(`/users/halloffame?type=${mode}&limit=3`)
      .then(({ data }) => setEntries(Array.isArray(data) ? data : []))
      .catch(() => toast.error('Failed to load hall of fame'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (open) fetchData()
  }, [open, mode])

  useEffect(() => {
    if (loading || entries.length === 0) {
      setRevealed([false, false, false])
      return
    }
    const timers = REVEAL_DELAYS.map((delay, i) =>
      setTimeout(() => setRevealed(prev => { const next = [...prev]; next[i] = true; return next }), delay)
    )
    return () => timers.forEach(clearTimeout)
  }, [loading, entries])

  useEffect(() => {
    if (mode !== 'teams' || !storeTeams.length) return
    const sorted = [...storeTeams].sort((a, b) => (a.rank || 99) - (b.rank || 99)).slice(0, 3)
    setEntries(sorted)
    setRevealed([false, false, false])
  }, [storeTeams, mode])

  useEffect(() => {
    if (mode !== 'players') return
    const socket = getSocket()
    if (!socket) return
    const handler = () => {
      api.get('/users/halloffame?type=players&limit=3')
        .then(({ data }) => { const list = Array.isArray(data) ? data : []; setEntries(list); setRevealed([false, false, false]) })
        .catch(() => {})
    }
    socket.on('achievement:new', handler)
    return () => socket.off('achievement:new', handler)
  }, [mode])

  const reversed = useMemo(() => [...entries].reverse(), [entries])
  const maxValue = useMemo(() => Math.max(...entries.map(e => e.total_points ?? e.cash ?? 0), 1), [entries])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.85, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.85, opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            onClick={e => e.stopPropagation()}
            className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="sticky top-0 bg-white dark:bg-gray-800 z-10 flex items-center justify-between p-4 sm:p-5 border-b border-gray-100 dark:border-gray-700 rounded-t-3xl">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-md shadow-yellow-500/20">
                  <FiAward className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-extrabold text-gray-900 dark:text-white">Hall of Fame</h2>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">Top 3 ranked</p>
                </div>
              </div>
              <motion.button onClick={onClose}
                whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 transition-all min-w-[36px] min-h-[36px] flex items-center justify-center"
              >
                <HiOutlineX className="w-5 h-5" />
              </motion.button>
            </div>

            <div className="p-4 sm:p-5 space-y-4">
              <div className="flex bg-gray-100 dark:bg-gray-700/50 rounded-xl p-1">
                {[
                  { id: 'players', label: 'Top Players', icon: HiOutlineStar },
                  { id: 'teams', label: 'Top Teams', icon: HiOutlineUsers },
                ].map(({ id, label, icon: Icon }) => (
                  <motion.button
                    key={id}
                    onClick={() => setMode(id)}
                    whileTap={{ scale: 0.97 }}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all min-h-[40px] ${
                      mode === id
                        ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm border border-gray-200 dark:border-gray-500'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{label}</span>
                  </motion.button>
                ))}
              </div>

              {loading ? (
                <div className="space-y-3 py-4">
                  {[1,2,3].map(i => (
                    <div key={i} className="h-20 bg-gray-100 dark:bg-gray-700 rounded-2xl animate-pulse" />
                  ))}
                </div>
              ) : !entries.length ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-10">
                  <div className="text-5xl mb-3">🏆</div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {mode === 'players' ? 'No players with scores yet.' : 'No teams with cash yet.'}
                  </p>
                </motion.div>
              ) : (
                <div className="space-y-3">
                  {reversed.map((entry, i) => {
                    const actualRank = entries.length - i
                    return (
                      <EntryCard
                        key={entry.id || entry._id || actualRank}
                        entry={entry}
                        rank={actualRank}
                        maxValue={maxValue}
                        metricLabel={mode === 'teams' ? 'Cash' : 'Points'}
                        visible={revealed[i]}
                      />
                    )
                  })}
                  {!revealed.every(Boolean) && revealed.some(Boolean) && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center text-[10px] text-gray-400 dark:text-gray-500"
                    >
                      {revealed.filter(Boolean).length} of 3 revealed...
                    </motion.p>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
