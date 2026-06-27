import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { HiOutlineBadgeCheck, HiOutlineUser, HiOutlineX, HiOutlineStar } from 'react-icons/hi'
import toast from 'react-hot-toast'
import api from '../../api'
import useStore from '../../store'
import { playCoinUp } from '../../sound'

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
        const name = champ.displayName || champ.username || champ.name || 'Player'
        const avatar = champ.avatar || ''
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

  const name = champion?.displayName || champion?.username || champion?.name || 'Player'

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
              {champion?.avatar ? (
                <img src={champion.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
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

  const user = userDetails || auth.user || {}
  const displayName = user.displayName || user.username || 'Player'
  const avatarUrl = user.avatar || ''
  const totalScore = user.totalScore ?? user.score ?? user.points ?? 0
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto space-y-6"
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 sm:p-8 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover mx-auto ring-4 ring-blue-100 dark:ring-blue-900/50" />
          ) : (
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center mx-auto ring-4 ring-blue-100 dark:ring-blue-900/50">
              <HiOutlineUser className="w-10 h-10 text-white" />
            </div>
          )}
        </motion.div>

        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="mt-4 text-2xl font-bold text-gray-900 dark:text-white"
        >
          {displayName}
        </motion.h1>

        {rank && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.25 }}
            className="mt-2 inline-flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-full"
          >
            <HiOutlineBadgeCheck className="w-5 h-5 text-yellow-500" />
            <span className="text-lg font-bold text-purple-600 dark:text-purple-400">Your Rank: #{rank}</span>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="mt-6 flex items-center justify-center gap-8"
        >
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
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Coins in Pocket</p>
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6"
      >
        <div className="flex items-center gap-2 mb-4">
            <HiOutlineBadgeCheck className="w-5 h-5 text-yellow-500" />
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Top 5 Champions</h2>
        </div>
        <ChampionsRow onSelect={setSelectedChampion} />
      </motion.div>

      {selectedChampion && (
        <ChampionModal champion={selectedChampion} onClose={() => setSelectedChampion(null)} />
      )}
    </motion.div>
  )
}

export default Profile
