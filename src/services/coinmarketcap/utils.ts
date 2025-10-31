import { CMCQuote } from './types';

export function formatPrice(price: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: price < 1 ? 6 : 2
  }).format(price);
}

export function formatLargeNumber(num: number): string {
  if (num >= 1e12) {
    return `$${(num / 1e12).toFixed(2)}T`;
  } else if (num >= 1e9) {
    return `$${(num / 1e9).toFixed(2)}B`;
  } else if (num >= 1e6) {
    return `$${(num / 1e6).toFixed(2)}M`;
  } else if (num >= 1e3) {
    return `$${(num / 1e3).toFixed(2)}K`;
  }
  return `$${num.toFixed(2)}`;
}

export function formatPercentage(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

export function getChangeEmoji(changePercent: number): string {
  if (changePercent > 5) return '🚀';
  if (changePercent > 0) return '↗️';
  if (changePercent < -5) return '🧨';
  if (changePercent < 0) return '↘️';
  return '➡️';
}

export function formatCMCQuoteForTelegram(quote: CMCQuote): string {
  const changeEmoji = getChangeEmoji(quote.changePercent24h);
  
  return (
    `🪙 ${quote.symbol} (${quote.name})\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `💰 Fiyat: ${formatPrice(quote.price)}\n` +
    `📈 24s Değişim: ${formatPercentage(quote.changePercent24h)} ${changeEmoji}\n` +
    `📊 24s Hacim: ${formatLargeNumber(quote.volume24h)}\n` +
    `💎 Piyasa Değeri: ${formatLargeNumber(quote.marketCap)}\n` +
    `🔄 Dolaşan Arz: ${quote.circulatingSupply.toLocaleString()}\n` +
    `━━━━━━━━━━━━━━━━━━━━`
  );
}

export function isValidSymbol(symbol: string): boolean {
  return /^[A-Z]{2,10}$/.test(symbol);
}
