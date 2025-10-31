# 🔑 CoinMarketCap API Key Rotation Stratejisi

## 🎯 Amaç

4 adet CoinMarketCap API key'i arasında otomatik rotasyon yaparak:
- **Rate limit aşımını önlemek**
- **API kullanım limitini artırmak** (4x daha fazla request)
- **Sistem dayanıklılığını artırmak**
- **Key bloklanma riskini azaltmak**

---

## 🏗️ Mimari

### API Key Manager

```typescript
// services/coinmarketcap/key-manager.ts
import { config } from '../../config/env';

interface APIKeyStatus {
  key: string;
  requestsUsed: number;
  requestsLimit: number;
  resetTime: Date;
  isBlocked: boolean;
}

class CMCKeyManager {
  private keys: APIKeyStatus[] = [];
  private currentKeyIndex = 0;
  
  constructor() {
    // Her API key için status oluştur
    config.apis.coinMarketCap.keys.forEach((key) => {
      this.keys.push({
        key,
        requestsUsed: 0,
        requestsLimit: 10000, // CMC free tier limit
        resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 saat
        isBlocked: false
      });
    });
    
    // Başlangıçta aktif key'i ayarla
    const activeIndex = config.apis.coinMarketCap.activeKeyIndex;
    this.currentKeyIndex = activeIndex;
  }
  
  /** Aktif API key'i getir */
  getActiveKey(): string {
    // Eğer aktif key block'luysa veya limit dolmuşsa, sıradaki key'e geç
    const currentKey = this.keys[this.currentKeyIndex];
    
    if (currentKey.isBlocked || this.isLimitReached(currentKey)) {
      this.rotateToNextAvailableKey();
      return this.getActiveKey(); // Recursive call
    }
    
    return currentKey.key;
  }
  
  /** Request sayısını artır */
  incrementRequestCount(): void {
    const currentKey = this.keys[this.currentKeyIndex];
    currentKey.requestsUsed++;
    
    // Limit kontrolü
    if (this.isLimitReached(currentKey)) {
      logger.warn(`CMC API key ${this.currentKeyIndex + 1} limit doldu`);
    }
  }
  
  /** Sıradaki uygun key'e geç */
  private rotateToNextAvailableKey(): void {
    const originalIndex = this.currentKeyIndex;
    
    // Tüm key'leri dene
    for (let i = 0; i < this.keys.length; i++) {
      this.currentKeyIndex = (this.currentKeyIndex + 1) % this.keys.length;
      const newKey = this.keys[this.currentKeyIndex];
      
      if (!newKey.isBlocked && !this.isLimitReached(newKey)) {
        logger.info(`Rotated to CMC API key ${this.currentKeyIndex + 1}`);
        return;
      }
    }
    
    // Hiç uygun key bulunamadı
    logger.error('Tüm CMC API key\'leri kullanılamaz durumda!');
    this.currentKeyIndex = originalIndex; // Eski key'e dön
  }
  
  /** Key'i block'lu olarak işaretle */
  markAsBlocked(): void {
    const currentKey = this.keys[this.currentKeyIndex];
    currentKey.isBlocked = true;
    logger.error(`CMC API key ${this.currentKeyIndex + 1} blocklandı!`);
  }
  
  /** Limit doldu mu kontrolü */
  private isLimitReached(key: APIKeyStatus): boolean {
    return key.requestsUsed >= key.requestsLimit * 0.9; // %90'ında rotate et
  }
  
  /** Günlük reset */
  resetDaily(): void {
    this.keys.forEach((key) => {
      key.requestsUsed = 0;
      key.resetTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
      key.isBlocked = false; // Reset'te block'ları kaldır
    });
    
    logger.info('CMC API key\'leri günlük reset edildi');
  }
  
  /** İstatistikleri getir */
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

## 🔄 Kullanım Örneği

### CoinMarketCap Client

```typescript
// services/coinmarketcap/client.ts
import axios from 'axios';
import { cmcKeyManager } from './key-manager';

export class CoinMarketCapClient {
  private baseUrl = 'https://pro-api.coinmarketcap.com/v1';
  
