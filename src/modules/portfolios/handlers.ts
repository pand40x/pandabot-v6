import { Bot } from 'grammy';
import type { Context } from 'grammy';
import { Portfolio } from './model';
import { binanceClient } from '../../services/binance/client';
import { formatPriceDisplay, formatPriceTurkish } from '../../utils/priceFormatter';
import { logger } from '../../core/logger';

export function registerPortfoliosHandlers(bot: Bot) {
  // /portfolio command
  bot.command('portfolio', async (ctx: Context) => {
    const input = (ctx.match as string | undefined)?.trim();
    
    if (!input) {
      await ctx.reply(`❓ Kullanım:\n/portfolio show <PORTFOLIO_ADI>\n/portfolio add <PORTFOLIO> <MIKTAR> <SYMBOL>\n/portfolio remove <PORTFOLIO> <MIKTAR> <SYMBOL>\n/portfolio delete <PORTFOLIO>\n\nÖrnekler:\n/portfolio show my-portfolio\n/portfolio add my-portfolio 0.5 BTC`);
      return;
    }
    
    const parts = input.split(' ');
    const action = parts[0].toLowerCase();
    
    try {
      switch (action) {
        case 'show': {
          const portfolioName = parts[1];
          
          if (!portfolioName) {
            await ctx.reply('❌ Portfolio adı gerekli.\nÖrnek: /portfolio show my-portfolio');
            return;
          }
          
          const portfolio = await Portfolio.findOne({
            userId: ctx.from!.id,
            portfolioName
          });
          
          if (!portfolio) {
            await ctx.reply(`❌ "${portfolioName}" portföyü bulunamadı.`);
            return;
          }
          
          if (portfolio.items.length === 0) {
            await ctx.reply(`📊 ${portfolio.portfolioName}\n━━━━━━━━━━━━━━━━━━━━\nPortföy boş.\n━━━━━━━━━━━━━━━━━━━━`);
            return;
          }
          
          // Get current prices for all symbols from Binance
          const symbols = portfolio.items.map(item => item.symbol);
          const quotes = await binanceClient.getMultipleQuotes(symbols);
          const quoteMap = new Map(quotes.map(q => [q.symbol, q]));
          
          let message = `📊 ${portfolio.portfolioName}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
          let totalValue = 0;
          let totalCost = 0;
          
          portfolio.items.forEach((item, index) => {
            const quote = quoteMap.get(item.symbol);
            if (!quote) return;
            
            const currentValue = item.amount * quote.price;
            const cost = item.amount * (item.averagePrice || 0);
            const pnl = currentValue - cost;
            const pnlPercent = cost > 0 ? (pnl / cost) * 100 : 0;
            
            totalValue += currentValue;
            totalCost += cost;
            
            const display = formatPriceDisplay(item.symbol, quote.price, quote.changePercent24h);
            const currentValueFormatted = formatPriceTurkish(currentValue);
            const costFormatted = formatPriceTurkish(cost);
            
            const pnlEmoji = pnl >= 0 ? '↗️' : '↘️';
            const pnlFormatted = pnl >= 0 ? `+${currentValueFormatted} $` : `-${formatPriceTurkish(Math.abs(pnl))} $`;
            const pnlPercentFormatted = pnlPercent >= 0 ? `+${pnlPercent.toFixed(2)}%` : `${pnlPercent.toFixed(2)}%`;
            
            message += `${display.symbol} (${item.amount})\n`;
            message += `   💰 Değer: ${currentValueFormatted} $\n`;
            message += `   📊 P&L: ${pnlFormatted} (${pnlPercentFormatted}) ${pnlEmoji}\n\n`;
          });
          
          const totalPnl = totalValue - totalCost;
          const totalPnlPercent = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;
          const totalPnlEmoji = totalPnl >= 0 ? '↗️' : '↘️';
          const totalPnlFormatted = totalPnl >= 0 ? `+${formatPriceTurkish(totalPnl)} $` : `-${formatPriceTurkish(Math.abs(totalPnl))} $`;
          const totalPnlPercentFormatted = totalPnlPercent >= 0 ? `+${totalPnlPercent.toFixed(2)}%` : `${totalPnlPercent.toFixed(2)}%`;
          
          message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
          message += `💰 Toplam Değer: ${formatPriceTurkish(totalValue)} $\n`;
          message += `💸 Toplam Maliyet: ${formatPriceTurkish(totalCost)} $\n`;
          message += `📈 Toplam P&L: ${totalPnlFormatted} (${totalPnlPercentFormatted}) ${totalPnlEmoji}\n`;
          
          await ctx.reply(message);
          break;
        }
        
        case 'add': {
          const portfolioName = parts[1];
          const amount = parseFloat(parts[2]);
          const symbol = parts[3]?.toUpperCase();
          
          if (!portfolioName || !amount || !symbol) {
            await ctx.reply('❌ Portfolio adı, miktar ve sembol gerekli.\nÖrnek: /portfolio add my-portfolio 0.5 BTC');
            return;
          }
          
          if (amount <= 0) {
            await ctx.reply('❌ Miktar sıfırdan büyük olmalı.');
            return;
          }
          
          // Check if symbol is valid
          const quote = await binanceClient.getQuote(symbol);
          
          if (!quote) {
            await ctx.reply(`❌ ${symbol} bulunamadı.`);
            return;
          }
          
          // Find or create portfolio
          let portfolio = await Portfolio.findOne({
            userId: ctx.from!.id,
            portfolioName
          });
          
          if (!portfolio) {
            portfolio = await Portfolio.create({
              userId: ctx.from!.id,
              portfolioName,
              items: []
            });
          }
          
          // Check if symbol already exists in portfolio
          const existingItem = portfolio.items.find(item => item.symbol === symbol);
          
          if (existingItem) {
            // Update existing item
            const newAmount = existingItem.amount + amount;
            const newAveragePrice = ((existingItem.amount * (existingItem.averagePrice || 0)) + (amount * quote.price)) / newAmount;
            
            existingItem.amount = newAmount;
            existingItem.averagePrice = newAveragePrice;
            
            await portfolio.save();
            
            await ctx.reply(`✅ ${symbol} miktarı güncellendi!\nYeni Miktar: ${newAmount}\nOrt. Maliyet: $${newAveragePrice.toFixed(2)}`);
          } else {
            // Add new item
            portfolio.items.push({
              symbol,
              amount,
              averagePrice: quote.price,
              addedAt: new Date()
            } as any);
            
            await portfolio.save();
            
            await ctx.reply(`✅ ${symbol} eklendi!\nMiktar: ${amount}\nMaliyet: $${quote.price.toFixed(2)}`);
          }
          
          break;
        }
        
        case 'remove': {
          const portfolioName = parts[1];
          const amount = parseFloat(parts[2]);
          const symbol = parts[3]?.toUpperCase();
          
          if (!portfolioName || !amount || !symbol) {
            await ctx.reply('❌ Portfolio adı, miktar ve sembol gerekli.\nÖrnek: /portfolio remove my-portfolio 0.5 BTC');
            return;
          }
          
          if (amount <= 0) {
            await ctx.reply('❌ Miktar sıfırdan büyük olmalı.');
            return;
          }
          
          const portfolio = await Portfolio.findOne({
            userId: ctx.from!.id,
            portfolioName
          });
          
          if (!portfolio) {
            await ctx.reply(`❌ "${portfolioName}" portföyü bulunamadı.`);
            return;
          }
          
          const itemIndex = portfolio.items.findIndex(item => item.symbol === symbol);
          
          if (itemIndex === -1) {
            await ctx.reply(`❌ ${symbol} bu portföyde bulunamadı.`);
            return;
          }
          
          const existingItem = portfolio.items[itemIndex];
          
          if (amount >= existingItem.amount) {
            // Remove entire item
            portfolio.items.splice(itemIndex, 1);
            await portfolio.save();
            await ctx.reply(`✅ ${symbol} portföyden tamamen kaldırıldı.`);
          } else {
            // Update amount
            existingItem.amount -= amount;
            await portfolio.save();
            await ctx.reply(`✅ ${symbol} miktarı azaltıldı!\nYeni Miktar: ${existingItem.amount}`);
          }
          
          break;
        }
        
        case 'delete': {
          const portfolioName = parts[1];
          
          if (!portfolioName) {
            await ctx.reply('❌ Portfolio adı gerekli.\nÖrnek: /portfolio delete my-portfolio');
            return;
          }
          
          const result = await Portfolio.deleteOne({
            userId: ctx.from!.id,
            portfolioName
          });
          
          if (result.deletedCount === 0) {
            await ctx.reply(`❌ "${portfolioName}" portföyü bulunamadı.`);
            return;
          }
          
          await ctx.reply(`✅ "${portfolioName}" portföyü silindi!`);
          break;
        }
        
        default:
          await ctx.reply(`❓ Komutlar:\n/portfolio show <PORTFOLIO>\n/portfolio add <PORTFOLIO> <MIKTAR> <SYMBOL>\n/portfolio remove <PORTFOLIO> <MIKTAR> <SYMBOL>\n/portfolio delete <PORTFOLIO>`);
      }
    } catch (error) {
      logger.error('Error in portfolio command:', error);
      
      if (error instanceof Error && error.name === 'CastError') {
        await ctx.reply('❌ Geçersiz parametreler.');
        return;
      }
      
      await ctx.reply('❌ Bir hata oluştu.');
    }
  });
}
