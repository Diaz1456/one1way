import { motion } from 'framer-motion'
import useStore from '../store'

export default function SoundToggle() {
  const soundEnabled = useStore((s) => s.preferences.soundEnabled)
  const toggleSound = useStore((s) => s.preferences.toggleSound)

  return (
    <button
      onClick={toggleSound}
      className="relative w-10 h-10 flex items-center justify-center rounded-full bg-gray-700 hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
      aria-label={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
    >
      <motion.span
        key={soundEnabled ? 'sound-on' : 'sound-off'}
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.5, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="text-lg"
      >
        {soundEnabled ? '🔊' : '🔇'}
      </motion.span>
    </button>
  )
}
