import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { FiEdit2, FiTrash2, FiX } from 'react-icons/fi'
import api from '../../api'

const initialForm = { userId: '', title: '', description: '', category: '', points: 10, date: new Date().toISOString().split('T')[0] }

export default function Achievements() {
  const [achievements, setAchievements] = useState([])
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(initialForm)
  const [creating, setCreating] = useState(false)
  const [filter, setFilter] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [achRes, playerRes] = await Promise.all([
        api.get('/achievements'),
        api.get('/users')
      ])
      setAchievements(Array.isArray(achRes.data) ? achRes.data : achRes.data.achievements || [])
      const plist = Array.isArray(playerRes.data) ? playerRes.data : playerRes.data.users || playerRes.data.players || []
      setPlayers(plist)
    } catch {
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!form.userId || !form.title) {
      toast.error('Player and title required')
      return
    }
    try {
      setCreating(true)
      await api.post('/achievements', form)
      toast.success('Achievement created')
      setForm(initialForm)
      fetchData()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create achievement')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this achievement?')) return
    try {
      await api.delete(`/achievements/${id}`)
      toast.success('Achievement deleted')
      setAchievements(prev => prev.filter(a => a.id !== id))
    } catch {
      toast.error('Failed to delete achievement')
    }
  }

  const startEdit = (ach) => {
    setEditingId(ach.id)
    setEditForm({ title: ach.title, description: ach.description || '', category: ach.category || '', points: ach.points, date: ach.date ? ach.date.split('T')[0] : '' })
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
    } catch {
      toast.error('Failed to update achievement')
    }
  }

  const playerMap = Object.fromEntries(players.map(p => [p.id, p]))
  const filtered = achievements.filter(a =>
    !filter ||
    (a.title && a.title.toLowerCase().includes(filter.toLowerCase())) ||
    (a.category && a.category.toLowerCase().includes(filter.toLowerCase()))
  )

  const categoryBreakdown = {}
  achievements.forEach(a => {
    if (a.category) {
      categoryBreakdown[a.category] = (categoryBreakdown[a.category] || 0) + (a.points || 0)
    }
  })

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Add Achievement</h2>
        <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          <select
            value={form.userId}
            onChange={e => setForm({ ...form, userId: e.target.value })}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">Select Player *</option>
            {players.map(p => (
              <option key={p.id} value={p.id}>{p.displayName || p.username}</option>
            ))}
          </select>
          <input placeholder="Title *" value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
          <input placeholder="Description" value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
          <input placeholder="Category" value={form.category}
            onChange={e => setForm({ ...form, category: e.target.value })}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
          <input type="number" placeholder="Points" value={form.points}
            onChange={e => setForm({ ...form, points: Number(e.target.value) })}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
          <button type="submit" disabled={creating}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors">
            {creating ? 'Adding...' : 'Add Achievement'}
          </button>
        </form>
      </div>

      {Object.keys(categoryBreakdown).length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Score by Category</h2>
          <div className="flex flex-wrap gap-3">
            {Object.entries(categoryBreakdown).map(([cat, pts]) => (
              <div key={cat} className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{cat}</span>
                <span className="text-sm font-mono font-bold text-blue-600 dark:text-blue-400">{pts} pts</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">All Achievements ({filtered.length})</h2>
          <input
            placeholder="Search achievements..." value={filter}
            onChange={e => setFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none max-w-xs text-sm"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-gray-400 dark:text-gray-500 py-8">No achievements found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 text-left text-gray-500 dark:text-gray-400">
                  <th className="pb-3 font-medium">Player</th>
                  <th className="pb-3 font-medium">Title</th>
                  <th className="pb-3 font-medium">Description</th>
                  <th className="pb-3 font-medium">Category</th>
                  <th className="pb-3 font-medium text-right">Points</th>
                  <th className="pb-3 font-medium">Date</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(ach => (
                  <tr key={ach.id} className="border-b border-gray-100 dark:border-gray-700/50">
                    {editingId === ach.id ? (
                      <>
                        <td className="py-3 text-gray-900 dark:text-white">{playerMap[ach.userId]?.displayName || playerMap[ach.userId]?.username || ach.userId}</td>
                        <td className="py-3">
                          <input value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                            className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                        </td>
                        <td className="py-3">
                          <input value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                            className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                        </td>
                        <td className="py-3">
                          <input value={editForm.category} onChange={e => setEditForm({ ...editForm, category: e.target.value })}
                            className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                        </td>
                        <td className="py-3">
                          <input type="number" value={editForm.points} onChange={e => setEditForm({ ...editForm, points: Number(e.target.value) })}
                            className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm text-right" />
                        </td>
                        <td className="py-3">
                          <input type="date" value={editForm.date} onChange={e => setEditForm({ ...editForm, date: e.target.value })}
                            className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                        </td>
                        <td className="py-3">
                          <div className="flex gap-1">
                            <button onClick={() => saveEdit(ach.id)} className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 rounded hover:bg-green-200">Save</button>
                            <button onClick={cancelEdit} className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded hover:bg-gray-200">Cancel</button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-3 text-gray-900 dark:text-white">{playerMap[ach.userId]?.displayName || playerMap[ach.userId]?.username || ach.userId}</td>
                        <td className="py-3 font-medium text-gray-900 dark:text-white">{ach.title}</td>
                        <td className="py-3 text-gray-500 dark:text-gray-400 max-w-xs truncate">{ach.description || '-'}</td>
                        <td className="py-3">
                          {ach.category && (
                            <span className="px-2 py-0.5 text-xs rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">{ach.category}</span>
                          )}
                        </td>
                        <td className="py-3 text-right font-mono font-bold text-blue-600 dark:text-blue-400">{ach.points}</td>
                        <td className="py-3 text-gray-500 dark:text-gray-400 text-xs">{ach.date ? new Date(ach.date).toLocaleDateString() : '-'}</td>
                        <td className="py-3">
                          <div className="flex gap-1">
                            <button onClick={() => startEdit(ach)} className="p-1.5 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 rounded hover:bg-gray-100 dark:hover:bg-gray-700"><FiEdit2 size={14} /></button>
                            <button onClick={() => handleDelete(ach.id)} className="p-1.5 text-gray-500 hover:text-red-600 dark:hover:text-red-400 rounded hover:bg-gray-100 dark:hover:bg-gray-700"><FiTrash2 size={14} /></button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
