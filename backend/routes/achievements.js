import { Router } from 'express';
import { User, Team, Achievement, StockEvent } from '../models/index.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { broadcastAchievement, broadcastOvertake } from '../socket.js';

const router = Router();

router.use(authenticateToken);

router.get('/', async (req, res) => {
  try {
    const { user_id } = req.query;
    const filter = {};
    if (user_id) {
      filter.user_id = user_id;
    }
    const achievements = await Achievement.find(filter)
      .populate('user_id', 'username display_name')
      .sort({ createdAt: -1 });
    res.json(achievements);
  } catch (err) {
    console.error('List achievements error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  const { user_id, title, description, category, points, date_earned } = req.body;

  if (!user_id || !title) {
    return res.status(400).json({ error: 'user_id and title are required' });
  }

  try {
    let teamBefore = 0;
    let userInfo = null;

    if (points > 0) {
      userInfo = await User.findById(user_id).populate('team_id');

      if (userInfo && userInfo.team_id) {
        const beforeResult = await User.aggregate([
          { $match: { team_id: userInfo.team_id._id, role: 'player' } },
          {
            $lookup: {
              from: 'achievements',
              localField: '_id',
              foreignField: 'user_id',
              as: 'achievements',
            },
          },
          { $group: { _id: null, total: { $sum: { $sum: '$achievements.points' } } } },
        ]);
        teamBefore = beforeResult[0]?.total || 0;
      }
    }

    const achievement = await Achievement.create({
      user_id,
      title,
      description: description || null,
      category: category || null,
      points: points || 0,
      date_earned: date_earned || new Date().toISOString().split('T')[0],
    });

    if (points > 0 && userInfo) {
      broadcastAchievement(
        userInfo._id,
        userInfo.display_name || userInfo.username,
        userInfo.team_id?.name || null,
        points,
        category
      );

      if (userInfo.team_id) {
        const teamId = userInfo.team_id._id;
        const teamName = userInfo.team_id.name;

        await StockEvent.create({
          type: 'achievement',
          message: `${userInfo.display_name || userInfo.username} earned ${points} points in ${category || 'general'}`,
          data: {
            userId: userInfo._id.toString(),
            playerName: userInfo.display_name || userInfo.username,
            teamName: teamName,
            points,
            category,
            teamId: teamId.toString(),
          },
        });

        const afterResult = await User.aggregate([
          { $match: { team_id: teamId, role: 'player' } },
          {
            $lookup: {
              from: 'achievements',
              localField: '_id',
              foreignField: 'user_id',
              as: 'achievements',
            },
          },
          { $group: { _id: null, total: { $sum: { $sum: '$achievements.points' } } } },
        ]);
        const teamAfter = afterResult[0]?.total || 0;

        const otherTeamsResult = await User.aggregate([
          { $match: { team_id: { $ne: teamId, $ne: null }, role: 'player' } },
          {
            $lookup: {
              from: 'achievements',
              localField: '_id',
              foreignField: 'user_id',
              as: 'achievements',
            },
          },
          {
            $group: {
              _id: '$team_id',
              total: { $sum: { $sum: '$achievements.points' } },
            },
          },
          { $sort: { total: -1 } },
        ]);

        const teamMap = {};
        const allTeams = await Team.find({ _id: { $ne: teamId } });
        for (const t of allTeams) {
          teamMap[t._id.toString()] = t.name;
        }

        for (const other of otherTeamsResult) {
          const otherTeamId = other._id;
          const otherTotal = other.total;
          const otherName = teamMap[otherTeamId.toString()] || 'Unknown';

          if (teamAfter > otherTotal && teamBefore <= otherTotal) {
            broadcastOvertake(teamName, otherName);
            await StockEvent.create({
              type: 'overtake',
              message: `${teamName} overtook ${otherName}!`,
              data: { teamName, overtakenTeamName: otherName },
            });
          }
        }
      }
    }

    res.status(201).json(achievement);
  } catch (err) {
    console.error('Create achievement error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, category, points, date_earned } = req.body;

    const update = {};
    if (title !== undefined) update.title = title;
    if (description !== undefined) update.description = description;
    if (category !== undefined) update.category = category;
    if (points !== undefined) update.points = points;
    if (date_earned !== undefined) update.date_earned = date_earned;

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const achievement = await Achievement.findByIdAndUpdate(id, update, {
      new: true,
    });

    if (!achievement) {
      return res.status(404).json({ error: 'Achievement not found' });
    }

    res.json(achievement);
  } catch (err) {
    console.error('Update achievement error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const achievement = await Achievement.findByIdAndDelete(id);

    if (!achievement) {
      return res.status(404).json({ error: 'Achievement not found' });
    }

    res.json({ message: 'Achievement deleted', achievement: { id: achievement._id, title: achievement.title } });
  } catch (err) {
    console.error('Delete achievement error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
