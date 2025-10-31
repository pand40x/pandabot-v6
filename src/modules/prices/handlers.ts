import { Bot } from 'grammy';
import type { Context } from 'grammy';
import { binanceClient } from '../../services/binance/client';
import { formatPriceDisplay } from '../../utils/priceFormatter';
import { logger } from '../../core/logger';

function isValidSymbol(symbol: string): boolean {
  return /^[A-Z]{2,10}$/.test(symbol);
}

export function registerPricesModule(bot: Bot) {
  // /price command
  bot.command('price', async (ctx: Context) => {
    const symbol = (ctx.match as string | undefined)?.toUpperCase();
    
    if (!symbol) {
      await ctx.reply('❓ Sembol belirtin: /price BTC');
      return;
    }
    
    if (!isValidSymbol(symbol)) {
      await ctx.reply('❌ Geçersiz sembol formatı. Örnek: BTC, ETH');
      return;
    }
    
    try {
      // Get basic price from Binance (faster)
      const quote = await binanceClient.get24hrTicker(symbol);
      
      if (!quote) {
        await ctx.reply(`❌ ${symbol} bulunamadı veya fiyat alınamadı.`);
        return;
      }
      
      // Try to get detailed info from CoinMarketCap (optional)
      let cmcQuote = null;
      try {
        const { cmcClient } = await import('../../services/coinmarketcap/client');
        cmcQuote = await cmcClient.getLatestQuote(symbol);
      } catch (error) {
        // If CMC fails, just use Binance data
        logger.warn(`CMC fetch failed for ${symbol}, using Binance data`);
      }
      
      const cryptoEmojis: Record<string, string> = {
        'BTC': '🪙', 'ETH': 'Ξ', 'BNB': '🟡', 'SOL': '☀️',
        'XRP': '💧', 'ADA': '💎', 'DOGE': '🐕', 'DOT': '🔴',
        'AVAX': '🔺', 'MATIC': '⬟', 'ATOM': '⚛️', 'LINK': '🔗',
        'LTC': '🥈', 'UNI': '🦄', 'XLM': '⭐', 'VET': '🔗',
        'TRX': '💥', 'ETC': '💎', 'XMR': '🔒', 'ALGO': '🔵',
        'FIL': '📁', 'HBAR': '⚡', 'QNT': '🔢', 'ICP': '🌐',
        'MINA': '🧊', 'NEAR': '🟣', 'FTM': '🎭', 'SAND': '🏖️'
      };
      
      const emoji = cryptoEmojis[symbol] || '💰';
      const changeEmoji = quote.changePercent24h > 0 ? '↗️' : '↘️';
      const changeFormatted = quote.changePercent24h > 0 ? `+${quote.changePercent24h.toFixed(2)}%` : `${quote.changePercent24h.toFixed(2)}%`;
      
      // If CMC data available, use it for details
      if (cmcQuote) {
        // Format volume
        const volumeFormatted = cmcQuote.volume24h >= 1e9 
          ? `$${(cmcQuote.volume24h / 1e9).toFixed(2)}B`
          : cmcQuote.volume24h >= 1e6
          ? `$${(cmcQuote.volume24h / 1e6).toFixed(2)}M`
          : `$${(cmcQuote.volume24h / 1e3).toFixed(2)}K`;
        
        // Format market cap
        const marketCapFormatted = cmcQuote.marketCap >= 1e9
          ? `$${(cmcQuote.marketCap / 1e9).toFixed(2)}B`
          : cmcQuote.marketCap >= 1e6
          ? `$${(cmcQuote.marketCap / 1e6).toFixed(2)}M`
          : `$${(cmcQuote.marketCap / 1e3).toFixed(2)}K`;
        
        // Format circulating supply
        const supplyFormatted = cmcQuote.circulatingSupply >= 1e9
          ? `${(cmcQuote.circulatingSupply / 1e9).toFixed(2)}B`
          : cmcQuote.circulatingSupply >= 1e6
          ? `${(cmcQuote.circulatingSupply / 1e6).toFixed(2)}M`
          : `${cmcQuote.circulatingSupply.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`;
        
        await ctx.reply(
          `${emoji} ${symbol} (${cmcQuote.name})\n\n` +
          `💰 Fiyat: $${quote.price.toFixed(6)}\n` +
          `📈 24s Değişim: ${changeFormatted} ${changeEmoji}\n` +
          `📊 24s Hacim: ${volumeFormatted}\n` +
          `💎 Piyasa Değeri: ${marketCapFormatted}\n` +
          `🔄 Dolaşan Arz: ${supplyFormatted}`
        );
      } else {
        // Fallback to Binance data
        await ctx.reply(
          `${emoji} ${symbol}\n\n` +
          `💰 Fiyat: $${quote.price.toFixed(6)}\n` +
          `📈 24s Değişim: ${changeFormatted} ${changeEmoji}\n` +
          `📊 Kaynak: Binance\n` +
          `🕐 Güncelleme: ${new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`
        );
      }
    } catch (error) {
      logger.error(`Error fetching price for ${symbol}:`, error);
      await ctx.reply(`❌ ${symbol} için fiyat alınamadı. Lütfen tekrar deneyin.`);
    }
  });
  
  // /p command - Quick price query
  bot.command('p', async (ctx: Context) => {
    const symbols = (ctx.match as string | undefined)?.toUpperCase().split(' ').filter((s: string) => s.trim());
    
    if (!symbols || symbols.length === 0) {
      await ctx.reply('❓ Sembol(ler) belirtin: /p BTC ETH SOL');
      return;
    }
    
    // Validate symbols
    const invalidSymbols = symbols.filter((s: string) => !isValidSymbol(s));
    if (invalidSymbols.length > 0) {
      await ctx.reply(`❌ Geçersiz semboller: ${invalidSymbols.join(', ')}`);
      return;
    }
    
    try {
      if (symbols.length === 1) {
        // Single symbol - detailed view
        const symbol = symbols[0]!;
        const quote = await binanceClient.getQuote(symbol);
        
        if (!quote) {
          await ctx.reply(`❌ ${symbol} bulunamadı.`);
          return;
        }
        
        // Try to get detailed info from CoinMarketCap (optional)
        let cmcQuote = null;
        try {
          const { cmcClient } = await import('../../services/coinmarketcap/client');
          cmcQuote = await cmcClient.getLatestQuote(symbol);
        } catch (error) {
          // If CMC fails, we'll use Binance data
        }
        
        const cryptoEmojis: Record<string, string> = {
          'BTC': '🪙', 'ETH': 'Ξ', 'BNB': '🟡', 'SOL': '☀️',
          'XRP': '💧', 'ADA': '💎', 'DOGE': '🐕', 'DOT': '🔴',
          'AVAX': '🔺', 'MATIC': '⬟', 'ATOM': '⚛️', 'LINK': '🔗',
          'LTC': '🥈', 'UNI': '🦄', 'XLM': '⭐', 'VET': '🔗',
          'TRX': '💥', 'ETC': '💎', 'XMR': '🔒', 'ALGO': '🔵',
          'FIL': '📁', 'HBAR': '⚡', 'QNT': '🔢', 'ICP': '🌐',
          'MINA': '🧊', 'NEAR': '🟣', 'FTM': '🎭', 'SAND': '🏖️'
        };
        
        const emoji = cryptoEmojis[symbol] || '💰';
        const changeEmoji = quote.changePercent24h > 0 ? '↗️' : '↘️';
        const changeFormatted = quote.changePercent24h > 0 ? `+${quote.changePercent24h.toFixed(2)}%` : `${quote.changePercent24h.toFixed(2)}%`;
        
        // If CMC data available, use it for details
        if (cmcQuote) {
          const volumeFormatted = cmcQuote.volume24h >= 1e9 
            ? `$${(cmcQuote.volume24h / 1e9).toFixed(2)}B`
            : cmcQuote.volume24h >= 1e6
            ? `$${(cmcQuote.volume24h / 1e6).toFixed(2)}M`
            : `$${(cmcQuote.volume24h / 1e3).toFixed(2)}K`;
          
          const marketCapFormatted = cmcQuote.marketCap >= 1e9
            ? `$${(cmcQuote.marketCap / 1e9).toFixed(2)}B`
            : cmcQuote.marketCap >= 1e6
            ? `$${(cmcQuote.marketCap / 1e6).toFixed(2)}M`
            : `$${(cmcQuote.marketCap / 1e3).toFixed(2)}K`;
          
          const supplyFormatted = cmcQuote.circulatingSupply >= 1e9
            ? `${(cmcQuote.circulatingSupply / 1e9).toFixed(2)}B`
            : cmcQuote.circulatingSupply >= 1e6
            ? `${(cmcQuote.circulatingSupply / 1e6).toFixed(2)}M`
            : `${cmcQuote.circulatingSupply.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`;
          
          await ctx.reply(
            `${emoji} ${symbol} (${cmcQuote.name})\n\n` +
            `💰 Fiyat: $${quote.price.toFixed(6)}\n` +
            `📈 24s Değişim: ${changeFormatted} ${changeEmoji}\n` +
            `📊 24s Hacim: ${volumeFormatted}\n` +
            `💎 Piyasa Değeri: ${marketCapFormatted}\n` +
            `🔄 Dolaşan Arz: ${supplyFormatted}`
          );
        } else {
          // Fallback to Binance data
          await ctx.reply(
            `${emoji} ${symbol}\n\n` +
            `💰 Fiyat: $${quote.price.toFixed(6)}\n` +
            `📈 24s Değişim: ${changeFormatted} ${changeEmoji}\n` +
            `📊 Kaynak: Binance\n` +
            `🕐 Güncelleme: ${new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`
          );
        }
      } else {
        // Multiple symbols - compact view
        const quotes = await binanceClient.getMultipleQuotes(symbols);
        
        let message = '';
        quotes.forEach((quote) => {
          const display = formatPriceDisplay(quote.symbol, quote.price, quote.changePercent24h);
          message += `${display.symbol}: ${display.priceFormatted} ${display.changeFormatted}${display.rocketEmoji}\n`;
        });
        
        await ctx.reply(message);
      }
    } catch (error) {
      logger.error(`Error fetching prices for ${symbols.join(', ')}:`, error);
      await ctx.reply(`❌ Fiyatlar alınamadı. Lütfen tekrar deneyin.`);
    }
  });
}
