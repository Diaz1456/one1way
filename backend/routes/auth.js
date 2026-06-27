import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Username and password must be strings' });
  }

  try {
    const user = await User.findOne({ username: username.toLowerCase().trim() });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const teamId = user.team_id ? user.team_id.toString() : null;

    const accessToken = jwt.sign(
      { id: user._id.toString(), username: user.username, role: user.role, teamId },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { id: user._id.toString(), username: user.username, role: user.role, teamId },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user._id.toString(),
        username: user.username,
        role: user.role,
        avatar_url: user.avatar_url,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/register', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Username and password must be strings' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' });
    }

    const existing = await User.findOne({ username: username.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({
      username: username.toLowerCase().trim(),
      password_hash: hash,
      role: 'player',
    });

    res.status(201).json({
      id: user._id.toString(),
      username: user.username,
      role: user.role,
      avatar_url: user.avatar_url,
      created_at: user.createdAt,
    });
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Username already exists' });
    }
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token required' });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    const user = await User.findById(decoded.id).select('username role avatar_url team_id');

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    const teamId = user.team_id ? user.team_id.toString() : null;

    const accessToken = jwt.sign(
      { id: user._id.toString(), username: user.username, role: user.role, teamId },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    const newRefreshToken = jwt.sign(
      { id: user._id.toString(), username: user.username, role: user.role, teamId },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      accessToken,
      refreshToken: newRefreshToken,
      user: {
        id: user._id.toString(),
        username: user.username,
        role: user.role,
        avatar_url: user.avatar_url,
      },
    });
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }
    console.error('Refresh error:', err);
    res.status(500).json({ error: 'Token refresh failed' });
  }
});

router.post('/change-password', authenticateToken, async (req, res) => {
  const { current_password, new_password, confirm_password } = req.body;

  if (!current_password || !new_password || !confirm_password) {
    return res.status(400).json({ error: 'Current password, new password, and confirm password are required' });
  }

  if (typeof current_password !== 'string' || typeof new_password !== 'string' || typeof confirm_password !== 'string') {
    return res.status(400).json({ error: 'All password fields must be strings' });
  }

  if (new_password !== confirm_password) {
    return res.status(400).json({ error: 'New password and confirm password do not match' });
  }

  if (new_password.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }

  try {
    const user = await User.findById(req.user.id).select('password_hash');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const valid = await bcrypt.compare(current_password, user.password_hash);
    if (!valid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    user.password_hash = await bcrypt.hash(new_password, 10);
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

export default router;
