import { connectDB } from '../core/db';
import { Alert } from '../modules/alerts/model';
import { binanceClient } from '../services/binance/client';
import { Bot } from 'grammy';
import { logger } from '../core/logger';
import { formatAlertMessage } from '../utils/priceFormatter';

const bot = new Bot(process.env.BOT_TOKEN!);

const CHECK_INTERVAL_MINUTES = 5;
const COOLDOWN_MINUTES = 30;

async function checkAlerts() {
  try {
    // Get all active alerts
    const alerts = await Alert.find({ status: 'active' });
    
    if (alerts.length === 0) {
      return;
    }
    
    // Group alerts by symbol to minimize API calls
    const alertsBySymbol = new Map<string, typeof alerts>();
    
    for (const alert of alerts) {
      if (!alertsBySymbol.has(alert.symbol)) {
        alertsBySymbol.set(alert.symbol, [] as any);
      }
      alertsBySymbol.get(alert.symbol)!.push(alert);
    }
    
    // Get current prices for all symbols from Binance
    const symbols = Array.from(alertsBySymbol.keys());
    const quotes = await binanceClient.getMultipleQuotes(symbols);
    
    // Create a map of symbol -> quote
    const quoteMap = new Map(quotes.map(q => [q.symbol, q]));
    
    // Check each alert
    for (const alert of alerts) {
      try {
        const quote = quoteMap.get(alert.symbol);
        
        if (!quote) {
          logger.warn(`No quote found for ${alert.symbol}`);
          continue;
        }
        
        const currentPrice = quote.price;
        const priceChangePercent = ((currentPrice - alert.basePrice) / alert.basePrice) * 100;
        
        logger.info(`Alert ${alert.shortId} check: ${alert.symbol} - Current: $${currentPrice}, Base: $${alert.basePrice}, Change: ${priceChangePercent.toFixed(2)}%, Threshold: ${alert.thresholdPct}%`);
        
        // Check if threshold is reached
        const thresholdReached = alert.thresholdPct > 0 
          ? priceChangePercent >= alert.thresholdPct
          : priceChangePercent <= alert.thresholdPct;
        
        if (thresholdReached) {
          logger.info(`🎯 Alert threshold REACHED: ${alert.symbol} - Change: ${priceChangePercent.toFixed(2)}% >= ${alert.thresholdPct}%`);
        }
        
        // Check cooldown period
        const now = new Date();
        const lastTriggered = alert.lastTriggered;
        const cooldownPassed = !lastTriggered || 
          (now.getTime() - lastTriggered.getTime()) > (COOLDOWN_MINUTES * 60 * 1000);
        
        if (thresholdReached && cooldownPassed) {
          // Trigger alert with formatted message
          const message = formatAlertMessage(
            alert.symbol,
            alert.basePrice,
            currentPrice,
            priceChangePercent,
            alert.thresholdPct,
            alert.shortId
          );
          
          try {
            await bot.api.sendMessage(alert.userId, message);
            logger.info(`✅ Alert notification sent to user ${alert.userId} for ${alert.symbol}`);
          } catch (messageError) {
            logger.error(`❌ Failed to send alert notification to user ${alert.userId}:`, messageError);
          }
          
          // Update alert
          alert.currentPrice = currentPrice;
          alert.lastTriggered = now;
          await alert.save();
          
          logger.info(`Alert triggered for user ${alert.userId}, symbol ${alert.symbol}`);
        } else {
          // Update current price
          alert.currentPrice = currentPrice;
          await alert.save();
        }
        
      } catch (alertError) {
        logger.error(`Error processing alert ${alert._id}:`, alertError);
      }
    }
    
  } catch (error) {
    logger.error('Error in checkAlerts:', error);
  }
}

async function startAlertsWorker() {
  try {
    // Connect to database
    await connectDB();
    
    logger.info('✅ Alerts worker started');
    logger.info(`Checking alerts every ${CHECK_INTERVAL_MINUTES} minutes`);
    
    // Check alerts immediately on start
    await checkAlerts();
    
    // Set up interval to check alerts periodically
    const intervalMs = CHECK_INTERVAL_MINUTES * 60 * 1000;
    setInterval(checkAlerts, intervalMs);
    
    // Handle graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('Shutting down alerts worker...');
      process.exit(0);
    });
    
    process.on('SIGINT', async () => {
      logger.info('Shutting down alerts worker...');
      process.exit(0);
    });
  } catch (error) {
    logger.error('Failed to start alerts worker:', error);
    process.exit(1);
  }
}

// Start worker if running directly
if (require.main === module) {
  startAlertsWorker();
}

export { startAlertsWorker };
