import { io } from 'socket.io-client'
import useStore from './store'

const SOCKET_URL = '/'

let socket = null

export const connectSocket = (token) => {
  /* Always disconnect stale socket first — fixes login-after-logout bug */
  if (socket) {
    socket.removeAllListeners()
    socket.disconnect()
    socket = null
  }

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling']
  })

  socket.on('connect', () => {
    console.log('Socket connected:', socket.id)
  })

  socket.on('presence:update', ({ onlineUsers }) => {
    useStore.getState().setOnlineUsers(onlineUsers || [])
  })

  socket.on('countdown:sync', (data) => {
    useStore.getState().setCountdown(data)
  })

  socket.on('presence:recent', (logins) => {
    useStore.getState().setRecentLogins(logins || [])
  })

  socket.on('achievement:new', (data) => {
    useStore.getState().addStockEvent({ ...data, type: 'achievement' })
  })

  socket.on('team:overtake', (data) => {
    useStore.getState().addStockEvent({ ...data, type: 'overtake' })
  })

  socket.on('daily_task:new', (data) => {
    useStore.getState().setCurrentTask(data)
  })

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason)
  })

  useStore.getState().setSocket(socket)
  return socket
}

export const disconnectSocket = () => {
  if (socket) {
    socket.removeAllListeners()
    socket.disconnect()
    socket = null
    useStore.getState().setSocket(null)
  }
}

export const getSocket = () => socket
