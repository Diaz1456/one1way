import { Router } from 'express';
import mongoose from 'mongoose';
import { Team, User, Achievement } from '../models/index.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

router.get('/', async (req, res) => {
  try {
    const teams = await Team.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: 'team_id',
          as: 'members',
        },
      },
      { $addFields: { member_count: { $size: '$members' } } },
      { $project: { members: 0 } },
      { $sort: { name: 1 } },
    ]);

    res.json(teams);
  } catch (err) {
    console.error('List teams error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  const { name, color } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Team name is required' });
  }

  try {
    const team = await Team.create({ name, color: color || '#6366f1' });
    res.status(201).json(team);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Team name already exists' });
    }
    console.error('Create team error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, color } = req.body;

    const update = {};
    if (name !== undefined) update.name = name;
    if (color !== undefined) update.color = color;

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const team = await Team.findByIdAndUpdate(id, update, { new: true, runValidators: true });

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    res.json(team);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Team name already exists' });
    }
    console.error('Update team error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    await User.updateMany({ team_id: id }, { team_id: null });

    const team = await Team.findByIdAndDelete(id);

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    res.json({ message: 'Team deleted', team: { _id: team._id, name: team.name } });
  } catch (err) {
    console.error('Delete team error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id/members', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { member_ids } = req.body;

  if (!Array.isArray(member_ids)) {
    return res.status(400).json({ error: 'member_ids array is required' });
  }

  try {
    await User.updateMany({ team_id: id }, { team_id: null });

    await Promise.all(
      member_ids.map((userId) =>
        User.findByIdAndUpdate(userId, { team_id: id })
      )
    );

    const team = await Team.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(id) } },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: 'team_id',
          as: 'members',
        },
      },
      { $addFields: { member_count: { $size: '$members' } } },
      { $project: { members: 0 } },
    ]);

    res.json(team[0]);
  } catch (err) {
    console.error('Set team members error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id/rankings', async (req, res) => {
  try {
    const { id } = req.params;

    const team = await Team.findById(id);

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const members = await User.aggregate([
      { $match: { team_id: new mongoose.Types.ObjectId(id) } },
      {
        $lookup: {
          from: 'achievements',
          localField: '_id',
          foreignField: 'user_id',
          as: 'achievements',
        },
      },
      {
        $addFields: {
          total_points: { $sum: '$achievements.points' },
        },
      },
      {
        $project: {
          username: 1,
          display_name: 1,
          avatar_url: 1,
          total_points: 1,
        },
      },
      { $sort: { total_points: -1 } },
    ]);

    const totalPoints = members.reduce((sum, m) => sum + (m.total_points || 0), 0);

    res.json({
      ...team.toObject(),
      member_count: members.length,
      total_points: totalPoints,
      members,
    });
  } catch (err) {
    console.error('Team rankings error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
