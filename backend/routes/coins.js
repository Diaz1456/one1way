import { Router } from 'express';
import mongoose from 'mongoose';
import { Coin } from '../models/index.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

router.post('/', requireAdmin, async (req, res) => {
  const { user_id, amount } = req.body;

  if (!user_id || amount === undefined || amount === null) {
    return res.status(400).json({ error: 'user_id and amount are required' });
  }

  if (!mongoose.Types.ObjectId.isValid(user_id)) {
    return res.status(400).json({ error: 'Invalid user_id format' });
  }

  const amountNum = parseInt(amount, 10);
  if (isNaN(amountNum)) {
    return res.status(400).json({ error: 'Amount must be a number' });
  }

  try {
    const coin = await Coin.findOneAndUpdate(
      { user_id },
      { $inc: { amount: amountNum } },
      { upsert: true, new: true }
    );

    res.json(coin);
  } catch (err) {
    console.error('Set coins error:', err);
    res.status(500).json({ error: 'Failed to update coins' });
  }
});

router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid user_id' });
    }

    const coin = await Coin.findOne({ user_id: userId });

    if (!coin) {
      return res.json({ user_id: userId, amount: 0 });
    }

    res.json(coin);
  } catch (err) {
    console.error('Get coins error:', err);
    res.status(500).json({ error: 'Failed to get coins' });
  }
});

export default router;
