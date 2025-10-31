import { Bot } from 'grammy';
import type { Context } from 'grammy';
import { InlineKeyboard } from 'grammy';
import { Watchlist } from './model';
import { binanceClient } from '../../services/binance/client';
import { logger } from '../../core/logger';

// Yahoo Finance client for stock prices
let yahooFinanceClient: any = null;

async function getYahooFinanceClient() {
  if (!yahooFinanceClient) {
    const YahooFinance = (await import('yahoo-finance2')).default;
    yahooFinanceClient = new YahooFinance({ suppressNotices: ['yahooSurvey'] });
  }
  return yahooFinanceClient;
}

async function fetchStockQuotes(symbols: string[]) {
  const yf = await getYahooFinanceClient();
  const quotes = [];
  
  for (const symbol of symbols) {
    try {
      // Try with .IS for Turkish stocks
      let searchSymbol = symbol;
      if (symbol.length >= 4 && symbol.length <= 5 && !symbol.includes('.')) {
        searchSymbol = `${symbol}.IS`;
      }
      
      logger.info(`Fetching stock quote for ${searchSymbol}`);
      const quoteData = await yf.quote(searchSymbol);
      
      if (quoteData && quoteData.regularMarketPrice) {
        quotes.push({
          symbol: symbol,
          price: quoteData.regularMarketPrice || 0,
          change: quoteData.regularMarketChange || 0,
          changePercent: quoteData.regularMarketChangePercent || 0,
          name: quoteData.shortName || symbol
        });
        logger.info(`✅ Got quote for ${symbol}: ${quoteData.regularMarketPrice}`);
      } else {
        logger.warn(`⚠️ No price data for ${symbol}`);
      }
    } catch (error) {
      logger.error(`❌ Failed to fetch quote for ${symbol}:`, error);
    }
  }
  
  logger.info(`📊 Total quotes fetched: ${quotes.length}/${symbols.length}`);
  return quotes;
}

// Temporary storage for watchlist creation requests (for 60 seconds)
const pendingCreates = new Map<string, { listName: string; symbols: string[]; timestamp: number }>();

// BIST 100 Hisse Senetleri Listesi (popüler 50)
const BIST_TICKERS = [
  'AKBNK', 'ISCTR', 'VAKBN', 'GARAN', 'THYAO', 'PGSUS', 'ASELS', 'TUPRS', 'TCELL', 'TOFAS',
  'OTKAR', 'KCHOL', 'ARCLK', 'BIMAS', 'FROTO', 'KORDS', 'SAHOL', 'ALARK', 'ISGYO', 'TTRAK',
  'VESTL', 'PETKM', 'HEKTS', 'EKGYO', 'SISE', 'AGHOL', 'GUBRF', 'ISDMR', 'CIMSA', 'PNSUT',
  'ULKER', 'TKFEN', 'MAVI', 'BRISA', 'MGROS', 'BAGFS', 'BRSAN', 'OYAKC', 'KOZAL', 'GSDHO',
  'CCOLA', 'FENER', 'HALKB', 'KRDMD', 'MPARK', 'SOKM', 'TAVHL', 'YKBNK', 'ZOREN', 'ENJSA'
];

// Kripto popüler listesi
const CRYPTO_TICKERS = ['BTC', 'ETH', 'DOGE', 'ADA', 'DOT', 'SOL', 'AVAX', 'MATIC', 'ATOM', 'LINK'];

