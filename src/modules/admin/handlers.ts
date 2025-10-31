import { Bot } from 'grammy';
import type { Context } from 'grammy';
import { User } from '../users/model';
import { Note } from '../notes/model';
import { Reminder } from '../reminders/model';
import { Alert } from '../alerts/model';
import { Watchlist } from '../watchlists/model';
import { config } from '../../config/env';
import { logger as winstonLogger, getRecentLogs } from '../../core/logger';

function isAdmin(userId: number): boolean {
  return userId === config.bot.adminId;
}

// Helper function to get system stats
async function getSystemStats() {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const [
    totalUsers,
    activeUsers,
    blockedUsers,
    newUsersToday,
    activeReminders,
    activeAlerts,
    totalNotes,
    totalWatchlists
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ lastActive: { $gte: yesterday } }),
    User.countDocuments({ isBlocked: true }),
    User.countDocuments({ firstSeen: { $gte: startOfDay } }),
    Reminder.countDocuments({ status: 'active' }),
    Alert.countDocuments({ status: 'active' }),
    Note.countDocuments(),
    Watchlist.countDocuments()
  ]);
  
  return {
    users: {
      total: totalUsers,
      active: activeUsers,
      blocked: blockedUsers,
      newToday: newUsersToday
    },
    reminders: {
      active: activeReminders
    },
    alerts: {
      active: activeAlerts
    },
    notes: {
      total: totalNotes
    },
    watchlists: {
      total: totalWatchlists
    }
  };
}

