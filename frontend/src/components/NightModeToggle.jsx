import { motion } from 'framer-motion'
import useStore from '../store'

export default function NightModeToggle() {
  const nightMode = useStore((s) => s.preferences.nightMode)
  const toggleNightMode = useStore((s) => s.preferences.toggleNightMode)

  return (
    <button
      onClick={toggleNightMode}
      className="relative w-10 h-10 flex items-center justify-center rounded-full bg-gray-700 hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
      aria-label={nightMode ? 'Switch to light mode' : 'Switch to night mode'}
    >
      <motion.span
        key={nightMode ? 'moon' : 'sun'}
        initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
        animate={{ rotate: 0, opacity: 1, scale: 1 }}
        exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
        transition={{ duration: 0.3 }}
        className="text-lg"
      >
        {nightMode ? '🌙' : '☀️'}
      </motion.span>
    </button>
  )
}