export function registerWatchlistsModule(bot: Bot) {
  // /watchlist command
  bot.command('watchlist', async (ctx: Context) => {
    const input = (ctx.match as string | undefined)?.trim();
    
    if (!input) {
      await ctx.reply(`❓ Kullanım:\n/watchlist create <LIST_NAME> <SYMBOLS>\n\n💡 Hızlı listeler:\n/watchlist create crypto-all      (popüler kripto)\n/watchlist create bist-all        (BIST 100 hisse)\n\n📋 Örnekler:\n/watchlist create my-coins BTC ETH SOL\n/watchlist create banking AKBNK ISCTR GARAN\n\n💻 Mevcut: /watchlists`);
      return;
    }
    
    const parts = input.split(' ');
    const action = parts[0].toLowerCase();
    
    try {
      switch (action) {
        case 'create': {
          const listName = parts[1];
          const symbols = parts.slice(2).map(s => s.toUpperCase());
          
          if (!listName) {
            await ctx.reply('❌ Liste adı gerekli.\nÖr: /watchlist create my-coins BTC ETH');
            return;
          }
          
          if (symbols.length === 0) {
            await ctx.reply('❌ Semboller gerekli.\nÖr: /watchlist create my-coins BTC ETH');
            return;
          }
          
          // Special list names
          if (listName === 'crypto-all') {
            await Watchlist.findOneAndUpdate(
              { userId: ctx.from!.id, listName: 'crypto-all' },
              {
                userId: ctx.from!.id,
                listName: 'crypto-all',
                type: 'crypto',
                tickers: CRYPTO_TICKERS.map(symbol => ({ symbol })),
                $setOnInsert: { createdAt: new Date() }
              },
              { upsert: true, new: true }
            );
            
            await ctx.reply(`✅ Kripto watchlist oluşturuldu: crypto-all\nSemboller: ${CRYPTO_TICKERS.join(', ')}\nToplam: ${CRYPTO_TICKERS.length} sembol`);
            return;
          }
          
          if (listName === 'bist-all') {
            await Watchlist.findOneAndUpdate(
              { userId: ctx.from!.id, listName: 'bist-all' },
              {
                userId: ctx.from!.id,
                listName: 'bist-all',
                type: 'stock',
                tickers: BIST_TICKERS.map(symbol => ({ symbol })),
                $setOnInsert: { createdAt: new Date() }
              },
              { upsert: true, new: true }
            );
            
            await ctx.reply(`✅ Hisse watchlist oluşturuldu: bist-all\nSemboller: ${BIST_TICKERS.slice(0, 10).join(', ')}...\nToplam: ${BIST_TICKERS.length} hisse`);
            return;
          }
          
          // Ask user to choose type with inline keyboard
          const keyboard = new InlineKeyboard()
            .text('🔐 Kripto', `watchlist_create_crypto_${listName}`)
            .text('📈 Hisse', `watchlist_create_stock_${listName}`);
          
          await ctx.reply(
            `📋 **Liste Adı:** ${listName}\n` +
            `🔢 **Semboller:** ${symbols.slice(0, 10).join(', ')}${symbols.length > 10 ? '...' : ''}\n\n` +
            `❓ **Hangi türde kaydedilsin?**\n\n` +
            `🔐 **Kripto** - Binance API ile fiyat takibi\n` +
            `📈 **Hisse** - BIST hisse senetleri listesi`,
            { reply_markup: keyboard }
          );
          
          // Store creation request for 60 seconds
          const userId = ctx.from!.id.toString();
          pendingCreates.set(userId, {
            listName,
            symbols,
            timestamp: Date.now()
          });
          
          // Clean up expired requests after 60 seconds
          setTimeout(() => {
            pendingCreates.delete(userId);
          }, 60000);
          
          break;
        }
        
        case 'add': {
          const listName = parts[1];
          const symbols = parts.slice(2).map(s => s.toUpperCase());
          
          if (!listName || symbols.length === 0) {
            await ctx.reply('❌ Liste adı ve sembol(ler) gerekli.\nÖr: /watchlist add my-coins ADA\nÖr: /watchlist add my-coins ADA BTC ETH');
            return;
          }
          
          const watchlist = await Watchlist.findOne({ userId: ctx.from!.id, listName });
          
          if (!watchlist) {
            await ctx.reply(`❌ "${listName}" listesi bulunamadı.`);
            return;
          }
          
          const added = [];
          const alreadyExist = [];
          const invalid = [];
          
          for (const symbol of symbols) {
            // Validation
            if (!/^[A-Z]{2,10}(\.[A-Z]{1,2})?$/.test(symbol)) {
              invalid.push(symbol);
              continue;
            }
            
            if (watchlist.tickers.some(t => t.symbol === symbol)) {
              alreadyExist.push(symbol);
            } else {
              watchlist.tickers.push({ symbol, addedAt: new Date() } as any);
              added.push(symbol);
            }
          }
          
          if (added.length > 0) {
            await watchlist.save();
          }
          
          let response = '';
          if (added.length > 0) {
            response += `✅ Eklendi: ${added.join(', ')}\n`;
          }
          if (alreadyExist.length > 0) {
            response += `⚠️  Zaten var: ${alreadyExist.join(', ')}\n`;
          }
          if (invalid.length > 0) {
            response += `❌ Geçersiz: ${invalid.join(', ')}`;
          }
          
          await ctx.reply(response.trim());
          break;
        }
        
        case 'remove': {
          const listName = parts[1];
          const symbols = parts.slice(2).map(s => s.toUpperCase());
          
          if (!listName || symbols.length === 0) {
            await ctx.reply('❌ Liste adı ve sembol(ler) gerekli.\nÖr: /watchlist remove my-coins SOL\nÖr: /watchlist remove my-coins SOL BTC ETH');
            return;
          }
          
          const removed = [];
          const notFound = [];
          
          for (const symbol of symbols) {
            const result = await Watchlist.updateOne(
              { userId: ctx.from!.id, listName },
              { $pull: { tickers: { symbol } } }
            );
            
            if (result.modifiedCount > 0) {
              removed.push(symbol);
            } else {
              notFound.push(symbol);
            }
          }
          
          let response = '';
          if (removed.length > 0) {
            response += `✅ Kaldırıldı: ${removed.join(', ')}\n`;
          }
          if (notFound.length > 0) {
            response += `⚠️  Bulunamadı: ${notFound.join(', ')}`;
          }
          
          await ctx.reply(response.trim());
          break;
        }
        
        case 'delete': {
          const listName = parts[1];
          
          if (!listName) {
            await ctx.reply('❌ Liste adı gerekli.\nÖr: /watchlist delete my-coins');
            return;
          }
          
          await Watchlist.deleteOne({ userId: ctx.from!.id, listName });
          await ctx.reply(`✅ "${listName}" listesi silindi.`);
          break;
        }
        
        case 'show': {
          const listName = parts[1];
          
          if (!listName) {
            await ctx.reply('❌ Liste adı gerekli.\nÖr: /watchlist show my-coins');
            return;
          }
          
          const watchlist = await Watchlist.findOne({ userId: ctx.from!.id, listName });
          
          if (!watchlist) {
            await ctx.reply(`❌ "${listName}" listesi bulunamadı.`);
            return;
          }
          
          const symbols = watchlist.tickers.map(t => t.symbol);
          
          if (symbols.length === 0) {
            const userName = ctx.from?.first_name || ctx.from?.username || 'User';
            await ctx.reply(`📋 ${userName} - ${listName}\n\nListe boş.`);
            return;
          }
          
          // Get prices based on type
          let message = '';
          let totalChange = 0;
          
          logger.info(`[WATCHLIST DEBUG] listName=${listName}, type=${watchlist.type}, symbols=${symbols.join(',')}`);
          
          if (watchlist.type === 'crypto') {
            // Use Binance API
            const quotes = await binanceClient.getMultipleQuotes(symbols);
            
            const userName = ctx.from?.first_name || ctx.from?.username || 'User';
            message = `📋 ${userName} - ${listName} (Kripto)\n\n`;
            
            quotes.forEach((quote) => {
              const changeEmoji = quote.changePercent24h > 0 ? '↗️' : '↘️';
              const priceFormatted = quote.price.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              });
              message += `${quote.symbol}  $${priceFormatted}  ${quote.changePercent24h.toFixed(2)}% ${changeEmoji}\n`;
              totalChange += quote.changePercent24h;
            });
            
            const avgChange = quotes.length > 0 ? totalChange / quotes.length : 0;
            message += `\n📈 Ort. Değişim: ${avgChange > 0 ? '+' : ''}${avgChange.toFixed(2)}%`;
          } else {
            // Stock watchlist - use Yahoo Finance
            logger.info(`[WATCHLIST DEBUG] Using Yahoo Finance for ${symbols.length} symbols`);
            const quotes = await fetchStockQuotes(symbols);
            logger.info(`[WATCHLIST DEBUG] Yahoo Finance returned ${quotes.length} quotes`);
            
            const userName = ctx.from?.first_name || ctx.from?.username || 'User';
            message = `📋 ${userName} - ${listName} (Hisse)\n\n`;
            
            quotes.forEach((quote) => {
              const changeEmoji = quote.change >= 0 ? '▲' : '🔻';
              const changePercentFormatted = quote.changePercent >= 0 ? `+${quote.changePercent.toFixed(2)}%` : `${quote.changePercent.toFixed(2)}%`;
              const rocketEmoji = quote.changePercent >= 15 ? ' 🚀' : '';
              
              const priceFormatted = quote.price.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              });
              
              message += `${quote.symbol}  ${priceFormatted} ₺  ${changePercentFormatted} ${changeEmoji}${rocketEmoji}\n`;
            });
            
            if (quotes.length === 0) {
              message += `❌ Hiç hisse fiyatı alınamadı.\n`;
            } else {
              const avgChange = quotes.reduce((sum, q) => sum + q.changePercent, 0) / quotes.length;
              message += `\n📈 Ort. Değişim: ${avgChange >= 0 ? '+' : ''}${avgChange.toFixed(2)}%`;
            }
          }
          
          await ctx.reply(message);
          break;
        }
        
        default:
          await ctx.reply(`❓ Komutlar:\n/watchlist create <NAME> <SYMBOLS>\n/watchlist add <NAME> <SYMBOL>\n/watchlist remove <NAME> <SYMBOL>\n/watchlist show <NAME>\n/watchlist delete <NAME>\n/watchlists`);
      }
    } catch (error) {
      logger.error('Error in watchlist command:', error);
      await ctx.reply('❌ Bir hata oluştu.');
    }
  });
  
  // /watchlists command - list all watchlists
  bot.command('watchlists', async (ctx) => {
    try {
      const watchlists = await Watchlist.find({ userId: ctx.from!.id });
      
      if (watchlists.length === 0) {
        await ctx.reply(`📝 İzleme listeniz bulunmuyor.\n\n💡 Hızlı başlangıç:\n/watchlist create crypto-all\n/watchlist create bist-all\n\n📋 Liste oluştur: /watchlist create <NAME> <SYMBOLS>`);
        return;
      }
      
      let message = `📋 İzleme Listeleriniz (${watchlists.length})\n━━━━━━━━━━━━━━━━━━━━\n`;
      watchlists.forEach((wl, index) => {
        const type = wl.type === 'crypto' ? '🔐' : '📈';
        message += `${index + 1}. ${type} ${wl.listName} (${wl.tickers.length} ${wl.type === 'crypto' ? 'sembol' : 'hisse'})\n`;
      });
      message += `\n━━━━━━━━━━━━━━━━━━━━\n💡 Görüntüle: /watchlist show <NAME>\n🗑️ Sil: /watchlist delete <NAME>`;
      
      await ctx.reply(message);
    } catch (error) {
      logger.error('Error fetching watchlists:', error);
      await ctx.reply('❌ Listeler alınamadı.');
    }
  });
  
  // Callback query handler for watchlist creation
  bot.callbackQuery(/watchlist_create_(crypto|stock)_(.+)/, async (ctx) => {
    const type = ctx.match[1] as 'crypto' | 'stock';
    const listName = ctx.match[2];
    const userId = ctx.from!.id.toString();
    
    await ctx.answerCallbackQuery();
    
    // Get pending creation request
    const pending = pendingCreates.get(userId);
    
    if (!pending || pending.listName !== listName) {
      await ctx.reply('❌ İstek süresi dolmuş. Lütfen komutu yeniden gönderin.');
      return;
    }
    
    try {
      const { listName: actualListName, symbols } = pending;
      
      // Create the watchlist
      await Watchlist.findOneAndUpdate(
        { userId, listName: actualListName },
        {
          userId,
          listName: actualListName,
          type,
          tickers: symbols.map(symbol => ({ symbol })),
          $setOnInsert: { createdAt: new Date() }
        },
        { upsert: true, new: true }
      );
      
      // Clean up
      pendingCreates.delete(userId);
      
      const typeText = type === 'crypto' ? 'Kripto' : 'Hisse';
      const typeEmoji = type === 'crypto' ? '🔐' : '📈';
      
      await ctx.editMessageText(
        `${typeEmoji} **${typeText} Watchlist Oluşturuldu!**\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `📋 **Liste:** ${actualListName}\n` +
        `🔢 **Semboller:** ${symbols.slice(0, 10).join(', ')}${symbols.length > 10 ? '...' : ''}\n` +
        `📊 **Toplam:** ${symbols.length} ${type === 'crypto' ? 'sembol' : 'hisse'}\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `✅ Artık fiyatları takip edebilirsiniz!\n` +
        `💡 Görüntüle: /watchlist show ${actualListName}`
      );
      
    } catch (error) {
      logger.error('Error creating watchlist:', error);
      await ctx.reply('❌ Liste oluşturulurken bir hata oluştu.');
    }
  });
}
