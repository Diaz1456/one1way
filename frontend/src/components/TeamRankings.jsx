import { useMemo, useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { HiOutlineX, HiOutlineUsers } from 'react-icons/hi'
import useStore from '../store'
import api from '../api'

function useCountUp(target, duration = 1200) {
  const [value, setValue] = useState(0)
  const prevTarget = useRef(0)
  const raf = useRef(null)

  useEffect(() => {
    const start = prevTarget.current
    const diff = target - start
    if (Math.abs(diff) < 1) {
      setValue(target)
      prevTarget.current = target
      return
    }
    const startTime = performance.now()
    const animate = (now) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(start + diff * eased))
      if (progress < 1) raf.current = requestAnimationFrame(animate)
      else {
        setValue(target)
        prevTarget.current = target
      }
    }
    raf.current = requestAnimationFrame(animate)
    return () => { if (raf.current) cancelAnimationFrame(raf.current) }
  }, [target, duration])

  return value
}

function AnimatedNumber({ value, suffix = '', className = '', decimals = 0 }) {
  const animated = useCountUp(value)
  const formatted = decimals > 0
    ? animated.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    : animated.toLocaleString()
  return <span className={className}>{formatted}{suffix}</span>
}

const rankConfig = {
  1: {
    label: '1st', emoji: '👑',
    gradient: 'from-yellow-400 via-amber-400 to-yellow-300',
    glow: 'shadow-yellow-400/30', badge: 'bg-yellow-400 text-yellow-900',
    accent: 'text-yellow-500',
  },
  2: {
    label: '2nd', emoji: '🥈',
    gradient: 'from-gray-300 via-gray-200 to-gray-100',
    glow: 'shadow-gray-400/20', badge: 'bg-gray-300 text-gray-800',
    accent: 'text-gray-400',
  },
  3: {
    label: '3rd', emoji: '🥉',
    gradient: 'from-orange-300 via-amber-300 to-orange-200',
    glow: 'shadow-orange-400/20', badge: 'bg-orange-300 text-orange-900',
    accent: 'text-orange-500',
  },
}

const podiumHeight = { 1: 'h-64', 2: 'h-48', 3: 'h-36' }

