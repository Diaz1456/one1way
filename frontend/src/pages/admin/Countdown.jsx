import React, { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { FiPlay, FiSquare, FiRefreshCw } from 'react-icons/fi'
import api from '../../api'
import useStore from '../../store'

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function Countdown() {
  const { countdown, setCountdown } = useStore()
  const [minutes, setMinutes] = useState(5)
  const [seconds, setSeconds] = useState(0)
  const [remaining, setRemaining] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchState = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/countdown')
      setCountdown(data)
      if (data.isActive && data.endTime) {
        setIsRunning(true)
        const diff = Math.max(0, Math.floor((new Date(data.endTime).getTime() - Date.now()) / 1000))
        setRemaining(diff)
      } else {
        setIsRunning(false)
        setRemaining(data.duration || 0)
      }
    } catch {
      setCountdown({ endTime: null, isActive: false, duration: 0 })
    } finally {
      setLoading(false)
    }
  }, [setCountdown])

  useEffect(() => { fetchState() }, [fetchState])

  useEffect(() => {
    if (!isRunning) return
    const id = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          setIsRunning(false)
          setCountdown({ endTime: null, isActive: false, duration: 0 })
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [isRunning, setCountdown])

  const handleAction = async (action, extra = {}) => {
    try {
      const payload = { action, ...extra }
      const { data } = await api.post('/admin/countdown', payload)
      setCountdown(data)
      if (action === 'start') {
        setIsRunning(true)
        const totalSeconds = (extra.minutes || 0) * 60 + (extra.seconds || 0)
        setRemaining(totalSeconds)
        toast.success('Countdown started')
      } else if (action === 'stop') {
        setIsRunning(false)
        toast.success('Countdown stopped')
      } else if (action === 'reset') {
        setIsRunning(false)
        setRemaining(0)
        toast.success('Countdown reset')
      }
    } catch {
      toast.error(`Failed to ${action} countdown`)
    }
  }

  const handleStart = () => {
    const total = minutes * 60 + seconds
    if (total <= 0) {
      toast.error('Please set a duration greater than 0')
      return
    }
    handleAction('start', { minutes, seconds })
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Countdown Timer Control</h2>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Minutes</label>
            <input type="number" min={0} max={999} value={minutes}
              onChange={e => setMinutes(Math.max(0, Number(e.target.value)))}
              disabled={isRunning}
              className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-center"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Seconds</label>
            <input type="number" min={0} max={59} value={seconds}
              onChange={e => setSeconds(Math.min(59, Math.max(0, Number(e.target.value))))}
              disabled={isRunning}
              className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-center"
            />
          </div>
          <button onClick={handleStart} disabled={isRunning}
            className="flex items-center gap-2 px-5 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors">
            <FiPlay size={16} /> Start
          </button>
          <button onClick={() => handleAction('stop')} disabled={!isRunning}
            className="flex items-center gap-2 px-5 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors">
            <FiSquare size={16} /> Stop
          </button>
          <button onClick={() => handleAction('reset')}
            className="flex items-center gap-2 px-5 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors">
            <FiRefreshCw size={16} /> Reset
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6 text-center">Live Countdown</h2>
        <div className="flex justify-center">
          <motion.div
            key={remaining}
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            className={`text-8xl sm:text-9xl font-mono font-black tracking-wider tabular-nums ${
              isRunning && remaining <= 10
                ? 'text-red-500 animate-blink'
                : isRunning
                  ? 'text-green-500 dark:text-green-400'
                  : 'text-gray-400 dark:text-gray-500'
            }`}
          >
            {formatTime(remaining)}
          </motion.div>
        </div>
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
          {isRunning ? 'Countdown is running' : remaining > 0 ? 'Countdown paused' : 'No countdown set'}
        </p>
      </div>
    </div>
  )
}
