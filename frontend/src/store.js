import { create } from 'zustand'

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
    nightMode: localStorage.getItem('nightMode') === 'true',
    soundEnabled: localStorage.getItem('soundEnabled') !== 'false',
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

  socket: null,
  onlineUsers: [],

  countdown: {
    endTime: null,
    isActive: false,
    duration: 0
  },

  stockEvents: [],
  currentTask: null,

  setSocket: (socket) => set({ socket }),
  setOnlineUsers: (users) => set({ onlineUsers: users }),
  setCountdown: (countdown) => set({ countdown }),
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
