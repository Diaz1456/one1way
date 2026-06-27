import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { HiOutlineBadgeCheck, HiOutlineUser, HiOutlineX, HiOutlineStar, HiOutlineChartBar, HiOutlineFilter } from 'react-icons/hi'
import toast from 'react-hot-toast'
import api from '../../api'
import useStore from '../../store'
import { playCoinUp } from '../../sound'

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

const ChampionsRow = ({ onSelect }) => {
  const [champions, setChampions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/users/leaderboard?limit=5')
      .then(({ data }) => setChampions(Array.isArray(data) ? data : data.users || data.leaderboard || []))
      .catch(() => toast.error('Failed to load champions'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex gap-3 justify-center py-4">
        {[1,2,3,4,5].map(i => (
          <div key={i} className="w-16 h-20 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  if (!champions.length) {
    return <p className="text-center text-gray-400 text-sm py-4">No champions yet</p>
  }

  return (
    <div className="flex gap-3 justify-center flex-wrap">
      {champions.map((champ, idx) => {
        const name = champ.username || 'Player'
        const avatar = champ.avatar_url || ''
        const score = champ.score ?? champ.points ?? 0
        const isTop = idx === 0
        return (
          <motion.button
            key={champ.id || idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.08 }}
            whileHover={{ scale: 1.05, y: -4 }}
            onClick={() => onSelect(champ)}
            className={`flex flex-col items-center gap-1 p-3 rounded-2xl cursor-pointer transition-colors
              ${isTop
                ? 'bg-yellow-50 dark:bg-yellow-900/20 ring-2 ring-yellow-400/50'
                : 'bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
          >
            {avatar ? (
              <img src={avatar} alt="" className="w-10 h-10 rounded-full object-cover ring-2 ring-white dark:ring-gray-600" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                {name.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-xs font-medium text-gray-700 dark:text-gray-200 max-w-[64px] truncate">{name}</span>
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{score.toLocaleString()}</span>
              {isTop && <HiOutlineBadgeCheck className="w-4 h-4 text-yellow-500" />}
          </motion.button>
        )
      })}
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

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.85, opacity: 0 }}
          onClick={e => e.stopPropagation()}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full max-h-[70vh] overflow-y-auto"
        >
          <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3">
              {champion?.avatar_url ? (
                <img src={champion.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold">
                  {name.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <p className="font-semibold text-gray-800 dark:text-white">{name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Achievements</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400">
              <HiOutlineX className="w-5 h-5" />
            </button>
          </div>
          <div className="p-5">
            {loading ? (
              <div className="flex justify-center py-6">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
              </div>
            ) : achievements.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-6">No achievements yet</p>
            ) : (
              <ul className="space-y-2">
                {achievements.map((ach, i) => (
                  <motion.li
                    key={ach.id || i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl"
                  >
                    <HiOutlineStar className="w-5 h-5 text-yellow-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 dark:text-white truncate">
                        {ach.title || ach.name || 'Achievement'}
                      </p>
                      {(ach.date_earned || ach.dateEarned) && (
                        <p className="text-[10px] text-gray-400 dark:text-gray-500">{new Date(ach.date_earned || ach.dateEarned).toLocaleDateString()}</p>
                      )}
                    </div>
                    {ach.points != null && (
                      <span className="text-xs font-bold text-blue-600 dark:text-blue-400 shrink-0">+{ach.points}</span>
                    )}
                  </motion.li>
                ))}
              </ul>
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
  const [coins, setCoins] = useState(0)
  const [selectedChampion, setSelectedChampion] = useState(null)
  const [filter, setFilter] = useState('all')

  const user = userDetails || auth.user || {}
  const displayName = user.username || 'Player'
  const avatarUrl = user.avatar_url || ''

  const achievements = userDetails?.achievements || []
  const totalScore = useMemo(() => achievements.reduce((s, a) => s + (a.points || a.score || 0), 0), [achievements])
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

  useEffect(() => {
    if (!userId) return
    api.get(`/coins/${userId}`)
      .then(({ data }) => setCoins(data.balance ?? data.coins ?? data.amount ?? 0))
      .catch(() => {})
  }, [userId])

  useEffect(() => { playCoinUp() }, [])

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

  const maxCategoryPoints = categories.length > 0 ? Math.max(...categories.map(c => c.points)) : 1
  const categoryColors = [
    'bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500',
    'bg-rose-500', 'bg-cyan-500', 'bg-pink-500', 'bg-lime-500'
  ]
  const uniqueCategories = ['all', ...categories.map(c => c.name)]
  const filtered = filter === 'all' ? achievements : achievements.filter(a => (a.category || a.type || 'General') === filter)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-5xl mx-auto space-y-6"
    >
      {/* Profile card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 sm:p-8 text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 20 }}>
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover mx-auto ring-4 ring-blue-100 dark:ring-blue-900/50" />
          ) : (
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center mx-auto ring-4 ring-blue-100 dark:ring-blue-900/50">
              <HiOutlineUser className="w-10 h-10 text-white" />
            </div>
          )}
        </motion.div>

        <motion.h1 initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
          className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">
          {displayName}
        </motion.h1>

        {rank && (
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.25 }}
            className="mt-2 inline-flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-full">
            <HiOutlineBadgeCheck className="w-5 h-5 text-yellow-500" />
            <span className="text-lg font-bold text-purple-600 dark:text-purple-400">Rank: #{rank}</span>
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}
          className="mt-6 flex items-center justify-center gap-8">
          <div className="text-center">
            <p className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white">
              {totalScore.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Total Score</p>
          </div>
          <div className="h-12 w-px bg-gray-200 dark:bg-gray-700" />
          <div className="text-center">
            <div className="flex items-center gap-1 justify-center">
              <span className="text-3xl sm:text-4xl font-extrabold text-yellow-500">{coins.toLocaleString()}</span>
              <span className="text-2xl">🪙</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Coins</p>
          </div>
        </motion.div>
      </div>

      {/* Top 5 Champions — placed above achievements per Task 4 */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <div className="flex items-center gap-2 mb-4">
          <HiOutlineBadgeCheck className="w-5 h-5 text-yellow-500" />
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Top 5 Champions</h2>
        </div>
        <ChampionsRow onSelect={setSelectedChampion} />
      </div>

      {selectedChampion && (
        <ChampionModal champion={selectedChampion} onClose={() => setSelectedChampion(null)} />
      )}

      {/* Score by Category */}
      {categories.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center gap-2 mb-2">
            <HiOutlineChartBar className="w-6 h-6 text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Score by Category</h2>
          </div>
          <div className="mt-4 space-y-3">
            {categories.map((cat, i) => (
              <ProgressBar key={cat.name} label={cat.name} value={cat.points} max={maxCategoryPoints} color={categoryColors[i % categoryColors.length]} />
            ))}
          </div>
        </div>
      )}

      {/* Achievements grid */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <HiOutlineStar className="w-6 h-6 text-yellow-500" />
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
              Achievements {achievements.length > 0 && <span className="text-sm font-normal text-gray-400">({achievements.length})</span>}
            </h2>
          </div>
          {uniqueCategories.length > 1 && (
            <div className="flex items-center gap-2">
              <HiOutlineFilter className="w-4 h-4 text-gray-400" />
              <select value={filter} onChange={e => setFilter(e.target.value)}
                className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 outline-none">
                {uniqueCategories.map(cat => (
                  <option key={cat} value={cat}>{cat === 'all' ? 'All Categories' : cat}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {achievements.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-8">No achievements yet</p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-8">No achievements match this category</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {filtered.map((ach, i) => (
                <motion.div key={ach.id || i} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: i * 0.03 }}
                  className="group bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-100 dark:border-gray-600/40 p-4 hover:shadow-md hover:border-blue-200 dark:hover:border-blue-700/50 transition-all">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center shrink-0">
                      <HiOutlineStar className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">{ach.title || ach.name || 'Achievement'}</p>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium whitespace-nowrap">{ach.category || ach.type || 'General'}</span>
                      </div>
                      {ach.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{ach.description}</p>}
                      {(ach.date_earned || ach.dateEarned) && (
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1.5">{new Date(ach.date_earned || ach.dateEarned).toLocaleDateString()}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <span className="inline-flex items-center gap-0.5 text-sm font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-md">+{ach.points || ach.score || 0}</span>
                    </div>
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

export default Profile
