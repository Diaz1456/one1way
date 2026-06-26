import jwt from 'jsonwebtoken';
import { PresenceLog } from './models/index.js';

let io = null;

const onlineUsers = new Set();

export function setIO(ioInstance) {
  io = ioInstance;
}

export function emitToAll(event, data) {
  if (io) {
    io.emit(event, data);
  }
}

export function emitToAdmins(event, data) {
  if (io) {
    const adminSockets = [];
    for (const [socketId, socket] of io.sockets.sockets) {
      if (socket.user && socket.user.role === 'admin') {
        adminSockets.push(socket);
      }
    }
    adminSockets.forEach(s => s.emit(event, data));
  }
}

export function getOnlineUsers() {
  return onlineUsers;
}

export async function updatePresence(userId, eventType) {
  try {
    await PresenceLog.create({ user_id: userId, event: eventType });
  } catch (err) {
    console.error('Presence log error:', err);
  }
}

export function broadcastAchievement(userId, playerName, teamName, points, category) {
  emitToAll('achievement:new', { userId, playerName, teamName, points, category });
}

export function broadcastOvertake(teamName, overtakenTeamName) {
  emitToAll('team:overtake', { teamName, overtakenTeamName });
}

export function broadcastCountdown(state) {
  emitToAll('countdown:sync', state);
}

export function broadcastFeedback(feedback) {
  emitToAdmins('feedback:new', feedback);
}

export function broadcastTask(task) {
  emitToAll('daily_task:new', task);
}

export async function setupSocket(server) {
  const { Server } = await import('socket.io');

  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = { id: decoded.id, username: decoded.username, role: decoded.role };
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user.id;
    onlineUsers.add(userId);

    io.emit('presence:update', { onlineUsers: Array.from(onlineUsers) });
    updatePresence(userId, 'connect');

    socket.on('heartbeat', () => {
      socket.data.lastActivity = Date.now();
    });

    socket.on('disconnect', () => {
      onlineUsers.delete(userId);
      io.emit('presence:update', { onlineUsers: Array.from(onlineUsers) });
      updatePresence(userId, 'disconnect');
    });
  });

  return io;
}
