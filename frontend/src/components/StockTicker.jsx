import useStore from '../store'

function timeAgo(ts) {
  const diff = Date.now() - new Date(ts).getTime()
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return `${sec}s ago`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  return `${Math.floor(min / 60)}h ago`
}

export default function StockTicker() {
  const stockEvents = useStore((s) => s.stockEvents)

  if (stockEvents.length === 0) return null

  return (
    <div className="bg-gray-900 border-b border-gray-700 overflow-hidden h-8 relative">
      <div className="absolute inset-0 pointer-events-none z-10"
        style={{
          background: 'linear-gradient(90deg, #111827 0%, transparent 5%, transparent 95%, #111827 100%)'
        }}
      />
      <div className="ticker-track flex items-center h-full whitespace-nowrap">
        {[...stockEvents, ...stockEvents].map((event, i) => (
          <span key={`${event.id}-${i}`} className="inline-flex items-center gap-1.5 mx-6 text-sm">
            {event.type === 'achievement' ? (
              <span className="text-green-400">▲</span>
            ) : (
              <span className="text-yellow-400">🔔</span>
            )}
            <span className={event.type === 'overtake' ? 'text-yellow-300 font-semibold' : 'text-green-300'}>
              {event.message || event.text}
            </span>
            <span className="text-gray-500 text-xs">{timeAgo(event.timestamp)}</span>
          </span>
        ))}
      </div>
      <style>{`
        @keyframes ticker-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .ticker-track {
          animation: ticker-scroll 40s linear infinite;
        }
      `}</style>
    </div>
  )
}
