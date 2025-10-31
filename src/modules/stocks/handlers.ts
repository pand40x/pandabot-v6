import { Bot } from 'grammy';
import type { Context } from 'grammy';
import { logger } from '../../core/logger';

interface StockQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
  marketState: string;
  isMarketClosed: boolean;
}

// Initialize Yahoo Finance once
let yahooFinanceClient: any = null;

async function getYahooFinanceClient() {
  if (!yahooFinanceClient) {
    const YahooFinance = (await import('yahoo-finance2')).default;
    yahooFinanceClient = new YahooFinance({ suppressNotices: ['yahooSurvey'] });
  }
  return yahooFinanceClient;
}

async function fetchStockQuote(symbol: string): Promise<StockQuote> {
  try {
    const yf = await getYahooFinanceClient();
    
    // Only add .IS if explicitly requested OR if symbol is 4-5 chars AND doesn't contain a dot
    // (to avoid treating TSLA as Turkish stock)
    let searchSymbol = symbol;
    const hasDot = symbol.includes('.');
    
    // If it's a plain 4-5 char symbol without dots, it might be Turkish
    // But we need to be smart about this - let's try without .IS first, then with .IS
    if (!hasDot && symbol.length >= 4 && symbol.length <= 5) {
      // Try the symbol as-is first (might be US stock like TSLA, GOOG)
      try {
        const quoteData = await yf.quote(symbol);
        if (quoteData && (quoteData.regularMarketPrice || quoteData.regularMarketPreviousClose)) {
          // Success! Use this symbol
          searchSymbol = symbol;
        } else {
          // No data, try with .IS
          searchSymbol = `${symbol}.IS`;
        }
      } catch {
        // Symbol not found as-is, try with .IS
        searchSymbol = `${symbol}.IS`;
      }
    }
    
    const quoteData: any = await yf.quote(searchSymbol);
    
    if (!quoteData) {
      throw new Error(`Stock ${symbol} not found`);
    }
    
    // Use regularMarketPrice if available, otherwise use regularMarketPreviousClose
    const price = quoteData.regularMarketPrice || quoteData.regularMarketPreviousClose;
    
    if (!price) {
      throw new Error(`Stock ${symbol} not found`);
    }
    
    // Determine if market is open or closed
    const marketState = quoteData.marketState || 'UNKNOWN';
    const isMarketClosed = marketState === 'CLOSED';
    
    return {
      symbol: quoteData.symbol || searchSymbol,
      name: quoteData.shortName || symbol,
      price: price,
      change: quoteData.regularMarketChange || 0,
      changePercent: quoteData.regularMarketChangePercent || 0,
      currency: quoteData.currency || 'USD',
      marketState: marketState,
      isMarketClosed: isMarketClosed
    };
  } catch (error: any) {
    if (error.message?.includes('No data found') || error.message?.includes('not found')) {
      throw new Error(`Stock ${symbol} not found`);
    }
    throw error;
  }
}

async function fetchMultipleStocks(symbols: string[]): Promise<{ success: StockQuote[], failed: string[], errors: any[] }> {
  // yahoo-finance2 supports batch queries
  const quotes = await Promise.allSettled(
    symbols.map(symbol => fetchStockQuote(symbol))
  );
  
  const success: StockQuote[] = [];
  const failed: string[] = [];
  const errors: any[] = [];
  
  quotes.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      success.push(result.value);
      logger.info(`Fetched successfully: ${symbols[index]}`, { service: 'pandabot' });
    } else {
      failed.push(symbols[index]);
      errors.push(result.reason);
      logger.error(`Failed to fetch ${symbols[index]}: ${result.reason?.message}`, { 
        service: 'pandabot',
        symbol: symbols[index],
        error: result.reason 
      });
    }
  });
  
  return { success, failed, errors };
}

