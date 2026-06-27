import jwt from 'jsonwebtoken';
import { GlobalCountdown, PresenceLog, User } from './models/index.js';

let io = null;

const onlineUsers = new Map();

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
    for (const [, socket] of io.sockets.sockets) {
      if (socket.user && socket.user.role === 'admin') {
        adminSockets.push(socket);
      }
    }
    adminSockets.forEach(s => s.emit(event, data));
  }
}

export function getOnlineUsers() {
  return Array.from(onlineUsers.values());
}

export async function updatePresence(userId, eventType) {
  try {
    await PresenceLog.create({ user_id: userId, event: eventType });
  } catch (err) {
    console.error('Presence log error:', err);
  }
}

export async function broadcastRecentLogins() {
  try {
    const logs = await PresenceLog.find({ event: 'connect' })
      .populate('user_id', 'username')
      .sort({ timestamp: -1 })
      .limit(20);
    const recent = logs
      .filter(l => l.user_id)
      .map(l => ({ username: l.user_id.username, timestamp: l.timestamp }));
    emitToAll('presence:recent', recent);
  } catch (err) {
    console.error('Broadcast recent logins error:', err);
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

  io.on('connection', async (socket) => {
    const { id, username } = socket.user;
    onlineUsers.set(id, { id, username });

    io.emit('presence:update', { onlineUsers: Array.from(onlineUsers.values()) });
    await updatePresence(id, 'connect');
    await broadcastRecentLogins();

    const countdown = await GlobalCountdown.findOne().sort({ createdAt: -1 });
    if (countdown) {
      socket.emit('countdown:sync', countdown);
    }

    socket.on('heartbeat', () => {
      socket.data.lastActivity = Date.now();
    });

    socket.on('disconnect', async () => {
      onlineUsers.delete(id);
      io.emit('presence:update', { onlineUsers: Array.from(onlineUsers.values()) });
      await updatePresence(id, 'disconnect');
    });
  });

  return io;
}
