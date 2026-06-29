import { Router } from 'express';
import mongoose from 'mongoose';
import { User, Team, Achievement, StockEvent, CategoryRate } from '../models/index.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { broadcastAchievement, broadcastOvertake, broadcastTeams } from '../socket.js';
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
  const { user_id, title, description, category, points, date_earned } = req.body;

  if (!user_id) {
    return res.status(400).json({ error: 'user_id is required' });
  }

  if (!mongoose.Types.ObjectId.isValid(user_id)) {
    return res.status(400).json({ error: 'Invalid user_id format' });
  }

  const pointsVal = typeof points === 'number' ? points : (parseFloat(points) || 0);

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

    let rate = 0;
    if (category) {
      const rateDoc = await CategoryRate.findOne({ category }).lean();
      rate = rateDoc?.rate || 0;
    }

    const achievement = await Achievement.create({
      user_id,
      title: title || null,
      description: description || null,
      category: category || null,
      points: pointsVal,
      rateUsed: rate,
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

        const cashAmount = pointsVal * rate;
        if (cashAmount > 0) {
          await Team.findByIdAndUpdate(teamId, { $inc: { cash: cashAmount } });
          await StockEvent.create({
            type: 'achievement',
            message: `+$${cashAmount.toFixed(2)} cash for ${teamName} from ${userInfo.username}'s ${category || 'general'} achievement (${pointsVal} pts × $${rate}/pt)`,
            data: {
              teamId: teamId.toString(),
              teamName,
              playerName: userInfo.username,
              category,
              cashAmount,
            },
          });
        }
      }
    }

    res.status(201).json(achievement);
    broadcastTeams();
  } catch (err) {
    console.error('Create achievement error:', err);
    res.status(500).json({ error: 'Failed to create achievement' });
  }
});

router.put('/:id', requireAdmin, requireValidObjectId('id'), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, category, points, date_earned } = req.body;

    const oldAchievement = await Achievement.findById(id);
    if (!oldAchievement) {
      return res.status(404).json({ error: 'Achievement not found' });
    }

    const oldPoints = oldAchievement.points || 0;
    const oldRate = oldAchievement.rateUsed || 0;
    const oldCategory = oldAchievement.category;

    const update = {};
    if (title !== undefined) update.title = title;
    if (description !== undefined) update.description = description;
    if (category !== undefined) update.category = category;
    if (points !== undefined) update.points = typeof points === 'number' ? points : (parseFloat(points) || 0);
    if (date_earned !== undefined) update.date_earned = date_earned;

    const newCategory = category !== undefined ? category : oldCategory;
    const newPoints = points !== undefined ? (typeof points === 'number' ? points : (parseFloat(points) || 0)) : oldPoints;

    if (newCategory !== oldCategory || newPoints !== oldPoints) {
      let newRate = oldRate;
      if (newCategory !== oldCategory) {
        const rateDoc = await CategoryRate.findOne({ category: newCategory }).lean();
        newRate = rateDoc?.rate || 0;
        update.rateUsed = newRate;
      }
      const oldCash = oldPoints * oldRate;
      const newCash = newPoints * newRate;
      const cashDiff = newCash - oldCash;

      if (cashDiff !== 0) {
        const user = await User.findById(oldAchievement.user_id).populate('team_id');
        if (user && user.team_id) {
          const team = await Team.findById(user.team_id._id);
          if (team) {
            const newCashAmount = Math.max(0, (team.cash || 0) + cashDiff);
            team.cash = newCashAmount;
            await team.save();
          }
        }
      }
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const achievement = await Achievement.findByIdAndUpdate(id, update, { new: true });

    res.json(achievement);
    broadcastTeams();
  } catch (err) {
    console.error('Update achievement error:', err);
    res.status(500).json({ error: 'Failed to update achievement' });
  }
});

router.delete('/:id', requireAdmin, requireValidObjectId('id'), async (req, res) => {
  try {
    const { id } = req.params;

    const achievement = await Achievement.findById(id);
    if (!achievement) {
      return res.status(404).json({ error: 'Achievement not found' });
    }

    const cashToRemove = (achievement.points || 0) * (achievement.rateUsed || 0);

    if (cashToRemove > 0) {
      const user = await User.findById(achievement.user_id).populate('team_id');
      if (user && user.team_id) {
        const team = await Team.findById(user.team_id._id);
        if (team) {
          team.cash = Math.max(0, (team.cash || 0) - cashToRemove);
          await team.save();
        }
      }
    }

    await Achievement.findByIdAndDelete(id);

    res.json({ message: 'Achievement deleted. Team cash adjusted.' });
    broadcastTeams();
  } catch (err) {
    console.error('Delete achievement error:', err);
    res.status(500).json({ error: 'Failed to delete achievement' });
  }
});

export default router;
