// Price formatting utilities for Turkish market

export interface PriceDisplay {
  symbol: string;
  priceFormatted: string;
  changeFormatted: string;
  emoji: string;
  rocketEmoji: string;
}

// Symbol to emoji mapping - Only BTC and ETH
const SYMBOL_EMOJIS: Record<string, string> = {
  'BTC': '₿',
  'BTCUSDT': '₿',
  'ETH': 'Ξ',
  'ETHUSDT': 'Ξ'
};

/**
 * Format price in Turkish style
 * Input: 110621.06
 * Output: 110.621,06
 */
export function formatPriceTurkish(price: number): string {
  return price.toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 8
  });
}

/**
 * Format change percentage
 * Input: -2.27
 * Output: (-2.27%)
 */
function formatChange(changePct: number): string {
  const sign = changePct >= 0 ? '+' : '';
  return `(${sign}${changePct.toFixed(2)}%)`;
}

/**
 * Format full price display with emoji in single line format
 */
export function formatPriceDisplay(symbol: string, price: number, changePct: number): PriceDisplay {
  // Get emoji for symbol, or empty string if no emoji
  let emoji = SYMBOL_EMOJIS[symbol] || SYMBOL_EMOJIS[symbol + 'USDT'] || '';
  
  // Create display symbol (emoji + symbol name + colon)
  const displaySymbol = `${emoji}${symbol}:`;
  
  // Format price
  const priceFormatted = `${formatPriceTurkish(price)} $`;
  
  // Format change with emoji
  const changeFormatted = formatChange(changePct);
  const directionEmoji = changePct >= 0 ? '▲' : '🔻';
  
  // Add rocket emoji for big gains (>= 15%)
  const rocketEmoji = changePct >= 15 ? ' 🚀' : '';
  
  return {
    symbol: displaySymbol,
    priceFormatted,
    changeFormatted: `${directionEmoji} ${changeFormatted}`,
    emoji: directionEmoji,
    rocketEmoji
  };
}

/**
 * Create alert trigger message with formatted prices
 */
export function formatAlertMessage(
  symbol: string,
  basePrice: number,
  currentPrice: number,
  changePct: number,
  thresholdPct: number,
  shortId: number
): string {
  const display = formatPriceDisplay(symbol, currentPrice, changePct);
  const baseDisplay = formatPriceTurkish(basePrice);
  
  const thresholdFormatted = thresholdPct > 0 ? `+${thresholdPct}` : `${thresholdPct}`;
  
  return (
    `🔔 FİYAT ALARMI!\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `🪙 ${display.symbol}\n` +
    `📊 Taban: ${baseDisplay} $\n` +
    `💰 ${display.priceFormatted}\n` +
    `📈 Değişim: ${display.changeFormatted}${display.rocketEmoji}\n` +
    `🎯 Hedef: ${thresholdFormatted}%\n` +
    `🆔 ID: #${shortId}\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `✅ Alarm tetiklendi!`
  );
}

/**
 * Format alert list item with emoji and Turkish format
 */
export function formatAlertListItem(
  alert: any,
  currentPrice: number,
  changePct: number,
  basePrice: number
): string {
  const display = formatPriceDisplay(alert.symbol, currentPrice, changePct);
  const baseDisplay = formatPriceTurkish(basePrice);
  const priceChange = ((currentPrice - alert.basePrice) / alert.basePrice) * 100;
  const priceChangeFormatted = priceChange > 0 ? `+${priceChange.toFixed(2)}%` : `${priceChange.toFixed(2)}%`;
  const thresholdFormatted = alert.thresholdPct > 0 ? `+${alert.thresholdPct}%` : `${alert.thresholdPct}%`;
  
  return (
    `#${alert.shortId}. ${display.symbol}\n` +
    `   💰 Fiyat: ${display.priceFormatted} ${display.changeFormatted}${display.rocketEmoji}\n` +
    `   🎯 Eşik: ${thresholdFormatted} (${priceChangeFormatted} hedef)\n` +
    `   📅 Kuruldu: ${alert.createdAt.toLocaleDateString('tr-TR')}\n`
  );
}