function formatStockForTelegram(quote: StockQuote): string {
  const changeEmoji = quote.change >= 0 ? '↗️' : '↘️';
  const changeFormatted = quote.change >= 0 ? `+${quote.change.toFixed(2)}` : quote.change.toFixed(2);
  const changePercentFormatted = quote.changePercent >= 0 ? `+${quote.changePercent.toFixed(2)}%` : `${quote.changePercent.toFixed(2)}%`;
  
  let marketStatus = '';
  if (quote.isMarketClosed) {
    marketStatus = '\n⏰ Piyasa Kapalı (Son Kapanış)';
  }
  
  return (
    `📈 ${quote.name} (${quote.symbol})\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `💰 Fiyat: ${quote.currency === 'TRY' ? '₺' : '$'}${quote.price.toFixed(2)}\n` +
    `📊 Değişim: ${changeFormatted} (${changePercentFormatted}) ${changeEmoji}${marketStatus}\n` +
    `━━━━━━━━━━━━━━━━━━━━`
  );
}

function formatMultipleStocksForTelegram(result: { success: StockQuote[], failed: string[], errors: any[] }, requestedCount: number): string {
  if (result.success.length === 0 && result.failed.length === 0) {
    return '❌ Hiçbir hisse senedi bulunamadı.';
  }
  
  let message = `📈 Hisse Senetleri (${result.success.length}/${requestedCount})\n━━━━━━━━━━━━━━━━━━━━\n`;
  
  if (result.success.length > 0) {
    result.success.forEach(quote => {
      const changeEmoji = quote.change >= 0 ? '↗️' : '↘️';
      const changeFormatted = quote.change >= 0 ? `+${quote.change.toFixed(2)}` : quote.change.toFixed(2);
      const changePercentFormatted = quote.changePercent >= 0 ? `+${quote.changePercent.toFixed(2)}%` : `${quote.changePercent.toFixed(2)}%`;
      const currencySymbol = quote.currency === 'TRY' ? '₺' : '$';
      const marketStatus = quote.isMarketClosed ? ' ⏰' : '';
      
      message += `${quote.symbol}: ${currencySymbol}${quote.price.toFixed(2)} (${changeFormatted}, ${changePercentFormatted}) ${changeEmoji}${marketStatus}\n`;
    });
  }
  
  if (result.failed.length > 0) {
    message += '\n❌ *Başarısız:*\n';
    result.failed.forEach(symbol => {
      message += `• ${symbol}: Piyasa kapalı veya veri mevcut değil\n`;
    });
  }
  
  message += '\n━━━━━━━━━━━━━━━━━━━━';
  return message;
}

export function registerStocksHandlers(bot: Bot) {
  // /s command - Stock price query
  bot.command('s', async (ctx: Context) => {
    const input = (ctx.match as string | undefined)?.trim();
    
    if (!input) {
      await ctx.reply('📈 *Hisse Senedi Fiyatları*\n' +
        '━━━━━━━━━━━━━━━━━━━━\n' +
        '/s AAPL              → Apple\n' +
        '/s TSLA              → Tesla\n' +
        '/s AAPL MSFT GOOGL   → Çoklu sorgu\n' +
        '/s THYAO             → Türk hissesi\n' +
        '/s THYAO.IS          → Açık format\n' +
        '━━━━━━━━━━━━━━━━━━━━\n\n' +
        '✅ *Desteklenen Borsalar:*\n' +
        '🇺🇸 Amerikan borsası (NYSE, NASDAQ)\n' +
        '  • AAPL, MSFT, GOOGL, AMZN, TSLA, NVDA\n\n' +
        '🇹🇷 Türk borsası (BIST) - Sınırlı\n' +
        '  • THYAO, AKBNK, GARAN, ISCTR, SAHOL\n' +
        '  • .IS eki ile: THYAO.IS, AKBNK.IS\n\n' +
        '💡 Not: Yahoo Finance Türk borsası verilerini sınırlı destekler.');
      return;
    }
    
    try {
      const symbols = input.split(' ').map(s => s.trim().toUpperCase());
      
      // Validate symbols (allow Turkish stocks with .IS suffix)
      const invalidSymbols = symbols.filter(symbol => !/^[A-Z]{1,5}(\.[A-Z]{1,2})?(\.IS)?$/.test(symbol));
      if (invalidSymbols.length > 0) {
        await ctx.reply(`❌ Geçersiz semboller: ${invalidSymbols.join(', ')}\n\nGeçerli format: AAPL, MSFT, GOOGL, THYAO, THYAO.IS`);
        return;
      }
      
      await ctx.reply(`📈 Hisse senetleri yükleniyor...`);
      
      if (symbols.length === 1) {
        // Single stock - detailed view
        const quote = await fetchStockQuote(symbols[0]!);
        await ctx.reply(formatStockForTelegram(quote));
      } else {
        // Multiple stocks - compact view
        const result = await fetchMultipleStocks(symbols);
        await ctx.reply(formatMultipleStocksForTelegram(result, symbols.length));
      }
      
    } catch (error: any) {
      logger.error('Error fetching stock price:', error);
      
      if (error.code === 'ECONNABORTED') {
        await ctx.reply('❌ İstek zaman aşımına uğradı. Lütfen tekrar deneyin.');
      } else if (error.message?.includes('not found')) {
        const inputSymbol = input.split(' ')[0]?.toUpperCase();
        if (inputSymbol && inputSymbol.match(/^[A-Z]{4,5}$/)) {
          await ctx.reply(`❌ ${inputSymbol} hisse senedi bulunamadı.\n\n📝 Not: Yahoo Finance Türk borsası verilerini sınırlı şekilde destekler. Lütfen .IS ekleyerek deneyin:\n/s ${inputSymbol}.IS\n\n✅ Desteklenen borsalar:\n• Amerikan borsası: AAPL, TSLA, MSFT, GOOGL\n• Türk borsası: Bazı hisseler (.IS ile)`);
        } else {
          await ctx.reply('❌ Hisse senedi bulunamadı. Sembolü kontrol edin.\n\nÖrnek: /s AAPL\n/s TSLA\n/s THYAO.IS');
        }
      } else {
        await ctx.reply('❌ Hisse senedi fiyatı alınamadı. Lütfen tekrar deneyin.');
      }
    }
  });
  
  // /stock alias for /s
  bot.command('stock', async (ctx: Context) => {
    const input = (ctx.match as string | undefined)?.trim();
    
    if (!input) {
      await ctx.reply('❓ Hisse senedi sembolü belirtin:\n/stock AAPL\n/stock TSLA\n/stock NVDA\n\nYardım için /s komutunu kullanabilirsiniz.');
      return;
    }
    
    // Process the same as /s command
    ctx.match = input;
    // Re-use the /s command logic
    const symbols = input.split(' ').map(s => s.trim().toUpperCase());
    
    try {
      const invalidSymbols = symbols.filter(symbol => !/^[A-Z]{1,5}(\.[A-Z]{1,2})?(\.IS)?$/.test(symbol));
      if (invalidSymbols.length > 0) {
        await ctx.reply(`❌ Geçersiz semboller: ${invalidSymbols.join(', ')}\n\nGeçerli format: AAPL, MSFT, GOOGL, THYAO, THYAO.IS`);
        return;
      }
      
      await ctx.reply(`📈 Hisse senetleri yükleniyor...`);
      
      if (symbols.length === 1) {
        const quote = await fetchStockQuote(symbols[0]!);
        await ctx.reply(formatStockForTelegram(quote));
      } else {
        const result = await fetchMultipleStocks(symbols);
        await ctx.reply(formatMultipleStocksForTelegram(result, symbols.length));
      }
      
    } catch (error: any) {
      logger.error('Error fetching stock price:', error);
      
      if (error.code === 'ECONNABORTED') {
        await ctx.reply('❌ İstek zaman aşımına uğradı. Lütfen tekrar deneyin.');
      } else if (error.message?.includes('not found')) {
        await ctx.reply('❌ Hisse senedi bulunamadı. Sembolü kontrol edin.\n\nÖrnek: /stock AAPL');
      } else {
        await ctx.reply('❌ Hisse senedi fiyatı alınamadı. Lütfen tekrar deneyin.');
      }
    }
  });
}
