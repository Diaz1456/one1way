import { Router } from 'express';
import mongoose from 'mongoose';
import { User, Team, Achievement, StockEvent } from '../models/index.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { broadcastAchievement, broadcastOvertake } from '../socket.js';
import { requireValidObjectId } from '../middleware/validate.js';

const router = Router();

router.use(authenticateToken);

router.get('/', async (req, res) => {
  try {
    const { user_id } = req.query;
    const filter = {};
    if (user_id) {
      if (!mongoose.Types.ObjectId.isValid(user_id)) {
        return res.status(400).json({ error: 'Invalid user_id in query' });
      }
      filter.user_id = user_id;
    }
    const achievements = await Achievement.find(filter)
      .populate('user_id', 'username')
      .sort({ createdAt: -1 });
    res.json(achievements);
  } catch (err) {
    console.error('List achievements error:', err);
    res.status(500).json({ error: 'Failed to list achievements' });
  }
});

async function getTeamTotalScore(teamId) {
  const result = await User.aggregate([
    { $match: { team_id: new mongoose.Types.ObjectId(teamId), role: 'player' } },
    {
      $lookup: {
        from: 'achievements',
        localField: '_id',
        foreignField: 'user_id',
        as: 'achievements',
      },
    },
    {
      $project: {
        teamScore: {
          $reduce: {
            input: '$achievements',
            initialValue: 0,
            in: { $add: ['$$value', { $ifNull: ['$$this.points', 0] }] },
          },
        },
      },
    },
    { $group: { _id: null, total: { $sum: '$teamScore' } } },
  ]);
  return result[0]?.total || 0;
}

router.post('/', requireAdmin, async (req, res) => {
  const { user_id, description, category, points, date_earned } = req.body;

  if (!user_id) {
    return res.status(400).json({ error: 'user_id is required' });
  }

  if (!mongoose.Types.ObjectId.isValid(user_id)) {
    return res.status(400).json({ error: 'Invalid user_id format' });
  }

  const pointsVal = parseInt(points, 10) || 0;

  try {
    let teamBefore = 0;
    let userInfo = null;

    if (pointsVal > 0) {
      userInfo = await User.findById(user_id).populate('team_id');

      if (!userInfo) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (userInfo.team_id) {
        teamBefore = await getTeamTotalScore(userInfo.team_id._id);
      }
    }

    const achievement = await Achievement.create({
      user_id,
      description: description || null,
      category: category || null,
      points: pointsVal,
      date_earned: date_earned || new Date().toISOString().split('T')[0],
    });

    if (pointsVal > 0 && userInfo) {
      broadcastAchievement(
        userInfo._id,
        userInfo.username,
        userInfo.team_id?.name || null,
        pointsVal,
        category
      );

      if (userInfo.team_id) {
        const teamId = userInfo.team_id._id;
        const teamName = userInfo.team_id.name;

        await StockEvent.create({
          type: 'achievement',
          message: `${userInfo.username} earned ${pointsVal} points in ${category || 'general'}`,
          data: {
            userId: userInfo._id.toString(),
            playerName: userInfo.username,
            teamName,
            points: pointsVal,
            category,
            teamId: teamId.toString(),
          },
        });

        const teamAfter = await getTeamTotalScore(teamId);

        const otherTeams = await Team.find({ _id: { $ne: teamId } });
        for (const otherTeam of otherTeams) {
          const otherTotal = await getTeamTotalScore(otherTeam._id);
          if (teamAfter > otherTotal && teamBefore <= otherTotal) {
            broadcastOvertake(teamName, otherTeam.name);
            await StockEvent.create({
              type: 'overtake',
              message: `${teamName} overtook ${otherTeam.name}!`,
              data: { teamName, overtakenTeamName: otherTeam.name },
            });
          }
        }
      }
    }

    res.status(201).json(achievement);
  } catch (err) {
    console.error('Create achievement error:', err);
    res.status(500).json({ error: 'Failed to create achievement' });
  }
});

router.put('/:id', requireAdmin, requireValidObjectId('id'), async (req, res) => {
  try {
    const { id } = req.params;
    const { description, category, points, date_earned } = req.body;

    const update = {};
    if (description !== undefined) update.description = description;
    if (category !== undefined) update.category = category;
    if (points !== undefined) update.points = parseInt(points, 10) || 0;
    if (date_earned !== undefined) update.date_earned = date_earned;

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const achievement = await Achievement.findByIdAndUpdate(id, update, { new: true });

    if (!achievement) {
      return res.status(404).json({ error: 'Achievement not found' });
    }

    res.json(achievement);
  } catch (err) {
    console.error('Update achievement error:', err);
    res.status(500).json({ error: 'Failed to update achievement' });
  }
});

router.delete('/:id', requireAdmin, requireValidObjectId('id'), async (req, res) => {
  try {
    const { id } = req.params;

    const achievement = await Achievement.findByIdAndDelete(id);

    if (!achievement) {
      return res.status(404).json({ error: 'Achievement not found' });
    }

    res.json({ message: 'Achievement deleted', achievement: { id: achievement._id, category: achievement.category } });
  } catch (err) {
    console.error('Delete achievement error:', err);
    res.status(500).json({ error: 'Failed to delete achievement' });
  }
});

export default router;
