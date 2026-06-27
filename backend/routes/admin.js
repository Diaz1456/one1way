import { Router } from 'express';
import mongoose from 'mongoose';
import { GlobalCountdown, PresenceLog, StockEvent } from '../models/index.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { broadcastCountdown, getOnlineUsers } from '../socket.js';

const router = Router();

router.use(authenticateToken);
router.use(requireAdmin);

router.post('/countdown', async (req, res) => {
  const { action, minutes, seconds } = req.body;

  if (!action || !['start', 'stop', 'reset'].includes(action)) {
    return res.status(400).json({ error: 'action must be start, stop, or reset' });
  }

  try {
    if (action === 'start') {
      const totalSeconds = (parseInt(minutes || 0, 10) * 60) + parseInt(seconds || 0, 10);
      if (totalSeconds <= 0) {
        return res.status(400).json({ error: 'Duration must be greater than 0' });
      }

      const endTime = new Date(Date.now() + totalSeconds * 1000);

      await GlobalCountdown.deleteMany({});
      const countdown = await GlobalCountdown.create({
        end_time: endTime,
        duration_seconds: totalSeconds,
        is_active: true,
      });

      broadcastCountdown(countdown);
      res.json(countdown);
    } else if (action === 'stop') {
      await GlobalCountdown.updateMany({}, { is_active: false });

      const countdown = await GlobalCountdown.findOne().sort({ createdAt: -1 });

      if (countdown) {
        broadcastCountdown(countdown);
      }
      res.json(countdown || { is_active: false });
    } else if (action === 'reset') {
      await GlobalCountdown.updateMany({}, { is_active: false, end_time: null });

      const countdown = await GlobalCountdown.findOne().sort({ createdAt: -1 });

      if (countdown) {
        broadcastCountdown(countdown);
      }
      res.json(countdown || { is_active: false, end_time: null });
    }
  } catch (err) {
    console.error('Countdown error:', err);
    res.status(500).json({ error: 'Failed to manage countdown' });
  }
});

router.get('/countdown', async (req, res) => {
  try {
    const countdown = await GlobalCountdown.findOne().sort({ createdAt: -1 });

    if (!countdown) {
      return res.json({ is_active: false, end_time: null, duration_seconds: 0 });
    }

    res.json(countdown);
  } catch (err) {
    console.error('Get countdown error:', err);
    res.status(500).json({ error: 'Failed to get countdown' });
  }
});

router.get('/presence', async (req, res) => {
  try {
    const onlineUsers = getOnlineUsers();

    const recentLogs = await PresenceLog.find({
      timestamp: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    })
      .populate('user_id', 'username')
      .sort({ timestamp: -1 })
      .limit(200);

    res.json({
      onlineUsers,
      recentLogs,
    });
  } catch (err) {
    console.error('Get presence error:', err);
    res.status(500).json({ error: 'Failed to get presence data' });
  }
});

router.get('/events', async (req, res) => {
  try {
    const events = await StockEvent.find().sort({ createdAt: -1 }).limit(100);
    res.json(events);
  } catch (err) {
    console.error('Get events error:', err);
    res.status(500).json({ error: 'Failed to get events' });
  }
});

export default router;
