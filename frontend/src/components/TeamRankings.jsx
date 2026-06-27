import { useMemo, useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useStore from '../store'

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

function AnimatedNumber({ value, suffix = '', className = '' }) {
  const animated = useCountUp(value)
  return <span className={className}>{animated.toLocaleString()}{suffix}</span>
}

const rankConfig = {
  1: {
    label: '1st',
    emoji: '👑',
    gradient: 'from-yellow-400 via-amber-400 to-yellow-300',
    glow: 'shadow-yellow-400/30',
    badge: 'bg-yellow-400 text-yellow-900',
    accent: 'text-yellow-500',
  },
  2: {
    label: '2nd',
    emoji: '🥈',
    gradient: 'from-gray-300 via-gray-200 to-gray-100',
    glow: 'shadow-gray-400/20',
    badge: 'bg-gray-300 text-gray-800',
    accent: 'text-gray-400',
  },
  3: {
    label: '3rd',
    emoji: '🥉',
    gradient: 'from-orange-300 via-amber-300 to-orange-200',
    glow: 'shadow-orange-400/20',
    badge: 'bg-orange-300 text-orange-900',
    accent: 'text-orange-500',
  },
}

const podiumHeight = {
  1: 'h-64',
  2: 'h-48',
  3: 'h-36',
}

export default function TeamRankings({ compact = false }) {
  const teams = useStore((s) => s.teams)

  const sorted = useMemo(() => {
    if (!teams || teams.length === 0) return []
    return [...teams].sort((a, b) => (a.rank || 99) - (b.rank || 99)).slice(0, 3)
  }, [teams])

  if (sorted.length === 0) return null

  if (compact) {
    return (
      <div className="grid grid-cols-3 gap-2">
        {sorted.map((team) => (
          <TeamCardMini key={team.id} team={team} />
        ))}
      </div>
    )
  }

  return (
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
              {/* Emoji badge */}
              <motion.div
                animate={isFirst ? { scale: [1, 1.12, 1], rotate: [0, -5, 5, 0] } : {}}
                transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                className={`text-3xl sm:text-4xl mb-2 ${isFirst ? 'drop-shadow-lg' : ''}`}
              >
                {cfg.emoji}
              </motion.div>

              {/* Team card */}
              <motion.div
                whileHover={{ y: -4 }}
                className={`relative w-full min-w-[120px] sm:min-w-[160px] rounded-2xl p-4 sm:p-5
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

                {/* Rank badge */}
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

                  {/* Score */}
                  <div className="mt-3 flex justify-center gap-3 text-xs">
                    <div className={`font-bold ${isFirst ? 'text-yellow-800' : 'text-gray-700'}`}>
                      <AnimatedNumber value={team.score || 0} suffix=" pts" />
                    </div>
                  </div>

                  {/* Cash */}
                  <div className={`mt-2 px-3 py-1.5 rounded-xl backdrop-blur-sm flex items-center justify-center gap-1.5 text-sm font-bold
                    ${isFirst ? 'bg-yellow-200/60 text-yellow-800' : 'bg-white/40 text-gray-700'}`}
                  >
                    <span>$</span>
                    <AnimatedNumber value={team.cash || 0} />
                  </div>
                </div>
              </motion.div>

              {/* Podium block */}
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
  )
}

function TeamCardMini({ team }) {
  const cfg = rankConfig[team.rank] || rankConfig[3]
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`rounded-xl p-3 text-center border ${team.rank === 1 ? 'ring-1 ring-yellow-400 shadow-md shadow-yellow-400/20' : ''}`}
      style={{ borderColor: team.color || '#6366f1' }}
    >
      <div className="text-lg">{cfg.emoji}</div>
      <div className="text-xs font-semibold truncate mt-0.5 text-gray-800 dark:text-white">{team.name}</div>
      <div className="text-xs font-bold text-yellow-600 dark:text-yellow-400 mt-1">
        <AnimatedNumber value={team.score || 0} suffix=" pts" />
      </div>
      <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
        $<AnimatedNumber value={team.cash || 0} />
      </div>
    </motion.div>
  )
}
