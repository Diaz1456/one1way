import { Router } from 'express';
import mongoose from 'mongoose';
import { DailyTask, DailyTaskCompletion } from '../models/index.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { broadcastTask } from '../socket.js';
import { requireValidObjectId } from '../middleware/validate.js';

const router = Router();

router.use(authenticateToken);

/* List all tasks (admin) */
router.get('/', requireAdmin, async (req, res) => {
  try {
    const tasks = await DailyTask.find().sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) {
    console.error('List tasks error:', err);
    res.status(500).json({ error: 'Failed to list tasks' });
  }
});

/* Get current active tasks with completion status for today */
router.get('/current', async (req, res) => {
  try {
    const tasks = await DailyTask.find({ is_active: true }).sort({ createdAt: -1 });

    if (req.user.role === 'player') {
      const today = new Date().toISOString().split('T')[0];
      const completions = await DailyTaskCompletion.find({
        user_id: req.user.id,
        date: today,
      });
      const completionMap = {};
      completions.forEach(c => { completionMap[c.task_id.toString()] = c.completed; });

      const result = tasks.map(t => {
        const obj = t.toObject();
        obj.completed = completionMap[t._id.toString()] || false;
        return obj;
      });
      return res.json(result);
    }

    res.json(tasks);
  } catch (err) {
    console.error('Get current tasks error:', err);
    res.status(500).json({ error: 'Failed to get current tasks' });
  }
});

/* Create a new daily task (admin) */
router.post('/', requireAdmin, async (req, res) => {
  const { description, points_reward, coins_reward } = req.body;

  if (!description || typeof description !== 'string' || !description.trim()) {
    return res.status(400).json({ error: 'Description is required' });
  }

  try {
    const task = await DailyTask.create({
      description: description.trim(),
      points_reward: parseInt(points_reward, 10) || 0,
      coins_reward: parseInt(coins_reward, 10) || 0,
      is_active: true,
    });

    broadcastTask(task);

    res.status(201).json(task);
  } catch (err) {
    console.error('Create task error:', err);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

/* Update a task (admin) */
router.put('/:id', requireAdmin, requireValidObjectId('id'), async (req, res) => {
  const { description, points_reward, coins_reward, is_active } = req.body;

  try {
    const update = {};
    if (description !== undefined) update.description = description.trim();
    if (points_reward !== undefined) update.points_reward = parseInt(points_reward, 10);
    if (coins_reward !== undefined) update.coins_reward = parseInt(coins_reward, 10);
    if (is_active !== undefined) update.is_active = is_active;

    const task = await DailyTask.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    broadcastTask(task);
    res.json(task);
  } catch (err) {
    console.error('Update task error:', err);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

/* Delete a task (admin) */
router.delete('/:id', requireAdmin, requireValidObjectId('id'), async (req, res) => {
  try {
    const task = await DailyTask.findByIdAndDelete(req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    await DailyTaskCompletion.deleteMany({ task_id: req.params.id });
    res.json({ message: 'Task deleted' });
  } catch (err) {
    console.error('Delete task error:', err);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

/* Toggle completion for a task */
router.post('/complete', async (req, res) => {
  const { task_id } = req.body;

  if (!task_id || !mongoose.Types.ObjectId.isValid(task_id)) {
    return res.status(400).json({ error: 'Valid task_id is required' });
  }

  try {
    const task = await DailyTask.findOne({ _id: task_id, is_active: true });

    if (!task) {
      return res.status(404).json({ error: 'Active task not found' });
    }

    const today = new Date().toISOString().split('T')[0];

    let completion = await DailyTaskCompletion.findOne({
      user_id: req.user.id,
      task_id,
      date: today,
    });

    let wasCompleted = false;

    if (completion) {
      wasCompleted = completion.completed;
      completion.completed = !wasCompleted;
      await completion.save();
    } else {
      completion = await DailyTaskCompletion.create({
        user_id: req.user.id,
        task_id,
        date: today,
        completed: true,
      });
    }

    res.json(completion);
  } catch (err) {
    console.error('Complete task error:', err);
    res.status(500).json({ error: 'Failed to complete task' });
  }
});

/* Task completion history (admin) */
router.get('/history', requireAdmin, async (req, res) => {
  try {
    const { player_id, from_date, to_date } = req.query;
    const filter = {};

    if (player_id) {
      if (!mongoose.Types.ObjectId.isValid(player_id)) {
        return res.status(400).json({ error: 'Invalid player_id in query' });
      }
      filter.user_id = player_id;
    }
    if (from_date) {
      filter.date = { ...filter.date, $gte: from_date };
    }
    if (to_date) {
      filter.date = { ...filter.date, $lte: to_date };
    }

    const completions = await DailyTaskCompletion.find(filter)
      .populate('user_id', 'username')
      .populate('task_id')
      .sort({ date: -1, createdAt: -1 });

    res.json(completions);
  } catch (err) {
    console.error('Task history error:', err);
    res.status(500).json({ error: 'Failed to load task history' });
  }
});

export default router;
