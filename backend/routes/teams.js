import { Router } from 'express';
import mongoose from 'mongoose';
import { Team, User } from '../models/index.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { requireValidObjectId } from '../middleware/validate.js';
import { broadcastTeams } from '../socket.js';

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

    const result = teams.map(t => ({ ...t, id: t._id.toString() }));
    res.json(result);
  } catch (err) {
    console.error('List teams error:', err);
    res.status(500).json({ error: 'Failed to list teams' });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  const { name, color } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Team name is required' });
  }

  try {
    const team = await Team.create({ name: name.trim(), color: color || '#6366f1' });
    res.status(201).json(team);
    broadcastTeams();
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Team name already exists' });
    }
    console.error('Create team error:', err);
    res.status(500).json({ error: 'Failed to create team' });
  }
});

router.put('/:id', requireAdmin, requireValidObjectId('id'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, color } = req.body;

    const update = {};
    if (name !== undefined) update.name = name.trim();
    if (color !== undefined) update.color = color;

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const team = await Team.findByIdAndUpdate(id, update, { new: true, runValidators: true });

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    res.json({ ...team.toObject(), id: team._id.toString() });
    broadcastTeams();
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Team name already exists' });
    }
    console.error('Update team error:', err);
    res.status(500).json({ error: 'Failed to update team' });
  }
});

router.delete('/:id', requireAdmin, requireValidObjectId('id'), async (req, res) => {
  try {
    const { id } = req.params;

    await User.updateMany({ team_id: id }, { team_id: null });

    const team = await Team.findByIdAndDelete(id);

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    res.json({ message: 'Team deleted', team: { id: team._id.toString(), name: team.name } });
    broadcastTeams();
  } catch (err) {
    console.error('Delete team error:', err);
    res.status(500).json({ error: 'Failed to delete team' });
  }
});

router.put('/:id/members', requireAdmin, requireValidObjectId('id'), async (req, res) => {
  const { id } = req.params;
  const { member_ids } = req.body;

  if (!Array.isArray(member_ids)) {
    return res.status(400).json({ error: 'member_ids array is required' });
  }

  for (const uid of member_ids) {
    if (!mongoose.Types.ObjectId.isValid(uid)) {
      return res.status(400).json({ error: `Invalid member_id: ${uid}` });
    }
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

    if (!team || team.length === 0) {
      return res.status(404).json({ error: 'Team not found after update' });
    }

    res.json({ ...team[0], id: team[0]._id.toString() });
    broadcastTeams();
  } catch (err) {
    console.error('Set team members error:', err);
    res.status(500).json({ error: 'Failed to update team members' });
  }
});

router.put('/:id/cash', requireAdmin, requireValidObjectId('id'), async (req, res) => {
  try {
    const { id } = req.params;
    const { cash } = req.body;

    if (cash === undefined || typeof cash !== 'number' || cash < 0) {
      return res.status(400).json({ error: 'A valid cash amount (number >= 0) is required' });
    }

    const team = await Team.findByIdAndUpdate(id, { cash }, { new: true });

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    res.json({ ...team.toObject(), id: team._id.toString() });
    broadcastTeams();
  } catch (err) {
    console.error('Update team cash error:', err);
    res.status(500).json({ error: 'Failed to update team cash' });
  }
});

router.get('/:id/rankings', requireValidObjectId('id'), async (req, res) => {
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
          total_points: {
            $reduce: {
              input: '$achievements',
              initialValue: 0,
              in: { $add: ['$$value', { $ifNull: ['$$this.points', 0] }] },
            },
          },
        },
      },
      {
        $project: {
          username: 1,
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
    res.status(500).json({ error: 'Failed to load team rankings' });
  }
});

export default router;
