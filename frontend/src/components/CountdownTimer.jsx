import { useState, useEffect } from 'react'
import useStore from '../store'

function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function CountdownTimer({ compact }) {
  const countdown = useStore((s) => s.countdown)
  const [remaining, setRemaining] = useState(0)
  const [expired, setExpired] = useState(false)

  useEffect(() => {
    if (!countdown.isActive || !countdown.endTime) {
      setRemaining(0)
      setExpired(false)
      return
    }

    const tick = () => {
      const diff = new Date(countdown.endTime).getTime() - Date.now()
      const secs = Math.max(0, Math.floor(diff / 1000))
      setRemaining(secs)
      setExpired(secs <= 0)
    }

    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [countdown.endTime, countdown.isActive])

  if (expired) {
    return (
      <div className={`font-bold text-red-500 animate-pulse ${compact ? 'text-sm' : 'text-3xl'}`}>
        TIME'S UP!
      </div>
    )
  }

  if (!countdown.isActive) {
    return compact ? null : (
      <div className={`font-mono text-gray-400 ${compact ? 'text-xs' : 'text-2xl'}`}>
        --:--
      </div>
    )
  }

  const urgent = remaining < 10

  return (
    <div
      className={`font-mono font-bold tracking-wider ${
        compact ? 'text-sm' : 'text-4xl'
      } ${urgent ? 'text-red-500 blinking' : 'text-white'}`}
    >
      {formatTime(remaining)}
      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        .blinking {
          animation: blink 1s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
