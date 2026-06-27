import { useRef } from 'react'
import { motion } from 'framer-motion'
import useStore from '../store'

/*
 * Animated sun/moon toggle button.
 * - Sun: spinning rays on activation
 * - Moon: subtle glow pulse
 * - Smooth spring-based icon swap
 * - Glow ring on hover
 */
const ThemeToggle = ({ className = '' }) => {
  const { preferences, setThemeToggleDirection } = useStore()
  const isDark = preferences.nightMode
  const iconRef = useRef(null)

  const handleToggle = () => {
    setThemeToggleDirection(!isDark)
    preferences.toggleNightMode()
  }

  return (
    <motion.button
      onClick={handleToggle}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.85 }}
      className={`relative p-2 rounded-xl transition-all outline-none ${className} ${
        isDark
          ? 'bg-indigo-900/40 text-yellow-300 hover:bg-indigo-900/60 hover:shadow-lg hover:shadow-yellow-500/10'
          : 'bg-amber-50 text-amber-600 hover:bg-amber-100 hover:shadow-lg hover:shadow-amber-500/10'
      }`}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label="Toggle theme"
    >
      {/* Glow ring */}
      <motion.span
        className={`absolute inset-0 rounded-xl ${isDark ? 'bg-yellow-400/10' : 'bg-amber-400/10'}`}
        initial={false}
        animate={{ scale: [1, 1.2, 1], opacity: [0, 0.3, 0] }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      />

      {/* Sun icon (shown in light mode, animates to moon) */}
      <motion.div
        key={isDark ? 'moon' : 'sun'}
        initial={{ rotate: isDark ? 180 : -180, scale: 0.5, opacity: 0 }}
        animate={{ rotate: 0, scale: 1, opacity: 1 }}
        exit={{ rotate: isDark ? -180 : 180, scale: 0.5, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="relative w-5 h-5 flex items-center justify-center"
        ref={iconRef}
      >
        {isDark ? (
          /* 🌙 Moon crescent */
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path d="M21.752 15.002A9.72 9.72 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
          </svg>
        ) : (
          /* ☀️ Sun with rays */
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z" />
          </svg>
        )}
      </motion.div>
    </motion.button>
  )
}

export default ThemeToggle
