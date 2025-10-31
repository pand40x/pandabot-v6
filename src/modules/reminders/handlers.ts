import { Bot } from 'grammy';
import type { Context } from 'grammy';
import { Reminder } from './model';
import { getAgenda } from '../../core/scheduler';
import { logger } from '../../core/logger';

// Doğal Dil Parser
function parseNaturalLanguageTime(input: string, now: Date = new Date()) {
  const text = input.toLowerCase().trim();
  let remainingText = text;
  let remindAt: Date | null = null;
  let message = '';
  let success = false;
  let error = '';
  let matchedPattern: any = null;
  
  try {
    // 1. "hatırlat" kelimesini ara ve mesajı ayır
    const remindIndex = text.indexOf('hatırlat');
    if (remindIndex !== -1) {
      message = text.substring(remindIndex + 8).trim(); // "hatırlat" + boşluk
    } else {
      message = text;
    }
    
    // 2. Zaman ifadelerini parcala
    const timePatterns = [
      // Saat isimleri
      { pattern: /\b(sabah|öğle|akşam|gece)\b/, handler: (match: string) => {
        const hourMap: { [key: string]: number } = {
          'sabah': 9,
          'öğle': 12,
          'akşam': 18,
          'gece': 21
        };
        remindAt = new Date(now);
        remindAt.setHours(hourMap[match], 0, 0, 0);
        // Eğer geçmişse, yarına ayarla
        if (remindAt <= now) {
          remindAt.setDate(remindAt.getDate() + 1);
        }
        return true;
      }},
      
      // Relative time: 2 dakika/ dakika/ dk, 3 saat/saat/saat, 1 gün/gün
      { pattern: /(\d+)\s*(saniye|sn|s)\b/, handler: (match: string, num: string) => {
        remindAt = new Date(now);
        remindAt.setSeconds(remindAt.getSeconds() + parseInt(num));
        return true;
      }},
      
      { pattern: /(\d+)\s*(dakika|dk|d)\b/, handler: (match: string, num: string) => {
        remindAt = new Date(now);
        remindAt.setMinutes(remindAt.getMinutes() + parseInt(num));
        return true;
      }},
      
      { pattern: /(\d+)\s*(saat|sa|s)\b/, handler: (match: string, num: string) => {
        remindAt = new Date(now);
        remindAt.setHours(remindAt.getHours() + parseInt(num));
        return true;
      }},
      
      { pattern: /(\d+)\s*(gün|g)\b/, handler: (match: string, num: string) => {
        remindAt = new Date(now);
        remindAt.setDate(remindAt.getDate() + parseInt(num));
        return true;
      }},
      
      // Direkt format: +30m, +2h, +1d
      { pattern: /^\+(\d+)([mhd])\b/, handler: (match: string, num: string, unit: string) => {
        remindAt = new Date(now);
        switch (unit) {
          case 'm': remindAt.setMinutes(remindAt.getMinutes() + parseInt(num)); break;
          case 'h': remindAt.setHours(remindAt.getHours() + parseInt(num)); break;
          case 'd': remindAt.setDate(remindAt.getDate() + parseInt(num)); break;
        }
        return true;
      }},
      
      // Saat formatı: 15:30, 23:45
      { pattern: /(\d{1,2}):(\d{2})\b/, handler: (match: string, hour: string, min: string) => {
        remindAt = new Date(now);
        remindAt.setHours(parseInt(hour), parseInt(min), 0, 0);
        // Eğer geçmişse, yarına ayarla
        if (remindAt <= now) {
          remindAt.setDate(remindAt.getDate() + 1);
        }
        return true;
      }},
      
      // Tarih formatı: yarın
      { pattern: /\b(yarın)\b/, handler: (match: string) => {
        remindAt = new Date(now);
        remindAt.setDate(remindAt.getDate() + 1);
        remindAt.setHours(9, 0, 0, 0); // Sabah 9
        return true;
      }}
    ];
    
    // Zaman pattern'lerini dene
    for (const timePattern of timePatterns) {
      const match = text.match(timePattern.pattern);
      if (match) {
        // @ts-ignore - Spread operator for regex match array
        const handled = timePattern.handler(...match);
        if (handled) {
          matchedPattern = timePattern;
          remainingText = remainingText.replace(timePattern.pattern, '').trim();
          success = true;
          break;
        }
      }
    }
    
    // Eğer zaman bulunamadıysa
    if (!success) {
      error = 'Zaman algılanamadı';
      success = false;
    }
    
    // Mesajı temizle
    if (message && matchedPattern) {
      message = message.replace(matchedPattern.pattern, '').trim();
    } else if (message) {
      message = remainingText;
    }
    
    return {
      remindAt,
      message: message || remainingText,
      success,
      error
    };
    
  } catch (err: any) {
    return {
      remindAt: null,
      message: '',
      success: false,
      error: err.message
    };
  }
}

