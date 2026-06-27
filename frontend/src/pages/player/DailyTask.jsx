import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { HiOutlineClipboardCheck, HiOutlineCheckCircle, HiOutlineRefresh } from 'react-icons/hi'
import toast from 'react-hot-toast'
import api from '../../api'
import useStore from '../../store'
import { playCoinUp, playClick } from '../../sound'

const stagger = { animate: { transition: { staggerChildren: 0.06 } } }
const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } }
}

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
      </div>
    )}
  </AnimatePresence>
)

const TaskCheckbox = ({ task, onToggle, toggling }) => {
  const completed = task.completed || false
  return (
    <motion.div variants={fadeUp}
      className={`relative rounded-2xl p-5 border-2 transition-all ${
        completed
          ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/10'
          : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/30'
      }`}>
      <div className="flex items-start gap-4">
        <div className="pt-0.5">
          <button
            onClick={() => onToggle(task)}
            disabled={toggling}
            className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${
              completed
                ? 'bg-green-500 border-green-500 text-white cursor-default'
                : toggling
                  ? 'border-blue-400 border-t-transparent animate-spin'
                  : 'border-gray-300 dark:border-gray-500 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer'
            }`}
          >
            {completed && <HiOutlineCheckCircle className="w-5 h-5" />}
          </button>
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-base font-semibold ${completed ? 'text-green-600 dark:text-green-400 line-through' : 'text-gray-800 dark:text-white'}`}>
            {task.description || task.title || 'Daily task'}
          </p>
          {(task.points_reward > 0 || task.coins_reward > 0) && (
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              {task.points_reward > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 dark:bg-blue-900/20 rounded-full text-xs font-semibold text-blue-600 dark:text-blue-400">
                  +{task.points_reward} pts
                </span>
              )}
              {task.coins_reward > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-yellow-50 dark:bg-yellow-900/20 rounded-full text-xs font-semibold text-yellow-600 dark:text-yellow-400">
                  +{task.coins_reward} coins
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

const DailyTask = () => {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(null)
  const [showCelebration, setShowCelebration] = useState(false)
  const hasCelebrated = useRef(false)

  const fetchTasks = () => {
    setLoading(true)
    api.get('/tasks/current')
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : (data.tasks || data.results || [])
        setTasks(list)
      })
      .catch(() => setTasks([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchTasks() }, [])

  const handleToggle = (task) => {
    const id = task._id || task.id
    if (toggling === id) return
    setToggling(id)

    api.post('/tasks/complete', { task_id: id })
      .then(({ data }) => {
        const nowCompleted = data.completed
        setTasks(prev => prev.map(t => {
          if ((t._id || t.id) === id) {
            return { ...t, completed: nowCompleted }
          }
          return t
        }))

        if (nowCompleted) {
          playCoinUp()
          if (!hasCelebrated.current) {
            setShowCelebration(true)
            hasCelebrated.current = true
            setTimeout(() => setShowCelebration(false), 3000)
          }
          toast.success('Task completed!')
        } else {
          toast('Task uncompleted', { icon: '↩️' })
        }
      })
      .catch(err => {
        toast.error(err.response?.data?.error || 'Failed to update task')
      })
      .finally(() => setToggling(null))
  }

  const allDone = tasks.length > 0 && tasks.every(t => t.completed)
  const doneCount = tasks.filter(t => t.completed).length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-500 border-t-transparent" />
      </div>
    )
  }

  if (tasks.length === 0) {
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
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">No Daily Tasks</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
            The admin has not assigned any daily tasks yet. Check back later!
          </p>
          <button
            onClick={() => { playClick(); fetchTasks() }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors text-sm font-medium"
          >
            <HiOutlineRefresh className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto"
    >
      <CelebrationOverlay show={showCelebration} />

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 sm:p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <HiOutlineClipboardCheck className="w-7 h-7 text-blue-500" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Daily Tasks</h2>
          </div>
          {doneCount > 0 && (
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {doneCount}/{tasks.length} done
            </span>
          )}
        </div>

        {allDone && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-5 flex items-center gap-2 text-green-600 dark:text-green-400 text-sm font-medium bg-green-50 dark:bg-green-900/10 rounded-xl px-4 py-3 border border-green-200 dark:border-green-800"
          >
            <HiOutlineCheckCircle className="w-5 h-5 shrink-0" />
            All tasks completed for today!
          </motion.div>
        )}

        <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-3">
          {tasks.map((task) => (
            <TaskCheckbox
              key={task._id || task.id}
              task={task}
              onToggle={handleToggle}
              toggling={toggling === (task._id || task.id)}
            />
          ))}
        </motion.div>

        <button
          onClick={() => { playClick(); fetchTasks() }}
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
