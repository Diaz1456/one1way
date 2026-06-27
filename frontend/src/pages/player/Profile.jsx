import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { HiOutlineBadgeCheck, HiOutlineUser, HiOutlineX, HiOutlineStar, HiOutlineChartBar, HiOutlineUsers, HiOutlineChat } from 'react-icons/hi'
import toast from 'react-hot-toast'
import api from '../../api'
import useStore from '../../store'

import { getSocket } from '../../socket'

const stagger = { animate: { transition: { staggerChildren: 0.05 } } }
const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } }
}
const fadeSlideCard = {
  initial: { opacity: 0, y: 12, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.35, ease: 'easeOut' } }
}

const rankGradients = [
  'from-yellow-400 to-amber-500',
  'from-gray-300 to-slate-400',
  'from-amber-500 to-orange-500',
]

const rankIcons = ['🥇', '🥈', '🥉']

const ProgressBar = ({ value, max, color = 'bg-blue-500', label, delay = 0 }) => {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay }}
      className="flex items-center gap-3 group">
      {label && <span className="text-xs font-medium text-gray-600 dark:text-gray-400 w-16 sm:w-20 lg:w-24 shrink-0 truncate">{label}</span>}
      <div className="flex-1 h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut', delay }}
          className={`h-full rounded-full ${color} group-hover:brightness-110 transition-all`}
        />
      </div>
      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 w-16 text-right shrink-0 tabular-nums">
        {Number.isInteger(value) ? value.toLocaleString() : value.toFixed(1)}
      </span>
    </motion.div>
  )
}

