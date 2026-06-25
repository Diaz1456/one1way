import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { HiOutlineClipboardCheck, HiOutlineCheckCircle, HiOutlineRefresh } from 'react-icons/hi'
import toast from 'react-hot-toast'
import api from '../../api'
import useStore from '../../store'
import { playCoinUp, playClick } from '../../sound'

const confettiParticles = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  delay: Math.random() * 0.3,
  color: ['bg-yellow-400', 'bg-green-400', 'bg-blue-400', 'bg-pink-400', 'bg-purple-400'][Math.floor(Math.random() * 5)],
  size: Math.random() * 8 + 4
}))

const CelebrationOverlay = ({ show }) => (
  <AnimatePresence>
    {show && (
      <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
        {confettiParticles.map(p => (
          <motion.div
            key={p.id}
            initial={{ opacity: 1, y: -20, x: `${p.x}vw`, scale: 0 }}
            animate={{ opacity: 0, y: '100vh', x: `${p.x + (Math.random() - 0.5) * 40}vw`, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5 + Math.random(), delay: p.delay, ease: 'easeIn' }}
            className={`absolute top-0 ${p.color} rounded-full`}
            style={{ width: p.size, height: p.size }}
          />
        ))}
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.5 }}
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center"
        >
          <motion.div
            animate={{ rotate: [0, -10, 10, -10, 0] }}
            transition={{ duration: 0.5 }}
            className="text-6xl mb-2"
          >
            🎉
          </motion.div>
          <p className="text-2xl font-bold text-green-500">Task Complete!</p>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
)

const DailyTask = () => {
  const [task, setTask] = useState(null)
  const [loading, setLoading] = useState(true)
  const [completing, setCompleting] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)
  const hasCelebrated = useRef(false)

  const fetchTask = () => {
    setLoading(true)
    api.get('/tasks/current')
      .then(({ data }) => {
        setTask(data.task || data)
        setCompleted(data.completed ?? data.done ?? false)
      })
      .catch(() => {
        setTask(null)
        setCompleted(false)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchTask() }, [])

  const handleComplete = () => {
    if (completed || completing || !task?.id) return
    setCompleting(true)
    api.post('/tasks/complete', { task_id: task.id })
      .then(() => {
        setCompleted(true)
        playCoinUp()
        if (!hasCelebrated.current) {
          setShowCelebration(true)
          hasCelebrated.current = true
          setTimeout(() => setShowCelebration(false), 3000)
        }
        toast.success('Daily task completed!')
      })
      .catch(err => {
        toast.error(err.response?.data?.message || 'Failed to complete task')
      })
      .finally(() => setCompleting(false))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-500 border-t-transparent" />
      </div>
    )
  }

  if (!task) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto"
      >
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-10 text-center">
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="text-6xl mb-4"
          >
            📋
          </motion.div>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">No Daily Task</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
            The admin has not assigned a daily task yet. Check back later!
          </p>
          <button
            onClick={() => { playClick(); fetchTask() }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors text-sm font-medium"
          >
            <HiOutlineRefresh className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </motion.div>
    )
  }

  const rewardsPoints = task.rewardPoints ?? task.points ?? task.reward?.points ?? 0
  const rewardsCoins = task.rewardCoins ?? task.coins ?? task.reward?.coins ?? 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto"
    >
      <CelebrationOverlay show={showCelebration} />

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-6">
          <HiOutlineClipboardCheck className="w-7 h-7 text-blue-500" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Daily Task</h2>
        </div>

        <motion.div
          layout
          className={`relative rounded-2xl p-6 border-2 transition-colors
            ${completed
              ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/10'
              : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/30'
            }`}
        >
          <div className="flex items-start gap-4">
            <div className="pt-0.5">
              <button
                onClick={handleComplete}
                disabled={completed || completing}
                className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all
                  ${completed
                    ? 'bg-green-500 border-green-500 text-white cursor-default'
                    : completing
                      ? 'border-blue-400 border-t-transparent animate-spin'
                      : 'border-gray-300 dark:border-gray-500 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer'
                  }`}
              >
                {completed && <HiOutlineCheckCircle className="w-5 h-5" />}
              </button>
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-lg font-semibold ${completed ? 'text-green-600 dark:text-green-400 line-through' : 'text-gray-800 dark:text-white'}`}>
                {task.title || task.description || 'Complete your daily task'}
              </p>
              {task.description && task.description !== task.title && (
                <p className={`text-sm mt-1 ${completed ? 'text-green-500 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                  {task.description}
                </p>
              )}
            </div>
          </div>

          {(rewardsPoints > 0 || rewardsCoins > 0) && (
            <div className="mt-5 flex items-center gap-4 flex-wrap">
              {rewardsPoints > 0 && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-full text-sm">
                  <span className="font-bold text-blue-600 dark:text-blue-400">+{rewardsPoints}</span>
                  <span className="text-blue-500 dark:text-blue-400">pts</span>
                </div>
              )}
              {rewardsCoins > 0 && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-yellow-50 dark:bg-yellow-900/20 rounded-full text-sm">
                  <span className="font-bold text-yellow-600 dark:text-yellow-400">+{rewardsCoins}</span>
                  <span className="text-yellow-500 dark:text-yellow-400">🪙</span>
                </div>
              )}
            </div>
          )}
        </motion.div>

        {completed && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 flex items-center gap-2 text-green-600 dark:text-green-400 text-sm font-medium"
          >
            <HiOutlineCheckCircle className="w-5 h-5" />
            Completed today
          </motion.div>
        )}

        <button
          onClick={() => { playClick(); fetchTask() }}
          className="mt-6 inline-flex items-center gap-2 px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
        >
          <HiOutlineRefresh className="w-4 h-4" />
          Refresh
        </button>
      </div>
    </motion.div>
  )
}

export default DailyTask
