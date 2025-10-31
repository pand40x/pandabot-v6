import axios, { AxiosInstance } from 'axios';
import { cmcKeyManager } from './key-manager';
import { CMCQuote, CMCSymbolData } from './types';
import { logger } from '../../core/logger';
import { config } from '../../config/env';

export class CoinMarketCapClient {
  private client: AxiosInstance;
  private baseUrl = 'https://pro-api.coinmarketcap.com/v1';
  
  constructor() {
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: config.http.timeout,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    // Request interceptor
    this.client.interceptors.request.use((config) => {
      const apiKey = cmcKeyManager.getActiveKey();
      config.headers['X-CMC_PRO_API_KEY'] = apiKey;
      return config;
    });
    
    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        cmcKeyManager.incrementRequestCount();
        return response;
      },
      (error) => {
        if (error.response?.status === 429) {
          cmcKeyManager.markAsBlocked();
          logger.warn('CMC API rate limit exceeded, key marked as blocked');
        }
        return Promise.reject(error);
      }
    );
  }
  
  async getLatestQuote(symbol: string): Promise<CMCQuote> {
    try {
      const response = await this.client.get<{ data: CMCSymbolData }>(
        '/cryptocurrency/quotes/latest',
        {
          params: { symbol }
        }
      );
      
      return this.parseQuoteData(response.data, symbol);
    } catch (error) {
      logger.error(`CMC API error for ${symbol}:`, error);
      throw error;
    }
  }
  
  async getMultipleQuotes(symbols: string[]): Promise<CMCQuote[]> {
    try {
      const response = await this.client.get<{ data: Record<string, CMCSymbolData> }>(
        '/cryptocurrency/quotes/latest',
        {
          params: { symbol: symbols.join(',') }
        }
      );
      
      return symbols.map(symbol => this.parseQuoteData(response.data, symbol));
    } catch (error) {
      logger.error('CMC API multiple quotes error:', error);
      throw error;
    }
  }
  
  async getTopCryptos(limit: number = 10): Promise<CMCQuote[]> {
    try {
      const response = await this.client.get<{ data: Record<string, CMCSymbolData> }>(
        '/cryptocurrency/listings/latest',
        {
          params: { 
            limit,
            sort: 'market_cap',
            sort_dir: 'desc'
          }
        }
      );
      
      return Object.values(response.data.data).map(data => this.parseQuoteData(
        { data: { [data.symbol]: data } },
        data.symbol
      ));
    } catch (error) {
      logger.error('CMC API top cryptos error:', error);
      throw error;
    }
  }
  
  async searchCryptocurrency(query: string): Promise<CMCQuote[]> {
    try {
      const response = await this.client.get<{ data: any[] }>(
        '/cryptocurrency/listings/latest',
        {
          params: { 
            limit: 100,
            sort: 'market_cap'
          }
        }
      );
      
      // Filter based on query
      const filtered = response.data.data.filter(crypto =>
        crypto.symbol.toLowerCase().includes(query.toLowerCase()) ||
        crypto.name.toLowerCase().includes(query.toLowerCase())
      );
      
      return filtered.map(crypto => this.parseQuoteData(
        { data: { [crypto.symbol]: crypto } },
        crypto.symbol
      ));
    } catch (error) {
      logger.error('CMC API search error:', error);
      throw error;
    }
  }
  
  private parseQuoteData(data: any, symbol: string): CMCQuote {
    const crypto = data.data[symbol];
    
    if (!crypto) {
      throw new Error(`Symbol ${symbol} not found in CMC response`);
    }
    
    return {
      id: crypto.id,
      symbol: crypto.symbol,
      name: crypto.name,
      price: crypto.quote.USD.price,
      changePercent24h: crypto.quote.USD.percent_change_24h,
      changePercent7d: crypto.quote.USD.percent_change_7d,
      volume24h: crypto.quote.USD.volume_24h,
      marketCap: crypto.quote.USD.market_cap,
      circulatingSupply: crypto.circulating_supply,
      totalSupply: crypto.total_supply,
      maxSupply: crypto.max_supply,
      lastUpdated: new Date(crypto.quote.USD.last_updated)
    };
  }
  
  async healthCheck(): Promise<boolean> {
    try {
      await this.getLatestQuote('BTC');
      return true;
    } catch (error) {
      logger.error('CMC API health check failed');
      return false;
    }
  }
}

export const cmcClient = new CoinMarketCapClient();
