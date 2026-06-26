import { Router } from 'express';
import { Coin } from '../models/index.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

router.post('/', requireAdmin, async (req, res) => {
  const { user_id, amount } = req.body;

  if (!user_id || amount === undefined || amount === null) {
    return res.status(400).json({ error: 'user_id and amount are required' });
  }

  try {
    const coin = await Coin.findOneAndUpdate(
      { user_id },
      { $inc: { amount } },
      { upsert: true, new: true }
    );

    res.json(coin);
  } catch (err) {
    console.error('Set coins error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const coin = await Coin.findOne({ user_id: userId });

    if (!coin) {
      return res.json({ user_id: userId, amount: 0 });
    }

    res.json(coin);
  } catch (err) {
    console.error('Get coins error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
