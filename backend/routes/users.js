import { Router } from 'express';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { User, Team, Achievement, Coin, Note } from '../models/index.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

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
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) {
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
      filter.$or = [
        { username: { $regex: search, $options: 'i' } },
        { display_name: { $regex: search, $options: 'i' } },
      ];
    }

    if (req.user.role !== 'admin') {
      filter.role = 'player';
    }

    const users = await User.find(filter).select('-password_hash').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    console.error('List users error:', err);
    res.status(500).json({ error: 'Internal server error' });
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
          total_points: { $ifNull: [{ $sum: '$achievements.points' }, 0] },
        },
      },
      { $sort: { total_points: -1 } },
      { $project: { password_hash: 0, achievements: 0 } },
    ]);
    res.json(results);
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ error: 'Internal server error' });
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
          total_points: { $ifNull: [{ $sum: '$achievements.points' }, 0] },
        },
      },
      { $sort: { total_points: -1 } },
      { $limit: 5 },
      { $project: { password_hash: 0, achievements: 0 } },
    ]);
    res.json(results);
  } catch (err) {
    console.error('Champions error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/me', async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password_hash');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    console.error('Get current user error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id/details', async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).populate('team_id');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const achievements = await Achievement.find({ user_id: id }).sort({ createdAt: -1 });

    const coin = await Coin.findOne({ user_id: id });

    const response = {
      ...user.toObject(),
      team_name: user.team_id?.name || null,
      team_color: user.team_id?.color || null,
      team_id: user.team_id?._id || null,
      achievements,
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
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { password, display_name, username, role, team_id, avatar_url } = req.body;

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

    if (display_name && (isAdmin || req.user.id === id)) {
      update.display_name = display_name;
    }

    if (isAdmin) {
      if (username) update.username = username;
      if (role) update.role = role;
      if (team_id !== undefined) update.team_id = team_id;
      if (avatar_url !== undefined) update.avatar_url = avatar_url;
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const user = await User.findByIdAndUpdate(id, update, {
      new: true,
      select: '-password_hash',
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByIdAndDelete(id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User deleted', user: { id: user._id, username: user.username } });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id/avatar', upload.single('avatar'), async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({ error: 'Avatar file is required' });
    }

    const avatarUrl = `/uploads/${req.file.filename}`;

    const user = await User.findByIdAndUpdate(
      id,
      { avatar_url: avatarUrl },
      { new: true, select: 'id avatar_url' }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ id: user._id, avatar_url: user.avatar_url });
  } catch (err) {
    console.error('Avatar upload error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id/notes', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    const note = await Note.findOneAndUpdate(
      { player_user_id: id },
      { content, admin_id: req.user.id },
      { upsert: true, new: true }
    );

    res.json(note);
  } catch (err) {
    console.error('Update notes error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id/achievements', async (req, res) => {
  try {
    const { id } = req.params;
    const achievements = await Achievement.find({ user_id: id }).sort({ createdAt: -1 });
    res.json(achievements);
  } catch (err) {
    console.error('Get achievements error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id/coins', async (req, res) => {
  try {
    const { id } = req.params;
    const coin = await Coin.findOne({ user_id: id });
    if (!coin) {
      return res.json({ user_id: id, amount: 0 });
    }
    res.json(coin);
  } catch (err) {
    console.error('Get coins error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
