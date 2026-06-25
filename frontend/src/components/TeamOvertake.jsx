import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useStore from '../store'
import { getSocket } from '../socket'

export default function TeamOvertake() {
  const [overtake, setOvertake] = useState(null)
  const [minimized, setMinimized] = useState(false)

  const handleOvertake = useCallback((data) => {
    setOvertake({ ...data, uid: Date.now() })
    setMinimized(false)
    setTimeout(() => setMinimized(true), 5000)
  }, [])

  useEffect(() => {
    const socket = getSocket()
    if (socket) {
      socket.on('team:overtake', handleOvertake)
    }
    return () => {
      if (socket) socket.off('team:overtake', handleOvertake)
    }
  }, [handleOvertake])

  const dismiss = () => {
    setOvertake(null)
    setMinimized(false)
  }

  const message = overtake?.message ||
    (overtake?.overtaker && overtake?.overtaken
      ? `${overtake.overtaker} just overtook ${overtake.overtaken} in the market! Shares skyrocketing!`
      : null)

  return (
    <AnimatePresence>
      {overtake && !minimized && (
        <motion.div
          key={overtake.uid}
          initial={{ opacity: 0, scale: 0.5, y: -50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: -30 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={dismiss}
        >
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-gray-900 border-2 border-yellow-500 rounded-2xl p-8 max-w-lg mx-4 text-center shadow-2xl relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-green-500 via-transparent to-red-500" />
            </div>

            <div className="text-5xl mb-4">🔔</div>

            <h2 className="text-2xl font-bold text-yellow-400 mb-3">
              MARKET SHAKE-UP!
            </h2>

            <p className="text-gray-200 text-lg leading-relaxed">
              {message}
            </p>

            <div className="flex items-center justify-center gap-6 mt-6">
              <div className="flex items-center gap-2 text-green-400">
                <span className="text-2xl">▲</span>
                <span className="font-semibold">{overtake?.overtaker || 'Team A'}</span>
              </div>
              <span className="text-gray-500 text-2xl">⚡</span>
              <div className="flex items-center gap-2 text-red-400">
                <span className="text-2xl">▼</span>
                <span className="font-semibold">{overtake?.overtaken || 'Team B'}</span>
              </div>
            </div>

            <button
              onClick={dismiss}
              className="mt-6 px-6 py-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded-full font-semibold transition-colors"
            >
              Dismiss
            </button>
          </motion.div>
        </motion.div>
      )}

      {overtake && minimized && (
        <motion.button
          key={`badge-${overtake.uid}`}
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 100 }}
          onClick={() => { setMinimized(false); setOvertake(null) }}
          className="fixed top-4 right-4 z-50 bg-yellow-600 hover:bg-yellow-500 text-white px-3 py-1.5 rounded-full text-sm font-semibold shadow-lg flex items-center gap-2 transition-colors"
        >
          <span>🔔</span>
          <span>Market Update</span>
          <span className="text-yellow-200">✕</span>
        </motion.button>
      )}
    </AnimatePresence>
  )
}
