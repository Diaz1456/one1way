import bcrypt from 'bcryptjs';
import { connectDB } from './db.js';
import { User, Team, DailyTask, GlobalCountdown } from './models/index.js';

async function seed() {
  await connectDB();

  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'commander48';
  const adminHash = await bcrypt.hash(password, 10);

  try {
    const existing = await User.findOne({ username });
    if (existing) {
      existing.password_hash = adminHash;
      existing.role = 'admin';
      await existing.save();
      console.log('Admin password updated:', { id: existing._id, username: existing.username });
    } else {
      const admin = await User.create({
        username,
        password_hash: adminHash,
        role: 'admin',
      });
      console.log('Admin user created:', { id: admin._id, username: admin.username, role: admin.role });
    }

    const teamCount = await Team.countDocuments();
    if (teamCount === 0) {
      const teamData = [
        { name: 'Alpha Squad', color: '#ef4444', cash: 5000 },
        { name: 'Bravo Crew', color: '#3b82f6', cash: 3200 },
        { name: 'Delta Force', color: '#22c55e', cash: 1800 },
      ];

      const teams = await Team.insertMany(teamData);
      for (const t of teams) {
        console.log('Team created:', { id: t._id, name: t.name });
      }

      const playerHash = await bcrypt.hash('password123', 10);

      const players = [
        { username: 'player1', teamIdx: 0 },
        { username: 'player2', teamIdx: 1 },
        { username: 'player3', teamIdx: 2 },
        { username: 'player4', teamIdx: 0 },
        { username: 'player5', teamIdx: 1 },
      ];

      for (const p of players) {
        const exists = await User.findOne({ username: p.username });
        if (!exists) {
          const user = await User.create({
            username: p.username,
            password_hash: playerHash,
            role: 'player',
            team_id: teams[p.teamIdx]._id,
          });
          console.log('Player created:', { id: user._id, username: user.username, role: user.role });
        }
      }
    } else {
      console.log('Teams already exist, skipping team/player seed');
    }

    const taskCount = await DailyTask.countDocuments();
    if (taskCount === 0) {
      await DailyTask.create({
        description: 'Complete your daily training',
        points_reward: 50,
        coins_reward: 10,
        is_active: true,
      });
      console.log('Sample daily task created');
    }

    const countdownCount = await GlobalCountdown.countDocuments();
    if (countdownCount === 0) {
      await GlobalCountdown.create({
        end_time: new Date(Date.now() + 10 * 60 * 1000),
        duration_seconds: 600,
        is_active: false,
      });
      console.log('Global countdown initialized');
    }

    console.log('Seed completed successfully');
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  }
}

seed();
