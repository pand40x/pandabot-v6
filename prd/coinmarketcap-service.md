# 🌐 CoinMarketCap Servis Entegrasyonu

## 📦 Servis Yapısı

```
src/
└── services/
    └── coinmarketcap/
        ├── index.ts          (Ana export)
        ├── client.ts         (API client)
        ├── key-manager.ts    (Key rotation)
        ├── types.ts          (TypeScript types)
        └── utils.ts          (Helper functions)
```

---

## 🔑 key-manager.ts

```typescript
// services/coinmarketcap/key-manager.ts
import { config } from '../../config/env';
import { logger } from '../../core/logger';

interface APIKeyStatus {
  key: string;
  requestsUsed: number;
  requestsLimit: number;
  resetTime: Date;
  isBlocked: boolean;
}

export class CMCKeyManager {
  private keys: APIKeyStatus[] = [];
  private currentKeyIndex = 0;
  
  constructor() {
    // Her API key için status oluştur
    config.apis.coinMarketCap.keys.forEach((key, index) => {
      this.keys.push({
        key,
        requestsUsed: 0,
        requestsLimit: 10000, // CMC free tier limit
        resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        isBlocked: false
      });
    });
    
    // Başlangıç key'i ayarla
    const activeIndex = config.apis.coinMarketCap.activeKeyIndex;
    this.currentKeyIndex = activeIndex;
    
    logger.info(`CMC Key Manager initialized with ${this.keys.length} keys`);
  }
  
  getActiveKey(): string {
    const currentKey = this.keys[this.currentKeyIndex];
    
    if (currentKey.isBlocked || this.isLimitReached(currentKey)) {
      this.rotateToNextAvailableKey();
      return this.getActiveKey();
    }
    
    return currentKey.key;
  }
  
  incrementRequestCount(): void {
    const currentKey = this.keys[this.currentKeyIndex];
    currentKey.requestsUsed++;
  }
  
  markAsBlocked(): void {
    const currentKey = this.keys[this.currentKeyIndex];
    currentKey.isBlocked = true;
    logger.error(`CMC API key ${this.currentKeyIndex + 1} marked as blocked`);
  }
  
  private rotateToNextAvailableKey(): void {
    const originalIndex = this.currentKeyIndex;
    
    for (let i = 0; i < this.keys.length; i++) {
      this.currentKeyIndex = (this.currentKeyIndex + 1) % this.keys.length;
      const newKey = this.keys[this.currentKeyIndex];
      
      if (!newKey.isBlocked && !this.isLimitReached(newKey)) {
        logger.info(`Rotated to CMC API key ${this.currentKeyIndex + 1}`);
        return;
      }
    }
    
    logger.error('All CMC API keys are unavailable!');
    this.currentKeyIndex = originalIndex;
  }
  
  private isLimitReached(key: APIKeyStatus): boolean {
    return key.requestsUsed >= key.requestsLimit * 0.9;
  }
  
  resetDaily(): void {
    this.keys.forEach((key) => {
      key.requestsUsed = 0;
      key.resetTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
      key.isBlocked = false;
    });
    
    logger.info('CMC API keys daily reset completed');
  }
  
  getStats() {
    return this.keys.map((key, index) => ({
      keyNumber: index + 1,
      requestsUsed: key.requestsUsed,
      requestsLimit: key.requestsLimit,
      usagePercent: (key.requestsUsed / key.requestsLimit) * 100,
      isBlocked: key.isBlocked,
      resetTime: key.resetTime
    }));
  }
}

export const cmcKeyManager = new CMCKeyManager();
```

---

## 📊 client.ts

```typescript
// services/coinmarketcap/client.ts
import axios, { AxiosInstance } from 'axios';
import { cmcKeyManager } from './key-manager';
import { CMCQuote, CMCSymbolData } from './types';
import { logger } from '../../core/logger';

export class CoinMarketCapClient {
  private client: AxiosInstance;
  private baseUrl = 'https://pro-api.coinmarketcap.com/v1';
  
  constructor() {
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
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
      const response = await this.client.get<{ data: CMCSymbolData }>(
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
```

---

## 📝 types.ts

