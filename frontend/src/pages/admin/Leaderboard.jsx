import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { FiSearch, FiX, FiStar, FiCheckCircle, FiAward, FiTrendingUp } from 'react-icons/fi'
import api from '../../api'

const rankColors = {
  1: { ring: 'ring-yellow-400', bg: 'from-yellow-400 to-amber-500', label: 'Gold' },
  2: { ring: 'ring-gray-300', bg: 'from-gray-300 to-gray-400', label: 'Silver' },
  3: { ring: 'ring-orange-400', bg: 'from-orange-400 to-orange-500', label: 'Bronze' }
}

const stagger = {
  animate: { transition: { staggerChildren: 0.04 } }
}

const cardItem = {
  initial: { opacity: 0, y: 12, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.3, ease: 'easeOut' } }
}

export default function Leaderboard() {
  const [players, setPlayers] = useState([])
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [modalPlayer, setModalPlayer] = useState(null)
  const [modalData, setModalData] = useState(null)
  const [modalLoading, setModalLoading] = useState(false)

  const fetchLeaderboard = useCallback(async () => {
    try {
      setLoading(true)
      const { data } = await api.get('/users/leaderboard')
      setPlayers(Array.isArray(data) ? data : data.users || data.leaderboard || [])
    } catch {
      toast.error('Failed to load leaderboard')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchLeaderboard() }, [fetchLeaderboard])

  const openModal = async (player, rank) => {
    setModalPlayer({ ...player, rank })
    setModalLoading(true)
    setModalData(null)
    try {
      const { data } = await api.get(`/users/${player.id}/details`)
      const achs = data.achievements || []
      const taskCount = achs.filter(a => a.category === 'daily_task').length
      setModalData({ achievements: achs, taskCount })
    } catch {
      setModalData({ achievements: [], taskCount: 0 })
    } finally {
      setModalLoading(false)
    }
  }

  const filtered = players.filter(p =>
    !filter || (p.username && p.username.toLowerCase().includes(filter.toLowerCase()))
  )

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg shadow-gray-200/50 dark:shadow-black/20 border border-gray-100 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md shadow-amber-500/20">
              <FiAward className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Leaderboard</h2>
          </div>
          <div className="relative max-w-xs w-full sm:w-64">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input placeholder="Search players..." value={filter} onChange={e => setFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 outline-none transition-all text-sm" />
          </div>
        </div>
      </motion.div>

      {/* Player cards */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="relative w-10 h-10">
            <div className="absolute inset-0 rounded-full border-2 border-amber-200 dark:border-amber-900" />
            <div className="absolute inset-0 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-gray-400 dark:text-gray-500 py-20">No players found</motion.p>
      ) : (
        <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-3">
          {filtered.map((player, index) => {
            const rank = index + 1
            const colors = rankColors[rank]
            return (
              <motion.div key={player.id} variants={cardItem} layout
                onClick={() => openModal(player, rank)}
                whileHover={{ scale: 1.01, y: -2 }}
                whileTap={{ scale: 0.99 }}
                className={`relative bg-white dark:bg-gray-800 rounded-2xl shadow-sm hover:shadow-lg hover:shadow-gray-200/50 dark:hover:shadow-black/20 border border-gray-100 dark:border-gray-700/50 p-4 cursor-pointer transition-all overflow-hidden group ${
                  colors ? `ring-2 ${colors.ring} ring-offset-2 dark:ring-offset-gray-900` : ''
                }`}
              >
                {/* Gradient accent on top */}
                {colors && (
                  <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${colors.bg}`} />
                )}
                <div className="flex items-center gap-4">
                  {/* Rank badge */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                    colors
                      ? `bg-gradient-to-br ${colors.bg} text-white shadow-md`
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                  }`}>
                    #{rank}
                  </div>

                  {/* Avatar */}
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-base shrink-0 shadow-sm">
                    {(player.username || '?')[0].toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900 dark:text-white truncate">{player.username}</p>
                      {colors && (
                        <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-gradient-to-r from-amber-100 to-amber-200 dark:from-amber-900/30 dark:to-amber-800/30 text-amber-700 dark:text-amber-300 font-medium">{colors.label}</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{player.team?.name || player.teamName || 'No team'}</p>
                  </div>

                  {/* Score */}
                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold text-gray-900 dark:text-white tabular-nums">{player.score ?? player.total_points ?? 0}</p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">Points</p>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      )}

      {/* Player detail modal */}
      <AnimatePresence>
        {modalPlayer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => { setModalPlayer(null); setModalData(null) }}
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.85, opacity: 0, y: 10 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              onClick={e => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden"
            >
              {/* Modal header */}
              <div className="relative bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 dark:from-blue-500/5 dark:via-purple-500/5 dark:to-pink-500/5 p-6 pb-0">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-purple-500/20">
                        {(modalPlayer.username || '?')[0].toUpperCase()}
                      </div>
                      {/* Rank badge overlay */}
                      <div className={`absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-md ${
                        modalPlayer.rank <= 3
                          ? `bg-gradient-to-br ${rankColors[modalPlayer.rank].bg}`
                          : 'bg-gray-400 dark:bg-gray-600'
                      }`}>
                        #{modalPlayer.rank}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">{modalPlayer.username}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        {modalPlayer.team?.name || modalPlayer.teamName || 'No team'}
                      </p>
                    </div>
                  </div>
                  <motion.button onClick={() => { setModalPlayer(null); setModalData(null) }}
                    whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                    className="p-2 rounded-xl hover:bg-white/50 dark:hover:bg-gray-700/50 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-all">
                    <FiX size={20} />
                  </motion.button>
                </div>

                {/* Stats row */}
                <div className="flex gap-4 mt-6 pb-6 border-b border-gray-100 dark:border-gray-700">
                  <div className="flex-1 bg-white/60 dark:bg-gray-700/40 rounded-xl px-4 py-3 text-center backdrop-blur-sm">
                    <p className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">{modalPlayer.score ?? modalPlayer.total_points ?? 0}</p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider mt-0.5">Points</p>
                  </div>
                  <div className="flex-1 bg-white/60 dark:bg-gray-700/40 rounded-xl px-4 py-3 text-center backdrop-blur-sm">
                    <p className="text-2xl font-bold text-amber-500 tabular-nums">{modalLoading ? '...' : modalData?.taskCount ?? 0}</p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider mt-0.5">Tasks Done</p>
                  </div>
                  <div className="flex-1 bg-white/60 dark:bg-gray-700/40 rounded-xl px-4 py-3 text-center backdrop-blur-sm">
                    <p className="text-2xl font-bold text-emerald-500 tabular-nums">{modalPlayer.rank}</p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider mt-0.5">Rank</p>
                  </div>
                </div>
              </div>

              {/* Modal body */}
              <div className="p-6 overflow-y-auto max-h-[50vh]">
                <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                  <FiStar className="w-4 h-4 text-amber-500" />
                  Achievements
                </h4>

                {modalLoading ? (
                  <div className="space-y-3">
                    {[1,2,3].map(i => (
                      <div key={i} className="h-16 bg-gray-100 dark:bg-gray-700/50 rounded-xl animate-pulse" />
                    ))}
                  </div>
                ) : !modalData || modalData.achievements.length === 0 ? (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="text-center text-gray-400 dark:text-gray-500 py-8 text-sm">
                    No achievements yet
                  </motion.p>
                ) : (
                  <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-2">
                    {modalData.achievements.slice(0, 50).map((ach, i) => (
                      <motion.div key={ach.id || i} variants={cardItem}
                        className="flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-700/30 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors group">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0 shadow-sm">
                          <FiStar className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-base font-bold text-gray-800 dark:text-white truncate">{ach.category || 'Achievement'}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {(ach.date_earned || ach.dateEarned) && (
                              <span className="text-[10px] text-gray-400 dark:text-gray-500">
                                {new Date(ach.date_earned || ach.dateEarned).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="text-sm font-bold text-blue-600 dark:text-blue-400 shrink-0 group-hover:scale-110 transition-transform">+{ach.points || 0}</span>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
