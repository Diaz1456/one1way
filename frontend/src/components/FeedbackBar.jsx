import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../api'
import { getSocket } from '../socket'

export default function FeedbackBar() {
  const [feedbacks, setFeedbacks] = useState([])

  const fetchFeedbacks = useCallback(async () => {
    try {
      const { data } = await api.get('/feedback')
      const items = Array.isArray(data) ? data : data.feedbacks || []
      setFeedbacks(items)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    fetchFeedbacks()

    const socket = getSocket()
    if (socket) {
      const handleNew = (data) => {
        setFeedbacks((prev) => [data, ...prev])
      }
      socket.on('feedback:new', handleNew)
      return () => socket.off('feedback:new', handleNew)
    }
  }, [fetchFeedbacks])

  const dismiss = async (id) => {
    try {
      await api.delete(`/feedback/${id}`)
      setFeedbacks((prev) => prev.filter((f) => f.id !== id))
    } catch {
      // ignore
    }
  }

  return (
    <div className="p-4">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
        Player Feedback
      </h3>

      <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto">
        <AnimatePresence>
          {feedbacks.length === 0 && (
            <p className="text-gray-500 text-sm">No feedback yet</p>
          )}
          {feedbacks.map((fb) => (
            <motion.div
              key={fb.id}
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, x: 100, height: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-gray-800 rounded-lg p-3 border border-gray-700"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-gray-200 truncate">
                      {fb.senderName || fb.sender || fb.name || 'Anonymous'}
                    </span>
                    <span className="text-xs text-gray-500 flex-shrink-0">
                      {new Date(fb.timestamp || fb.createdAt || Date.now()).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 break-words">
                    {fb.message || fb.text || ''}
                  </p>
                </div>
                <button
                  onClick={() => dismiss(fb.id)}
                  className="text-gray-500 hover:text-red-400 transition-colors flex-shrink-0 mt-0.5"
                  aria-label="Dismiss feedback"
                >
                  ✕
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
