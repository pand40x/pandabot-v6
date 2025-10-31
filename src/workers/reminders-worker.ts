import { connectDB } from '../core/db';
import { agenda } from '../core/scheduler';
import { Reminder } from '../modules/reminders/model';
import { Bot } from 'grammy';
import { logger } from '../core/logger';

// Create bot instance for sending messages
const bot = new Bot(process.env.BOT_TOKEN!);

async function setupReminderJob() {
  // Define the reminder job
  agenda.define('send-reminder', async (job) => {
    const { reminderId, userId, message } = job.attrs.data as {
      reminderId: string;
      userId: number;
      message: string;
    };
    
    try {
      // Update reminder status to completed
      await Reminder.findByIdAndUpdate(reminderId, {
        status: 'completed',
        completedAt: new Date()
      });
      
      // Send reminder message to user
      await bot.api.sendMessage(
        userId,
        `🔔 HATIRLATICI\n━━━━━━━━━━━━━━━━━━━━\n${message}\n━━━━━━━━━━━━━━━━━━━━`
      );
      
      logger.info(`Reminder sent to user ${userId}: ${message}`);
    } catch (error) {
      logger.error(`Failed to send reminder ${reminderId}:`, error);
      
      // If user blocked the bot, mark as cancelled
      if (error instanceof Error && error.message.includes('chat not found')) {
        await Reminder.findByIdAndUpdate(reminderId, {
          status: 'cancelled'
        });
      }
    }
  });
}

async function startRemindersWorker() {
  try {
    // Connect to database
    await connectDB();
    
    // Setup agenda job
    await setupReminderJob();
    
    // Start agenda
    await agenda.start();
    
    logger.info('✅ Reminders worker started successfully');
    
    // Handle graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('Shutting down reminders worker...');
      await agenda.stop();
      process.exit(0);
    });
    
    process.on('SIGINT', async () => {
      logger.info('Shutting down reminders worker...');
      await agenda.stop();
      process.exit(0);
    });
  } catch (error) {
    logger.error('Failed to start reminders worker:', error);
    process.exit(1);
  }
}

// Start worker if running directly
if (require.main === module) {
  startRemindersWorker();
}

export { startRemindersWorker };
