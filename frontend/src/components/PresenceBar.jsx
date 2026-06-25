import { useState, useEffect, useCallback } from 'react'
import useStore from '../store'
import api from '../api'
import { getSocket } from '../socket'

export default function PresenceBar() {
  const onlineUsers = useStore((s) => s.onlineUsers)
  const [recentLogins, setRecentLogins] = useState([])

  const fetchPresence = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/presence')
      if (data.recentLogins) setRecentLogins(data.recentLogins.slice(0, 10))
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    fetchPresence()
    const socket = getSocket()
    if (socket) {
      socket.on('presence:update', ({ onlineUsers: users, recentLogins: logins }) => {
        if (logins) setRecentLogins(logins.slice(0, 10))
      })
    }
    return () => {
      if (socket) socket.off('presence:update')
    }
  }, [fetchPresence])

  return (
    <div className="p-4 space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Online Now
        </h3>
        <div className="space-y-2">
          {onlineUsers.length === 0 && (
            <p className="text-gray-500 text-sm">No users online</p>
          )}
          {onlineUsers.map((user) => (
            <div key={user.id || user.username} className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block animate-pulse" />
              <span className="text-sm text-gray-200">{user.username || user.name}</span>
              {user.role && (
                <span className="text-xs text-gray-500 ml-auto uppercase">{user.role}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-gray-700 pt-4">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Recently Logged In
        </h3>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {recentLogins.length === 0 && (
            <p className="text-gray-500 text-sm">No recent logins</p>
          )}
          {recentLogins.map((entry, i) => (
            <div key={entry.id || i} className="text-xs text-gray-400 flex justify-between">
              <span>{entry.username || entry.name}</span>
              <span>{new Date(entry.timestamp || entry.loggedInAt).toLocaleTimeString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
