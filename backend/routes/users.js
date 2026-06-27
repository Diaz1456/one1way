import { Router } from 'express';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { User, Team, Achievement, Coin, Note } from '../models/index.js';
import mongoose from 'mongoose';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { requireValidObjectId } from '../middleware/validate.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.resolve(process.env.UPLOAD_DIR || 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `avatar-${req.params.id}-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const extOk = allowed.test(path.extname(file.originalname).toLowerCase());
    const mimeOk = allowed.test(file.mimetype);
    if (extOk && mimeOk) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (jpeg, jpg, png, gif, webp) are allowed'));
    }
  },
});

const router = Router();

router.use(authenticateToken);

router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    const filter = {};

    if (search) {
      filter.username = { $regex: search, $options: 'i' };
    }

    if (req.user.role !== 'admin') {
      filter.role = 'player';
    }

    const users = await User.find(filter).select('-password_hash').sort({ createdAt: -1 }).lean();
    const result = users.map(u => ({ ...u, id: u._id.toString() }));
    res.json(result);
  } catch (err) {
    console.error('List users error:', err);
    res.status(500).json({ error: 'Failed to list users' });
  }
});

router.get('/leaderboard', async (req, res) => {
  try {
    const results = await User.aggregate([
      { $match: { role: 'player' } },
      {
        $lookup: {
          from: 'teams',
          localField: 'team_id',
          foreignField: '_id',
          as: 'team',
        },
      },
      { $unwind: { path: '$team', preserveNullAndEmptyArrays: true } },
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
      { $sort: { total_points: -1 } },
      ...(req.user.role !== 'admin' ? [{ $limit: 5 }] : []),
      { $project: { password_hash: 0, achievements: 0 } },
    ]);
    const mapped = results.map(u => ({ ...u, id: u._id.toString() }));
    res.json(mapped);
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ error: 'Failed to load leaderboard' });
  }
});

router.get('/champions', async (req, res) => {
  try {
    const results = await User.aggregate([
      { $match: { role: 'player' } },
      {
        $lookup: {
          from: 'teams',
          localField: 'team_id',
          foreignField: '_id',
          as: 'team',
        },
      },
      { $unwind: { path: '$team', preserveNullAndEmptyArrays: true } },
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
      { $sort: { total_points: -1 } },
      { $limit: 5 },
      { $project: { password_hash: 0, achievements: 0 } },
    ]);
    const mapped = results.map(u => ({ ...u, id: u._id.toString() }));
    res.json(mapped);
  } catch (err) {
    console.error('Champions error:', err);
    res.status(500).json({ error: 'Failed to load champions' });
  }
});

router.get('/me', async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password_hash').lean();
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ ...user, id: user._id.toString() });
  } catch (err) {
    console.error('Get current user error:', err);
    res.status(500).json({ error: 'Failed to get current user' });
  }
});

router.get('/:id/details', requireValidObjectId('id'), async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).populate('team_id');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const achievements = await Achievement.find({ user_id: id }).sort({ createdAt: -1 });

    const coin = await Coin.findOne({ user_id: id });

    const totalPoints = achievements.reduce((sum, a) => sum + (a.points || 0), 0);

    let team_cash = null;
    let team_rank = null;

    if (user.team_id) {
      team_cash = user.team_id.cash || 0;
      const rankedTeams = await Team.aggregate([
        { $sort: { cash: -1, name: 1 } },
        { $project: { _id: 1 } },
      ]);
      const pos = rankedTeams.findIndex(t => t._id.toString() === user.team_id._id.toString());
      team_rank = pos >= 0 ? pos + 1 : null;
    }

    const response = {
      ...user.toObject(),
      team_name: user.team_id?.name || null,
      team_color: user.team_id?.color || null,
      team_id: user.team_id?._id || null,
      team_cash,
      team_rank,
      achievements,
      total_points: totalPoints,
      coins: coin?.amount || 0,
    };

    delete response.password_hash;

    if (req.user.role === 'admin') {
      const notes = await Note.find({ player_user_id: id })
        .populate('admin_id', 'username')
        .sort({ createdAt: -1 });
      response.notes = notes;
    }

    res.json(response);
  } catch (err) {
    console.error('User details error:', err);
    res.status(500).json({ error: 'Failed to load user details' });
  }
});

