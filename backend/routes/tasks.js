import { Router } from 'express';
import { DailyTask, DailyTaskCompletion, Achievement, Coin } from '../models/index.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { broadcastTask } from '../socket.js';

const router = Router();

router.use(authenticateToken);

router.get('/current', async (req, res) => {
  try {
    const task = await DailyTask.findOne({ is_active: true }).sort({ createdAt: -1 });

    if (!task) {
      return res.json(null);
    }

    if (req.user.role === 'player') {
      const today = new Date().toISOString().split('T')[0];
      const completion = await DailyTaskCompletion.findOne({
        user_id: req.user.id,
        task_id: task._id,
        date: today,
      });

      task._doc.completed = completion ? completion.completed : false;
    }

    res.json(task);
  } catch (err) {
    console.error('Get current task error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  const { description, points_reward, coins_reward } = req.body;

  if (!description) {
    return res.status(400).json({ error: 'Description is required' });
  }

  try {
    await DailyTask.updateMany({ is_active: true }, { is_active: false });

    const task = await DailyTask.create({
      description,
      points_reward: points_reward || 0,
      coins_reward: coins_reward || 0,
      is_active: true,
    });

    broadcastTask(task);

    res.status(201).json(task);
  } catch (err) {
    console.error('Create task error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/complete', async (req, res) => {
  const { task_id } = req.body;

  if (!task_id) {
    return res.status(400).json({ error: 'task_id is required' });
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

    if (!wasCompleted && completion.completed) {
      if (task.points_reward > 0) {
        await Achievement.create({
          user_id: req.user.id,
          title: `Completed: ${task.description}`,
          description: 'Daily task reward',
          category: 'daily_task',
          points: task.points_reward,
          date_earned: new Date(),
        });
      }
      if (task.coins_reward > 0) {
        await Coin.findOneAndUpdate(
          { user_id: req.user.id },
          { $inc: { amount: task.coins_reward } },
          { upsert: true }
        );
      }
    }

    res.json(completion);
  } catch (err) {
    console.error('Complete task error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/history', requireAdmin, async (req, res) => {
  try {
    const { player_id, from_date, to_date } = req.query;
    const filter = {};

    if (player_id) {
      filter.user_id = player_id;
    }
    if (from_date) {
      filter.date = { ...filter.date, $gte: from_date };
    }
    if (to_date) {
      filter.date = { ...filter.date, $lte: to_date };
    }

    const completions = await DailyTaskCompletion.find(filter)
      .populate('user_id', 'username display_name')
      .populate('task_id')
      .sort({ date: -1, createdAt: -1 });

    res.json(completions);
  } catch (err) {
    console.error('Task history error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
