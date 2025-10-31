import Agenda, { Job } from 'agenda';
import { config } from '../config/env';
import { logger } from './logger';

// Singleton instance
let agendaInstance: Agenda | null = null;

export const agenda = agendaInstance;

export const getAgenda = (): Agenda => {
  if (!agendaInstance) {
    throw new Error('Agenda not initialized. Call initAgenda() first.');
  }
  return agendaInstance;
};

export const initAgenda = async (): Promise<Agenda> => {
  if (agendaInstance) {
    logger.info('Agenda already initialized');
    return agendaInstance;
  }
  
  try {
    agendaInstance = new Agenda({
      db: {
        address: config.database.uri,
        collection: 'jobs'
      },
      processEvery: '30 seconds',
      maxConcurrency: 20,
      defaultConcurrency: 5,
      // Use a separate process for job processing in production
      // processEvery: config.workers.jobCheckInterval + ' seconds',
    });
    
    // Define jobs
    
    // Reminder job
    agendaInstance.define('send-reminder', async (job: Job) => {
      const { userId, message, reminderId } = job.attrs.data as any;
      logger.info('Processing reminder job', { reminderId, userId });
      
      try {
        // Import bot instance dynamically to avoid circular dependency
        const { bot } = await import('../bot');
        
        await bot.api.sendMessage(
          userId,
          `🔔 Hatırlatma\n━━━━━━━━━━━━━━━━━━━━\n${message}\n━━━━━━━━━━━━━━━━━━━━`
        );
        
        // Update reminder status to completed
        const { Reminder } = await import('../modules/reminders/model');
        await Reminder.findByIdAndUpdate(reminderId, {
          status: 'completed',
          completedAt: new Date()
        });
        
        logger.info('Reminder sent successfully', { reminderId, userId });
      } catch (error) {
        logger.error('Failed to send reminder', { error, reminderId, userId });
        throw error;
      }
    });
    
    // Alert check job (runs every minute)
    agendaInstance.define('check-price-alerts', async (job: Job) => {
      logger.info('Checking price alerts...');
      
      try {
        const { Alert } = await import('../modules/alerts/model');
        const { cmcClient } = await import('../services/coinmarketcap/client');
        
        const activeAlerts = await Alert.find({ status: 'active' });
        logger.info(`Found ${activeAlerts.length} active alerts`);
        
        // Group alerts by symbol to minimize API calls
        const alertsBySymbol = activeAlerts.reduce((acc: Record<string, any[]>, alert) => {
          if (!acc[alert.symbol]) acc[alert.symbol] = [];
          acc[alert.symbol].push(alert);
          return acc;
        }, {});
        
        // Check each symbol
        for (const [symbol, alerts] of Object.entries(alertsBySymbol)) {
          try {
            const quote = await cmcClient.getLatestQuote(symbol);
            const currentPrice = quote.price;
            
            for (const alert of alerts) {
              const changePercent = ((currentPrice - alert.basePrice) / alert.basePrice) * 100;
              
              // Check if threshold triggered
              const shouldTrigger = 
                (alert.thresholdPct > 0 && changePercent >= alert.thresholdPct) ||
                (alert.thresholdPct < 0 && changePercent <= alert.thresholdPct);
              
              // Check cooldown (30 minutes)
              const cooldownPassed = 
                !alert.lastTriggered || 
                (Date.now() - alert.lastTriggered.getTime()) > 30 * 60 * 1000;
              
              if (shouldTrigger && cooldownPassed) {
                // Trigger alert
                const { bot } = await import('../bot');
                
                await bot.api.sendMessage(
                  alert.userId,
                  `🔔 FİYAT ALARMI\n━━━━━━━━━━━━━━━━━━━━\n` +
                  `🪙 ${alert.symbol}\n` +
                  `💰 Eski Fiyat: $${alert.basePrice.toFixed(2)}\n` +
                  `💰 Yeni Fiyat: $${currentPrice.toFixed(2)}\n` +
                  `📊 Değişim: ${changePercent > 0 ? '+' : ''}${changePercent.toFixed(2)}%\n` +
                  `⏰ Zaman: ${new Date().toLocaleString('tr-TR')}\n` +
                  `━━━━━━━━━━━━━━━━━━━━`
                );
                
                // Update alert
                alert.lastTriggered = new Date();
                await alert.save();
                
                logger.info('Alert triggered', { 
                  alertId: alert._id, 
                  symbol, 
                  userId: alert.userId,
                  changePercent 
                });
              }
            }
          } catch (error) {
            logger.error(`Error checking alerts for ${symbol}:`, error);
          }
        }
      } catch (error) {
        logger.error('Error in check-price-alerts job:', error);
        throw error;
      }
    });
    
    // CMC API key reset job (daily at midnight)
    agendaInstance.define('reset-cmc-keys', async (job: Job) => {
      logger.info('Resetting CMC API keys...');
      
      try {
        const { cmcKeyManager } = await import('../services/coinmarketcap/key-manager');
        cmcKeyManager.resetDaily();
        
        // Notify admin
        const { bot } = await import('../bot');
        const stats = cmcKeyManager.getStats();
        
        const message = `🔑 CMC API Key'leri günlük reset edildi\n📊 İstatistikler:\n` +
          stats.map(stat => `  Key ${stat.keyNumber}: ${stat.requestsUsed}/${stat.requestsLimit}`).join('\n');
        
        await bot.api.sendMessage(config.bot.adminId, message);
        logger.info('CMC API keys reset completed');
      } catch (error) {
        logger.error('Error resetting CMC API keys:', error);
        throw error;
      }
    });
    
    // Daily summary job (daily at midnight)
    agendaInstance.define('send-daily-summary', async (job: Job) => {
      logger.info('Generating daily summary...');
      
      try {
        const { User } = await import('../modules/users/model');
        const { Note } = await import('../modules/notes/model');
        const { Reminder } = await import('../modules/reminders/model');
        const { Alert } = await import('../modules/alerts/model');
        const { Watchlist } = await import('../modules/watchlists/model');
        const { bot } = await import('../bot');
        
        const now = new Date();
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        // Get metrics
        const [
          totalUsers,
          newUsersToday,
          activeUsers,
          blockedUsers,
          totalNotes,
          activeReminders,
          completedReminders,
          activeAlerts,
          totalWatchlists
        ] = await Promise.all([
          User.countDocuments(),
          User.countDocuments({ firstSeen: { $gte: startOfDay } }),
          User.countDocuments({ lastActive: { $gte: yesterday } }),
          User.countDocuments({ isBlocked: true }),
          Note.countDocuments(),
          Reminder.countDocuments({ status: 'active' }),
          Reminder.countDocuments({ status: 'completed', completedAt: { $gte: startOfDay } }),
          Alert.countDocuments({ status: 'active' }),
          Watchlist.countDocuments()
        ]);
        
        // Calculate uptime
        const uptime = process.uptime();
        const uptimeStr = `${Math.floor(uptime / 86400)}d ${Math.floor((uptime % 86400) / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`;
        
        const message = 
          `📊 Günlük Özet - ${now.toLocaleDateString('tr-TR')}\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `👥 Kullanıcılar\n` +
          `  🆕 Yeni: ${newUsersToday}\n` +
          `  👀 Aktif: ${activeUsers}\n` +
          `  🚫 Engellenen: ${blockedUsers}\n` +
          `  📊 Toplam: ${totalUsers}\n` +
          `\n` +
          `⏰ Hatırlatmalar\n` +
          `  📅 Aktif: ${activeReminders}\n` +
          `  ✅ Tamamlanan (bugün): ${completedReminders}\n` +
          `\n` +
          `🔔 Alarmlar\n` +
          `  🟢 Aktif: ${activeAlerts}\n` +
          `\n` +
          `📝 Veriler\n` +
          `  Notlar: ${totalNotes}\n` +
          `  İzleme Listeleri: ${totalWatchlists}\n` +
          `\n` +
          `⚙️ Sistem\n` +
          `  📈 Uptime: ${uptimeStr}\n` +
          `  🖥️ Bellek: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
        
        await bot.api.sendMessage(config.bot.adminId, message);
        logger.info('Daily summary sent to admin');
      } catch (error) {
        logger.error('Error generating daily summary:', error);
        throw error;
      }
    });
    
    await agendaInstance.start();
    logger.info('✅ Agenda scheduler started');
    
    // Schedule recurring jobs
    await agendaInstance.every(config.workers.alertCheckInterval + ' seconds', 'check-price-alerts');
    await agendaInstance.every('0 0 * * *', 'reset-cmc-keys'); // Daily at midnight
    await agendaInstance.every('0 0 * * *', 'send-daily-summary'); // Daily at midnight
    
    return agendaInstance;
  } catch (error) {
    logger.error('Failed to initialize Agenda:', error);
    throw error;
  }
};

export const scheduleReminder = async (
  when: Date,
  userId: number,
  message: string,
  reminderId: string
): Promise<Job> => {
  const agenda = getAgenda();
  
  const job = await agenda.schedule(when, 'send-reminder', {
    userId,
    message,
    reminderId
  });
  
  logger.info('Reminder scheduled', { reminderId, when, userId });
  return job;
};

export const closeAgenda = async (): Promise<void> => {
  if (agendaInstance) {
    await agendaInstance.stop();
    agendaInstance = null;
    logger.info('Agenda scheduler stopped');
  }
};
