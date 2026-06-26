import React, { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { FiTrash2, FiMessageSquare } from 'react-icons/fi'
import api from '../../api'
import { getSocket } from '../../socket'

export default function Feedback() {
  const [feedbackList, setFeedbackList] = useState([])
  const [loading, setLoading] = useState(true)
  const listRef = useRef(null)

  const fetchFeedback = useCallback(async () => {
    try {
      setLoading(true)
      const { data } = await api.get('/feedback')
      setFeedbackList(Array.isArray(data) ? data : data.feedback || data.messages || [])
    } catch {
      setFeedbackList([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchFeedback() }, [fetchFeedback])

  useEffect(() => {
    const socket = getSocket()
    if (!socket) return
    const handler = (data) => {
      setFeedbackList(prev => [{ ...data, id: data.id || Date.now(), timestamp: data.timestamp || new Date().toISOString() }, ...prev])
      toast('New feedback received!', { icon: '💬' })
    }
    socket.on('feedback:new', handler)
    return () => socket.off('feedback:new', handler)
  }, [])

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this feedback?')) return
    try {
      await api.delete(`/feedback/${id}`)
      setFeedbackList(prev => prev.filter(f => f.id !== id))
      toast.success('Feedback deleted')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete feedback')
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Feedback Messages</h2>
          <button onClick={fetchFeedback} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" />
          </div>
        ) : feedbackList.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500"
          >
            <FiMessageSquare size={48} className="mb-4 opacity-50" />
            <p className="text-lg font-medium">No Feedback Yet</p>
            <p className="text-sm mt-1">Player feedback will appear here in real time.</p>
          </motion.div>
        ) : (
          <div ref={listRef} className="space-y-3 max-h-[600px] overflow-y-auto">
            <AnimatePresence>
              {feedbackList.map((f) => (
                <motion.div
                  key={f.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 100 }}
                  layout
                  className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-100 dark:border-gray-700"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900 dark:text-white">{f.name || f.username || f.sender || 'Anonymous'}</span>
                        {f.email && (
                          <span className="text-xs text-gray-400 dark:text-gray-500">{f.email}</span>
                        )}
                        {f.timestamp && (
                          <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto shrink-0">
                            {new Date(f.timestamp).toLocaleString()}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">{f.message || f.text || f.content}</p>
                      {f.rating && (
                        <div className="mt-2 flex items-center gap-1">
                          {Array.from({ length: 5 }, (_, i) => (
                            <span key={i} className={`text-sm ${i < f.rating ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}>★</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(f.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded hover:bg-red-50 dark:hover:bg-red-900/20 shrink-0 transition-colors"
                      title="Delete feedback"
                    >
                      <FiTrash2 size={16} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}
