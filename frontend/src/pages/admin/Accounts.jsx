import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { FiChevronDown, FiChevronUp, FiUserPlus, FiSearch, FiShield, FiTrash2, FiEdit2, FiSave, FiX, FiLock, FiCamera } from 'react-icons/fi'
import api from '../../api'

const initialForm = { username: '', password: '', coins: 0 }

const stagger = {
  animate: { transition: { staggerChildren: 0.05 } }
}

const fadeSlide = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2 } }
}

export default function Accounts() {
  const [players, setPlayers] = useState([])
  const [teams, setTeams] = useState([])
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(initialForm)
  const [creating, setCreating] = useState(false)
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [editingId, setEditingId] = useState(null)
  const [pwForm, setPwForm] = useState({ newPassword: '', confirmPassword: '' })
  const [pwSubmitting, setPwSubmitting] = useState(false)

  const fetchPlayers = useCallback(async () => {
    try {
      setLoading(true)
      const [userRes, teamRes] = await Promise.all([
        api.get('/users'),
        api.get('/teams')
      ])
      setPlayers(Array.isArray(userRes.data) ? userRes.data : userRes.data.users || userRes.data.players || [])
      setTeams(Array.isArray(teamRes.data) ? teamRes.data : teamRes.data.teams || [])
    } catch {
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchPlayers() }, [fetchPlayers])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!form.username || !form.password) {
      toast.error('Username and password required')
      return
    }
    try {
      setCreating(true)
      await api.post('/auth/register', form)
      toast.success('Player created')
      setForm(initialForm)
      fetchPlayers()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create player')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this player?')) return
    try {
      await api.delete(`/users/${id}`)
      toast.success('Player deleted')
      setPlayers(prev => prev.filter(p => p.id !== id))
      if (selectedPlayer?.id === id) setSelectedPlayer(null)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete player')
    }
  }

  const handleChangePassword = async () => {
    if (!selectedPlayer) return
    const { newPassword, confirmPassword } = pwForm
    if (!newPassword || !confirmPassword) {
      toast.error('Both password fields are required')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    try {
      setPwSubmitting(true)
      await api.put(`/users/${selectedPlayer.id}`, { password: newPassword })
      toast.success('Password updated')
      setPwForm({ newPassword: '', confirmPassword: '' })
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update password')
    } finally {
      setPwSubmitting(false)
    }
  }

  const handleUploadAvatar = async () => {
    if (!avatarFile || !selectedPlayer) return
    const formData = new FormData()
    formData.append('avatar', avatarFile)
    try {
      await api.put(`/users/${selectedPlayer.id}/avatar`, formData)
      toast.success('Avatar uploaded')
      setAvatarFile(null)
      setAvatarPreview(null)
      fetchPlayers()
    } catch {
      toast.error('Failed to upload avatar')
    }
  }

  const [note, setNote] = useState('')
  const [noteSaving, setNoteSaving] = useState(false)

  const startEdit = (player) => {
    setEditingId(player.id)
    setEditForm({
      username: player.username || '',
      role: player.role || 'player',
      team_id: player.team_id || player.team?._id || player.teamId || '',
    })
    setNote(player.admin_note?.content || '')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm({})
  }

  const saveEdit = async (id) => {
    try {
      const payload = {}
      if (editForm.username) payload.username = editForm.username
      if (editForm.role) payload.role = editForm.role
      payload.team_id = editForm.team_id || null
      await api.put(`/users/${id}`, payload)
      toast.success('Player updated')
      setEditingId(null)
      fetchPlayers()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update player')
    }
  }

  const handleSaveNote = async () => {
    if (!editingId) return
    try {
      setNoteSaving(true)
      await api.put(`/users/${editingId}/notes`, { content: note })
      toast.success('Note saved')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save note')
    } finally {
      setNoteSaving(false)
    }
  }

  const filtered = players.filter(p =>
    !filter || (p.username && p.username.toLowerCase().includes(filter.toLowerCase()))
  )

  const [detailCache, setDetailCache] = useState({})

  const loadDetails = async (player) => {
    if (detailCache[player.id]) return detailCache[player.id]
    try {
      const { data } = await api.get(`/users/${player.id}/details`)
      const breakdown = {}
      const achs = data.achievements || []
      achs.forEach(a => {
        const cat = a.category || 'General'
        breakdown[cat] = (breakdown[cat] || 0) + (a.points || 0)
      })
      const enriched = { ...data, categoryBreakdown: breakdown, taskCount: achs.filter(a => a.category === 'daily_task').length }
      setDetailCache(prev => ({ ...prev, [player.id]: enriched }))
      return enriched
    } catch {
      return null
    }
  }

  const [expandedDetails, setExpandedDetails] = useState(null)
  const [detailsLoading, setDetailsLoading] = useState(false)

  const toggleDetails = async (player) => {
    if (expandedDetails?.id === player.id) {
      setExpandedDetails(null)
      return
    }
    setDetailsLoading(true)
    setExpandedDetails(player)
    const details = await loadDetails(player)
    if (details) {
      setExpandedDetails({ ...player, ...details })
    }
    setDetailsLoading(false)
  }

  return (
    <motion.div initial="initial" animate="animate" className="space-y-6">

      {/* Create Player */}
      <motion.div variants={fadeSlide} className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg shadow-gray-200/50 dark:shadow-black/20 border border-gray-100 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
            <FiUserPlus className="w-4 h-4 text-white" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Add Player</h2>
        </div>
        <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <input placeholder="Username *" value={form.username}
            onChange={e => setForm({ ...form, username: e.target.value })}
            className="px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 outline-none transition-all" />
          <input type="password" placeholder="Password *" value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })}
            className="px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 outline-none transition-all" />
          <input type="number" placeholder="Initial Coins" value={form.coins}
            onChange={e => setForm({ ...form, coins: Number(e.target.value) })}
            className="px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 outline-none transition-all" />
          <motion.button type="submit" disabled={creating}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 disabled:opacity-50 text-white rounded-xl font-medium transition-all shadow-md shadow-blue-500/20">
            {creating ? 'Creating...' : 'Create Player'}
          </motion.button>
        </form>
      </motion.div>

      {/* Players grid */}
      <motion.div variants={fadeSlide} className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg shadow-gray-200/50 dark:shadow-black/20 border border-gray-100 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Players ({filtered.length})</h2>
          <div className="relative max-w-xs w-full sm:w-auto">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input placeholder="Search players..." value={filter}
              onChange={e => setFilter(e.target.value)}
              autoComplete="off"
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 outline-none transition-all text-sm" />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="relative w-10 h-10">
              <div className="absolute inset-0 rounded-full border-2 border-blue-200 dark:border-blue-900" />
              <div className="absolute inset-0 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-gray-400 dark:text-gray-500 py-16">No players found</motion.p>
        ) : (
          <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-2">
            {filtered.map(player => {
              const isExpanded = expandedDetails?.id === player.id
              return (
                <motion.div key={player.id} variants={fadeSlide} layout className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-700/50">
                  {/* Player row */}
                  <div
                    onClick={() => toggleDetails(player)}
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-all ${
                      isExpanded
                        ? 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 shadow-sm'
                        : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/30'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm">
                      {(player.username || '?')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900 dark:text-white text-sm">{player.username}</span>
                        <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 capitalize">{player.role || 'player'}</span>
                      </div>
                      <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        {player.team?.name || player.teamName || 'No team'}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                      {editingId === player.id ? (
                        <>
                          <motion.button onClick={() => saveEdit(player.id)}
                            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                            className="p-2 rounded-lg bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/60 transition-colors"><FiSave size={15} /></motion.button>
                          <motion.button onClick={cancelEdit}
                            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"><FiX size={15} /></motion.button>
                        </>
                      ) : (
                        <>
                          <motion.button onClick={() => startEdit(player)}
                            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-blue-500 transition-colors"><FiEdit2 size={15} /></motion.button>
                          <motion.button onClick={() => handleDelete(player.id)}
                            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                            className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors"><FiTrash2 size={15} /></motion.button>
                        </>
                      )}
                      <div className="ml-1 p-1 text-gray-400">
                        {isExpanded ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
                      </div>
                    </div>
                  </div>

                  {/* Inline edit row */}
                  <AnimatePresence>
                    {editingId === player.id && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden border-t border-gray-100 dark:border-gray-700/50">
                        <div className="p-4 bg-gray-50/50 dark:bg-gray-800/50 flex flex-wrap gap-3">
                          <div className="flex-1 min-w-[140px]">
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Username</label>
                            <input value={editForm.username} onChange={e => setEditForm({ ...editForm, username: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500/40 outline-none" />
                          </div>
                          <div className="flex-1 min-w-[120px]">
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Role</label>
                            <select value={editForm.role} onChange={e => setEditForm({ ...editForm, role: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500/40 outline-none">
                              <option value="player">Player</option>
                              <option value="admin">Admin</option>
                            </select>
                          </div>
                          <div className="flex-1 min-w-[140px]">
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Team</label>
                            <select value={editForm.team_id} onChange={e => setEditForm({ ...editForm, team_id: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500/40 outline-none">
                              <option value="">No Team</option>
                              {teams.map(t => (
                                <option key={t.id || t._id} value={t.id || t._id}>{t.name}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div className="px-4 pb-4 bg-gray-50/50 dark:bg-gray-800/50">
                          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Admin Note</label>
                          <textarea value={note} onChange={e => setNote(e.target.value)}
                            rows={3} maxLength={2000}
                            placeholder="Leave a private note for this player..."
                            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500/40 outline-none resize-none" />
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-gray-400">{note.length}/2000</span>
                            <motion.button onClick={handleSaveNote} disabled={noteSaving}
                              whileTap={{ scale: 0.95 }}
                              className="px-3 py-1.5 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-all shadow-sm">
                              {noteSaving ? 'Saving...' : 'Save Note'}
                            </motion.button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Expandable detail panel */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                        className="overflow-hidden border-t border-gray-100 dark:border-gray-700/50">
                        <div className="p-5 bg-gradient-to-br from-gray-50/80 to-white dark:from-gray-800/50 dark:to-gray-800/30">
                          {detailsLoading ? (
                            <div className="flex justify-center py-10">
                              <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              {/* Profile info */}
                              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 }}>
                                <h4 className="text-base font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                  <span className="w-1.5 h-5 rounded-full bg-blue-500" />
                                  {expandedDetails.username}
                                </h4>
                                <div className="space-y-2.5 text-sm">
                                  {[
                                    ['Rank', `#${players.findIndex(p => p.id === expandedDetails.id) + 1}`],
                                    ['Total Score', (expandedDetails.total_points ?? expandedDetails.totalPoints ?? 0).toLocaleString()],
                                    ['Coins', (expandedDetails.coins ?? 0).toLocaleString()],
                                    ['Team', expandedDetails.team?.name || expandedDetails.teamName || '-'],
                                    ['Tasks Done', expandedDetails.taskCount ?? 0],
                                  ].map(([label, value]) => (
                                    <div key={label} className="flex items-center justify-between px-3 py-2 bg-white dark:bg-gray-700/30 rounded-lg">
                                      <span className="text-gray-500 dark:text-gray-400">{label}</span>
                                      <span className="font-semibold text-gray-800 dark:text-gray-200">{value}</span>
                                    </div>
                                  ))}
                                </div>
                              </motion.div>

                              {/* Score by category */}
                              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                                <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                                  <span className="w-1.5 h-5 rounded-full bg-emerald-500" />
                                  Score by Category
                                </h4>
                                {expandedDetails.categoryBreakdown && Object.keys(expandedDetails.categoryBreakdown).length > 0 ? (
                                  <div className="space-y-2">
                                    {Object.entries(expandedDetails.categoryBreakdown).sort((a, b) => b[1] - a[1]).map(([cat, pts], i) => (
                                      <motion.div key={cat} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                                        className="flex items-center justify-between px-3 py-2 bg-white dark:bg-gray-700/30 rounded-lg text-sm">
                                        <span className="text-gray-600 dark:text-gray-400">{cat}</span>
                                        <span className="font-bold text-blue-600 dark:text-blue-400">{pts} pts</span>
                                      </motion.div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-sm text-gray-400 dark:text-gray-500">No data</p>
                                )}
                              </motion.div>

                              {/* Password change + Avatar */}
                              <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }} className="space-y-5">
                                <div>
                                  <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                                    <span className="w-1.5 h-5 rounded-full bg-amber-500" />
                                    Change Password
                                  </h4>
                                  <div className="space-y-2">
                                    <input type="password" placeholder="New password *" value={pwForm.newPassword}
                                      onChange={e => setPwForm({ ...pwForm, newPassword: e.target.value })}
                                      className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 outline-none transition-all" />
                                    <input type="password" placeholder="Confirm new password *" value={pwForm.confirmPassword}
                                      onChange={e => setPwForm({ ...pwForm, confirmPassword: e.target.value })}
                                      className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 outline-none transition-all" />
                                    <motion.button onClick={handleChangePassword} disabled={pwSubmitting}
                                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                      className="w-full px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-sm font-medium transition-all shadow-md shadow-amber-500/20 flex items-center justify-center gap-2">
                                      <FiLock size={14} />
                                      {pwSubmitting ? 'Saving...' : 'Set Password'}
                                    </motion.button>
                                  </div>
                                </div>
                                <div>
                                  <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                                    <span className="w-1.5 h-5 rounded-full bg-violet-500" />
                                    Upload Avatar
                                  </h4>
                                  <input type="file" accept="image/*"
                                    onChange={e => {
                                      const file = e.target.files[0]
                                      setAvatarFile(file)
                                      if (file) {
                                        const reader = new FileReader()
                                        reader.onload = (ev) => setAvatarPreview(ev.target.result)
                                        reader.readAsDataURL(file)
                                      }
                                    }}
                                    className="w-full text-sm text-gray-500 dark:text-gray-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-gradient-to-r file:from-violet-500 file:to-purple-500 file:text-white hover:file:from-violet-600 hover:file:to-purple-600 file:cursor-pointer file:transition-all file:shadow-md file:shadow-violet-500/20" />
                                  {avatarPreview && (
                                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                                      className="mt-3 flex items-center gap-3 p-3 bg-white dark:bg-gray-700/30 rounded-xl">
                                      <img src={avatarPreview} alt="Preview" className="w-14 h-14 rounded-xl object-cover ring-2 ring-white dark:ring-gray-600 shadow-sm" />
                                      <motion.button onClick={handleUploadAvatar}
                                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                        className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white rounded-xl text-sm font-medium transition-all shadow-md shadow-emerald-500/20 flex items-center gap-2">
                                        <FiCamera size={14} />
                                        Upload
                                      </motion.button>
                                    </motion.div>
                                  )}
                                </div>
                              </motion.div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  )
}
