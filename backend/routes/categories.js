import { Router } from 'express';
import { Category } from '../models/index.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

router.get('/', async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 }).lean();
    const result = categories.map(c => ({ ...c, id: c._id.toString() }));
    res.json(result);
  } catch (err) {
    console.error('List categories error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  const { name, description } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }
  try {
    const existing = await Category.findOne({ name: name.trim() });
    if (existing) {
      return res.status(409).json({ error: 'Category already exists' });
    }
    const category = await Category.create({ name: name.trim(), description: description || '' });
    res.status(201).json({ ...category.toObject(), id: category._id.toString() });
  } catch (err) {
    console.error('Create category error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    const update = {};
    if (name !== undefined) update.name = name.trim();
    if (description !== undefined) update.description = description;
    if (Object.keys(update).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    const category = await Category.findByIdAndUpdate(id, update, { new: true, lean: true });
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.json({ ...category, id: category._id.toString() });
  } catch (err) {
    console.error('Update category error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findByIdAndDelete(id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.json({ message: 'Category deleted', category: { id: category._id, name: category.name } });
  } catch (err) {
    console.error('Delete category error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
