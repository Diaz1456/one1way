import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { FiSearch, FiX, FiChevronDown, FiChevronUp } from 'react-icons/fi'
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
  const [expandedId, setExpandedId] = useState(null)
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

  const toggleDetails = async (player) => {
    if (expandedId === player.id) {
      setExpandedId(null)
      setPlayerDetails(null)
      return
    }
    setExpandedId(player.id)
    setDetailsLoading(true)
    setNotes('')
    setPlayerDetails(null)
    try {
      const { data } = await api.get(`/users/${player.id}/details`)
      // Build category breakdown
      const breakdown = {}
      const achs = data.achievements || []
      achs.forEach(a => {
        const cat = a.category || 'General'
        breakdown[cat] = (breakdown[cat] || 0) + (a.points || 0)
      })
      setPlayerDetails({ ...data, categoryBreakdown: breakdown, taskCount: achs.filter(a => a.category === 'daily_task').length })
      setNotes(data.notes || '')
    } catch {
      setPlayerDetails({})
    } finally {
      setDetailsLoading(false)
    }
  }

  const saveNotes = async () => {
    if (!expandedId) return
    try {
      await api.put(`/users/${expandedId}/notes`, { content: notes })
      toast.success('Notes saved')
    } catch {
      toast.error('Failed to save notes')
    }
  }

  const filtered = players.filter(p =>
    !filter || (p.username && p.username.toLowerCase().includes(filter.toLowerCase()))
  )

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Leaderboard</h2>
          <div className="relative max-w-xs w-full">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input placeholder="Search players..." value={filter} onChange={e => setFilter(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" /></div>
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
                  const isExpanded = expandedId === player.id
                  return (
                    <React.Fragment key={player.id}>
                      <tr
                        onClick={() => toggleDetails(player)}
                        className={`border-b border-gray-100 dark:border-gray-700/50 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/30 ${colors?.bg || ''} ${colors?.border ? `border-l-4 ${colors.border}` : ''} ${isExpanded ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                      >
                        <td className="py-3">
                          {colors ? (
                            <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full ${colors.badge} text-white text-xs font-bold`}>{rank}</span>
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
                                  {(player.username || '?')[0].toUpperCase()}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-gray-900 dark:text-white">{player.username}</p>
                              {isExpanded ? <FiChevronUp size={14} className="text-gray-400" /> : <FiChevronDown size={14} className="text-gray-400" />}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 text-right">
                          <span className="font-mono font-bold text-gray-900 dark:text-white">{player.score ?? player.total_points ?? 0}</span>
                        </td>
                        <td className="py-3 text-gray-600 dark:text-gray-400">{player.team?.name || player.teamName || '-'}</td>
                      </tr>

                      {/* Expandable detail row */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.tr
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <td colSpan={4} className="p-4 bg-gray-50 dark:bg-gray-800/50">
                              {detailsLoading ? (
                                <div className="flex justify-center py-6"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" /></div>
                              ) : playerDetails ? (
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                  {/* Left: profile info */}
                                  <div className="space-y-4">
                                    <div className="flex items-center gap-4">
                                      <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-600 overflow-hidden shrink-0">
                                        {player.avatarUrl ? (
                                          <img src={player.avatarUrl} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                          <div className="w-full h-full flex items-center justify-center text-2xl text-gray-500 dark:text-gray-400 font-bold">
                                            {(player.username || '?')[0].toUpperCase()}
                                          </div>
                                        )}
                                      </div>
                                      <div>
                                        <p className="text-lg font-bold text-gray-900 dark:text-white">{player.username}</p>
                                        <p className="text-sm text-gray-500">Rank: #{rank}</p>
                                      </div>
                                    </div>
                                    <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                                      <p><span className="font-medium">Total Score:</span> {player.score ?? player.total_points ?? 0}</p>
                                      <p><span className="font-medium">Coins:</span> {playerDetails.coins ?? 0}</p>
                                      <p><span className="font-medium">Team:</span> {player.team?.name || player.teamName || '-'}</p>
                                      <p><span className="font-medium">Tasks Done:</span> {playerDetails.taskCount ?? 0}</p>
                                    </div>
                                    <div>
                                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Admin Notes</h4>
                                      <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                        placeholder="Add notes..." />
                                      <button onClick={saveNotes} className="mt-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors">Save Notes</button>
                                    </div>
                                  </div>

                                  {/* Middle: score by category breakdown */}
                                  <div>
                                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Score by Category</h4>
                                    {playerDetails.categoryBreakdown && Object.keys(playerDetails.categoryBreakdown).length > 0 ? (
                                      <div className="space-y-2">
                                        {Object.entries(playerDetails.categoryBreakdown).sort((a, b) => b[1] - a[1]).map(([cat, pts]) => (
                                          <div key={cat} className="flex items-center justify-between p-2 bg-white dark:bg-gray-700/30 rounded-lg text-sm">
                                            <span className="text-gray-700 dark:text-gray-300">{cat}</span>
                                            <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{pts} pts</span>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-sm text-gray-400 dark:text-gray-500">No achievements yet</p>
                                    )}
                                  </div>

                                  {/* Right: recent achievements */}
                                  <div>
                                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Achievements</h4>
                                    {(!playerDetails.achievements || playerDetails.achievements.length === 0) ? (
                                      <p className="text-sm text-gray-400 dark:text-gray-500">No achievements recorded</p>
                                    ) : (
                                      <div className="space-y-2 max-h-80 overflow-y-auto">
                                        {playerDetails.achievements.slice(0, 20).map((ach, i) => (
                                          <div key={ach.id || i} className="p-3 bg-white dark:bg-gray-700/30 rounded-lg text-sm">
                                            <div className="flex items-center justify-between">
                                              <p className="font-medium text-gray-900 dark:text-white truncate">{ach.title}</p>
                                              <span className="font-mono font-bold text-blue-600 dark:text-blue-400 shrink-0 ml-2">{ach.points} pts</span>
                                            </div>
                                            {ach.category && <span className="text-[10px] px-1.5 py-0.5 bg-gray-200 dark:bg-gray-600 rounded text-gray-600 dark:text-gray-400">{ach.category}</span>}
                                            {(ach.date_earned || ach.dateEarned) && (
                                              <p className="text-xs text-gray-400 mt-0.5">{new Date(ach.date_earned || ach.dateEarned).toLocaleDateString()}</p>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <p className="text-center text-gray-400 py-6">Could not load details</p>
                              )}
                            </td>
                          </motion.tr>
                        )}
                      </AnimatePresence>
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
