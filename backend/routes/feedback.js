import { Router } from 'express';
import mongoose from 'mongoose';
import { Feedback, User } from '../models/index.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { broadcastFeedback } from '../socket.js';

const router = Router();

router.use(authenticateToken);

router.get('/', requireAdmin, async (req, res) => {
  try {
    const feedbacks = await Feedback.find()
      .populate('sender_user_id', 'username avatar_url')
      .sort({ createdAt: -1 });

    res.json(feedbacks);
  } catch (err) {
    console.error('List feedback error:', err);
    res.status(500).json({ error: 'Failed to list feedback' });
  }
});

router.post('/', async (req, res) => {
  const { message } = req.body;

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    const feedback = await Feedback.create({
      sender_user_id: req.user.id,
      message: message.trim(),
    });

    const user = await User.findById(req.user.id).select('username avatar_url');

    broadcastFeedback({
      ...feedback.toObject(),
      sender_id: user._id,
      sender_username: user.username,
      sender_avatar_url: user.avatar_url,
    });

    res.status(201).json(feedback);
  } catch (err) {
    console.error('Create feedback error:', err);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid feedback id' });
    }

    const feedback = await Feedback.findByIdAndDelete(id);

    if (!feedback) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    res.json({ message: 'Feedback deleted' });
  } catch (err) {
    console.error('Delete feedback error:', err);
    res.status(500).json({ error: 'Failed to delete feedback' });
  }
});

export default router;
