import bcrypt from 'bcryptjs';
import { connectDB } from './db.js';
import { User, Team, Achievement, Coin, DailyTask, DailyTaskCompletion, Note, Feedback, PresenceLog, GlobalCountdown, StockEvent } from './models/index.js';

async function seed() {
  await connectDB();

  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'commander48';
  const adminHash = await bcrypt.hash(password, 10);

  try {
    await PresenceLog.deleteMany({});
    await Feedback.deleteMany({});
    await Note.deleteMany({});
    await StockEvent.deleteMany({});
    await GlobalCountdown.deleteMany({});
    await DailyTaskCompletion.deleteMany({});
    await DailyTask.deleteMany({});
    await Coin.deleteMany({});
    await Achievement.deleteMany({});
    await User.deleteMany({});
    await Team.deleteMany({});
    console.log('Cleared all collections');

    const admin = await User.create({
      username,
      password_hash: adminHash,
      role: 'admin',
      display_name: 'Administrator',
    });
    console.log('Admin user created:', { id: admin._id, username: admin.username, role: admin.role });

    const teamData = [
      { name: 'Alpha Squad', color: '#ef4444' },
      { name: 'Bravo Crew', color: '#3b82f6' },
      { name: 'Delta Force', color: '#22c55e' },
    ];

    const teams = await Team.insertMany(teamData);
    for (const t of teams) {
      console.log('Team created:', { id: t._id, name: t.name });
    }

    const playerHash = await bcrypt.hash('password123', 10);

    const players = [
      { username: 'player1', display_name: 'Player One', teamIdx: 0 },
      { username: 'player2', display_name: 'Player Two', teamIdx: 1 },
      { username: 'player3', display_name: 'Player Three', teamIdx: 2 },
      { username: 'player4', display_name: 'Player Four', teamIdx: 0 },
      { username: 'player5', display_name: 'Player Five', teamIdx: 1 },
    ];

    for (const p of players) {
      const user = await User.create({
        username: p.username,
        password_hash: playerHash,
        role: 'player',
        display_name: p.display_name,
        team_id: teams[p.teamIdx]._id,
      });
      console.log('Player created:', { id: user._id, username: user.username, role: user.role });
    }

    await DailyTask.create({
      description: 'Complete your daily training',
      points_reward: 50,
      coins_reward: 10,
      is_active: true,
    });
    console.log('Sample daily task created');

    await GlobalCountdown.create({
      end_time: new Date(Date.now() + 10 * 60 * 1000),
      duration_seconds: 600,
      is_active: false,
    });
    console.log('Global countdown initialized');

    console.log('Seed completed successfully');
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  }
}

seed();
