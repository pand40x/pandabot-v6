import { Bot } from 'grammy';
import type { Context } from 'grammy';
import axios from 'axios';
import { logger } from '../../core/logger';

export function registerCurrencyModule(bot: Bot) {
  bot.command('dolar', async (ctx: Context) => {
    try {
      await ctx.reply('💱 USD/TRY kuru alınıyor...');
      
      // Using ExchangeRate-API (free tier: 1500 requests/month)
      const response = await axios.get(
        'https://api.exchangerate-api.com/v4/latest/USD',
        { timeout: 10000 }
      );
      
      const rate = response.data.rates.TRY;
      
      if (!rate) {
        throw new Error('TRY rate not found in response');
      }
      
      await ctx.reply(
        `💱 USD/TRY Kuru\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `💰 Dolar: $1\n` +
        `🇹🇷 Türk Lirası: ₺${rate.toFixed(2)}\n` +
        `📊 Güncelleme: ${new Date().toLocaleString('tr-TR')}\n` +
        `━━━━━━━━━━━━━━━━━━━━`
      );
      
    } catch (error: any) {
      logger.error('Error fetching USD/TRY rate:', error);
      
      if (error.code === 'ECONNABORTED') {
        await ctx.reply('❌ İstek zaman aşımına uğradı. Lütfen tekrar deneyin.');
      } else if (error.response?.status === 429) {
        await ctx.reply('❌ API rate limit aşıldı. Lütfen birkaç dakika sonra tekrar deneyin.');
      } else {
        await ctx.reply('❌ Kur alınırken hata oluştu. Lütfen tekrar deneyin.');
      }
    }
  });
}
