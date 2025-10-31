import axios from 'axios';

const BINANCE_API_BASE = 'https://api.binance.com';

export interface BinanceTicker {
  symbol: string;
  price: number;
  changePercent24h: number;
}

export interface BinancePrice {
  symbol: string;
  price: number;
}

class BinanceClient {
  private async fetch<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    try {
      const response = await axios.get(`${BINANCE_API_BASE}${endpoint}`, {
        params,
        timeout: 10000
      });
      return response.data;
    } catch (error) {
      console.error('Binance API error:', error);
      throw error;
    }
  }

  /**
   * Get latest price for a single symbol
   */
  async getLatestPrice(symbol: string): Promise<BinancePrice | null> {
    try {
      const data = await this.fetch<{ symbol: string; price: string }>('/api/v3/ticker/price', {
        symbol: `${symbol}USDT`
      });
      
      return {
        symbol,
        price: parseFloat(data.price)
      };
    } catch (error) {
      console.error(`Error fetching price for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Get 24hr ticker statistics
   */
  async get24hrTicker(symbol: string): Promise<BinanceTicker | null> {
    try {
      const data = await this.fetch<{
        symbol: string;
        lastPrice: string;
        priceChangePercent: string;
      }>('/api/v3/ticker/24hr', {
        symbol: `${symbol}USDT`
      });
      
      return {
        symbol,
        price: parseFloat(data.lastPrice),
        changePercent24h: parseFloat(data.priceChangePercent)
      };
    } catch (error) {
      console.error(`Error fetching 24hr ticker for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Get multiple 24hr tickers
   */
  async getMultipleTickers(symbols: string[]): Promise<BinanceTicker[]> {
    try {
      const tickers = await this.fetch<Array<{
        symbol: string;
        lastPrice: string;
        priceChangePercent: string;
      }>>('/api/v3/ticker/24hr');

      // Filter for requested symbols
      const filtered = tickers.filter(t => {
        const baseSymbol = t.symbol.replace('USDT', '');
        return symbols.includes(baseSymbol);
      });

      return filtered.map(t => ({
        symbol: t.symbol.replace('USDT', ''),
        price: parseFloat(t.lastPrice),
        changePercent24h: parseFloat(t.priceChangePercent)
      }));
    } catch (error) {
      console.error('Error fetching multiple tickers:', error);
      return [];
    }
  }

  /**
   * Get price and change percent for a symbol
   */
  async getQuote(symbol: string): Promise<BinanceTicker | null> {
    return this.get24hrTicker(symbol);
  }

  /**
   * Get multiple quotes (price + change)
   */
  async getMultipleQuotes(symbols: string[]): Promise<BinanceTicker[]> {
    return this.getMultipleTickers(symbols);
  }
}

export const binanceClient = new BinanceClient();
