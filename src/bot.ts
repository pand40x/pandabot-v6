import { Bot, Middleware } from 'grammy';
import type { Context } from 'grammy';
import type { Update } from '@grammyjs/types';
import { config, isModuleActive } from './config/env';
import { logger, logUserAction, logError } from './core/logger';
import { db } from './core/db';

// Global bot instance for use in other modules
export let bot: Bot;

// Rate limiting store (in-memory)
const rateLimitStore = new Map<number, { count: number; resetTime: number }>();

// Rate limiting middleware
const rateLimitMiddleware: Middleware = async (ctx: Context, next) => {
  const userId = ctx.from?.id;
  if (!userId) return next();
  
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = config.limits.rateLimitPerMinute;
  
  const userLimit = rateLimitStore.get(userId);
  
  if (!userLimit || now > userLimit.resetTime) {
    rateLimitStore.set(userId, {
      count: 1,
      resetTime: now + windowMs
    });
    return next();
  }
  
  if (userLimit.count >= maxRequests) {
    const waitTime = Math.ceil((userLimit.resetTime - now) / 1000);
    await ctx.reply(
      `⏱️ Çok hızlı komut gönderiyorsunuz.\n` +
      `${waitTime} saniye bekleyin.`
    );
    return;
  }
  
  userLimit.count++;
  return next();
};

// Watchlist name middleware (handle direct list name input)
const watchlistNameMiddleware: Middleware = async (ctx: Context, next) => {
  const text = ctx.message?.text?.trim();
  
  // Skip if it's a command
  if (!text || text.startsWith('/')) {
    return next();
  }
  
  // Check if user is blocked
  const userId = ctx.from?.id;
  if (!userId) return next();
  
  try {
    const { Watchlist } = await import('./modules/watchlists/model');
    
    const watchlist = await Watchlist.findOne({
      userId,
      listName: text
    });
    
    if (watchlist) {
      logUserAction(userId, 'watchlist_direct_access', { listName: text });
      
      const symbols = watchlist.tickers.map(t => t.symbol);
      
      if (symbols.length === 0) {
        await ctx.reply(`📋 ${watchlist.listName}\n━━━━━━━━━━━━━━━━━━━━\nListe boş.\n━━━━━━━━━━━━━━━━━━━━`);
        return;
      }
      
      // Get prices based on type
      if (watchlist.type === 'crypto') {
        // Use CoinMarketCap for crypto
        const { cmcClient } = await import('./services/coinmarketcap/client');
        const quotes = await cmcClient.getMultipleQuotes(symbols);
        
        const userName = ctx.from?.first_name || ctx.from?.username || 'User';
        let message = `📋 ${userName} - ${watchlist.listName}\n\n`;
        let totalChange = 0;
        
        quotes.forEach((quote) => {
          const changeEmoji = quote.changePercent24h > 0 ? '↗️' : '↘️';
          const priceFormatted = quote.price.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          });
          message += `${quote.symbol}  $${priceFormatted}  ${quote.changePercent24h.toFixed(2)}% ${changeEmoji}\n`;
          totalChange += quote.changePercent24h;
        });
        
        const avgChange = totalChange / quotes.length;
        message += `\n📈 Ort. Değişim: ${avgChange > 0 ? '+' : ''}${avgChange.toFixed(2)}%`;
        
        await ctx.reply(message);
      } else {
        // Use Yahoo Finance for stocks
        const YahooFinance = (await import('yahoo-finance2')).default;
        const yahooClient = new YahooFinance({ suppressNotices: ['yahooSurvey'] });
        
        const quotes = [];
        
        for (const symbol of symbols) {
          try {
            let searchSymbol = symbol;
            if (symbol.length >= 4 && symbol.length <= 5 && !symbol.includes('.')) {
              searchSymbol = `${symbol}.IS`;
            }
            
            const quoteData = await yahooClient.quote(searchSymbol);
            
            if (quoteData && (quoteData.regularMarketPrice || quoteData.regularMarketPreviousClose)) {
              quotes.push({
                symbol: symbol,
                price: quoteData.regularMarketPrice || quoteData.regularMarketPreviousClose,
                change: quoteData.regularMarketChange || 0,
                changePercent: quoteData.regularMarketChangePercent || 0,
                name: quoteData.shortName || symbol
              });
            }
          } catch (error) {
            console.error(`Failed to fetch ${symbol}:`, error);
          }
        }
        
        const userName = ctx.from?.first_name || ctx.from?.username || 'User';
        let message = `📋 ${userName} - ${watchlist.listName} (Hisse)\n\n`;
        
        quotes.forEach((quote) => {
          const changeEmoji = quote.change >= 0 ? '▲' : '🔻';
          const changePercentFormatted = quote.changePercent >= 0 ? `+${quote.changePercent.toFixed(2)}%` : `${quote.changePercent.toFixed(2)}%`;
          const priceFormatted = quote.price.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          });
          
          message += `${quote.symbol}  ${priceFormatted} ₺  ${changePercentFormatted} ${changeEmoji}\n`;
        });
        
        if (quotes.length === 0) {
          message += `❌ Hiç hisse fiyatı alınamadı.\n`;
        } else {
          const avgChange = quotes.reduce((sum, q) => sum + q.changePercent, 0) / quotes.length;
          message += `\n📈 Ort. Değişim: ${avgChange >= 0 ? '+' : ''}${avgChange.toFixed(2)}%`;
        }
        
        await ctx.reply(message);
      }
      
      return;
    }
  } catch (error) {
    logError(error as Error, { ctx, text });
  }
  
  return next();
};