router.put('/:id', requireValidObjectId('id'), async (req, res) => {
  try {
    const { id } = req.params;
    const { password, username, role, team_id, avatar_url } = req.body;

    if (req.user.role !== 'admin' && req.user.id !== id) {
      return res.status(403).json({ error: 'You can only update your own profile' });
    }

    const isAdmin = req.user.role === 'admin';
    const update = {};

    if (password) {
      if (!isAdmin) {
        return res.status(403).json({ error: 'Use /auth/change-password to change your own password' });
      }
      update.password_hash = await bcrypt.hash(password, 10);
    }

    if (isAdmin) {
      if (username !== undefined) update.username = username;
      if (role !== undefined) update.role = role;
      if (team_id !== undefined) update.team_id = team_id === '' ? null : team_id;
      if (avatar_url !== undefined) update.avatar_url = avatar_url;
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const user = await User.findByIdAndUpdate(id, update, { new: true }).select('-password_hash');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (err) {
    console.error('Update user error:', err);
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Username already taken' });
    }
    res.status(500).json({ error: 'Failed to update user' });
  }
});

router.delete('/:id', requireAdmin, requireValidObjectId('id'), async (req, res) => {
  try {
    const { id } = req.params;

    const target = await User.findById(id).select('username role');
    if (!target) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (target.role === 'admin') {
      return res.status(403).json({ error: 'Cannot delete the main admin account' });
    }

    await User.findByIdAndDelete(id);

    res.json({ message: 'User deleted', user: { id: target._id, username: target.username } });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

router.put('/:id/avatar', requireValidObjectId('id'), (req, res, next) => {
  upload.single('avatar')(req, res, (err) => {
    if (err) {
      if (err.message === 'Only image files (jpeg, jpg, png, gif, webp) are allowed') {
        return res.status(400).json({ error: err.message });
      }
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File size exceeds 5MB limit' });
      }
      console.error('Multer error:', err);
      return res.status(400).json({ error: 'File upload failed: ' + err.message });
    }
    next();
  });
}, async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({ error: 'Avatar file is required' });
    }

    const avatarUrl = `/uploads/${req.file.filename}`;

    const user = await User.findByIdAndUpdate(
      id,
      { avatar_url: avatarUrl },
      { new: true }
    ).select('username avatar_url');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ id: user._id.toString(), avatar_url: user.avatar_url });
  } catch (err) {
    console.error('Avatar upload error:', err);
    res.status(500).json({ error: 'Failed to upload avatar' });
  }
});

router.put('/:id/notes', requireAdmin, requireValidObjectId('id'), async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (content === undefined || content === null) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const note = await Note.findOneAndUpdate(
      { player_user_id: id },
      { content, admin_id: req.user.id },
      { upsert: true, new: true }
    );

    res.json(note);
  } catch (err) {
    console.error('Update notes error:', err);
    res.status(500).json({ error: 'Failed to update notes' });
  }
});

router.get('/:id/achievements', requireValidObjectId('id'), async (req, res) => {
  try {
    const { id } = req.params;
    const achievements = await Achievement.find({ user_id: id }).sort({ createdAt: -1 });
    res.json(achievements);
  } catch (err) {
    console.error('Get achievements error:', err);
    res.status(500).json({ error: 'Failed to load achievements' });
  }
});

router.get('/:id/coins', requireValidObjectId('id'), async (req, res) => {
  try {
    const { id } = req.params;
    const coin = await Coin.findOne({ user_id: id });
    if (!coin) {
      return res.json({ user_id: id, amount: 0 });
    }
    res.json(coin);
  } catch (err) {
    console.error('Get coins error:', err);
    res.status(500).json({ error: 'Failed to load coins' });
  }
});

export default router;