  async getLatestListing(symbol: string) {
    let attempts = 0;
    const maxAttempts = this.keys.length; // Her key'i dene
    
    while (attempts < maxAttempts) {
      try {
        const apiKey = cmcKeyManager.getActiveKey();
        
        const response = await axios.get(
          `${this.baseUrl}/cryptocurrency/quotes/latest`,
          {
            params: { symbol },
            headers: {
              'X-CMC_PRO_API_KEY': apiKey,
              'Accept': 'application/json'
            },
            timeout: 10000
          }
        );
        
        // Request başarılı - sayacı artır
        cmcKeyManager.incrementRequestCount();
        
        // Veriyi parse et ve return et
        return this.parsePriceData(response.data, symbol);
        
      } catch (error) {
        attempts++;
        
        if (error.response?.status === 429) {
          // Rate limit - key'i block'la
          cmcKeyManager.markAsBlocked();
        }
        
        if (attempts >= maxAttempts) {
          throw new Error('Tüm CMC API key\'leri denendi');
        }
        
        // 1 saniye bekle ve tekrar dene
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }
  
  private parsePriceData(data: any, symbol: string) {
    const crypto = data.data[symbol];
    return {
      symbol: crypto.symbol,
      name: crypto.name,
      price: crypto.quote.USD.price,
      changePercent: crypto.quote.USD.percent_change_24h,
      volume: crypto.quote.USD.volume_24h,
      marketCap: crypto.quote.USD.market_cap,
      lastUpdated: crypto.quote.USD.last_updated
    };
  }
}
```

---

## ⏰ Otomatik Reset

### Günlük Reset Job'u

```typescript
// core/scheduler.ts - Agenda job olarak
agenda.define('reset-cmc-keys', async () => {
  cmcKeyManager.resetDaily();
  
  // Admin'e bildir
  await bot.api.sendMessage(
    ADMIN_ID,
    `🔑 CMC API Key'leri günlük reset edildi\n` +
    `📊 İstatistikler:\n` +
    cmcKeyManager.getStats()
      .map(stat => `  Key ${stat.keyNumber}: ${stat.requestsUsed}/${stat.requestsLimit}`)
      .join('\n')
  );
});

// Her gün 00:00'da çalıştır
agenda.every('1 day', 'reset-cmc-keys', {
  hour: 0,
  minute: 0
});
```

---

## 📊 Monitoring

### API Usage Dashboard

```typescript
bot.command('cmc_stats', async (ctx) => {
  if (!isAdmin(ctx.from.id)) {
    await ctx.reply('❌ Bu komutu kullanma yetkiniz yok.');
    return;
  }
  
  const stats = cmcKeyManager.getStats();
  
  let message = `🔑 CMC API İstatistikleri\n━━━━━━━━━━━━━━━━━━━━\n`;
  
  stats.forEach((stat) => {
    message += `\n` +
      `Key ${stat.keyNumber}:\n` +
      `  📊 Kullanım: ${stat.requestsUsed}/${stat.requestsLimit} ` +
      `(${stat.usagePercent.toFixed(1)}%)\n` +
      `  ${stat.isBlocked ? '🚫 Blocklandı' : '✅ Aktif'}\n` +
      `  ⏰ Reset: ${stat.resetTime.toLocaleTimeString('tr-TR')}\n`;
  });
  
  await ctx.reply(message);
});
```

### Örnek Çıktı:

```
🔑 CMC API İstatistikleri
━━━━━━━━━━━━━━━━━━━━

Key 1:
  📊 Kullanım: 7,250/10,000 (72.5%)
  ✅ Aktif
  ⏰ Reset: 00:00

Key 2:
  📊 Kullanım: 5,100/10,000 (51.0%)
  ✅ Aktif
  ⏰ Reset: 00:00

Key 3:
  📊 Kullanım: 0/10,000 (0.0%)
  🚫 Blocklandı
  ⏰ Reset: 00:00

Key 4:
  📊 Kullanım: 3,450/10,000 (34.5%)
  ✅ Aktif
  ⏰ Reset: 00:00
━━━━━━━━━━━━━━━━━━━━
```

---

## 🚨 Error Handling

### Rate Limit Aşımı

```typescript
// 429 status code geldiğinde
if (error.response?.status === 429) {
  cmcKeyManager.markAsBlocked();
  
  logger.error({
    message: 'CMC API rate limit',
    keyIndex: cmcKeyManager.getCurrentKeyIndex(),
    retryAfter: error.response.headers['retry-after']
  });
  
  // Fallback to Binance
  return await this.getPriceFromBinance(symbol);
}
```

### Tüm Key'ler Kullanılamaz

```typescript
// Fallback mechanism
try {
  return await this.getFromCoinMarketCap(symbol);
} catch (cmcError) {
  logger.warn('CMC başarısız, Binance deneniyor...');
  
  try {
    return await this.getFromBinance(symbol);
  } catch (binanceError) {
    logger.error('Tüm API\'ler başarısız');
    throw new Error('Fiyat bilgisi alınamıyor');
  }
}
```

---

## 🎛️ Config Ayarları

### Environment Variables

```bash
# .env
COINMARKETCAP_API_KEY_1=82282cc8-7614-4dbc-bb8d-c0fece23ed03
COINMARKETCAP_API_KEY_2=47072cce-e237-4d4c-8ef9-e4fb4ac8a120
COINMARKETCAP_API_KEY_3=3b28409c-da97-4f0d-ad0c-4d30f8d68fef
COINMARKETCAP_API_KEY_4=57264830-d93a-4c21-8710-b36e12e837df

# Aktif key (1-4 arası)
COINMARKETCAP_ACTIVE_KEY=1

# Rotation ayarları
CMC_REQUEST_LIMIT=10000           # Her key için limit
CMC_ROTATION_THRESHOLD=0.9        # %90'ında rotate et
CMC_RETRY_DELAY=1000             # Retry arası bekleme (ms)
```

---

## ✅ Avantajları

1. **4x Daha Fazla Request**: 4 key ile 40,000/gün request
2. **Yüksek Erişilebilirlik**: Bir key çökse bile diğerleri devam eder
3. **Otomatik Fallback**: Key'ler sırayla denenerek en uygun olan seçilir
4. **Smart Rotation**: %90 kullanımda rotate ederek limit aşımını önler
5. **Monitoring**: Her an hangi key'in ne kadar kullandığını görebilirsiniz
6. **Günlük Reset**: Otomatik reset ile her gün taze başlangıç

---

## 📋 Best Practices

### ✅ Yapılması Gerekenler

- [ ] Her key için ayrı rate limit tracking
- [ ] Block'lanan key'leri logla
- [ ] Günlük admin bildirimi
- [ ] Fallback to Binance
- [ ] Request latency monitoring

### ❌ Yapılmaması Gerekenler

- [ ] Aynı anda tüm key'leri kullanma
- [ ] Block'lu key'leri tekrar deneme
- [ ] Manual key reset (otomatik olmalı)
- [ ] Rate limit aşımına izin verme
- [ ] Key'leri hard-code etme

---

Bu strateji ile CoinMarketCap API'nizi en verimli şekilde kullanabilir, rate limit sorunlarını minimize edebilirsiniz! 🚀
