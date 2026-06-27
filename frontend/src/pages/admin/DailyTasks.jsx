import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { HiOutlinePlus, HiOutlineTrash, HiOutlinePencil, HiOutlineCheck, HiOutlineX } from 'react-icons/hi'
import toast from 'react-hot-toast'
import api from '../../api'

const stagger = { animate: { transition: { staggerChildren: 0.05 } } }
const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } }
}

const DailyTasks = () => {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ description: '', points_reward: 0, coins_reward: 0 })

  const fetchTasks = () => {
    setLoading(true)
    api.get('/tasks')
      .then(({ data }) => setTasks(Array.isArray(data) ? data : []))
      .catch(() => toast.error('Failed to load tasks'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchTasks() }, [])

  const resetForm = () => {
    setForm({ description: '', points_reward: 0, coins_reward: 0 })
    setEditingId(null)
    setShowForm(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.description.trim()) {
      toast.error('Description is required')
      return
    }

    try {
      if (editingId) {
        await api.put(`/tasks/${editingId}`, form)
        toast.success('Task updated')
      } else {
        await api.post('/tasks', form)
        toast.success('Task created')
      }
      resetForm()
      fetchTasks()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save task')
    }
  }

  const handleEdit = (task) => {
    setForm({
      description: task.description || '',
      points_reward: task.points_reward || 0,
      coins_reward: task.coins_reward || 0,
    })
    setEditingId(task._id || task.id)
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this task?')) return
    try {
      await api.delete(`/tasks/${id}`)
      toast.success('Task deleted')
      fetchTasks()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete task')
    }
  }

  const toggleActive = async (task) => {
    try {
      await api.put(`/tasks/${task._id || task.id}`, { is_active: !task.is_active })
      toast.success(task.is_active ? 'Task deactivated' : 'Task activated')
      fetchTasks()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update task')
    }
  }

  return (
    <motion.div initial="initial" animate="animate" className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Daily Tasks</h2>
        <motion.button
          onClick={() => { setShowForm(true); setEditingId(null); setForm({ description: '', points_reward: 0, coins_reward: 0 }) }}
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm"
        >
          <HiOutlinePlus className="w-4 h-4" />
          New Task
        </motion.button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            onSubmit={handleSubmit}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
              <input
                type="text"
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 outline-none transition-all"
                placeholder="Task description"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Points Reward</label>
                <input
                  type="number"
                  value={form.points_reward}
                  onChange={e => setForm({ ...form, points_reward: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 outline-none transition-all"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Coins Reward</label>
                <input
                  type="number"
                  value={form.coins_reward}
                  onChange={e => setForm({ ...form, coins_reward: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 outline-none transition-all"
                  min="0"
                />
              </div>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <motion.button
                type="submit"
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                <HiOutlineCheck className="w-4 h-4" />
                {editingId ? 'Update' : 'Create'}
              </motion.button>
              <motion.button
                type="button"
                onClick={resetForm}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
              >
                <HiOutlineX className="w-4 h-4" />
                Cancel
              </motion.button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-500 border-t-transparent" />
        </div>
      ) : tasks.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="text-center py-12 text-gray-400 dark:text-gray-500 text-sm">
          No tasks created yet
        </motion.div>
      ) : (
        <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-3">
          {tasks.map((task) => (
            <motion.div key={task._id || task.id} variants={fadeUp}
              className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm border p-5 transition-all ${
                task.is_active
                  ? 'border-gray-100 dark:border-gray-700'
                  : 'border-gray-200 dark:border-gray-600 opacity-60'
              }`}>
              <div className="flex items-start gap-4">
                <button
                  onClick={() => toggleActive(task)}
                  className={`mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                    task.is_active
                      ? 'bg-green-500 border-green-500 text-white'
                      : 'border-gray-300 dark:border-gray-500 hover:border-gray-400'
                  }`}
                  title={task.is_active ? 'Deactivate' : 'Activate'}
                >
                  {task.is_active && <HiOutlineCheck className="w-3 h-3" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-semibold text-gray-900 dark:text-white">
                    {task.description}
                  </p>
                  <div className="flex items-center gap-3 mt-2">
                    {task.points_reward > 0 && (
                      <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full">
                        +{task.points_reward} pts
                      </span>
                    )}
                    {task.coins_reward > 0 && (
                      <span className="text-xs font-semibold text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 px-2 py-0.5 rounded-full">
                        +{task.coins_reward} coins
                      </span>
                    )}
                    <span className={`text-xs ${task.is_active ? 'text-green-500' : 'text-gray-400'}`}>
                      {task.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                    Created {new Date(task.createdAt || task.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <motion.button
                    onClick={() => handleEdit(task)}
                    whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                    className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-blue-500 transition-all"
                    title="Edit"
                  >
                    <HiOutlinePencil className="w-4 h-4" />
                  </motion.button>
                  <motion.button
                    onClick={() => handleDelete(task._id || task.id)}
                    whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                    className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-all"
                    title="Delete"
                  >
                    <HiOutlineTrash className="w-4 h-4" />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </motion.div>
  )
}

export default DailyTasks