const ChampionsRow = ({ onSelect }) => {
  const [champions, setChampions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/users/champions')
      .then(({ data }) => setChampions(Array.isArray(data) ? data : []))
      .catch(() => toast.error('Failed to load champions'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex gap-3 justify-center py-4">
        {[1,2,3,4,5].map(i => (
          <div key={i} className="w-14 h-16 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  if (!champions.length) {
    return <p className="text-center text-gray-400 text-sm py-4">No champions yet</p>
  }

  const maxScore = Math.max(...champions.map(c => c.total_points ?? c.score ?? 0), 1)

  return (
    <div className="space-y-5">
      <motion.div variants={stagger} initial="initial" animate="animate" className="flex items-end justify-center gap-2 sm:gap-4">
        {champions.slice(0, 3).map((champ, idx) => {
          const name = champ.username || 'Player'
          const avatar = champ.avatar_url || ''
          const score = champ.total_points ?? champ.score ?? champ.points ?? 0
          const barH = Math.max((score / maxScore) * 120, 48)
          const order = [1, 0, 2]
          const visualIdx = order[idx]
          const barColor = ['from-yellow-400 to-amber-500', 'from-gray-300 to-slate-400', 'from-amber-500 to-orange-500'][visualIdx]
          return (
            <motion.button
              key={champ.id || idx}
              variants={fadeUp}
              whileHover={{ scale: 1.05, y: -4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelect(champ)}
              className="flex flex-col items-center gap-2 group flex-1 min-w-0 max-w-[130px]"
            >
              <motion.div
                animate={{ height: barH }}
                transition={{ type: 'spring', stiffness: 120, damping: 22, delay: idx * 0.12 }}
                className={`w-full rounded-xl flex flex-col items-center justify-end pb-1.5 pt-1 shadow-lg bg-gradient-to-t ${barColor}`}
              >
                <span className="text-lg sm:text-xl leading-none">{rankIcons[visualIdx]}</span>
                <span className="text-[9px] font-bold text-white/90 tabular-nums mt-0.5">{score.toLocaleString()}</span>
              </motion.div>
              <div className="flex flex-col items-center gap-1 w-full px-0.5">
                {avatar ? (
                  <img src={avatar} alt="" className="w-6 h-6 sm:w-7 sm:h-7 rounded-full object-cover ring-2 ring-white dark:ring-gray-600 shrink-0" />
                ) : (
                  <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-white text-[9px] sm:text-[10px] font-bold shadow-sm shrink-0 bg-gradient-to-br ${barColor}`}>
                    {name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="text-[10px] sm:text-xs font-semibold text-gray-800 dark:text-gray-200 w-full text-center truncate leading-tight">{name}</span>
              </div>
            </motion.button>
          )
        })}
      </motion.div>

      {champions.length > 3 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex items-center justify-center gap-2 sm:gap-4"
        >
          {champions.slice(3).map((champ, idx) => {
            const name = champ.username || 'Player'
            const score = champ.total_points ?? champ.score ?? champ.points ?? 0
            const rank = idx + 4
            return (
              <motion.button
                key={champ.id || idx}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onSelect(champ)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all min-w-0 flex-1 max-w-[180px]"
              >
                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 shrink-0 w-4 text-center">#{rank}</span>
                <div className="flex-1 min-w-0 truncate">
                  <span className="text-[11px] font-medium text-gray-700 dark:text-gray-300 truncate block">{name}</span>
                </div>
                <span className="text-[10px] font-bold text-blue-500 dark:text-blue-400 shrink-0 tabular-nums">{score.toLocaleString()}</span>
              </motion.button>
            )
          })}
        </motion.div>
      )}

      {champions[0] && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-[10px] text-gray-400 dark:text-gray-500"
        >
          👑 <span className="font-semibold text-yellow-600 dark:text-yellow-400">{champions[0].username}</span> leads with{' '}
          <span className="font-bold tabular-nums">{(champions[0].total_points ?? champions[0].score ?? 0).toLocaleString()}</span> points
        </motion.p>
      )}
    </div>
  )
}

const ChampionModal = ({ champion, onClose }) => {
  const [achievements, setAchievements] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!champion?.id) { setLoading(false); return }
    api.get(`/users/${champion.id}/achievements`)
      .then(({ data }) => setAchievements(Array.isArray(data) ? data : data.achievements || data.results || []))
      .catch(() => setAchievements([]))
      .finally(() => setLoading(false))
  }, [champion?.id])

  const name = champion?.username || 'Player'

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

  const maxCatPoints = categories.length > 0 ? Math.max(...categories.map(c => c.points)) : 1

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.85, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.85, opacity: 0, y: 10 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          onClick={e => e.stopPropagation()}
          className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-md w-full max-h-[70vh] overflow-y-auto"
        >
          <div className="sticky top-0 bg-white dark:bg-gray-800 z-10 flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700 rounded-t-3xl">
            <div className="flex items-center gap-3">
              {champion?.avatar_url ? (
                <img src={champion.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover ring-2 ring-blue-100 dark:ring-blue-900" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold shadow-sm">
                  {name.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <p className="font-semibold text-gray-800 dark:text-white">{name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Achievements</p>
              </div>
            </div>
            <motion.button onClick={onClose}
              whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
              className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 transition-all">
              <HiOutlineX className="w-5 h-5" />
            </motion.button>
          </div>
          <div className="p-5">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="relative w-8 h-8">
                  <div className="absolute inset-0 rounded-full border-2 border-blue-200" />
                  <div className="absolute inset-0 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                </div>
              </div>
            ) : categories.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-8">No achievements yet</p>
            ) : (
              <div className="space-y-3">
                {categories.map((cat, i) => (
                  <motion.div
                    key={cat.name}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className={`p-4 rounded-xl border ${
                      i === 0
                        ? 'bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/10 border-yellow-200 dark:border-yellow-700/40'
                        : 'bg-gray-50 dark:bg-gray-700/30 border-gray-100 dark:border-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-base sm:text-lg font-bold truncate ${
                        i === 0 ? 'text-yellow-700 dark:text-yellow-300' : 'text-gray-800 dark:text-white'
                      }`}>
                        {cat.name}
                      </p>
                      <p className={`text-lg sm:text-xl font-black tabular-nums shrink-0 ${
                        i === 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-blue-600 dark:text-blue-400'
                      }`}>
                        {Number.isInteger(cat.points) ? cat.points.toLocaleString() : cat.points.toFixed(1)}
                      </p>
                    </div>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">{cat.count} {cat.count === 1 ? 'entry' : 'entries'}</p>
                    <div className="mt-2.5 w-full h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(cat.points / maxCatPoints) * 100}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut', delay: i * 0.08 + 0.2 }}
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
      </motion.div>
    </AnimatePresence>
  )
}

const Profile = ({ userDetails }) => {
  const { auth } = useStore()
  const [rank, setRank] = useState(null)
  const [selectedChampion, setSelectedChampion] = useState(null)
  const [adminNote, setAdminNote] = useState(null)

  useEffect(() => {
    if (userDetails?.admin_note) {
      setAdminNote(userDetails.admin_note)
    }
  }, [userDetails?.admin_note])

  useEffect(() => {
    const socket = getSocket()
    if (!socket) return
    const handler = (data) => {
      if (!auth.user?.id) return
      if (data.playerUserId === auth.user.id || data.playerUserId === auth.user._id) {
        setAdminNote(data)
      }
    }
    socket.on('admin_note:update', handler)
    return () => socket.off('admin_note:update', handler)
  }, [auth.user?.id, auth.user?._id])

  const user = userDetails || auth.user || {}
  const displayName = user.username || 'Player'
  const avatarUrl = user.avatar_url || ''

  const achievements = userDetails?.achievements || []
  const totalScore = useMemo(() => achievements.reduce((s, a) => s + parseFloat(a.points || a.score || 0), 0), [achievements])
  const userId = user.id

  useEffect(() => {
    if (!userId) return
    api.get('/users/leaderboard')
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : data.users || data.leaderboard || []
        const idx = list.findIndex(u => u.id === userId)
        setRank(idx >= 0 ? idx + 1 : null)
      })
      .catch(() => {})
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

  const maxCategoryPoints = categories.length > 0 ? Math.max(...categories.map(c => c.points)) : 1
  return (
    <motion.div initial="initial" animate="animate" className="max-w-4xl mx-auto space-y-6">

      {/* Profile card */}
      <motion.div variants={fadeUp}
        className="relative bg-white dark:bg-gray-800 rounded-3xl shadow-lg shadow-gray-200/50 dark:shadow-black/20 border border-gray-100 dark:border-gray-700 p-6 sm:p-8 text-center overflow-hidden">
        {/* Decorative gradient blob */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-blue-100/40 to-purple-100/40 dark:from-blue-500/5 dark:to-purple-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-gradient-to-br from-amber-100/30 to-rose-100/30 dark:from-amber-500/5 dark:to-rose-500/5 rounded-full blur-3xl" />

        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 20 }} className="relative">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover mx-auto ring-4 ring-blue-100 dark:ring-blue-900/50 shadow-lg" />
          ) : (
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center mx-auto ring-4 ring-blue-100 dark:ring-blue-900/50 shadow-lg">
              <HiOutlineUser className="w-10 h-10 text-white" />
            </div>
          )}
        </motion.div>

        <motion.h1 variants={fadeUp} className="mt-4 text-2xl font-bold text-gray-900 dark:text-white relative">{displayName}</motion.h1>

        {rank && (
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.25, type: 'spring' }}
            className="mt-3 inline-flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-full shadow-sm">
            <HiOutlineBadgeCheck className="w-5 h-5 text-yellow-500" />
            <span className="text-lg font-bold text-purple-600 dark:text-purple-400">Rank: #{rank}</span>
          </motion.div>
        )}

        <motion.div variants={fadeUp} className="mt-6 flex items-center justify-center">
          <motion.div whileHover={{ scale: 1.05 }} className="text-center px-6 py-3 rounded-2xl bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/10 border border-blue-100 dark:border-blue-800/30">
            <p className="text-4xl sm:text-5xl font-black tabular-nums bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent">
              {Number.isInteger(totalScore) ? totalScore.toLocaleString() : totalScore.toFixed(1)}
            </p>
            <p className="text-[10px] font-semibold text-blue-500 dark:text-blue-400 mt-0.5 uppercase tracking-wider">Total Score</p>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* My Team */}
      {userDetails?.team_name && (
        <motion.div variants={fadeSlideCard}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg shadow-gray-200/50 dark:shadow-black/20 border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center">
              <HiOutlineUsers className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">My Team</h2>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <div
              className="w-10 h-10 rounded-full border-2 border-white/50 shadow-sm shrink-0"
              style={{ backgroundColor: userDetails.team_color || '#6366f1' }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-lg font-bold text-gray-900 dark:text-white truncate">{userDetails.team_name}</p>
            </div>
            {userDetails.team_rank != null && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-full shadow-sm">
                <HiOutlineBadgeCheck className="w-4 h-4 text-yellow-500" />
                <span className="font-bold text-purple-600 dark:text-purple-400">#{userDetails.team_rank}</span>
              </div>
            )}
          </div>
          <div className="mt-3 flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
              ${(userDetails.team_cash || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </motion.div>
      )}

      {/* Admin Note */}
      {adminNote?.content && (
        <motion.div variants={fadeSlideCard}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg shadow-gray-200/50 dark:shadow-black/20 border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shrink-0 shadow-sm">
              <HiOutlineChat className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <h2 className="text-base font-bold text-gray-800 dark:text-white">Note from Admin</h2>
                {adminNote.admin_username && (
                  <span className="text-xs text-gray-400 dark:text-gray-500">— {adminNote.admin_username}</span>
                )}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                {adminNote.content}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Top Champions */}
      <motion.div variants={fadeSlideCard}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg shadow-gray-200/50 dark:shadow-black/20 border border-gray-100 dark:border-gray-700 p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center">
            <HiOutlineBadgeCheck className="w-4 h-4 text-white" />
          </div>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Top Champions</h2>
        </div>
        <ChampionsRow onSelect={setSelectedChampion} />
      </motion.div>

      {selectedChampion && (
        <ChampionModal champion={selectedChampion} onClose={() => setSelectedChampion(null)} />
      )}

      {/* Score by Category */}
      {categories.length > 0 && (
        <motion.div variants={fadeSlideCard}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg shadow-gray-200/50 dark:shadow-black/20 border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <HiOutlineChartBar className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Score by Category</h2>
            </div>
            <div className="text-right">
              <p className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white tabular-nums">
                {Number.isInteger(totalScore) ? totalScore.toLocaleString() : totalScore.toFixed(1)}
              </p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500">total</p>
            </div>
          </div>
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
        </motion.div>
      )}

    </motion.div>
  )
}

export default Profile