export function registerRemindersHandlers(bot: Bot) {
  // /remind command
  bot.command('remind', async (ctx: Context) => {
    const input = (ctx.match as string | undefined)?.trim();
    
    if (!input) {
      await ctx.reply(
        '⏰ *Doğal Dil Hatırlatıcı*\n' +
        '━━━━━━━━━━━━━━━━━━━━\n' +
        '/remind akşam ekmek alacağım\n' +
        '/remind 2 dakika hatırlat toplantı\n' +
        '/remind yarın sabah proje sunumu\n' +
        '/remind 15:30 doktor randevusu\n' +
        '/remind +30m önemli toplantı\n' +
        '━━━━━━━━━━━━━━━━━━━━\n\n' +
        '🕐 *Zaman Formatları:*\n' +
        '• akşam, sabah, öğle, gece\n' +
        '• 2 dakika, 5 saat, 1 gün\n' +
        '• 15:30 (belirli saat)\n' +
        '• yarın (sabah 9:00)\n' +
        '• +30m, +2h, +1d (direkt format)\n\n' +
        '💡 İptal: /remind cancel <ID>'
      );
      return;
    }
    
    // Check if this is a cancel command
    const parts = input.split(' ');
    if (parts[0]?.toLowerCase() === 'cancel') {
      const id = parts[1];
      
      if (!id) {
        await ctx.reply('❌ ID gerekli.\nÖrnek: /remind cancel 507f1f77bcf86cd799439011');
        return;
      }
      
      try {
        const reminder = await Reminder.findOne({ _id: id, userId: ctx.from!.id });
        
        if (!reminder) {
          await ctx.reply('❌ Hatırlatma bulunamadı.');
          return;
        }
        
        if (reminder.status !== 'active') {
          await ctx.reply('❌ Bu hatırlatma zaten tamamlanmış veya iptal edilmiş.');
          return;
        }
        
        // Cancel agenda job if exists
        if (reminder.jobId) {
          await getAgenda().cancel({ _id: reminder.jobId });
        }
        
        reminder.status = 'cancelled';
        await reminder.save();
        
        await ctx.reply(`✅ Hatırlatma iptal edildi!\nID: ${id}`);
      } catch (error) {
        logger.error('Error cancelling reminder:', error);
        await ctx.reply('❌ Bir hata oluştu.');
      }
      
      return;
    }
    
    // Parse using natural language
    const result = parseNaturalLanguageTime(input);
    
    if (!result.success) {
      await ctx.reply(
        `❌ Zaman algılanamadı!\n\n` +
        `Örnekler:\n` +
        `• /remind akşam ekmek alacağım\n` +
        `• /remind 2 dakika hatırlat toplantı\n` +
        `• /remind 15:30 doktor randevusu\n` +
        `• /remind +30m önemli toplantı`
      );
      return;
    }
    
    const remindAt = result.remindAt!;
    const message = result.message;
    
    try {
      // Check if time is in the future
      if (remindAt <= new Date()) {
        await ctx.reply('❌ Zaman geçmişte olamaz.');
        return;
      }
      
      // Check message length
      if (message.length > 500) {
        await ctx.reply('❌ Mesaj çok uzun (max 500 karakter).');
        return;
      }
      
      // Create reminder in database
      const reminder = await Reminder.create({
        userId: ctx.from!.id,
        message,
        remindAt,
        status: 'active'
      });
      
      // Create agenda job
      const job = await getAgenda().schedule(remindAt, 'send-reminder', {
        reminderId: reminder._id.toString(),
        userId: ctx.from!.id,
        message: reminder.message
      });
      
      // Save job ID to reminder
      reminder.jobId = job.attrs._id?.toString();
      await reminder.save();
      
      const timeStrFormatted = remindAt.toLocaleString('tr-TR');
      await ctx.reply(
        `✅ *Hatırlatma kuruldu!*\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `🕐 Zaman: ${timeStrFormatted}\n` +
        `📌 Mesaj: ${message}\n` +
        `🆔 ID: \`${reminder._id}\``
      );
      
    } catch (error) {
      logger.error('Error creating reminder:', error);
      await ctx.reply('❌ Bir hata oluştu.');
    }
  });
  
  // /reminders command - list all reminders
  bot.command('reminders', async (ctx) => {
    try {
      const reminders = await Reminder.find({ 
        userId: ctx.from!.id,
        status: 'active'
      })
        .sort({ remindAt: 1 })
        .limit(20);
      
      if (reminders.length === 0) {
        await ctx.reply('⏰ Aktif hatırlatmanız bulunmuyor.\nYeni hatırlatma kurmak için: /remind <ZAMAN> <MESAJ>');
        return;
      }
      
      let message = `⏰ Hatırlatmalarınız (Aktif: ${reminders.length})\n━━━━━━━━━━━━━━━━━━━━\n`;
      
      reminders.forEach((reminder, index) => {
        const timeStr = reminder.remindAt.toLocaleString('tr-TR');
        const shortMsg = reminder.message.substring(0, 40);
        message += `${index + 1}. ID: ${reminder._id}\n   📅 ${timeStr}\n   📌 ${shortMsg}${reminder.message.length > 40 ? '...' : ''}\n\n`;
      });
      
      message += `━━━━━━━━━━━━━━━━━━━━\n💡 İptal et: /remind cancel <ID>`;
      
      await ctx.reply(message);
    } catch (error) {
      logger.error('Error fetching reminders:', error);
      await ctx.reply('❌ Hatırlatmalar alınamadı.');
    }
  });
}