```typescript
// services/coinmarketcap/types.ts

export interface CMCQuote {
  id: number;
  symbol: string;
  name: string;
  price: number;
  changePercent24h: number;
  changePercent7d: number;
  volume24h: number;
  marketCap: number;
  circulatingSupply: number;
  totalSupply: number;
  maxSupply: number;
  lastUpdated: Date;
}

export interface CMCSymbolData {
  id: number;
  symbol: string;
  name: string;
  circulating_supply: number;
  total_supply: number;
  max_supply: number;
  quote: {
    USD: {
      price: number;
      volume_24h: number;
      percent_change_24h: number;
      percent_change_7d: number;
      market_cap: number;
      last_updated: string;
    };
  };
}

export interface CMCResponse<T> {
  status: {
    timestamp: string;
    error_code: number | null;
    error_message: string | null;
    elapsed: number;
    credit_count: number;
  };
  data: T;
}
```

---

## 🔧 utils.ts

```typescript
// services/coinmarketcap/utils.ts

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
```

---

## 🚀 index.ts (Ana Export)

```typescript
// services/coinmarketcap/index.ts
export { CoinMarketCapClient, cmcClient } from './client';
export { CMCKeyManager, cmcKeyManager } from './key-manager';
export { CMCQuote, CMCSymbolData, CMCResponse } from './types';
export * from './utils';

// Quick access functions
export async function getCryptoPrice(symbol: string): Promise<number> {
  const quote = await cmcClient.getLatestQuote(symbol);
  return quote.price;
}

export async function getCryptoChange(symbol: string): Promise<number> {
  const quote = await cmcClient.getLatestQuote(symbol);
  return quote.changePercent24h;
}

export async function getMultiplePrices(symbols: string[]): Promise<Record<string, number>> {
  const quotes = await cmcClient.getMultipleQuotes(symbols);
  const prices: Record<string, number> = {};
  
  quotes.forEach(quote => {
    prices[quote.symbol] = quote.price;
  });
  
  return prices;
}
```

---

## 💡 Kullanım Örnekleri

### 1. Tek Kripto Fiyatı

```typescript
import { cmcClient } from '../services/coinmarketcap';

async function getBTCCurrentPrice() {
  try {
    const quote = await cmcClient.getLatestQuote('BTC');
    console.log(`BTC fiyatı: $${quote.price}`);
    console.log(`24s değişim: ${quote.changePercent24h}%`);
  } catch (error) {
    console.error('Fiyat alınamadı:', error);
  }
}
```

### 2. Çoklu Fiyat Sorgusu

```typescript
import { cmcClient } from '../services/coinmarketcap';

async function getTop10() {
  try {
    const top10 = await cmcClient.getTopCryptos(10);
    
    top10.forEach((crypto, index) => {
      console.log(`${index + 1}. ${crypto.symbol}: $${crypto.price}`);
    });
  } catch (error) {
    console.error('Top kripto alınamadı:', error);
  }
}
```

### 3. Fiyat Arama

```typescript
import { cmcClient } from '../services/coinmarketcap';

async function searchCrypto(query: string) {
  try {
    const results = await cmcClient.searchCryptocurrency(query);
    
    results.forEach(crypto => {
      console.log(`${crypto.symbol} - ${crypto.name}: $${crypto.price}`);
    });
  } catch (error) {
    console.error('Arama başarısız:', error);
  }
}
```

### 4. Module'de Kullanım

```typescript
// modules/prices/service.ts
import { cmcClient } from '../../services/coinmarketcap';
import { formatCMCQuoteForTelegram } from '../../services/coinmarketcap/utils';

export class PriceService {
  async getPrice(symbol: string) {
    try {
      const quote = await cmcClient.getLatestQuote(symbol);
      return {
        success: true,
        data: formatCMCQuoteForTelegram(quote)
      };
    } catch (error) {
      return {
        success: false,
        error: 'Fiyat alınamadı'
      };
    }
  }
}
```

---

## 🔍 Testing

### Unit Test Örneği

```typescript
// tests/services/coinmarketcap/client.test.ts
import { CoinMarketCapClient } from '../../../src/services/coinmarketcap/client';

describe('CoinMarketCapClient', () => {
  let client: CoinMarketCapClient;
  
  beforeEach(() => {
    client = new CoinMarketCapClient();
  });
  
  it('should get BTC price', async () => {
    const quote = await client.getLatestQuote('BTC');
    
    expect(quote.symbol).toBe('BTC');
    expect(quote.price).toBeGreaterThan(0);
    expect(quote.name).toBe('Bitcoin');
  });
  
  it('should handle invalid symbol', async () => {
    await expect(client.getLatestQuote('INVALID'))
      .rejects.toThrow();
  });
});
```

---

Bu entegrasyon ile CoinMarketCap API'nizi profesyonel şekilde kullanabilir, key rotation ile rate limit sorunlarını aşabilirsiniz! 🚀
