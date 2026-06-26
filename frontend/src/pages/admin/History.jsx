import React, { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import api from '../../api'

function todayStr() {
  return new Date().toISOString().split('T')[0]
}
function weekAgoStr() {
  const d = new Date()
  d.setDate(d.getDate() - 7)
  return d.toISOString().split('T')[0]
}

export default function History() {
  const [players, setPlayers] = useState([])
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const [playerId, setPlayerId] = useState('')
  const [fromDate, setFromDate] = useState(weekAgoStr)
  const [toDate, setToDate] = useState(todayStr)

  useEffect(() => {
    api.get('/users').then(({ data }) => {
      setPlayers(Array.isArray(data) ? data : data.users || data.players || [])
    }).catch(() => {})
  }, [])

  const fetchHistory = useCallback(async () => {
    if (!fromDate || !toDate) return
    try {
      setLoading(true)
      const params = { from_date: fromDate, to_date: toDate }
      if (playerId) params.player_id = playerId
      const { data } = await api.get('/tasks/history', { params })
      setHistory(Array.isArray(data) ? data : data.history || data.rows || [])
    } catch {
      toast.error('Failed to load history')
      setHistory([])
    } finally {
      setLoading(false)
    }
  }, [playerId, fromDate, toDate])

  useEffect(() => { fetchHistory() }, [fetchHistory])

  const totalCompletions = history.filter(h => h.status === true || h.status === 'completed' || h.checked === true).length
  const completionRate = history.length > 0 ? Math.round((totalCompletions / history.length) * 100) : 0

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Task Completion History</h2>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <select
            value={playerId}
            onChange={e => setPlayerId(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">All Players</option>
            {players.map(p => (
              <option key={p.id} value={p.id}>{p.displayName || p.username}</option>
            ))}
          </select>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">From</label>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">To</label>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <button onClick={fetchHistory}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors self-end">
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Records</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{history.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Completions</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{totalCompletions}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Completion Rate</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{completionRate}%</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" />
          </div>
        ) : history.length === 0 ? (
          <p className="text-center text-gray-400 dark:text-gray-500 py-8">No history records found for the selected criteria</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 text-left text-gray-500 dark:text-gray-400">
                  <th className="pb-3 font-medium">Date</th>
                  <th className="pb-3 font-medium">Player</th>
                  <th className="pb-3 font-medium">Task</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h, i) => (
                  <tr key={h.id || i} className="border-b border-gray-100 dark:border-gray-700/50">
                    <td className="py-3 text-gray-700 dark:text-gray-300">
                      {h.date ? new Date(h.date).toLocaleDateString() : (h.completed_at ? new Date(h.completed_at).toLocaleDateString() : '-')}
                    </td>
                    <td className="py-3 text-gray-900 dark:text-white">{h.playerName || h.displayName || h.username || h.player_id || '-'}</td>
                    <td className="py-3 text-gray-600 dark:text-gray-400 max-w-md truncate">{h.taskDescription || h.description || h.task || '-'}</td>
                    <td className="py-3">
                      {(h.status === true || h.status === 'completed' || h.checked === true) ? (
                        <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 font-medium">
                          <span className="w-2 h-2 rounded-full bg-green-500" /> Completed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-gray-400 dark:text-gray-500">
                          <span className="w-2 h-2 rounded-full bg-gray-400" /> Pending
                        </span>
                      )}
                    </td>
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
