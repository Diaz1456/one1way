import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { FiEdit2, FiTrash2, FiX, FiStar, FiSearch } from 'react-icons/fi'
import api from '../../api'

const initialForm = { user_id: '', description: '', category: '', points: 10, date_earned: new Date().toISOString().split('T')[0] }

const stagger = { animate: { transition: { staggerChildren: 0.04 } } }
const fadeSlide = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } }
}

export default function Achievements() {
  const [achievements, setAchievements] = useState([])
  const [players, setPlayers] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(initialForm)
  const [creating, setCreating] = useState(false)
  const [filter, setFilter] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [achRes, playerRes, catRes] = await Promise.all([
        api.get('/achievements'),
        api.get('/users'),
        api.get('/categories')
      ])
      setAchievements(Array.isArray(achRes.data) ? achRes.data : achRes.data.achievements || [])
      const plist = Array.isArray(playerRes.data) ? playerRes.data : playerRes.data.users || playerRes.data.players || []
      setPlayers(plist)
      setCategories(Array.isArray(catRes.data) ? catRes.data : [])
    } catch {
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!form.user_id || !form.category) {
      toast.error('Player and category are required')
      return
    }
    try {
      setCreating(true)
      await api.post('/achievements', form)
      toast.success('Achievement created')
      setForm(initialForm)
      fetchData()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create achievement')
    } finally {
      setCreating(false)
    }
  }

  const startEdit = (ach) => {
    setEditingId(ach.id || ach._id)
    setEditForm({
      description: ach.description || '',
      category: ach.category || '',
      points: ach.points || 0,
      date_earned: ach.date_earned ? new Date(ach.date_earned).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm({})
  }

  const saveEdit = async (id) => {
    try {
      await api.put(`/achievements/${id}`, editForm)
      toast.success('Achievement updated')
      setEditingId(null)
      fetchData()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this achievement?')) return
    try {
      await api.delete(`/achievements/${id}`)
      toast.success('Achievement deleted')
      setAchievements(prev => prev.filter(a => (a.id || a._id) !== id))
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete')
    }
  }

  const categoryBreakdown = {}
  achievements.forEach(a => {
    if (a.category) {
      categoryBreakdown[a.category] = (categoryBreakdown[a.category] || 0) + (a.points || 0)
    }
  })

  const filtered = achievements.filter(a =>
    !filter ||
    (a.category && a.category.toLowerCase().includes(filter.toLowerCase())) ||
    (a.user_id?.username && a.user_id.username.toLowerCase().includes(filter.toLowerCase()))
  )

  return (
    <motion.div initial="initial" animate="animate" className="space-y-6">

      {/* Add form */}
      <motion.div variants={fadeSlide} className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg shadow-gray-200/50 dark:shadow-black/20 border border-gray-100 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md shadow-amber-500/20">
            <FiStar className="w-4 h-4 text-white" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Add Achievement</h2>
        </div>
        <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <select value={form.user_id} onChange={e => setForm({ ...form, user_id: e.target.value })}
            className="px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 outline-none transition-all">
            <option value="">Select Player *</option>
            {players.map(p => (
              <option key={p.id} value={p.id}>{p.username}</option>
            ))}
          </select>
          <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
            className="px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 outline-none transition-all font-medium">
            <option value="">Select Category *</option>
            {categories.map(c => (
              <option key={c.id || c._id} value={c.name}>{c.name}</option>
            ))}
          </select>
          <input placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
            className="px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 outline-none transition-all" />
          <input type="number" step="any" placeholder="Points" value={form.points} onChange={e => setForm({ ...form, points: e.target.value === '' ? '' : Number(e.target.value) })}
            className="px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 outline-none transition-all" />
          <motion.button type="submit" disabled={creating}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 text-white rounded-xl font-medium transition-all shadow-md shadow-amber-500/20">
            {creating ? 'Adding...' : 'Add Achievement'}
          </motion.button>
        </form>
      </motion.div>

      {/* Category breakdown */}
      {Object.keys(categoryBreakdown).length > 0 && (
        <motion.div variants={fadeSlide} className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg shadow-gray-200/50 dark:shadow-black/20 border border-gray-100 dark:border-gray-700 p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Score by Category</h2>
          <div className="flex flex-wrap gap-3">
            {Object.entries(categoryBreakdown).sort((a, b) => b[1] - a[1]).map(([cat, pts]) => (
              <motion.div key={cat} whileHover={{ scale: 1.05 }}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl border border-amber-100 dark:border-amber-800/30 shadow-sm">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{cat}</span>
                <span className="text-sm font-bold text-amber-600 dark:text-amber-400">{pts.toFixed(1)} pts</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Achievement cards */}
      <motion.div variants={fadeSlide} className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg shadow-gray-200/50 dark:shadow-black/20 border border-gray-100 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">All Achievements ({filtered.length})</h2>
          <div className="relative max-w-xs w-full sm:w-64">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input placeholder="Search achievements..." value={filter} onChange={e => setFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 outline-none transition-all text-sm" />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="relative w-8 h-8">
              <div className="absolute inset-0 rounded-full border-2 border-amber-200 dark:border-amber-900" />
              <div className="absolute inset-0 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-gray-400 dark:text-gray-500 py-12">No achievements found</p>
        ) : (
          <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-3">
            {filtered.map(ach => {
              const aid = ach.id || ach._id
              const isEditing = editingId === aid
              return (
                <motion.div key={aid} variants={fadeSlide} layout
                  className="bg-gray-50 dark:bg-gray-700/20 rounded-xl border border-gray-100 dark:border-gray-700/50 p-4 hover:shadow-md transition-all">
                  {isEditing ? (
                    <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-end">
                      <div className="flex-1 w-full sm:w-auto min-w-[80px] sm:min-w-[120px]">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
                        <select value={editForm.category} onChange={e => setEditForm({ ...editForm, category: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500/40 outline-none">
                          <option value="">None</option>
                          {categories.map(c => <option key={c.id || c._id} value={c.name}>{c.name}</option>)}
                        </select>
                      </div>
                      <div className="w-full sm:w-20">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Points</label>
                        <input type="number" step="any" value={editForm.points} onChange={e => setEditForm({ ...editForm, points: e.target.value === '' ? '' : Number(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500/40 outline-none" />
                      </div>
                      <div className="flex gap-1.5">
                        <motion.button onClick={() => saveEdit(aid)} whileTap={{ scale: 0.95 }}
                          className="px-3 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg text-sm font-medium shadow-md shadow-green-500/20">Save</motion.button>
                        <motion.button onClick={cancelEdit} whileTap={{ scale: 0.95 }}
                          className="px-3 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium">Cancel</motion.button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                        <FiStar className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-base font-bold text-gray-900 dark:text-white">{ach.category || 'Uncategorized'}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                          <span className="font-medium text-gray-600 dark:text-gray-400">{ach.user_id?.username || 'Unknown'}</span>
                          <span>·</span>
                          {ach.description && <span className="truncate">{ach.description}</span>}
                          {(ach.date_earned || ach.dateEarned) && (
                            <>
                              <span>·</span>
                              <span>{new Date(ach.date_earned || ach.dateEarned).toLocaleDateString()}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm font-bold text-amber-600 dark:text-amber-400 tabular-nums">+{(ach.points || 0).toFixed(1)}</span>
                        <motion.button onClick={() => startEdit(ach)}
                          whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                          className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-400 hover:text-blue-500 transition-all"><FiEdit2 size={14} /></motion.button>
                        <motion.button onClick={() => handleDelete(aid)}
                          whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                          className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-all"><FiTrash2 size={14} /></motion.button>
                      </div>
                    </div>
                  )}
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  )
}
