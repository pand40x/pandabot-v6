import { Bot } from 'grammy';
import type { Context } from 'grammy';
import { InlineKeyboard } from 'grammy';
import { Note } from './model';
import { logger } from '../../core/logger';

// Helper function to get next shortId
async function getNextShortId(): Promise<number> {
  const lastNote = await Note.findOne().sort({ shortId: -1 });
  return lastNote ? lastNote.shortId + 1 : 1;
}

export function registerNotesHandlers(bot: Bot) {
  // /note command
  bot.command('note', async (ctx: Context) => {
    const input = (ctx.match as string | undefined)?.trim();
    
    if (!input) {
      await ctx.reply(`📝 *Notlar Modülü*\n━━━━━━━━━━━━━━━━━━━━\n` +
        `/note add <NOT>        → Yeni not ekle\n` +
        `/note list             → Notları listele + butonlar\n` +
        `/note search <KELIME>  → Notlarda ara\n` +
        `/note view #<ID>       → Notu görüntüle (Ör: /note view #1)\n` +
        `/note edit #<ID> <YENİ> → Notu düzenle (Ör: /note edit #1 Yeni içerik)\n` +
        `/note delete #<ID>     → Notu sil (Ör: /note delete #1)\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `🎯 *Basit ID Sistemi!*\n` +
        `📋 Her not: #1, #2, #3... şeklinde\n` +
        `👁️ Görüntüle | ✏️ Düzenle | 🗑️ Sil\n\n` +
        `✅ Artık karmaşık ID yok!\n` +
        `💡 Sadece #1, #2, #3 kullanın.`
      );
      return;
    }
    
    const parts = input.split(' ');
    const action = parts[0].toLowerCase();
    
    try {
      switch (action) {
        case 'add': {
          const content = parts.slice(1).join(' ');
          
          if (!content) {
            await ctx.reply('❌ Not içeriği gerekli.\nÖr: /note add Bitcoin fiyatını kontrol et');
            return;
          }
          
          if (content.length > 1000) {
            await ctx.reply(`❌ Not çok uzun (max 1000 karakter).`);
            return;
          }
          
          // Get next shortId
          const shortId = await getNextShortId();
          
          const note = await Note.create({
            userId: ctx.from!.id,
            content,
            shortId
          });
          
          await ctx.reply(`✅ Not eklendi!\n🆔 ID: #${shortId}\n📅 Tarih: ${note.createdAt.toLocaleString('tr-TR')}`);
          break;
        }
        
        case 'list': {
          const notes = await Note.find({ userId: ctx.from!.id })
            .sort({ createdAt: -1 })
            .limit(20);
          
          if (notes.length === 0) {
            await ctx.reply('📝 Not listeniz boş.\nYeni not eklemek için: /note add <NOT>');
            return;
          }
          
          let message = `📝 Notlarım (Toplam: ${notes.length})\n━━━━━━━━━━━━━━━━━━━━\n`;
          
          const keyboard = new InlineKeyboard();
          
          notes.forEach((note, index) => {
            const date = note.createdAt.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' });
            message += `#${note.shortId}. [${date}] ${note.content.substring(0, 40)}${note.content.length > 40 ? '...' : ''}\n`;
            
            // Add inline buttons for each note - USE SHORT ID
            keyboard
              .text(`👁️ #${note.shortId}`, `note_view_${note.shortId}`)
              .text(`✏️ #${note.shortId}`, `note_edit_${note.shortId}`)
              .text(`🗑️ #${note.shortId}`, `note_delete_${note.shortId}`)
              .row();
          });
          
          message += `━━━━━━━━━━━━━━━━━━━━\n💡 Her not için üç seçeneğiniz var:\n👁️ Görüntüle | ✏️ Düzenle | 🗑️ Sil`;
          
          await ctx.reply(message, { reply_markup: keyboard });
          break;
        }
        
        case 'view': {
          const shortIdStr = parts[1];
          
          if (!shortIdStr) {
            await ctx.reply('❌ ID gerekli.\nÖr: /note view #1 veya /note view 1');
            return;
          }
          
          // Extract shortId number from input (#1 or 1)
          const shortId = parseInt(shortIdStr.replace('#', ''));
          
          if (isNaN(shortId) || shortId <= 0) {
            await ctx.reply('❌ Geçersiz ID. Sayı girin.\nÖr: /note view #1 veya /note view 1');
            return;
          }
          
          const note = await Note.findOne({ shortId, userId: ctx.from!.id });
          
          if (!note) {
            await ctx.reply(`❌ Not bulunamadı.\n🔢 ID: #${shortId}\n\n💡 Kullanılabilir ID\'leri görmek için: /note list`);
            return;
          }
          
          const date = note.createdAt.toLocaleString('tr-TR');
          const updated = note.updatedAt.toLocaleString('tr-TR');
          
          const keyboard = new InlineKeyboard()
            .text('✏️ Düzenle', `note_edit_${note.shortId}`)
            .text('🗑️ Sil', `note_delete_${note.shortId}`);
          
          await ctx.reply(
            `📄 *Not Detayı*\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `📝 **İçerik:**\n${note.content}\n\n` +
            `📅 **Oluşturulma:** ${date}\n` +
            `🔄 **Güncellenme:** ${updated}\n` +
            `🆔 **ID:** #${note.shortId}\n` +
            `━━━━━━━━━━━━━━━━━━━━`,
            { reply_markup: keyboard }
          );
          break;
        }
        
        case 'search': {
          const query = parts.slice(1).join(' ');
          
          if (!query) {
            await ctx.reply('❌ Arama kelimesi gerekli.\nÖr: /note search Bitcoin');
            return;
          }
          
          const notes = await Note.find({
            userId: ctx.from!.id,
            content: { $regex: query, $options: 'i' }
          })
            .sort({ createdAt: -1 })
            .limit(20);
          
          if (notes.length === 0) {
            await ctx.reply(`🔍 "${query}" için sonuç bulunamadı.\n\n💡 Farklı bir kelime deneyin veya yeni not ekleyin.`);
            return;
          }
          
          let message = `🔍 Arama Sonuçları ("${query}" - ${notes.length} sonuç)\n━━━━━━━━━━━━━━━━━━━━\n`;
          
          notes.forEach((note, index) => {
            const date = note.createdAt.toLocaleDateString('tr-TR');
            const excerpt = note.content.substring(0, 50);
            message += `#${note.shortId}. ${excerpt}${note.content.length > 50 ? '...' : ''}\n   📅 ${date}\n\n`;
          });
          
          message += `━━━━━━━━━━━━━━━━━━━━\n💡 En kolay yöntem: /note list\n📋 Butonlara tıklayın, ID gerekmez!`;
          
          await ctx.reply(message);
          break;
        }
        
        case 'edit': {
          const shortIdStr = parts[1];
          const newContent = parts.slice(2).join(' ');
          
          if (!shortIdStr || !newContent) {
            await ctx.reply('❌ ID ve yeni içerik gerekli.\nÖr: /note edit #1 Yeni içerik veya /note edit 1 Yeni içerik');
            return;
          }
          
          // Extract shortId number from input
          const shortId = parseInt(shortIdStr.replace('#', ''));
          
          if (isNaN(shortId) || shortId <= 0) {
            await ctx.reply('❌ Geçersiz ID. Sayı girin.\nÖr: /note edit #1 veya /note edit 1');
            return;
          }
          
          const note = await Note.findOne({ shortId, userId: ctx.from!.id });
          
          if (!note) {
            await ctx.reply(`❌ Not bulunamadı.\n🔢 ID: #${shortId}\n\n💡 Kullanılabilir ID\'leri görmek için: /note list`);
            return;
          }
          
          if (newContent.length > 1000) {
            await ctx.reply('❌ Not çok uzun (max 1000 karakter).');
            return;
          }
          
          note.content = newContent;
          await note.save();
          
          await ctx.reply(`✅ Not güncellendi!\n🆔 ID: #${note.shortId}\n📝 İçerik: ${newContent.substring(0, 100)}${newContent.length > 100 ? '...' : ''}`);
          break;
        }
        
        case 'delete': {
          const shortIdStr = parts[1];
          
          if (!shortIdStr) {
            await ctx.reply('❌ ID gerekli.\nÖr: /note delete #1 veya /note delete 1');
            return;
          }
          
          // Extract shortId number from input
          const shortId = parseInt(shortIdStr.replace('#', ''));
          
          if (isNaN(shortId) || shortId <= 0) {
            await ctx.reply('❌ Geçersiz ID. Sayı girin.\nÖr: /note delete #1 veya /note delete 1');
            return;
          }
          
          const note = await Note.findOne({ shortId, userId: ctx.from!.id });
          
          if (!note) {
            await ctx.reply(`❌ Not bulunamadı.\n🔢 ID: #${shortId}\n\n💡 Kullanılabilir ID\'leri görmek için: /note list`);
            return;
          }
          
          const result = await Note.deleteOne({ shortId, userId: ctx.from!.id });
          
          if (result.deletedCount === 0) {
            await ctx.reply('❌ Not bulunamadı veya bu not size ait değil.');
            return;
          }
          
          await ctx.reply(`✅ Not silindi!\n🆔 ID: #${shortId}\n📝 İçerik: ${note.content.substring(0, 50)}${note.content.length > 50 ? '...' : ''}`);
          break;
        }
        
        default:
          await ctx.reply(`❓ *Komutlar:*\n` +
            `/note add <NOT>          → Yeni not ekle\n` +
            `/note list                → Notları listele + butonlar\n` +
            `/note search <KELIME>     → Notlarda ara\n` +
            `/note view #<ID>          → Notu görüntüle (Ör: /note view #1)\n` +
            `/note edit #<ID> <YENİ>   → Notu düzenle (Ör: /note edit #1 Yeni içerik)\n` +
            `/note delete #<ID>        → Notu sil (Ör: /note delete #1)\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `✅ Artık basit: #1, #2, #3!\n` +
            `💡 En kolay: /note list → Butona tıkla`);
      }
    } catch (error) {
      logger.error('Error in note command:', error);
      
      if (error instanceof Error && error.name === 'CastError') {
        await ctx.reply('❌ Geçersiz ID formatı.');
        return;
      }
      
      await ctx.reply('❌ Bir hata oluştu.');
    }
  });
  
  // Inline keyboard callback handlers
  bot.callbackQuery(/note_view_(.+)/, async (ctx) => {
    const shortIdStr = ctx.match[1];
    
    await ctx.answerCallbackQuery();
    
    try {
      const shortId = parseInt(shortIdStr);
      const note = await Note.findOne({ shortId, userId: ctx.from!.id });
      
      if (!note) {
        await ctx.answerCallbackQuery('❌ Not bulunamadı.');
        return;
      }
      
      const date = note.createdAt.toLocaleString('tr-TR');
      const updated = note.updatedAt.toLocaleString('tr-TR');
      
      const keyboard = new InlineKeyboard()
        .text('✏️ Düzenle', `note_edit_${note.shortId}`)
        .text('🗑️ Sil', `note_delete_${note.shortId}`);
      
      await ctx.editMessageText(
        `📄 *Not Detayı*\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `📝 **İçerik:**\n${note.content}\n\n` +
        `📅 **Oluşturulma:** ${date}\n` +
        `🔄 **Güncellenme:** ${updated}\n` +
        `🆔 **ID:** #${note.shortId}\n` +
        `━━━━━━━━━━━━━━━━━━━━`,
        { reply_markup: keyboard }
      );
    } catch (error) {
      logger.error('Error viewing note:', error);
      await ctx.answerCallbackQuery('❌ Bir hata oluştu.');
    }
  });
  
  bot.callbackQuery(/note_edit_(.+)/, async (ctx) => {
    const shortIdStr = ctx.match[1];
    
    await ctx.answerCallbackQuery('✏️ Lütfen /note edit komutunu kullanın');
    
    try {
      const shortId = parseInt(shortIdStr);
      const note = await Note.findOne({ shortId, userId: ctx.from!.id });
      
      if (!note) {
        await ctx.reply('❌ Not bulunamadı.');
        return;
      }
      
      await ctx.reply(
        `📝 *Not Düzenle*\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `🆔 Not ID: #${note.shortId}\n` +
        `📄 Mevcut İçerik:\n${note.content}\n` +
        `━━━━━━━━━━━━━━━━━━━━\n\n` +
        `💡 *Komut:*\n` +
        `/note edit #${note.shortId} <YENİ İÇERİK>\n\n` +
        `📝 *Örnek:*\n` +
        `/note edit #${note.shortId} Yeni not içeriği`
      );
    } catch (error) {
      logger.error('Error preparing note edit:', error);
      await ctx.reply('❌ Bir hata oluştu.');
    }
  });
  
  bot.callbackQuery(/note_delete_(.+)/, async (ctx) => {
    const shortIdStr = ctx.match[1];
    
    await ctx.answerCallbackQuery();
    
    try {
      const shortId = parseInt(shortIdStr);
      const note = await Note.findOne({ shortId, userId: ctx.from!.id });
      
      if (!note) {
        await ctx.answerCallbackQuery('❌ Not bulunamadı.');
        return;
      }
      
      // Show confirmation inline keyboard
      const confirmKeyboard = new InlineKeyboard()
        .text('✅ Evet, Sil', `note_confirm_delete_${shortId}`)
        .text('❌ İptal', `note_cancel_delete_${shortId}`);
      
      await ctx.editMessageText(
        `🗑️ *Notu Sil*\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `Bu notu silmek istediğinizden emin misiniz?\n\n` +
        `📄 *İçerik:*\n${note.content.substring(0, 100)}${note.content.length > 100 ? '...' : ''}\n\n` +
        `━━━━━━━━━━━━━━━━━━━━`,
        { reply_markup: confirmKeyboard }
      );
    } catch (error) {
      logger.error('Error preparing note deletion:', error);
      await ctx.answerCallbackQuery('❌ Bir hata oluştu.');
    }
  });
  
  bot.callbackQuery(/note_confirm_delete_(.+)/, async (ctx) => {
    const shortIdStr = ctx.match[1];
    
    await ctx.answerCallbackQuery('🗑️ Siliniyor...');
    
    try {
      const shortId = parseInt(shortIdStr);
      const result = await Note.deleteOne({ shortId, userId: ctx.from!.id });
      
      if (result.deletedCount > 0) {
        await ctx.editMessageText(`✅ *Not başarıyla silindi!*\n🆔 ID: #${shortId}`);
      } else {
        await ctx.answerCallbackQuery('❌ Not bulunamadı.');
      }
    } catch (error) {
      logger.error('Error deleting note:', error);
      await ctx.answerCallbackQuery('❌ Not silinirken bir hata oluştu.');
    }
  });
  
  bot.callbackQuery(/note_cancel_delete_(.+)/, async (ctx) => {
    await ctx.answerCallbackQuery('❌ İptal edildi');
    
    // Re-show the note list or note details
    try {
      const shortIdStr = ctx.match[1];
      const shortId = parseInt(shortIdStr);
      const note = await Note.findOne({ shortId, userId: ctx.from!.id });
      
      if (note) {
        const date = note.createdAt.toLocaleString('tr-TR');
        const updated = note.updatedAt.toLocaleString('tr-TR');
        
        const keyboard = new InlineKeyboard()
          .text('✏️ Düzenle', `note_edit_${note.shortId}`)
          .text('🗑️ Sil', `note_delete_${note.shortId}`);
        
        await ctx.editMessageText(
          `📄 *Not Detayı*\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `📝 **İçerik:**\n${note.content}\n\n` +
          `📅 **Oluşturulma:** ${date}\n` +
          `🔄 **Güncellenme:** ${updated}\n` +
          `🆔 **ID:** #${note.shortId}\n` +
          `━━━━━━━━━━━━━━━━━━━━`,
          { reply_markup: keyboard }
        );
      }
    } catch (error) {
      // If we can't re-show the note, just send a new message
      await ctx.reply('ℹ️ İşlem iptal edildi.');
    }
  });
}
