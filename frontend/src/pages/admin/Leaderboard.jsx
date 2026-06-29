import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { FiSearch, FiX, FiStar, FiAward, FiSend, FiEdit2, FiTrash2 } from 'react-icons/fi'
import api from '../../api'

const rankColors = {
  1: { ring: 'ring-yellow-400', bg: 'from-yellow-400 to-amber-500', label: 'Gold' },
  2: { ring: 'ring-gray-300', bg: 'from-gray-300 to-gray-400', label: 'Silver' },
  3: { ring: 'ring-orange-400', bg: 'from-orange-400 to-orange-500', label: 'Bronze' }
}

const stagger = {
  animate: { transition: { staggerChildren: 0.04 } }
}

const cardItem = {
  initial: { opacity: 0, y: 12, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.3, ease: 'easeOut' } }
}

export default function Leaderboard() {
  const [players, setPlayers] = useState([])
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [modalPlayer, setModalPlayer] = useState(null)
  const [modalData, setModalData] = useState(null)
  const [modalLoading, setModalLoading] = useState(false)
  const [categories, setCategories] = useState([])
  const [activeCategory, setActiveCategory] = useState(null)
  const [noteText, setNoteText] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [editingAchievement, setEditingAchievement] = useState(null)
  const [editForm, setEditForm] = useState({ title: '', description: '', category: '', points: '' })
  const [savingEdit, setSavingEdit] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  const fetchLeaderboard = useCallback(async (category) => {
    try {
      setLoading(true)
      const url = category ? `/users/leaderboard?category=${encodeURIComponent(category)}` : '/users/leaderboard'
      const { data } = await api.get(url)
      setPlayers(Array.isArray(data) ? data : data.users || data.leaderboard || [])
    } catch {
      toast.error('Failed to load leaderboard')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchLeaderboard(activeCategory) }, [fetchLeaderboard, activeCategory])

  useEffect(() => {
    api.get('/users/leaderboard/categories')
      .then(({ data }) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [])

  const openModal = async (player, rank) => {
    setModalPlayer({ ...player, rank })
    setModalLoading(true)
    setModalData(null)
    setNoteText('')
    try {
      const { data } = await api.get(`/users/${player.id}/details`)
      const achs = data.achievements || []
      const taskCount = achs.filter(a => a.category === 'daily_task').length
      const note = data.admin_note || null
      setModalData({ achievements: achs, taskCount, note })
      if (note?.content) setNoteText(note.content)
    } catch {
      setModalData({ achievements: [], taskCount: 0, note: null })
    } finally {
      setModalLoading(false)
    }
  }

  const saveNote = async () => {
    if (!modalPlayer?.id) return
    setSavingNote(true)
    try {
      const { data } = await api.put(`/users/${modalPlayer.id}/notes`, { content: noteText })
      setModalData(prev => ({ ...prev, note: data }))
      toast.success('Note saved')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save note')
    } finally {
      setSavingNote(false)
    }
  }

  const startEdit = (ach) => {
    setEditingAchievement(ach._id)
    setEditForm({
      title: ach.title || '',
      description: ach.description || '',
      category: ach.category || '',
      points: String(ach.points || 0),
    })
  }

  const cancelEdit = () => {
    setEditingAchievement(null)
    setEditForm({ title: '', description: '', category: '', points: '' })
  }

  const saveEdit = async () => {
    if (!editingAchievement) return
    setSavingEdit(true)
    try {
      await api.put(`/achievements/${editingAchievement}`, {
        title: editForm.title,
        description: editForm.description,
        category: editForm.category,
        points: parseFloat(editForm.points) || 0,
      })
      toast.success('Achievement updated - cash recalculated')
      cancelEdit()
      const { data } = await api.get(`/users/${modalPlayer.id}/details`)
      setModalData(prev => ({ ...prev, achievements: data.achievements || [] }))
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update achievement')
    } finally {
      setSavingEdit(false)
    }
  }

  const confirmDelete = (achId) => {
    if (!window.confirm('Delete this achievement? Team cash will be adjusted accordingly.')) return
    setDeletingId(achId)
    api.delete(`/achievements/${achId}`)
      .then(() => {
        toast.success('Achievement deleted - team cash adjusted')
        setModalData(prev => ({
          ...prev,
          achievements: (prev?.achievements || []).filter(a => a._id !== achId),
        }))
      })
      .catch(err => toast.error(err.response?.data?.error || 'Failed to delete'))
      .finally(() => setDeletingId(null))
  }

  const tabs = [
    { key: null, label: 'Overall' },
    ...categories.map(c => ({ key: c, label: c }))
  ]

  const filtered = players.filter(p =>
    !filter || (p.username && p.username.toLowerCase().includes(filter.toLowerCase()))
  )

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg shadow-gray-200/50 dark:shadow-black/20 border border-gray-100 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md shadow-amber-500/20">
              <FiAward className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {activeCategory ? `${activeCategory} Leaderboard` : 'Leaderboard'}
            </h2>
          </div>
          <div className="relative max-w-xs w-full sm:w-64">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input placeholder="Search players..." value={filter} onChange={e => setFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 outline-none transition-all text-sm" />
          </div>
        </div>
      </motion.div>

      {categories.length > 0 && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-2 overflow-x-auto">
          <div className="flex gap-1.5 min-w-max">
            {tabs.map(({ key, label }) => (
              <motion.button key={key ?? '__all__'}
                onClick={() => setActiveCategory(key)}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all min-h-[44px] whitespace-nowrap ${
                  activeCategory === key
                    ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-md shadow-amber-500/20'
                    : 'bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {label}
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="relative w-10 h-10">
            <div className="absolute inset-0 rounded-full border-2 border-amber-200 dark:border-amber-900" />
            <div className="absolute inset-0 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-gray-400 dark:text-gray-500 py-20">
          {activeCategory ? 'No achievements in this category yet.' : 'No players found'}
        </motion.p>
      ) : (
        <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-3">
          {filtered.map((player, index) => {
            const rank = index + 1
            const colors = rankColors[rank]
            return (
              <motion.div key={player.id} variants={cardItem} layout
                onClick={() => openModal(player, rank)}
                whileHover={{ scale: 1.01, y: -2 }}
                whileTap={{ scale: 0.99 }}
                className={`relative bg-white dark:bg-gray-800 rounded-2xl shadow-sm hover:shadow-lg hover:shadow-gray-200/50 dark:hover:shadow-black/20 border border-gray-100 dark:border-gray-700/50 p-4 cursor-pointer transition-all overflow-hidden group ${
                  colors ? `ring-2 ${colors.ring} ring-offset-2 dark:ring-offset-gray-900` : ''
                }`}
              >
                {colors && (
                  <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${colors.bg}`} />
                )}
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                    colors
                      ? `bg-gradient-to-br ${colors.bg} text-white shadow-md`
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                  }`}>
                    #{rank}
                  </div>
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-base shrink-0 shadow-sm">
                    {(player.username || '?')[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900 dark:text-white truncate">{player.username}</p>
                      {colors && (
                        <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-gradient-to-r from-amber-100 to-amber-200 dark:from-amber-900/30 dark:to-amber-800/30 text-amber-700 dark:text-amber-300 font-medium">{colors.label}</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{player.team?.name || player.teamName || 'No team'}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold text-gray-900 dark:text-white tabular-nums">{player.score ?? player.total_points ?? 0}</p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">Points</p>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      )}

      <AnimatePresence>
        {modalPlayer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => { setModalPlayer(null); setModalData(null) }}
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.85, opacity: 0, y: 10 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              onClick={e => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="relative bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 dark:from-blue-500/5 dark:via-purple-500/5 dark:to-pink-500/5 p-6 pb-0 shrink-0">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-purple-500/20">
                        {(modalPlayer.username || '?')[0].toUpperCase()}
                      </div>
                      <div className={`absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-md ${
                        modalPlayer.rank <= 3
                          ? `bg-gradient-to-br ${rankColors[modalPlayer.rank].bg}`
                          : 'bg-gray-400 dark:bg-gray-600'
                      }`}>
                        #{modalPlayer.rank}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">{modalPlayer.username}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        {modalPlayer.team?.name || modalPlayer.teamName || 'No team'}
                      </p>
                    </div>
                  </div>
                  <motion.button onClick={() => { setModalPlayer(null); setModalData(null) }}
                    whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                    className="p-2 rounded-xl hover:bg-white/50 dark:hover:bg-gray-700/50 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-all">
                    <FiX size={20} />
                  </motion.button>
                </div>
                <div className="flex gap-4 mt-6 pb-6 border-b border-gray-100 dark:border-gray-700">
                  <div className="flex-1 bg-white/60 dark:bg-gray-700/40 rounded-xl px-4 py-3 text-center backdrop-blur-sm">
                    <p className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">{modalPlayer.score ?? modalPlayer.total_points ?? 0}</p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider mt-0.5">Points</p>
                  </div>
                  <div className="flex-1 bg-white/60 dark:bg-gray-700/40 rounded-xl px-4 py-3 text-center backdrop-blur-sm">
                    <p className="text-2xl font-bold text-amber-500 tabular-nums">{modalLoading ? '...' : modalData?.taskCount ?? 0}</p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider mt-0.5">Tasks Done</p>
                  </div>
                  <div className="flex-1 bg-white/60 dark:bg-gray-700/40 rounded-xl px-4 py-3 text-center backdrop-blur-sm">
                    <p className="text-2xl font-bold text-emerald-500 tabular-nums">{modalPlayer.rank}</p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider mt-0.5">Rank</p>
                  </div>
                </div>
              </div>

              <div className="p-6 overflow-y-auto flex-1">
                <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                  <FiStar className="w-4 h-4 text-amber-500" />
                  Achievements
                </h4>

                {modalLoading ? (
                  <div className="space-y-3">
                    {[1,2,3].map(i => (
                      <div key={i} className="h-16 bg-gray-100 dark:bg-gray-700/50 rounded-xl animate-pulse" />
                    ))}
                  </div>
                ) : !modalData || modalData.achievements.length === 0 ? (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="text-center text-gray-400 dark:text-gray-500 py-8 text-sm">
                    No achievements yet
                  </motion.p>
                ) : (
                  <div className="space-y-2">
                    {modalData.achievements.map((ach, i) => {
                      const isEditing = editingAchievement === ach._id
                      return (
                        <motion.div
                          key={ach._id || i}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.03 }}
                          className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700/30 border border-gray-100 dark:border-gray-700"
                        >
                          {isEditing ? (
                            <div className="space-y-2">
                              <input value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                                placeholder="Title" className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                              <input value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                                placeholder="Description" className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                              <div className="flex gap-2">
                                <input value={editForm.category} onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}
                                  placeholder="Category" className="flex-1 px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                                <input value={editForm.points} onChange={e => setEditForm(f => ({ ...f, points: e.target.value }))}
                                  type="number" step="any" placeholder="Points" className="w-24 px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                              </div>
                              <div className="flex gap-2 justify-end">
                                <button onClick={cancelEdit}
                                  className="px-3 py-1.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">Cancel</button>
                                <button onClick={saveEdit} disabled={savingEdit}
                                  className="px-3 py-1.5 text-xs font-medium bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg hover:from-blue-600 hover:to-indigo-600 disabled:opacity-50 transition-all">
                                  {savingEdit ? 'Saving...' : 'Save'}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{ach.title || ach.name || 'Achievement'}</p>
                                  {ach.category && (
                                    <span className="text-[10px] font-medium text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded-full">{ach.category}</span>
                                  )}
                                </div>
                                {ach.description && (
                                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 leading-relaxed">{ach.description}</p>
                                )}
                              </div>
                              <div className="flex items-start gap-1 shrink-0">
                                <div className="text-right mr-1">
                                  <p className="text-base font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                                    {Number.isInteger(ach.points) ? ach.points : (ach.points || 0).toFixed(1)}
                                  </p>
                                  {ach.createdAt && (
                                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                                      {new Date(ach.createdAt).toLocaleDateString()}
                                    </p>
                                  )}
                                </div>
                                <div className="flex flex-col gap-1">
                                  <button onClick={() => startEdit(ach)}
                                    className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-all"
                                    title="Edit">
                                    <FiEdit2 size={12} />
                                  </button>
                                  <button onClick={() => confirmDelete(ach._id)} disabled={deletingId === ach._id}
                                    className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-all disabled:opacity-40"
                                    title="Delete">
                                    {deletingId === ach._id ? (
                                      <div className="w-3 h-3 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                      <FiTrash2 size={12} />
                                    )}
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </motion.div>
                      )
                    })}
                  </div>
                )}

                <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                  <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                    <span role="img" aria-label="note" className="text-base">📝</span>
                    Admin Notes
                  </h4>
                  <textarea value={noteText} onChange={e => setNoteText(e.target.value)}
                    placeholder="Leave a private note for this player..."
                    maxLength={2000}
                    rows={3}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 outline-none transition-all resize-none"
                  />
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] text-gray-400 dark:text-gray-500">{noteText.length}/2000</span>
                    <motion.button onClick={saveNote} disabled={savingNote}
                      whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-sm font-medium rounded-xl shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 transition-all disabled:opacity-50"
                    >
                      {savingNote ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <FiSend size={14} />
                      )}
                      {savingNote ? 'Saving...' : 'Save Note'}
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
