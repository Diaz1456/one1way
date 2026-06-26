import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { FiSearch, FiX } from 'react-icons/fi'
import api from '../../api'

const rankColors = {
  1: { border: 'border-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-900/20', badge: 'bg-yellow-400', text: 'text-yellow-700 dark:text-yellow-300', label: 'Gold' },
  2: { border: 'border-gray-300', bg: 'bg-gray-50 dark:bg-gray-700/30', badge: 'bg-gray-300', text: 'text-gray-600 dark:text-gray-300', label: 'Silver' },
  3: { border: 'border-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20', badge: 'bg-orange-400', text: 'text-orange-700 dark:text-orange-300', label: 'Bronze' }
}

export default function Leaderboard() {
  const [players, setPlayers] = useState([])
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [playerDetails, setPlayerDetails] = useState(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [notes, setNotes] = useState('')

  const fetchLeaderboard = useCallback(async () => {
    try {
      setLoading(true)
      const { data } = await api.get('/users/leaderboard')
      setPlayers(Array.isArray(data) ? data : data.users || data.leaderboard || [])
    } catch {
      toast.error('Failed to load leaderboard')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchLeaderboard() }, [fetchLeaderboard])

  const openDetails = async (player) => {
    setSelectedPlayer(player)
    setDetailsLoading(true)
    setNotes('')
    setPlayerDetails(null)
    try {
      const { data } = await api.get(`/users/${player.id}/details`)
      setPlayerDetails(data)
      setNotes(data.notes || '')
    } catch {
      setPlayerDetails({})
    } finally {
      setDetailsLoading(false)
    }
  }

  const saveNotes = async () => {
    if (!selectedPlayer) return
    try {
      await api.put(`/users/${selectedPlayer.id}/notes`, { notes })
      toast.success('Notes saved')
    } catch {
      toast.error('Failed to save notes')
    }
  }

  const filtered = players.filter(p =>
    !filter ||
    (p.username && p.username.toLowerCase().includes(filter.toLowerCase())) ||
    (p.displayName && p.displayName.toLowerCase().includes(filter.toLowerCase()))
  )

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Leaderboard</h2>
          <div className="relative max-w-xs w-full">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              placeholder="Search players..." value={filter}
              onChange={e => setFilter(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-gray-400 dark:text-gray-500 py-12">No players found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 text-left text-gray-500 dark:text-gray-400">
                  <th className="pb-3 font-medium w-12">Rank</th>
                  <th className="pb-3 font-medium">Player</th>
                  <th className="pb-3 font-medium text-right">Score</th>
                  <th className="pb-3 font-medium">Team</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((player, index) => {
                  const rank = index + 1
                  const colors = rankColors[rank]
                  return (
                    <tr
                      key={player.id}
                      onClick={() => openDetails(player)}
                      className={`border-b border-gray-100 dark:border-gray-700/50 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/30 ${
                        colors?.bg || ''
                      } ${colors?.border ? `border-l-4 ${colors.border}` : ''}`}
                    >
                      <td className="py-3">
                        {colors ? (
                          <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full ${colors.badge} text-white text-xs font-bold`}>
                            {rank}
                          </span>
                        ) : (
                          <span className="text-gray-500 dark:text-gray-400 font-mono text-xs">#{rank}</span>
                        )}
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 overflow-hidden shrink-0">
                            {player.avatarUrl ? (
                              <img src={player.avatarUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-500 dark:text-gray-400 text-xs font-bold">
                                {(player.displayName || player.username || '?')[0].toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{player.displayName || player.username}</p>
                            {player.displayName && <p className="text-xs text-gray-400">@{player.username}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 text-right">
                        <span className="font-mono font-bold text-gray-900 dark:text-white">{player.score ?? player.totalPoints ?? 0}</span>
                      </td>
                      <td className="py-3 text-gray-600 dark:text-gray-400">{player.team?.name || player.teamName || '-'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedPlayer && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Player Details</h2>
              <button onClick={() => setSelectedPlayer(null)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400">
                <FiX size={18} />
              </button>
            </div>

            {detailsLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" />
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-600 overflow-hidden shrink-0">
                      {selectedPlayer.avatarUrl ? (
                        <img src={selectedPlayer.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl text-gray-500 dark:text-gray-400 font-bold">
                          {(selectedPlayer.displayName || selectedPlayer.username || '?')[0].toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{selectedPlayer.displayName || selectedPlayer.username}</p>
                      <p className="text-sm text-gray-500">@{selectedPlayer.username}</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    <p><span className="font-medium">Rank:</span> #{players.findIndex(p => p.id === selectedPlayer.id) + 1}</p>
                    <p><span className="font-medium">Score:</span> {selectedPlayer.score ?? selectedPlayer.totalPoints ?? 0}</p>
                    <p><span className="font-medium">Coins:</span> {playerDetails?.coins ?? selectedPlayer.coins ?? 0}</p>
                    <p><span className="font-medium">Team:</span> {selectedPlayer.team?.name || selectedPlayer.teamName || '-'}</p>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Admin Notes</h4>
                    <textarea
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                      placeholder="Add notes about this player..."
                    />
                    <button onClick={saveNotes} className="mt-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors">
                      Save Notes
                    </button>
                  </div>
                </div>

                <div className="lg:col-span-2">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Achievements</h4>
                  {(!playerDetails?.achievements || playerDetails.achievements.length === 0) && (!playerDetails?.achievementSummary) ? (
                    <p className="text-sm text-gray-400 dark:text-gray-500">No achievements recorded</p>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {(playerDetails?.achievements || []).map((ach, i) => (
                        <div key={ach.id || i} className="p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg text-sm">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">{ach.title}</p>
                              <p className="text-gray-500 dark:text-gray-400 text-xs">{ach.description}</p>
                            </div>
                            <div className="text-right">
                              <span className="text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-600 rounded text-gray-700 dark:text-gray-300">{ach.category}</span>
                              <p className="font-mono font-bold text-blue-600 dark:text-blue-400 mt-1">{ach.points} pts</p>
                            </div>
                          </div>
                          {ach.date && <p className="text-xs text-gray-400 mt-1">{new Date(ach.date).toLocaleDateString()}</p>}
                        </div>
                      ))}
                      {playerDetails?.achievementSummary && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {Object.entries(playerDetails.achievementSummary).map(([cat, pts]) => (
                            <span key={cat} className="px-2 py-1 text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                              {cat}: {pts} pts
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {playerDetails?.recentActivity && playerDetails.recentActivity.length > 0 && (
                    <div className="mt-6">
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Recent Activity</h4>
                      <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                        {playerDetails.recentActivity.slice(0, 10).map((act, i) => (
                          <p key={i} className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                            {act.description || act.action} - <span className="text-xs text-gray-400">{new Date(act.timestamp || act.date).toLocaleString()}</span>
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
