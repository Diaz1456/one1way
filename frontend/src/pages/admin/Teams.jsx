import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { FiUsers, FiTrash2, FiEdit2, FiX, FiCheck, FiDollarSign } from 'react-icons/fi'
import api from '../../api'

export default function Teams() {
  const [teams, setTeams] = useState([])
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ name: '', color: '#3b82f6' })
  const [creating, setCreating] = useState(false)
  const [selectedTeam, setSelectedTeam] = useState(null)
  const [selectedMembers, setSelectedMembers] = useState([])
  const [saving, setSaving] = useState(false)
  const [editingTeam, setEditingTeam] = useState(null)
  const [editForm, setEditForm] = useState({ name: '', color: '' })
  const [cashInput, setCashInput] = useState({})

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [teamsRes, playersRes] = await Promise.all([
        api.get('/teams'),
        api.get('/users')
      ])
      setTeams(Array.isArray(teamsRes.data) ? teamsRes.data : teamsRes.data.teams || [])
      const plist = Array.isArray(playersRes.data) ? playersRes.data : playersRes.data.users || playersRes.data.players || []
      setPlayers(plist)
    } catch {
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleCreateTeam = async (e) => {
    e.preventDefault()
    if (!form.name) {
      toast.error('Team name required')
      return
    }
    try {
      setCreating(true)
      await api.post('/teams', form)
      toast.success('Team created')
      setForm({ name: '', color: '#3b82f6' })
      fetchData()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create team')
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteTeam = async (id) => {
    if (!window.confirm('Delete this team?')) return
    try {
      await api.delete(`/teams/${id}`)
      toast.success('Team deleted')
      setTeams(prev => prev.filter(t => t.id !== id))
      if (selectedTeam?.id === id) setSelectedTeam(null)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete team')
    }
  }

  const openTeam = (team) => {
    setSelectedTeam(team)
    const memberIds = (team.members || team.players || []).map(m => m.id || m.userId || m)
    setSelectedMembers(memberIds)
  }

  const toggleMember = (playerId) => {
    setSelectedMembers(prev =>
      prev.includes(playerId) ? prev.filter(id => id !== playerId) : [...prev, playerId]
    )
  }

  const saveMembers = async () => {
    if (!selectedTeam) return
    try {
      setSaving(true)
      await api.put(`/teams/${selectedTeam.id}/members`, { member_ids: selectedMembers })
      toast.success('Team members updated')
      fetchData()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update members')
    } finally {
      setSaving(false)
    }
  }

  const startEdit = (team, e) => {
    e.stopPropagation()
    setEditingTeam(team.id || team._id)
    setEditForm({ name: team.name, color: team.color || '#3b82f6' })
  }

  const cancelEdit = (e) => {
    e.stopPropagation()
    setEditingTeam(null)
    setEditForm({ name: '', color: '' })
  }

  const saveEdit = async (id, e) => {
    e.stopPropagation()
    if (!editForm.name.trim()) {
      toast.error('Team name is required')
      return
    }
    try {
      await api.put(`/teams/${id}`, editForm)
      toast.success('Team updated')
      setEditingTeam(null)
      fetchData()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update team')
    }
  }

  const handleSetCash = async (teamId, amount) => {
    const val = parseInt(amount, 10)
    if (isNaN(val) || val < 0) {
      toast.error('Enter a valid cash amount (>= 0)')
      return
    }
    try {
      await api.put(`/teams/${teamId}/cash`, { cash: val })
      toast.success('Cash updated')
      setCashInput(prev => ({ ...prev, [teamId]: '' }))
      fetchData()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update cash')
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Create Team</h2>
        <form onSubmit={handleCreateTeam} className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Team Name</label>
            <input placeholder="Team name" value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Color</label>
            <input type="color" value={form.color}
              onChange={e => setForm({ ...form, color: e.target.value })}
              className="w-12 h-10 p-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 cursor-pointer" />
          </div>
          <button type="submit" disabled={creating}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors">
            {creating ? 'Creating...' : 'Create Team'}
          </button>
        </form>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Teams ({teams.length})</h2>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" />
          </div>
        ) : teams.length === 0 ? (
          <p className="text-center text-gray-400 dark:text-gray-500 py-8">No teams created yet</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {teams.map(team => {
              const teamId = team.id || team._id
              const isEditing = editingTeam === teamId
              return (
              <motion.div
                key={teamId}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-100 dark:border-gray-700 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => openTeam(team)}
              >
                {isEditing ? (
                  <div className="flex flex-wrap items-end gap-3" onClick={e => e.stopPropagation()}>
                    <div className="flex-1 min-w-[140px]">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Team Name</label>
                      <input value={editForm.name}
                        onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                        className="w-full px-3 py-2 border border-blue-300 dark:border-blue-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500/40 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Color</label>
                      <input type="color" value={editForm.color}
                        onChange={e => setEditForm({ ...editForm, color: e.target.value })}
                        className="w-12 h-9 p-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 cursor-pointer" />
                    </div>
                    <div className="flex gap-1.5">
                      <motion.button onClick={e => saveEdit(teamId, e)} whileTap={{ scale: 0.95 }}
                        className="px-3 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg text-sm font-medium shadow-md shadow-green-500/20 flex items-center gap-1.5"><FiCheck size={14} /> Save</motion.button>
                      <motion.button onClick={cancelEdit} whileTap={{ scale: 0.95 }}
                        className="px-3 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium">Cancel</motion.button>
                    </div>
                  </div>
                ) : (
                <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: team.color || '#3b82f6' }} />
                    <h3 className="font-bold text-gray-900 dark:text-white">{team.name}</h3>
                  </div>
                  <div className="flex items-center gap-1">
                    <motion.button
                      onClick={e => startEdit(team, e)}
                      whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                      className="p-1.5 text-gray-400 hover:text-blue-500 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                      <FiEdit2 size={14} />
                    </motion.button>
                    <motion.button
                      onClick={(e) => { e.stopPropagation(); handleDeleteTeam(teamId) }}
                      whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                      className="p-1.5 text-gray-400 hover:text-red-500 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                      <FiTrash2 size={14} />
                    </motion.button>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 flex-wrap">
                  <span className="flex items-center gap-1">
                    <FiUsers size={14} />
                    {(team.members?.length || team.players?.length || 0)} members
                  </span>
                  <span className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                    <FiDollarSign size={14} />
                    {(team.cash || 0).toLocaleString()}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-2" onClick={e => e.stopPropagation()}>
                  <input
                    type="number" min="0" placeholder="Set cash..."
                    value={cashInput[teamId] ?? ''}
                    onChange={e => setCashInput(prev => ({ ...prev, [teamId]: e.target.value }))}
                    className="w-24 px-2 py-1 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500/40 outline-none"
                  />
                  <motion.button
                    onClick={() => handleSetCash(teamId, cashInput[teamId])}
                    whileTap={{ scale: 0.95 }}
                    className="px-2 py-1 text-xs bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-lg font-medium shadow-sm shadow-emerald-500/20"
                  >
                    Set Cash
                  </motion.button>
                </div>
                {(team.members?.length > 0 || team.players?.length > 0) && (
                  <div className="flex -space-x-2 mt-3">
                    {(team.members || team.players || []).slice(0, 5).map((m) => {
                      const uid = m.id || m.userId || m
                      const pl = players.find(p => p.id === uid)
                      return (
                        <div key={uid} className="w-7 h-7 rounded-full bg-gray-300 dark:bg-gray-600 border-2 border-white dark:border-gray-800 overflow-hidden" title={pl?.username || uid}>
                          {pl?.avatarUrl ? (
                            <img src={pl.avatarUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-300">
                              {(pl?.username || '?')[0]?.toUpperCase() || '?'}
                            </div>
                          )}
                        </div>
                      )
                    })}
                    {(team.members?.length || team.players?.length || 0) > 5 && (
                      <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-600 border-2 border-white dark:border-gray-800 flex items-center justify-center text-xs font-medium text-gray-500 dark:text-gray-400">
                        +{(team.members?.length || team.players?.length) - 5}
                      </div>
                    )}
                  </div>
                )}
                </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedTeam && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: selectedTeam.color || '#3b82f6' }} />
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">{selectedTeam.name} - Manage Members</h2>
              </div>
              <button onClick={() => setSelectedTeam(null)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400">
                <FiX size={18} />
              </button>
            </div>

            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {selectedMembers.length} member{selectedMembers.length !== 1 ? 's' : ''} selected
              </p>
              <button
                onClick={saveMembers}
                disabled={saving}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm transition-colors"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-80 overflow-y-auto">
              {players.map(player => {
                const isSelected = selectedMembers.includes(player.id)
                return (
                  <div
                    key={player.id}
                    onClick={() => toggleMember(player.id)}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors border ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                        : 'bg-gray-50 dark:bg-gray-700/30 border-transparent hover:bg-gray-100 dark:hover:bg-gray-700/50'
                    }`}
                  >
                    <input type="checkbox" checked={isSelected} onChange={() => toggleMember(player.id)} className="rounded text-blue-600 focus:ring-blue-500" />
                    <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 overflow-hidden shrink-0">
                      {player.avatarUrl ? (
                        <img src={player.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-300">
                          {(player.username || '?')[0]?.toUpperCase() || '?'}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{player.username}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
