import { Bot } from 'grammy';
import type { Context } from 'grammy';
import { Alert } from './model';
import { binanceClient } from '../../services/binance/client';
import { logger } from '../../core/logger';
import { formatAlertListItem, formatAlertMessage } from '../../utils/priceFormatter';

// Helper function to get next shortId
async function getNextShortId(): Promise<number> {
  const lastAlert = await Alert.findOne().sort({ shortId: -1 });
  return lastAlert ? lastAlert.shortId + 1 : 1;
}

export function registerAlertsHandlers(bot: Bot) {
  // /alert command
  bot.command('alert', async (ctx: Context) => {
    const input = (ctx.match as string | undefined)?.trim();
    
    if (!input) {
      await ctx.reply(`❓ Kullanım:\n/alert <SYMBOL> <YUZDE>\n\nÖrnekler:\n/alert BTC -5      (BTC %5 düştüğünde bildir)\n/alert BTC +10     (BTC %10 arttığında bildir)\n/alert BTC +0,01   (BTC binde 1 arttığında)\n/alert ETH 2,5     (ETH %2,5 arttığında)\n\n💡 Sadece sayı girin (% otomatik anlaşılır)\n💡 Türkçe ondalık: 2,5 kullanın\n📊 Fiyatlar: Binance API\n⏱️ Kontrol: 5 dakikada bir\n📋 Mevcut alarmlar: /alerts\n⏹️ İptal et: /alert cancel #1\n🗑️ Alarm sil: /alert delete BTC\n\n🆔 Artık basit ID: #1, #2, #3...`);
      return;
    }
    
    const parts = input.split(' ');
    
    // Check for sub-commands
    if (parts[0]?.toLowerCase() === 'delete') {
      const symbol = parts[1]?.toUpperCase();
      
      if (!symbol) {
        await ctx.reply('❌ Sembol gerekli.\nÖrnek: /alert delete BTC');
        return;
      }
      
      try {
        const result = await Alert.deleteMany({
          userId: ctx.from!.id,
          symbol: symbol
        });
        
        if (result.deletedCount === 0) {
          await ctx.reply(`❌ ${symbol} için aktif alarm bulunamadı.`);
          return;
        }
        
        await ctx.reply(`✅ ${symbol} için tüm alarmlar silindi!\nSilinen: ${result.deletedCount}`);
      } catch (error) {
        logger.error('Error deleting alerts:', error);
        await ctx.reply('❌ Bir hata oluştu.');
      }
      
      return;
    }
    
    if (parts[0]?.toLowerCase() === 'cancel') {
      const shortIdStr = parts[1];
      
      if (!shortIdStr) {
        await ctx.reply('❌ ID gerekli.\nÖrnek: /alert cancel #1 veya /alert cancel 1');
        return;
      }
      
      // Extract shortId number from input (#1 or 1)
      const shortId = parseInt(shortIdStr.replace('#', ''));
      
      if (isNaN(shortId) || shortId <= 0) {
        await ctx.reply('❌ Geçersiz ID. Sayı girin.\nÖrnek: /alert cancel #1 veya /alert cancel 1');
        return;
      }
      
      try {
        const alert = await Alert.findOne({ shortId, userId: ctx.from!.id });
        
        if (!alert) {
          await ctx.reply(`❌ Alarm bulunamadı.\n🔢 ID: #${shortId}\n\n💡 Mevcut alarmları görmek için: /alerts`);
          return;
        }
        
        alert.status = 'paused';
        await alert.save();
        
        await ctx.reply(`✅ Alarm duraklatıldı!\n🆔 ID: #${alert.shortId}\n🪙 Sembol: ${alert.symbol}`);
      } catch (error) {
        logger.error('Error cancelling alert:', error);
        await ctx.reply('❌ Bir hata oluştu.');
      }
      
      return;
    }
    
    // Create new alert
    const symbol = parts[0]?.toUpperCase();
    const thresholdStr = parts[1];
    
    if (!symbol || !thresholdStr) {
      await ctx.reply('❌ Sembol ve yüzde gerekli.\nÖrnek: /alert BTC -5 veya /alert BTC +0,01');
      return;
    }
    
    // Parse threshold - both with and without % sign
    // Accept: -5, +10, 2,5, +0,01, +10%, 2,5%
    let normalizedThreshold = thresholdStr.replace('%', '').replace(',', '.');
    
    // Check if it's a valid number
    const thresholdMatch = normalizedThreshold.match(/^([+-]?\d+(?:\.\d+)?)$/);
    
    if (!thresholdMatch) {
      await ctx.reply('❌ Geçersiz yüzde formatı.\n\n✅ Doğru kullanımlar:\n• -5 (eksi beş yüzde)\n• +10 (artı on yüzde)\n• +0,01 (artı binde bir)\n• 2,5 (iki buçuk yüzde)\n\n💡 Sadece sayı girin (% otomatik anlaşılır)\n💡 Türkçe ondalık: 2,5 kullanın');
      return;
    }
    
    const thresholdPct = parseFloat(thresholdMatch[1]);
    
    try {
      // Get current price from Binance
      const quote = await binanceClient.getQuote(symbol);
      
      if (!quote) {
        await ctx.reply(`❌ ${symbol} bulunamadı veya fiyat alınamadı.`);
        return;
      }
      
      // Check if alert already exists for this symbol and threshold
      const existingAlert = await Alert.findOne({
        userId: ctx.from!.id,
        symbol: symbol,
        thresholdPct: thresholdPct,
        status: 'active'
      });
      
      if (existingAlert) {
        await ctx.reply(`❌ Bu alarm zaten mevcut.\n🆔 ID: #${existingAlert.shortId}`);
        return;
      }
      
      // Get next shortId
      const shortId = await getNextShortId();
      
      // Create alert
      const alert = await Alert.create({
        userId: ctx.from!.id,
        symbol: symbol,
        thresholdPct: thresholdPct,
        basePrice: quote.price,
        currentPrice: quote.price,
        status: 'active',
        shortId
      });
      
      await ctx.reply(
        `🔔 Alarm Kuruldu!\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `📊 Fiyat: ${symbol}\n` +
        `🎯 Eşik: ${thresholdPct > 0 ? '+' : ''}${thresholdPct}%\n` +
        `⏱️ Kontrol: 5 dakikada bir\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `🆔 ID: #${alert.shortId}`
      );
      
    } catch (error) {
      logger.error('Error creating alert:', error);
      await ctx.reply('❌ Bir hata oluştu.');
    }
  });
  
  // /alerts command - list all alerts
  bot.command('alerts', async (ctx) => {
    try {
      const alerts = await Alert.find({ 
        userId: ctx.from!.id,
        status: 'active'
      })
        .sort({ createdAt: -1 })
        .limit(20);
      
      if (alerts.length === 0) {
        await ctx.reply('🔔 Aktif alarmınız bulunmuyor.\nYeni alarm kurmak için: /alert <SYMBOL> <YUZDE>');
        return;
      }
      
      let message = `🔔 Alarmlarınız (Aktif: ${alerts.length})\n━━━━━━━━━━━━━━━━━━━━\n⏱️ Kontrol Sıklığı: 5 dakika\n\n`;
      
      // Get current prices for all symbols from Binance
      const symbols = [...new Set(alerts.map(a => a.symbol))];
      const quotes = await binanceClient.getMultipleQuotes(symbols);
      const quoteMap = new Map(quotes.map(q => [q.symbol, q]));
      
      alerts.forEach((alert, index) => {
        const currentQuote = quoteMap.get(alert.symbol);
        const currentPrice = currentQuote?.price || alert.currentPrice;
        const changePercent = currentQuote?.changePercent24h || 0;
        
        const formattedItem = formatAlertListItem(alert, currentPrice, changePercent, alert.basePrice);
        message += formattedItem + '\n';
      });
      
      message += `━━━━━━━━━━━━━━━━━━━━\n`;
      message += `💡 İptal et: /alert cancel #<ID>\n`;
      message += `🗑️ Tümünü sil: /alert delete <SYMBOL>\n`;
      message += `📝 Not: Basit ID kullanın (#1, #2, #3...)`;
      
      await ctx.reply(message);
    } catch (error) {
      logger.error('Error fetching alerts:', error);
      await ctx.reply('❌ Alarmlar alınamadı.');
    }
  });
}
