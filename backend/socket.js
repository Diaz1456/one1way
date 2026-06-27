import jwt from 'jsonwebtoken';
import { GlobalCountdown, PresenceLog, Team } from './models/index.js';

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
    emitToAdmins('presence:recent', recent);
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

export function broadcastAdminNote(playerUserId, data) {
  emitToAll('admin_note:update', { playerUserId, ...data });
}

async function computeTeamRankings() {
  const teams = await Team.aggregate([
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: 'team_id',
        as: 'members',
      },
    },
    { $unwind: { path: '$members', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'achievements',
        localField: 'members._id',
        foreignField: 'user_id',
        as: 'memberAchievements',
      },
    },
    {
      $group: {
        _id: '$_id',
        name: { $first: '$name' },
        color: { $first: '$color' },
        cash: { $first: '$cash' },
        createdAt: { $first: '$createdAt' },
        updatedAt: { $first: '$updatedAt' },
        member_count: { $sum: { $cond: [{ $ifNull: ['$members._id', false] }, 1, 0] } },
        score: {
          $sum: {
            $reduce: {
              input: { $ifNull: ['$memberAchievements', []] },
              initialValue: 0,
              in: { $add: ['$$value', { $ifNull: ['$$this.points', 0] }] },
            },
          },
        },
      },
    },
    { $sort: { cash: -1, name: 1 } },
  ]);

  return teams.map((t, i) => ({
    ...t,
    id: t._id.toString(),
    rank: i + 1,
  }));
}

let previousRankings = [];

export async function broadcastTeams() {
  if (!io) return;
  try {
    const ranked = await computeTeamRankings();
    emitToAll('teams:update', ranked);

    const prevMap = {};
    previousRankings.forEach(t => { prevMap[t.id] = t.rank; });

    ranked.forEach(t => {
      const prevRank = prevMap[t.id];
      if (prevRank && prevRank > t.rank) {
        const overtaken = previousRankings.find(o => o.rank === t.rank);
        if (overtaken) {
          broadcastOvertake(t.name, overtaken.name);
        }
      }
    });

    previousRankings = ranked;
  } catch (err) {
    console.error('broadcastTeams error:', err);
  }
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
      socket.user = { id: decoded.id, username: decoded.username, role: decoded.role, teamId: decoded.teamId };
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

    try {
      const initialTeams = await computeTeamRankings();
      socket.emit('teams:update', initialTeams);
    } catch (err) {
      console.error('Send initial teams error:', err);
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
