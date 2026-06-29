import { Router } from 'express';
import { CategoryCash } from '../models/index.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

router.get('/', async (req, res) => {
  try {
    const mappings = await CategoryCash.find().sort({ category: 1 }).lean();
    res.json(mappings.map(m => ({ ...m, id: m._id.toString() })));
  } catch (err) {
    console.error('List category cash error:', err);
    res.status(500).json({ error: 'Failed to load category cash values' });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    const { category, cash } = req.body;
    if (!category || !category.trim()) {
      return res.status(400).json({ error: 'Category name is required' });
    }
    const cashVal = typeof cash === 'number' ? cash : (parseFloat(cash) || 0);
    const mapping = await CategoryCash.findOneAndUpdate(
      { category: category.trim() },
      { cash: Math.max(0, cashVal) },
      { upsert: true, new: true, lean: true }
    );
    res.json({ ...mapping, id: mapping._id.toString() });
  } catch (err) {
    console.error('Save category cash error:', err);
    res.status(500).json({ error: 'Failed to save category cash value' });
  }
});

router.delete('/:category', requireAdmin, async (req, res) => {
  try {
    const { category } = req.params;
    await CategoryCash.findOneAndDelete({ category });
    res.json({ message: 'Category cash mapping deleted' });
  } catch (err) {
    console.error('Delete category cash error:', err);
    res.status(500).json({ error: 'Failed to delete category cash mapping' });
  }
});

export default router;