// Create and configure bot instance
export function createBot(): Bot {
  const newBot = new Bot(config.bot.token);
  
  // Apply middleware
  newBot.use(rateLimitMiddleware);
  newBot.use(watchlistNameMiddleware);
  
  // Global error handler
  newBot.catch((err) => {
    const ctx = err.ctx;
    const error = err.error as Error;
    
    logError(error as Error, {
      updateId: ctx.update.update_id,
      userId: ctx.from?.id,
      chatId: ctx.chat?.id
    });
    
    // Notify admin of critical errors
    import('./core/logger').then(({ notifyAdminOfError }) => {
      notifyAdminOfError(error as Error, {
        module: 'bot',
        updateId: ctx.update.update_id,
        userId: ctx.from?.id,
        chatId: ctx.chat?.id
      });
    });
    
    // Handle blocked user
    if (error.message?.includes('chat not found')) {
      const userId = ctx.from?.id;
      const firstName = ctx.from?.first_name || 'Unknown';
      
      if (userId) {
        db.getConnection().collection('users').updateOne(
          { telegramId: userId },
          { 
            $set: { 
              isBlocked: true,
              blockedAt: new Date()
            }
          }
        ).then(() => {
          // Notify admin of blocked user
          import('./core/logger').then(({ notifyAdminOfBlockedUser }) => {
            notifyAdminOfBlockedUser(userId, firstName);
          });
        }).catch(err => logError(err));
      }
    }
  });
  
  // Start command
  newBot.command('start', async (ctx) => {
    const welcomeMessage = `
🎉 PandaBot'a hoş geldin!

Ben senin finansal asistanınım. 
Aşağıdaki komutları kullanabilirsin:

📊 /price - Kripto fiyat sorgula
📈 /s - Hisse senedi fiyat sorgula
📋 /watchlist - İzleme listesi oluştur
📝 /note - Not al
⏰ /remind - Hatırlatma kur
🔔 /alert - Fiyat alarmı
🤖 /ai - AI'ya sor
💱 /dolar - USD/TRY kur

Yardım için /help yazabilirsin!

📝 Özellik: Liste adını komutsuz direkt yazarak fiyatlarını görebilirsin!
`;
    
    await ctx.reply(welcomeMessage);
  });
  
  // Help command
  newBot.command('help', async (ctx) => {
    const helpMessage = `
📚 Yardım
━━━━━━━━━━━━━━━━━━━━
📊 Fiyat Sorgulama
  /price <SYMBOL>     Ör: /price BTC

📈 Hisse Senetleri
  /s <SYMBOL>         Ör: /s AAPL
  /s AAPL MSFT GOOGL  (çoklu sorgu)
  /stock <SYMBOL>     Alternatif komut

📋 İzleme Listeleri
  /watchlist create <NAME> <SYMBOLS>
  /watchlist add <NAME> <SYMBOL>
  /watchlist remove <NAME> <SYMBOL>
  /watchlist show <NAME>
  /watchlist delete <NAME>
  /watchlists           (tüm listeler)
  Ör: /watchlist create my-coins BTC ETH

📝 Notlar
  /note add <İÇERİK>
  /note list
  /note edit <ID> <YENİ>
  /note delete <ID>

⏰ Hatırlatmalar
  /remind <TIME> <MESAJ>
  /reminders
  /remind cancel <ID>
  Ör: /remind 15:30 Fatura öde

🔔 Fiyat Alarmları
  /alert <SYMBOL> <%DEĞİŞİM>
  /alerts
  /alert cancel <ID>
  /alert delete <SYMBOL>
  Ör: /alert BTC -5%

🤖 AI Asistan
  /ai <SORU>
  Ör: /ai Bitcoin hakkında ne düşünüyorsun?

💱 Döviz
  /dolar          USD/TRY kur

⭐ Özel Özellik:
Liste adını komutsuz direkt yazarak fiyatlarını görebilirsin!
Ör: "my-coins" yazınca otomatik görüntüler

━━━━━━━━━━━━━━━━━━━━
`;
    await ctx.reply(helpMessage);
  });
  
  // Store global bot instance
  bot = newBot;
  
  logger.info('🤖 Bot created successfully');
  
  return newBot;
}

// Initialize bot and modules
export async function initializeBot(): Promise<Bot> {
  const bot = createBot();
  
  try {
    // Register modules
    const { registerModules } = await import('./modules');
    registerModules(bot);
    
    logger.info('📦 All modules registered');
    
    return bot;
  } catch (error) {
    logError(error as Error, { context: 'initializeBot' });
    throw error;
  }
}
