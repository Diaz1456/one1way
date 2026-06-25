import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useStore from '../store'
import { getSocket } from '../socket'

export default function AchievementPopUp() {
  const [items, setItems] = useState([])

  const addItem = useCallback((event) => {
    const id = Date.now()
    setItems((prev) => [...prev, { ...event, uid: id }])
    setTimeout(() => {
      setItems((prev) => prev.filter((e) => e.uid !== id))
    }, 5000)
  }, [])

  useEffect(() => {
    const socket = getSocket()
    if (socket) {
      socket.on('achievement:new', addItem)
    }
    return () => {
      if (socket) socket.off('achievement:new', addItem)
    }
  }, [addItem])

  const dismiss = (uid) => {
    setItems((prev) => prev.filter((e) => e.uid !== uid))
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
      <AnimatePresence>
        {items.map((item) => (
          <motion.div
            key={item.uid}
            initial={{ opacity: 0, x: 100, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="pointer-events-auto bg-gray-800 border border-green-500/30 rounded-lg shadow-xl p-4 max-w-sm backdrop-blur-sm"
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                <span className="text-green-400 text-lg">▲</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-green-400 font-semibold text-sm">
                  +{item.points || item.pts || 0} pts
                </p>
                <p className="text-gray-200 text-sm leading-tight mt-0.5">
                  {item.message || `${item.playerName || item.player} earned ${item.points || item.pts || 0} points!`}
                </p>
                {item.team && (
                  <p className="text-gray-400 text-xs mt-1">
                    {item.team} &bull; shares surging
                  </p>
                )}
              </div>
              <button
                onClick={() => dismiss(item.uid)}
                className="text-gray-500 hover:text-white transition-colors flex-shrink-0"
                aria-label="Dismiss"
              >
                ✕
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
