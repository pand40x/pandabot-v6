import { Bot } from 'grammy';
import type { Context } from 'grammy';
import { User } from './model';
import { config } from '../../config/env';
import { logger } from '../../core/logger';

export function registerUsersModule(bot: Bot) {
  // Start command handler - also registers user
  bot.command('start', async (ctx: Context) => {
    const user = ctx.from;
    
    if (!user) {
      return;
    }
    
    try {
      // Update or create user
      const userDoc = await User.findOneAndUpdate(
        { telegramId: user.id },
        {
          telegramId: user.id,
          username: user.username,
          firstName: user.first_name,
          lastName: user.last_name,
          languageCode: user.language_code,
          lastActive: new Date(),
          $inc: { totalCommands: 1 }
        },
        { upsert: true, new: true }
      );
      
      // Send welcome message for new users
      if (userDoc.isNew) {
        await ctx.reply(
          `🎉 PandaBot'a hoş geldin!\n\n` +
          `Ben senin finansal asistanınım.\n` +
          `Aşağıdaki komutları kullanabilirsin:\n\n` +
          `📊 /price - Fiyat sorgula\n` +
          `📋 /watchlist - İzleme listesi oluştur\n` +
          `📝 /note - Not al\n` +
          `⏰ /remind - Hatırlatma kur\n` +
          `🔔 /alert - Fiyat alarmı\n` +
          `🤖 /ai - AI'ya sor\n` +
          `💱 /dolar - USD/TRY kur\n\n` +
          `Yardım için /help yazabilirsin!\n\n` +
          `📝 Özellik: Liste adını komutsuz direkt yazarak fiyatlarını görebilirsin!`
        );
        
        // Notify admin
        try {
          const { notifyAdminOfNewUser } = await import('../../core/logger');
          await notifyAdminOfNewUser(user);
        } catch (error) {
          logger.warn('Failed to notify admin of new user:', error);
        }
      }
    } catch (error) {
      logger.error('Error handling start command:', error);
      await ctx.reply('❌ Bir hata oluştu. Lütfen tekrar deneyin.');
    }
  });
}
