export { CoinMarketCapClient, cmcClient } from './client';
export { CMCKeyManager, cmcKeyManager } from './key-manager';
export { CMCQuote, CMCSymbolData, CMCResponse } from './types';
export * from './utils';

// Quick access functions
export async function getCryptoPrice(symbol: string): Promise<number> {
  const { cmcClient } = await import('./client');
  const quote = await cmcClient.getLatestQuote(symbol);
  return quote.price;
}

export async function getCryptoChange(symbol: string): Promise<number> {
  const { cmcClient } = await import('./client');
  const quote = await cmcClient.getLatestQuote(symbol);
  return quote.changePercent24h;
}

export async function getMultiplePrices(symbols: string[]): Promise<Record<string, number>> {
  const { cmcClient } = await import('./client');
  const quotes = await cmcClient.getMultipleQuotes(symbols);
  const prices: Record<string, number> = {};
  
  quotes.forEach((quote: any) => {
    prices[quote.symbol] = quote.price;
  });
  
  return prices;
}