export function registerAdminHandlers(bot: Bot) {
  // /stats command
  bot.command('stats', async (ctx: Context) => {
    if (!isAdmin(ctx.from!.id)) {
      await ctx.reply('❌ Bu komutu kullanma yetkiniz yok.');
      return;
    }
    
    try {
      const stats = await getSystemStats();
      const uptime = process.uptime();
      const uptimeStr = `${Math.floor(uptime / 86400)}d ${Math.floor((uptime % 86400) / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`;
      
      const message =
        `📊 Sistem İstatistikleri\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `👥 Kullanıcılar\n` +
        `  Toplam: ${stats.users.total}\n` +
        `  Aktif (24s): ${stats.users.active}\n` +
        `  Engelli: ${stats.users.blocked}\n` +
        `  Yeni (bugün): ${stats.users.newToday}\n` +
        `\n` +
        `⏰ Hatırlatmalar\n` +
        `  Aktif: ${stats.reminders.active}\n` +
        `\n` +
        `🔔 Alarmlar\n` +
        `  Aktif: ${stats.alerts.active}\n` +
        `\n` +
        `📝 Veriler\n` +
        `  Notlar: ${stats.notes.total}\n` +
        `  İzleme Listeleri: ${stats.watchlists.total}\n` +
        `\n` +
        `⚙️ Sistem\n` +
        `  Uptime: ${uptimeStr}\n` +
        `  Bellek: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
      
      await ctx.reply(message);
    } catch (error) {
      winstonLogger.error('Error fetching stats:', error);
      await ctx.reply('❌ İstatistikler alınamadı.');
    }
  });
  
  // /users command
  bot.command('users', async (ctx: Context) => {
    if (!isAdmin(ctx.from!.id)) {
      await ctx.reply('❌ Bu komutu kullanma yetkiniz yok.');
      return;
    }
    
    const page = parseInt(ctx.match as string) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;
    
    try {
      const users = await User.find()
        .sort({ lastActive: -1 })
        .skip(skip)
        .limit(limit);
      
      const totalUsers = await User.countDocuments();
      const totalPages = Math.ceil(totalUsers / limit);
      
      if (users.length === 0) {
        await ctx.reply('📭 Kullanıcı bulunamadı.');
        return;
      }
      
      let message = `👥 Kullanıcılar (Sayfa ${page}/${totalPages})\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      
      users.forEach((user, index) => {
        const username = user.username ? `@${user.username}` : 'Yok';
        const lastActive = user.lastActive 
          ? `${Math.floor((Date.now() - user.lastActive.getTime()) / (1000 * 60 * 60 * 24))} gün önce`
          : 'Hiç';
        
        message += `${index + 1}. 👤 ${user.firstName} (${username})\n`;
        message += `   🆔 ID: ${user.telegramId}\n`;
        message += `   📅 Son Aktivite: ${lastActive}\n`;
        message += `   📊 Komutlar: ${user.totalCommands}\n`;
        
        if (user.isBlocked) {
          message += `   ⚠️ Engelli\n`;
        }
        
        message += '\n';
      });
      
      message += `━━━━━━━━━━━━━━━━━━━━\n`;
      message += `💡 Ban: /ban <ID> | Unban: /unban <ID>`;
      
      await ctx.reply(message);
    } catch (error) {
      winstonLogger.error('Error fetching users:', error);
      await ctx.reply('❌ Kullanıcılar alınamadı.');
    }
  });
  
  // /ban command
  bot.command('ban', async (ctx: Context) => {
    if (!isAdmin(ctx.from!.id)) {
      await ctx.reply('❌ Bu komutu kullanma yetkiniz yok.');
      return;
    }
    
    const userId = parseInt(ctx.match as string);
    
    if (!userId) {
      await ctx.reply('❌ Geçersiz kullanıcı ID.\nÖrnek: /ban 123456789');
      return;
    }
    
    try {
      const user = await User.findOneAndUpdate(
        { telegramId: userId },
        { 
          isBlocked: true,
          blockedAt: new Date(),
          blockedReason: 'Manual ban'
        },
        { new: true }
      );
      
      if (!user) {
        await ctx.reply('❌ Kullanıcı bulunamadı.');
        return;
      }
      
      await ctx.reply(
        `✅ Kullanıcı engellendi\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `🆔 ID: ${userId}\n` +
        `👤 Ad: ${user.firstName}\n` +
        `📅 Engellenme: ${new Date().toLocaleString('tr-TR')}\n` +
        `━━━━━━━━━━━━━━━━━━━━`
      );
      
      // Notify admin about ban
      winstonLogger.info(`Admin ${ctx.from!.id} banned user ${userId}`);
      
    } catch (error) {
      winstonLogger.error('Error banning user:', error);
      await ctx.reply('❌ Bir hata oluştu.');
    }
  });
  
  // /unban command
  bot.command('unban', async (ctx: Context) => {
    if (!isAdmin(ctx.from!.id)) {
      await ctx.reply('❌ Bu komutu kullanma yetkiniz yok.');
      return;
    }
    
    const userId = parseInt(ctx.match as string);
    
    if (!userId) {
      await ctx.reply('❌ Geçersiz kullanıcı ID.\nÖrnek: /unban 123456789');
      return;
    }
    
    try {
      const user = await User.findOneAndUpdate(
        { telegramId: userId },
        { 
          isBlocked: false,
          $unset: { blockedAt: 1, blockedReason: 1 }
        },
        { new: true }
      );
      
      if (!user) {
        await ctx.reply('❌ Kullanıcı bulunamadı.');
        return;
      }
      
      await ctx.reply(
        `✅ Kullanıcının engeli kaldırıldı\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `🆔 ID: ${userId}\n` +
        `👤 Ad: ${user.firstName}\n` +
        `📅 Kaldırma: ${new Date().toLocaleString('tr-TR')}\n` +
        `━━━━━━━━━━━━━━━━━━━━`
      );
      
      winstonLogger.info(`Admin ${ctx.from!.id} unbanned user ${userId}`);
      
    } catch (error) {
      winstonLogger.error('Error unbanning user:', error);
      await ctx.reply('❌ Bir hata oluştu.');
    }
  });
  
  // /broadcast command
  bot.command('broadcast', async (ctx: Context) => {
    if (!isAdmin(ctx.from!.id)) {
      await ctx.reply('❌ Bu komutu kullanma yetkiniz yok.');
      return;
    }
    
    const message = ctx.match as string;
    
    if (!message) {
      await ctx.reply('❌ Mesaj içeriği gerekli.\nÖrnek: /broadcast Bakım çalışması yapılacak');
      return;
    }
    
    await ctx.reply('📢 Mesaj gönderiliyor...');
    
    try {
      // Get active users (last 7 days)
      const activeUsers = await User.find({
        lastActive: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        isBlocked: false
      });
      
      let sent = 0;
      let failed = 0;
      
      // Send in batches to avoid rate limiting
      const batchSize = 20;
      for (let i = 0; i < activeUsers.length; i += batchSize) {
        const batch = activeUsers.slice(i, i + batchSize);
        
        await Promise.all(
          batch.map(async (user) => {
            try {
              await bot.api.sendMessage(user.telegramId, 
                `📢 Duyuru\n━━━━━━━━━━━━━━━━━━━━\n${message}\n━━━━━━━━━━━━━━━━━━━━`
              );
              sent++;
            } catch (error) {
              failed++;
            }
          })
        );
        
        // Rate limiting - wait between batches
        if (i + batchSize < activeUsers.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      await ctx.reply(
        `📢 Mesaj gönderildi\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `👥 Hedef: ${activeUsers.length} aktif kullanıcı\n` +
        `✅ Gönderildi: ${sent}\n` +
        `❌ Başarısız: ${failed}\n` +
        `⏱️ Süre: ${Math.ceil(activeUsers.length / batchSize)} batch\n` +
        `━━━━━━━━━━━━━━━━━━━━`
      );
      
      winstonLogger.info(`Admin ${ctx.from!.id} broadcasted to ${sent} users`);
      
    } catch (error) {
      winstonLogger.error('Error broadcasting message:', error);
      await ctx.reply('❌ Mesaj gönderilirken hata oluştu.');
    }
  });
  
  // /logs command
  bot.command('logs', async (ctx: Context) => {
    if (!isAdmin(ctx.from!.id)) {
      await ctx.reply('❌ Bu komutu kullanma yetkiniz yok.');
      return;
    }
    
    try {
      const count = parseInt(ctx.match as string) || 10;
      const logs = await getRecentLogs(count);
      
      if (logs.length === 0) {
        await ctx.reply('📋 Log bulunamadı.');
        return;
      }
      
      let message = `📋 Son ${logs.length} Log\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      
      logs.forEach(log => {
        const level = log.level.toUpperCase().padEnd(5);
        message += `${log.timestamp} [${level}] ${log.message}\n`;
      });
      
      message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
      
      await ctx.reply(message);
    } catch (error) {
      winstonLogger.error('Error fetching logs:', error);
      await ctx.reply('❌ Loglar alınamadı.');
    }
  });
  
  // /backup command
  bot.command('backup', async (ctx: Context) => {
    if (!isAdmin(ctx.from!.id)) {
      await ctx.reply('❌ Bu komutu kullanma yetkiniz yok.');
      return;
    }
    
    await ctx.reply('💾 Yedekleme başlatıldı...');
    
    try {
      const [
        userCount,
        noteCount,
        reminderCount,
        alertCount,
        watchlistCount
      ] = await Promise.all([
        User.countDocuments(),
        Note.countDocuments(),
        Reminder.countDocuments(),
        Alert.countDocuments(),
        Watchlist.countDocuments()
      ]);
      
      await ctx.reply(
        `💾 Veritabanı Yedeği\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `👥 Users: ${userCount}\n` +
        `📝 Notes: ${noteCount}\n` +
        `⏰ Reminders: ${reminderCount}\n` +
        `🔔 Alerts: ${alertCount}\n` +
        `📋 Watchlists: ${watchlistCount}\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `✅ Yedekleme tamamlandı!`
      );
      
      winstonLogger.info(`Admin ${ctx.from!.id} requested database backup`);
      
    } catch (error) {
      winstonLogger.error('Error creating backup:', error);
      await ctx.reply('❌ Yedekleme sırasında hata oluştu.');
    }
  });
  
  // /restart command
  bot.command('restart', async (ctx: Context) => {
    if (!isAdmin(ctx.from!.id)) {
      await ctx.reply('❌ Bu komutu kullanma yetkiniz yok.');
      return;
    }
    
    await ctx.reply(
      `🔄 Bot yeniden başlatılıyor...\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `⏱️ İşlemler durduruluyor...\n` +
      `💾 Veriler kaydediliyor...\n` +
      `🖥️ Sistem yeniden başlatılıyor...\n` +
      `━━━━━━━━━━━━━━━━━━━━`
    );
    
    winstonLogger.info(`Admin ${ctx.from!.id} requested bot restart`);
    
    // Graceful shutdown
    setTimeout(() => {
      process.exit(0);
    }, 2000);
  });
}
