import { create } from 'zustand'

/*
 * Theme initialization priority:
 * 1. localStorage saved preference (explicit user choice)
 * 2. System prefers-color-scheme: dark (first visit only)
 * 3. Default: light mode
 */
function getInitialNightMode() {
  const stored = localStorage.getItem('nightMode')
  if (stored !== null) return stored === 'true'
  if (typeof window !== 'undefined') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  }
  return false
}

const useStore = create((set, get) => ({
  auth: {
    user: null,
    accessToken: localStorage.getItem('accessToken') || null,
    refreshToken: localStorage.getItem('refreshToken') || null,
    login: (user, accessToken, refreshToken) => {
      localStorage.setItem('accessToken', accessToken)
      localStorage.setItem('refreshToken', refreshToken)
      set({ auth: { ...get().auth, user, accessToken, refreshToken } })
    },
    restore: (user) => {
      set({ auth: { ...get().auth, user } })
    },
    logout: () => {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      set({ auth: { user: null, accessToken: null, refreshToken: null } })
    }
  },

  preferences: {
    nightMode: getInitialNightMode(),
    soundEnabled: localStorage.getItem('soundEnabled') !== 'false',
    /* Toggle night mode; persists to localStorage and applies .dark class via App.jsx */
    toggleNightMode: () => {
      const next = !get().preferences.nightMode
      localStorage.setItem('nightMode', next)
      set({ preferences: { ...get().preferences, nightMode: next } })
    },
    toggleSound: () => {
      const next = !get().preferences.soundEnabled
      localStorage.setItem('soundEnabled', next)
      set({ preferences: { ...get().preferences, soundEnabled: next } })
    }
  },

  /* The last toggle animation direction: true = toggling to dark, false = toggling to light */
  themeToggleDirection: null,
  setThemeToggleDirection: (dir) => set({ themeToggleDirection: dir }),

  socket: null,
  onlineUsers: [],
  recentLogins: [],

  countdown: {
    endTime: null,
    isActive: false,
    duration: 0
  },

  teams: [],
  stockEvents: [],
  currentTask: null,

  setSocket: (socket) => set({ socket }),
  setOnlineUsers: (users) => set({ onlineUsers: users }),
  setRecentLogins: (logins) => set({ recentLogins: logins }),
  setCountdown: (countdown) => set({ countdown }),
  setTeams: (teams) => set({ teams }),
  setCurrentTask: (task) => set({ currentTask: task }),
  addStockEvent: (event) => {
    const events = get().stockEvents
    const newEvent = { ...event, id: Date.now(), timestamp: new Date().toISOString() }
    set({ stockEvents: [...events.slice(-49), newEvent] })
  },
  dismissStockEvent: (id) => {
    set({ stockEvents: get().stockEvents.filter(e => e.id !== id) })
  }
}))

export default useStore
