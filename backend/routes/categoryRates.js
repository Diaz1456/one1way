import { Router } from 'express';
import { CategoryRate } from '../models/index.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

router.get('/', async (req, res) => {
  try {
    const rates = await CategoryRate.find().sort({ category: 1 }).lean();
    res.json(rates.map(r => ({ ...r, id: r._id.toString() })));
  } catch (err) {
    console.error('List category rates error:', err);
    res.status(500).json({ error: 'Failed to load category rates' });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    const { category, rate } = req.body;
    if (!category || !category.trim()) {
      return res.status(400).json({ error: 'Category name is required' });
    }
    const rateVal = typeof rate === 'number' ? rate : (parseFloat(rate) || 0);
    const record = await CategoryRate.findOneAndUpdate(
      { category: category.trim() },
      { rate: Math.max(0, rateVal) },
      { upsert: true, new: true, lean: true }
    );
    res.json({ ...record, id: record._id.toString() });
  } catch (err) {
    console.error('Save category rate error:', err);
    res.status(500).json({ error: 'Failed to save category rate' });
  }
});

router.delete('/:category', requireAdmin, async (req, res) => {
  try {
    const { category } = req.params;
    await CategoryRate.findOneAndDelete({ category });
    res.json({ message: 'Category rate deleted' });
  } catch (err) {
    console.error('Delete category rate error:', err);
    res.status(500).json({ error: 'Failed to delete category rate' });
  }
});

export default router;
