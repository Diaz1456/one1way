import cron from 'node-cron';
import { DailyTaskCompletion } from './models/index.js';

export function startScheduler() {
  /* Reset daily task completions every day at 6:00 AM server time */
  cron.schedule('0 6 * * *', async () => {
    try {
      const result = await DailyTaskCompletion.deleteMany({});
      console.log(`[Scheduler] Reset ${result.deletedCount} daily task completions at 6:00 AM`);
    } catch (err) {
      console.error('[Scheduler] Error resetting daily tasks:', err);
    }
  });

  console.log('[Scheduler] Daily task reset scheduled for 6:00 AM');
}
