import { useMemo } from 'react'
import { motion, LayoutGroup } from 'framer-motion'
import { HiOutlineCash } from 'react-icons/hi'
import useStore from '../store'

const rankMedal = ['', 'text-yellow-400', 'text-gray-300', 'text-amber-600']
const rankBg = [
  '',
  'from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 border-yellow-200 dark:border-yellow-700/40',
  'from-gray-50 to-slate-50 dark:from-gray-800/50 dark:to-slate-800/30 border-gray-200 dark:border-gray-600/40',
  'from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-700/40',
]
const rankGlow = [
  '',
  'shadow-yellow-500/20',
  'shadow-gray-400/10',
  'shadow-amber-500/20',
]

function TeamCard({ team, rank }) {
  const medal = rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : `#${rank}`
  const cashStr = team.cash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28, mass: 0.8 }}
      className={`relative rounded-2xl p-4 sm:p-5 bg-gradient-to-br ${rankBg[rank]} border backdrop-blur-sm ${rankGlow[rank]} shadow-lg`}
    >
      <div className="flex items-center gap-4">
        <div className="shrink-0 text-center w-14">
          <div className={`text-3xl sm:text-4xl ${rankMedal[rank]}`}>{rank <= 3 ? medal : ''}</div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mt-0.5">
            {rank <= 3 ? '' : `#${rank}`}
          </div>
        </div>

        <div
          className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-white text-lg sm:text-xl font-bold shrink-0 shadow-md"
          style={{ background: team.color || '#6366f1' }}
        >
          {(team.name || 'T').charAt(0).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm sm:text-base font-bold text-gray-900 dark:text-white truncate">
            {team.name}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              {team.member_count || 0} {team.member_count === 1 ? 'member' : 'members'}
            </span>
          </div>
        </div>

        <div className="shrink-0 text-right">
          <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
            <HiOutlineCash className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-base sm:text-lg font-black tabular-nums">
              {cashStr}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default function TeamRankingLive() {
  const teams = useStore((s) => s.teams)

  const sorted = useMemo(() => {
    return [...teams]
      .sort((a, b) => (a.rank || 99) - (b.rank || 99))
      .slice(0, 3)
  }, [teams])

  if (!sorted.length) return null

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base sm:text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
          <span className="text-xl">🏆</span>
          Team Rankings
        </h3>
        <span className="text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700/50 px-2 py-1 rounded-full">
          LIVE
        </span>
      </div>

      <LayoutGroup>
        <div className="space-y-2 sm:space-y-3">
          {sorted.map((team, idx) => (
            <TeamCard key={team.id} team={team} rank={team.rank || idx + 1} />
          ))}
        </div>
      </LayoutGroup>
    </div>
  )
}
