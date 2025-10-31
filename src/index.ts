import { config } from './config/env';
import { logger, logSystemEvent } from './core/logger';
import { db } from './core/db';
import { initializeBot } from './bot';
import { initAgenda, closeAgenda } from './core/scheduler';

async function bootstrap() {
  try {
    logger.info('🚀 Starting PandaBot v6...');
    
    // 1. Connect to database
    logger.info('📦 Connecting to MongoDB...');
    await db.connect();
    
    // 2. Initialize scheduler
    logger.info('⏰ Initializing job scheduler...');
    await initAgenda();
    
    // 3. Initialize and start bot
    logger.info('🤖 Initializing bot...');
    const bot = await initializeBot();
    
    // 4. Start bot
    await bot.start({
      onStart: (me) => {
        logSystemEvent('bot_started', {
          botName: me.first_name,
          botUsername: me.username,
          version: process.env.npm_package_version || '1.0.0'
        });
      }
    });
    
    logger.info(`
╔═══════════════════════════════╗
║     PandaBot v6 is running!    ║
║                               ║
║  Mode: ${config.mode.padEnd(21)} ║
║  Database: Connected ✓        ║
║  Scheduler: Active ✓          ║
╚═══════════════════════════════╝
    `);
    
  } catch (error) {
    logger.error('❌ Failed to start PandaBot:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  await shutdown();
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  await shutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

async function shutdown() {
  try {
    logger.info('Closing database connections...');
    await db.disconnect();
    
    logger.info('Closing job scheduler...');
    await closeAgenda();
    
    logger.info('Shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
}

// Start the application
bootstrap();
