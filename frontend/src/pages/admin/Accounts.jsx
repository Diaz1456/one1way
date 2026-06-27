import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { FiChevronDown, FiChevronUp } from 'react-icons/fi'
import api from '../../api'

const initialForm = { username: '', password: '', coins: 0 }

export default function Accounts() {
  const [players, setPlayers] = useState([])
  const [teams, setTeams] = useState([])
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(initialForm)
  const [creating, setCreating] = useState(false)
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [newPassword, setNewPassword] = useState('')
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [editingId, setEditingId] = useState(null)

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
    if (!newPassword || !selectedPlayer) return
    try {
      await api.put(`/users/${selectedPlayer.id}`, { password: newPassword })
      toast.success('Password updated')
      setNewPassword('')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update password')
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

  const startEdit = (player) => {
    setEditingId(player.id)
    setEditForm({
      username: player.username || '',
      role: player.role || 'player',
      team_id: player.team_id || player.team?._id || player.teamId || '',
    })
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

  const filtered = players.filter(p =>
    !filter || (p.username && p.username.toLowerCase().includes(filter.toLowerCase()))
  )

  // Compute category breakdown and task count from player details
  const [detailCache, setDetailCache] = useState({})

  const loadDetails = async (player) => {
    if (detailCache[player.id]) return detailCache[player.id]
    try {
      const { data } = await api.get(`/users/${player.id}/details`)
      // Build category breakdown
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
    <div className="space-y-6">
      {/* Create Player form */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Add Player</h2>
        <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <input placeholder="Username *" value={form.username}
            onChange={e => setForm({ ...form, username: e.target.value })}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
          <input type="password" placeholder="Password *" value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
          <input type="number" placeholder="Initial Coins" value={form.coins}
            onChange={e => setForm({ ...form, coins: Number(e.target.value) })}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
          <button type="submit" disabled={creating}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors">
            {creating ? 'Creating...' : 'Create Player'}
          </button>
        </form>
      </div>

      {/* Players table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Players ({filtered.length})</h2>
          <input placeholder="Search players..." value={filter}
            onChange={e => setFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none max-w-xs text-sm" />
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" /></div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-gray-400 dark:text-gray-500 py-8">No players found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 text-left text-gray-500 dark:text-gray-400">
                  <th className="pb-3 font-medium">Username</th>
                  <th className="pb-3 font-medium">Role</th>
                  <th className="pb-3 font-medium">Team</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(player => (
                  <React.Fragment key={player.id}>
                    <tr className={`border-b border-gray-100 dark:border-gray-700/50 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/30 ${expandedDetails?.id === player.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                      <td className="py-3">
                        <button onClick={() => toggleDetails(player)} className="flex items-center gap-2 text-gray-900 dark:text-white font-medium hover:text-blue-600 dark:hover:text-blue-400">
                          {expandedDetails?.id === player.id ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
                          {player.username}
                        </button>
                      </td>
                      <td className="py-3">
                        {editingId === player.id ? (
                          <select value={editForm.role} onChange={e => setEditForm({ ...editForm, role: e.target.value })}
                            className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
                            <option value="player">player</option>
                            <option value="admin">admin</option>
                          </select>
                        ) : (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 capitalize">{player.role || 'player'}</span>
                        )}
                      </td>
                      <td className="py-3 text-gray-700 dark:text-gray-300">
                        {editingId === player.id ? (
                          <select value={editForm.team_id} onChange={e => setEditForm({ ...editForm, team_id: e.target.value })}
                            className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm max-w-[140px]">
                            <option value="">No Team</option>
                            {teams.map(t => (
                              <option key={t.id || t._id} value={t.id || t._id}>{t.name}</option>
                            ))}
                          </select>
                        ) : (
                          player.team?.name || player.teamName || '-'
                        )}
                      </td>
                      <td className="py-3">
                        {editingId === player.id ? (
                          <div className="flex gap-1">
                            <button onClick={() => saveEdit(player.id)} className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 rounded hover:bg-green-200">Save</button>
                            <button onClick={cancelEdit} className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded hover:bg-gray-200">Cancel</button>
                          </div>
                        ) : (
                          <div className="flex gap-1">
                            <button onClick={(e) => { e.stopPropagation(); startEdit(player) }}
                              className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900/60 transition-colors">Edit</button>
                            <button onClick={(e) => { e.stopPropagation(); handleDelete(player.id) }}
                              className="px-2 py-1 text-xs bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors">Delete</button>
                          </div>
                        )}
                      </td>
                    </tr>

                    {/* Expandable detail row */}
                    <AnimatePresence>
                      {expandedDetails?.id === player.id && (
                        <motion.tr
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <td colSpan={4} className="p-4 bg-gray-50 dark:bg-gray-800/50">
                            {detailsLoading ? (
                              <div className="flex justify-center py-6"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" /></div>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Left: profile info */}
                                <div>
                                  <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3">{expandedDetails.username}</h4>
                                  <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                                    <p><span className="font-medium">Rank:</span> #{players.findIndex(p => p.id === expandedDetails.id) + 1}</p>
                                    <p><span className="font-medium">Total Score:</span> {expandedDetails.total_points ?? expandedDetails.totalPoints ?? 0}</p>
                                    <p><span className="font-medium">Coins:</span> {expandedDetails.coins ?? 0}</p>
                                    <p><span className="font-medium">Team:</span> {expandedDetails.team?.name || expandedDetails.teamName || '-'}</p>
                                    <p><span className="font-medium">Tasks Done:</span> {expandedDetails.taskCount ?? 0}</p>
                                  </div>
                                </div>

                                {/* Middle: score by category */}
                                <div>
                                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Score by Category</h4>
                                  {expandedDetails.categoryBreakdown && Object.keys(expandedDetails.categoryBreakdown).length > 0 ? (
                                    <div className="space-y-2">
                                      {Object.entries(expandedDetails.categoryBreakdown).sort((a, b) => b[1] - a[1]).map(([cat, pts]) => (
                                        <div key={cat} className="flex items-center justify-between text-sm">
                                          <span className="text-gray-600 dark:text-gray-400">{cat}</span>
                                          <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{pts} pts</span>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-sm text-gray-400 dark:text-gray-500">No data</p>
                                  )}
                                </div>

                                {/* Right: change password + avatar */}
                                <div className="space-y-4">
                                  <div>
                                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Change Password</h4>
                                    <div className="flex gap-2">
                                      <input type="password" placeholder="New password" value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)}
                                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                                      <button onClick={handleChangePassword} className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm transition-colors">Set</button>
                                    </div>
                                  </div>
                                  <div>
                                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Upload Avatar</h4>
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
                                      className="text-sm text-gray-600 dark:text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:bg-blue-50 dark:file:bg-blue-900/40 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100" />
                                    {avatarPreview && (
                                      <div className="mt-2 flex items-center gap-2">
                                        <img src={avatarPreview} alt="Preview" className="w-12 h-12 rounded-full object-cover" />
                                        <button onClick={handleUploadAvatar} className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-colors">Upload</button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </td>
                        </motion.tr>
                      )}
                    </AnimatePresence>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