function TeamMembersModal({ team, onClose }) {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!team?.id) { setLoading(false); return }
    api.get(`/teams/${team.id}/rankings`)
      .then(({ data }) => setMembers(Array.isArray(data.members) ? data.members : []))
      .catch(() => setMembers([]))
      .finally(() => setLoading(false))
  }, [team?.id])

  const name = team?.name || 'Team'

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
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: team?.color || '#6366f1' }} />
              <div>
                <p className="font-semibold text-gray-800 dark:text-white">{name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{members.length} player{members.length !== 1 ? 's' : ''}</p>
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
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
              </div>
            ) : members.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-8">No players in this team</p>
            ) : (
              <div className="space-y-2">
                {members.map((m, i) => (
                  <motion.div
                    key={m._id || i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/30 rounded-xl"
                  >
                    {m.avatar_url ? (
                      <img src={m.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover ring-2 ring-white dark:ring-gray-600" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm ring-2 ring-white dark:ring-gray-600">
                        {(m.username || '?')[0].toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 dark:text-white truncate">{m.username || 'Player'}</p>
                    </div>
                    <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">{m.total_points || 0} pts</span>
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

export default function TeamRankings({ compact = false }) {
  const teams = useStore((s) => s.teams)
  const [selectedTeam, setSelectedTeam] = useState(null)

  const sorted = useMemo(() => {
    if (!teams || teams.length === 0) return []
    return [...teams].sort((a, b) => (a.rank || 99) - (b.rank || 99)).slice(0, 3)
  }, [teams])

  if (sorted.length === 0) return null

  return (
    <>
      {compact ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {sorted.map((team) => (
            <TeamCardMini key={team.id} team={team} onClick={() => setSelectedTeam(team)} />
          ))}
        </div>
      ) : (
        <div className="w-full">
          <div className="relative flex items-end justify-center gap-4 sm:gap-6 px-4 pt-8 pb-4">
            {sorted.map((team) => {
              const cfg = rankConfig[team.rank] || rankConfig[3]
              const isFirst = team.rank === 1
              const height = podiumHeight[team.rank] || 'h-36'
              const order = team.rank === 1 ? 'order-2' : team.rank === 2 ? 'order-1' : 'order-3'

              return (
                <motion.div
                  key={team.id}
                  layout
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 20, delay: team.rank * 0.1 }}
                  className={`flex flex-col items-center ${order} ${isFirst ? 'z-10' : 'z-0'}`}
                >
                  <motion.div
                    animate={isFirst ? { scale: [1, 1.12, 1], rotate: [0, -5, 5, 0] } : {}}
                    transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                    className={`text-3xl sm:text-4xl mb-2 ${isFirst ? 'drop-shadow-lg' : ''}`}
                  >
                    {cfg.emoji}
                  </motion.div>

                  <motion.div
                    whileHover={{ y: -4 }}
                    onClick={() => setSelectedTeam(team)}
                    className={`relative w-full min-w-[80px] sm:min-w-[120px] lg:min-w-[160px] rounded-2xl p-3 sm:p-5 cursor-pointer
                      bg-gradient-to-b ${cfg.gradient}
                      shadow-xl ${cfg.glow}
                      ${isFirst ? 'ring-2 ring-yellow-300 ring-offset-2 ring-offset-gray-50 dark:ring-offset-gray-900' : ''}
                      border border-white/20 backdrop-blur-sm`}
                  >
                    {isFirst && (
                      <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center shadow-lg shadow-yellow-500/40 animate-pulse">
                        <svg className="w-4 h-4 text-yellow-900" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      </div>
                    )}

                    <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-xs font-bold shadow-md ${cfg.badge}`}>
                      {cfg.label}
                    </div>

                    <div className="mt-4 text-center">
                      <div
                        className="w-8 h-8 rounded-full mx-auto mb-2 border-2 border-white/50 shadow-sm"
                        style={{ backgroundColor: team.color || '#6366f1' }}
                      />
                      <h3 className={`font-bold text-sm sm:text-base truncate ${isFirst ? 'text-yellow-900' : 'text-gray-800'}`}>
                        {team.name}
                      </h3>

                      <div className="mt-2 flex items-center justify-center gap-1 text-xs">
                        <HiOutlineUsers className={`w-3.5 h-3.5 ${isFirst ? 'text-yellow-800' : 'text-gray-500'}`} />
                        <span className={`font-medium ${isFirst ? 'text-yellow-800' : 'text-gray-600'}`}>
                          {team.member_count || 0} player{(team.member_count || 0) !== 1 ? 's' : ''}
                        </span>
                      </div>

                      <div className="mt-2 flex justify-center gap-3 text-xs">
                        <div className={`font-bold ${isFirst ? 'text-yellow-800' : 'text-gray-700'}`}>
                          <AnimatedNumber value={team.score || 0} suffix=" pts" />
                        </div>
                      </div>

                      <div className={`mt-2 px-3 py-1.5 rounded-xl backdrop-blur-sm flex items-center justify-center gap-1.5 text-sm font-bold
                        ${isFirst ? 'bg-yellow-200/60 text-yellow-800' : 'bg-white/40 text-gray-700'}`}
                      >
                        <span>$</span>
                        <AnimatedNumber value={team.cash || 0} decimals={2} />
                      </div>
                    </div>
                  </motion.div>

                  <div
                    className={`w-full rounded-b-lg mt-0 ${height}
                      ${isFirst ? 'bg-gradient-to-t from-yellow-500/20 to-transparent' : ''}
                    `}
                  />
                </motion.div>
              )
            })}
          </div>
        </div>
      )}

      {selectedTeam && (
        <TeamMembersModal team={selectedTeam} onClose={() => setSelectedTeam(null)} />
      )}
    </>
  )
}

function TeamCardMini({ team, onClick }) {
  const cfg = rankConfig[team.rank] || rankConfig[3]
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      onClick={onClick}
      className={`rounded-xl p-3 text-center border cursor-pointer transition-all hover:shadow-md ${team.rank === 1 ? 'ring-1 ring-yellow-400 shadow-md shadow-yellow-400/20' : ''}`}
      style={{ borderColor: team.color || '#6366f1' }}
    >
      <div className="text-lg">{cfg.emoji}</div>
      <div className="text-xs font-semibold truncate mt-0.5 text-gray-800 dark:text-white">{team.name}</div>
      <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
        {team.member_count || 0} player{(team.member_count || 0) !== 1 ? 's' : ''}
      </div>
      <div className="text-xs font-bold text-yellow-600 dark:text-yellow-400 mt-1">
        <AnimatedNumber value={team.score || 0} suffix=" pts" />
      </div>
      <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
        $<AnimatedNumber value={team.cash || 0} decimals={2} />
      </div>
    </motion.div>
  )
}
