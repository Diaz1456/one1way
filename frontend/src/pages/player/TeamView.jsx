import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { HiOutlineUsers, HiOutlineUserGroup, HiOutlineBadgeCheck, HiOutlineUser } from 'react-icons/hi'
import toast from 'react-hot-toast'
import api from '../../api'
import useStore from '../../store'

const TeamView = () => {
  const { auth } = useStore()
  const [team, setTeam] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const userId = auth.user?.id

  useEffect(() => {
    if (!userId) { setLoading(false); return }
    api.get('/teams')
      .then(({ data }) => {
        const teams = Array.isArray(data) ? data : data.teams || data.results || []
        const myTeam = teams.find(t =>
          t.members?.some(m => m.id === userId || m.userId === userId) ||
          t.leaderId === userId ||
          t.leader?.id === userId
        )
        setTeam(myTeam || null)
      })
      .catch(err => {
        setError(err.response?.data?.message || 'Failed to load teams')
        toast.error('Failed to load teams')
      })
      .finally(() => setLoading(false))
  }, [userId])

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.06 } }
  }

  const itemAnim = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0 }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-500 border-t-transparent" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-500 dark:text-red-400 font-medium">{error}</p>
          <button onClick={() => window.location.reload()} className="mt-3 text-sm text-blue-500 hover:underline">
            Try again
          </button>
        </div>
      </div>
    )
  }

  if (!team) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto"
      >
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-10 text-center">
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ repeat: Infinity, duration: 2.5 }}
            className="text-7xl mb-4"
          >
            👥
          </motion.div>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">No Team</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm max-w-xs mx-auto">
            You are not part of any team yet. Join or create a team to start collaborating!
          </p>
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ repeat: Infinity, duration: 1.5, repeatType: 'reverse' }}
            className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-medium text-sm shadow-lg"
          >
            <HiOutlineUserGroup className="w-5 h-5" />
            Find a Team
          </motion.div>
        </div>
      </motion.div>
    )
  }

  const teamName = team.name || team.teamName || 'My Team'
  const teamColor = team.color || '#3B82F6'
  const members = team.members || team.players || team.users || []
  const teamScore = team.totalScore ?? team.score ?? team.points ?? 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto space-y-6"
    >
      <motion.div
        layout
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 sm:p-8 overflow-hidden relative"
      >
        <div
          className="absolute top-0 right-0 w-32 h-32 rounded-bl-full opacity-10"
          style={{ background: teamColor }}
        />
        <div className="flex items-center gap-4 flex-wrap relative">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-md"
            style={{ background: teamColor }}
          >
            {teamName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{teamName}</h2>
            <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <HiOutlineUsers className="w-4 h-4" />
                {members.length} {members.length === 1 ? 'member' : 'members'}
              </span>
              <span className="flex items-center gap-1">
                <HiOutlineBadgeCheck className="w-4 h-4 text-yellow-500" />
                <span className="font-semibold text-gray-700 dark:text-gray-300">{teamScore.toLocaleString()}</span> pts
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 sm:p-8"
      >
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
          <HiOutlineUserGroup className="w-5 h-5" />
          Team Members
        </h3>

        {members.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-6">No members yet</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {members.map((member, i) => {
              const name = member.displayName || member.username || member.name || 'Player'
              const avatar = member.avatar || ''
              return (
                <motion.div
                  key={member.id || member.userId || i}
                  variants={itemAnim}
                  className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/30 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
                >
                  {avatar ? (
                    <img src={avatar} alt="" className="w-10 h-10 rounded-full object-cover ring-2 ring-white dark:ring-gray-600" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-white">
                      <HiOutlineUser className="w-5 h-5" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-white truncate">{name}</p>
                    {member.role && (
                      <p className="text-xs text-gray-400 dark:text-gray-500">{member.role}</p>
                    )}
                  </div>
                  {(member.score ?? member.points) != null && (
                    <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                      {(member.score || member.points || 0).toLocaleString()}
                    </span>
                  )}
                </motion.div>
              )
            })}
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

export default TeamView
