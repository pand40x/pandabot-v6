# 🔄 6. Sistem Akışı (Yüksek Seviye)

## 🎯 Genel Akış Diagramı

```
┌─────────────────────────────────────────────────────────────────┐
│                        TELEGRAM CLIENT                          │
│                     (Kullanıcı Arayüzü)                         │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                    ┌───────────▼───────────┐
                    │     /price BTC        │
                    │     (Komut Gönder)    │
                    └───────────┬───────────┘
                                │
┌───────────────────────────────▼───────────────────────────────┐
│                      grammY BOT FRAMEWORK                     │
│                                                              │
│  1. Webhook alır                                              │
│  2. Update'i işler                                           │
│  3. Command Router'a yönlendir                               │
└───────────────────────────────┬───────────────────────────────┘
                                │
                    ┌───────────▼───────────┐
                    │   Command Router      │
                    │                       │
                    │   /price → PriceModule│
                    │   /list → UserListModule│
                    │   /ai → AI Module      │
                    └───────────┬───────────┘
                                │
                    ┌───────────▼───────────┐
                    │  Module Handler       │
                    │   (Business Logic)    │
                    └───────────┬───────────┘
                                │
            ┌───────────────────┼───────────────────┐
            │                   │                   │
    ┌───────▼──────┐   ┌───────▼──────┐   ┌───────▼───────┐
    │   MongoDB    │   │ External APIs│   │   Local LLM   │
    │  (Database)  │   │              │   │     API       │
    │              │   │ - Binance    │   │              │
    │ - Query      │   │ - Yahoo      │   │ - AI Query    │
    │ - Insert     │   │ - CoinGecko  │   │              │
    │ - Update     │   │              │   │              │
    └───────┬──────┘   └───────┬──────┘   └───────┬───────┘
            │                   │                  │
            └───────────────────┼──────────────────┘
                                │
                    ┌───────────▼───────────┐
                    │  Response Formatter   │
                    │                       │
                    │  - Emojis             │
                    │  - Tables             │
                    │  - Markdown           │
                    └───────────┬───────────┘
                                │
                    ┌───────────▼───────────┐
                    │  Send to Telegram     │
                    └───────────────────────┘
```

---

## 📊 Detaylı Akış Örnekleri

### 1. 💰 Fiyat Sorgulama Akışı

```
Kullanıcı Input: "/price BTC"
│
└─→ [grammY] Webhook received
    │
    └─→ [Router] Parse command → /price BTC
        │
        └─→ [PriceModule] Handle command
            │
            ├─→ [Binance API] Get BTC price
            │   GET https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT
            │
            ├─→ [Yahoo Finance] Get TRY conversion rate
            │   GET https://query1.finance.yahoo.com/v7/finance/quote?symbols=USDTRY=X
            │
            ├─→ [Database] Log query (optional)
            │   INSERT INTO queries_log
            │
            └─→ [Formatter] Create response
                ┌─────────────────────────────────┐
                │ 🪙 BTC (Bitcoin)                 │
                │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
                │ 💰 Fiyat: $43,250.50            │
                │ 📈 24s Değişim: +3.2% ↗️         │
                │ 🇺🇸 USD | 🇹🇷 TRY: ₺1,298,415   │
                └─────────────────────────────────┘
                │
                └─→ [grammY] Send message to user
```

**Direkt Liste Adı Komutu (Komutsuz):**

```
Kullanıcı Input: "my-coins" (komut yok, sadece liste adı)
│
└─→ [Router] Check if input matches user's watchlist name
    │
    ├─→ [Database] Find watchlist named "my-coins"
    │   SELECT * FROM watchlists WHERE userId=? AND listName='my-coins'
    │
    ├─→ [CoinMarketCap] Get prices for all tickers in list
    │   BTC, ETH, SOL, ADA
    │
    └─→ [Response] Show formatted prices
        📋 my-coins
        ━━━━━━━━━━━━━━━━━━━━━
        1. BTC  $43,250  +3.2% ↗️
        2. ETH  $2,580   +2.1% ↗️
        3. SOL  $98      -0.5% ↘️
        4. ADA  $0.52    +1.8% ↗️
        ━━━━━━━━━━━━━━━━━━━━━
        Ort. Değişim: +1.65%
```

**Handler Örneği:**

```typescript
// core/router.ts
bot.on('message:text', async (ctx) => {
  const text = ctx.message.text.trim();
  
  // Check if it's a command first
  if (text.startsWith('/')) {
    return; // Let command handlers deal with it
  }
  
  // Check if it matches a watchlist name
  const watchlist = await Watchlist.findOne({
    userId: ctx.from.id,
    listName: text
  });
  
  if (watchlist) {
    // User referenced their watchlist directly
    const prices = await getPricesForTickers(watchlist.tickers.map(t => t.symbol));
    await ctx.reply(formatWatchlistPrices(watchlist.listName, prices));
  }
});
```

**Kod Örneği:**

```typescript
// modules/prices/handler.ts
import { Bot, CommandContext } from 'grammy';
import { CoinMarketCapClient } from '../../services/coinmarketcap';

export function registerPriceHandler(bot: Bot) {
  bot.command('price', async (ctx: CommandContext) => {
    const symbol = ctx.match; // BTC
    
    try {
      // 1. Fetch from CoinMarketCap (primary)
      const cmcClient = new CoinMarketCapClient();
      const cmcData = await cmcClient.getLatestListing(symbol);
      
      // 2. Fetch TRY conversion
      const currencyData = await axios.get(
        'https://query1.finance.yahoo.com/v7/finance/quote?symbols=USDTRY=X'
      );
      
      // 3. Calculate and format
      const priceUSD = cmcData.price;
      const tryRate = parseFloat(currencyData.data.quoteResponse.result[0].regularMarketPrice);
      const priceTRY = priceUSD * tryRate;
      const changePercent = cmcData.changePercent;
      
      // 4. Send response
      await ctx.reply(
        `🪙 ${symbol} (Bitcoin)\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `💰 Fiyat: $${priceUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}\n` +
        `📈 24s Değişim: ${changePercent > 0 ? '+' : ''}${changePercent.toFixed(2)}% ${changePercent > 0 ? '↗️' : '↘️'}\n` +
        `🇺🇸 USD | 🇹🇷 TRY: ₺${priceTRY.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`
      );
      
    } catch (error) {
      // Fallback to Binance if CMC fails
      try {
        const binanceData = await axios.get(
          `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}USDT`
        );
        // ... format and send
      } catch (fallbackError) {
        await ctx.reply('❌ Fiyat alınırken hata oluştu. Lütfen tekrar deneyin.');
      }
    }
  });
}
```

---

### 2. ⏰ Hatırlatma Akışı

```
Kullanıcı Input: "/remind 15:30 Fatura öde"
│
└─→ [grammY] Command received
    │
    └─→ [ReminderModule] Parse time & message
        │   Time: 15:30 (today)
        │   Message: "Fatura öde"
        │
        └─→ [Agenda] Schedule job
            │
            ├─→ [MongoDB] Save reminder
            │   INSERT INTO reminders (userId, message, remindAt, status, jobId)
            │
            └─→ [Agenda] Create delayed job
                Job Name: send-reminder
                Run At: 2025-10-31 15:30:00
                Data: { userId: 123, message: "Fatura öde" }
                │
                └─→ [Job Processor] Wait for execution
```

**Kod Örneği:**

```typescript
// modules/reminders/handler.ts
import agenda from '../core/agenda';

export function registerReminderHandler(bot: Bot) {
  bot.command('remind', async (ctx) => {
    const input = ctx.match; // "15:30 Fatura öde"
    const [timePart, ...messageParts] = input.split(' ');
    const message = messageParts.join(' ');
    
    // Parse time (15:30)
    const [hour, minute] = timePart.split(':').map(Number);
    const remindAt = new Date();
    remindAt.setHours(hour, minute, 0, 0);
    
    // If time already passed today, schedule for tomorrow
    if (remindAt < new Date()) {
      remindAt.setDate(remindAt.getDate() + 1);
    }
    
    try {
      // Save to MongoDB
      const reminder = await Reminder.create({
        userId: ctx.from!.id,
        message,
        remindAt,
        status: 'active'
      });
      
      // Schedule with Agenda
      await agenda.schedule(remindAt, 'send-reminder', {
        userId: ctx.from!.id,
        message,
        reminderId: reminder._id
      });
      
      await ctx.reply(
        `✅ Hatırlatma kuruldu!\n` +
        `⏰ Zaman: ${remindAt.toLocaleString('tr-TR')}\n` +
        `📝 Mesaj: "${message}"`
      );
      
    } catch (error) {
      await ctx.reply('❌ Hatırlatma kurulurken hata oluştu.');
    }
  });
}
```

---

### 3. 🔔 Fiyat Alarm Akışı

```
Kullanıcı Input: "/alert BTC -5%"
│
└─→ [AlertModule] Create alert
    │
    ├─→ [Binance API] Get current price
    │   Current: $43,250
    │
    ├─→ [Database] Save alert
    │   INSERT INTO alerts (userId, symbol, thresholdPct, basePrice, status)
    │   (123456789, BTC, -5, 43250, 'active')
    │
    └─→ [Alert Worker] Background process starts
        │
        └─→ [Loop] Every 60 seconds:
            │
            ├─→ [MongoDB] Get active alerts
            │   SELECT * FROM alerts WHERE status='active'
            │
            ├─→ [CoinMarketCap API] Check current prices (primary)
            │   For each alert symbol, fetch latest price
            │   Fallback: Binance API
            │
            ├─→ [Compare] Check thresholds
            │   BTC: Base $43,250 | Current $40,500 | Change: -6.35%
            │   Threshold: -5% | Triggered: YES ✅
            │
            └─→ [Notify] Send to user
                ┌─────────────────────────────────┐
                │ 🔔 FİYAT ALARMI                   │
                │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
                │ 🪙 BTC                           │
                │ 💰 Eski Fiyat: $43,250           │
                │ 💰 Yeni Fiyat: $40,500           │
                │ 📉 Değişim: -6.35%               │
                │ ⏰ Zaman: 14:25                   │
                └─────────────────────────────────┘
                │
                └─→ [Database] Update alert
                    UPDATE alerts SET lastTriggered=NOW() WHERE _id=...
```

**Worker Örneği:**

```typescript
// workers/price-alerts.ts
import { Alert } from '../modules/alerts/model';
import { getCurrentPrice } from '../services/binance';

async function checkAlerts() {
  console.log('🔔 Checking alerts...');
  
  // Get all active alerts
  const activeAlerts = await Alert.find({ status: 'active' });
  console.log(`📊 Found ${activeAlerts.length} active alerts`);
  
  // Group by symbol to minimize API calls
  const alertsBySymbol = activeAlerts.reduce((acc, alert) => {
    if (!acc[alert.symbol]) acc[alert.symbol] = [];
    acc[alert.symbol].push(alert);
    return acc;
  }, {} as Record<string, typeof activeAlerts>);
  
  // Check each symbol once
  for (const [symbol, alerts] of Object.entries(alertsBySymbol)) {
    try {
      const currentPrice = await getCurrentPrice(symbol);
      
      for (const alert of alerts) {
        const changePercent = ((currentPrice - alert.basePrice) / alert.basePrice) * 100;
        
        // Check if threshold triggered
        const shouldTrigger = 
          (alert.thresholdPct > 0 && changePercent >= alert.thresholdPct) ||
          (alert.thresholdPct < 0 && changePercent <= alert.thresholdPct);
        
        // Check cooldown (30 minutes)
        const cooldownPassed = 
          !alert.lastTriggered || 
          (Date.now() - alert.lastTriggered.getTime()) > 30 * 60 * 1000;
        
        if (shouldTrigger && cooldownPassed) {
          // Trigger alert
          await notifyUser(alert.userId, alert, currentPrice, changePercent);
          
          // Update last triggered
          alert.lastTriggered = new Date();
          await alert.save();
        }
      }
    } catch (error) {
      console.error(`❌ Error checking ${symbol}:`, error);
    }
  }
}

// Run every minute
setInterval(checkAlerts, 60 * 1000);
```

---

### 4. 🤖 AI Sorgu Akışı

```
Kullanıcı Input: "/ai Bitcoin hakkında ne düşünüyorsun?"
│
└─→ [AIModule] Receive query
    │
    ├─→ [Validation] Check if AI service available
    │
    ├─→ [Local LLM API] Send request
    │   POST http://127.0.0.1:1234/v1/chat/completions
    │   {
    │     "model": "local-model",
    │     "messages": [
    │       { "role": "user", "content": "Bitcoin hakkında ne düşünüyorsun?" }
    │     ],
    │     "temperature": 0.7,
    │     "max_tokens": 500
    │   }
    │
    ├─→ [LLM] Process query
    │
    └─→ [Response] Send AI answer
        ┌─────────────────────────────────┐
        │ 🤖 AI Cevabı:                    │
        │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
        │ Bitcoin, merkezi olmayan bir     │
        │ dijital para birimidir...        │
        └─────────────────────────────────┘
```

**Kod Örneği:**

```typescript
// modules/ai/handler.ts
import axios from 'axios';

export function registerAIHandler(bot: Bot) {
  bot.command('ai', async (ctx) => {
    const query = ctx.match;
    
    if (!query) {
      await ctx.reply('❓ Sorunuzu yazın: /ai <soru>');
      return;
    }
    
    // Typing indicator
    await ctx.replyWithChatAction('typing');
    
    try {
      const response = await axios.post(
        'http://127.0.0.1:1234/v1/chat/completions',
        {
          model: 'local-model',
          messages: [
            {
              role: 'user',
              content: query
            }
          ],
          temperature: 0.7,
          max_tokens: 500
        },
        {
          timeout: 30000,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      const answer = response.data.choices[0].message.content;
      
      await ctx.reply(`🤖 AI Cevabı:\n━━━━━━━━━━━━━━━━━━━━\n${answer}`);
      
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        await ctx.reply(
          '❌ AI servisi şu anda erişilemez.\n' +
          'Local LLM servisi çalışıyor mu? (http://127.0.0.1:1234)'
        );
      } else {
        await ctx.reply('❌ Bir hata oluştu. Lütfen tekrar deneyin.');
      }
    }
  });
}
```

### 5. 💱 Döviz Kuru Akışı

```
Kullanıcı Input: "/dolar"
│
└─→ [CurrencyModule] Get USD/TRY rate
    │
    ├─→ [Yahoo Finance] Get USD/TRY
    │   GET https://query1.finance.yahoo.com/v7/finance/quote?symbols=USDTRY=X
    │
    └─→ [Response] Send rate
        💱 USD/TRY Kuru
        ━━━━━━━━━━━━━━━━━━━━━
        💰 Dolar: $1
        🇹🇷 Türk Lirası: ₺30.15
        📊 Güncelleme: 31.10.2025 14:30
        ━━━━━━━━━━━━━━━━━━━━━
```

**Kod Örneği:**

```typescript
// modules/currency/handler.ts
bot.command('dolar', async (ctx) => {
  try {
    const response = await axios.get(
      'https://query1.finance.yahoo.com/v7/finance/quote?symbols=USDTRY=X'
    );
    
    const rate = parseFloat(
      response.data.quoteResponse.result[0].regularMarketPrice
    );
    
    await ctx.reply(
      `💱 USD/TRY Kuru\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `💰 Dolar: $1\n` +
      `🇹🇷 Türk Lirası: ₺${rate.toFixed(2)}\n` +
      `📊 Güncelleme: ${new Date().toLocaleString('tr-TR')}\n` +
      `━━━━━━━━━━━━━━━━━━━━`
    );
    
  } catch (error) {
    await ctx.reply('❌ Kur alınırken hata oluştu.');
  }
});
```

---

## 🔄 Asenkron İşlem Akışları

### Worker Process Akışı

```
┌─────────────────────────────────────────────────────────────┐
│                      MAIN BOT PROCESS                       │
│                                                              │
│  ┌─────────────┐         ┌─────────────┐                    │
│  │   Bot       │         │   Web API   │                    │
│  │  (grammY)   │         │   Handlers  │                    │
│  └──────┬──────┘         └──────┬──────┘                    │
│         │                       │                            │
│         └───────────┬───────────┘                            │
│                     │                                        │
│              ┌──────▼──────┐                                 │
│              │  Command    │                                 │
│              │  Router     │                                 │
│              └──────┬──────┘                                 │
│                     │                                        │
└─────────────────────┼────────────────────────────────────────┘
                      │
                      │ Queue/DB Events
                      │
┌─────────────────────▼────────────────────────────────────────┐
│                   WORKER PROCESS                             │
│                                                              │
│  ┌────────────────────────────────────────┐                │
│  │  ┌─────────────┐  ┌─────────────┐     │                │
│  │  │  Reminder   │  │   Alert     │     │                │
│  │  │   Worker    │  │   Worker    │     │                │
│  │  └──────┬──────┘  └──────┬──────┘     │                │
│  │         │                │             │                │
│  │         └───────┬────────┘             │                │
│  │                 │                      │                │
│  └─────────────────┼──────────────────────┘                │
│                    │                                       │
│            ┌───────▼───────┐                                │
│            │   MongoDB     │                                │
│            │ (Persistence) │                                │
│            └───────────────┘                                │
│                                                              │
└────────────────────────────────────────────────────────────┘
```

---

## 🚨 Hata Yönetimi Akışı

### Hata Durumları ve Çözümleri

| Hata Tipi | Örnek | Çözüm |
|-----------|-------|-------|
| **API Hatası** | Binance API 429 (Rate Limit) | Retry with exponential backoff |
| **Veritabanı Hatası** | MongoDB connection failed | Reconnect with retry |
| **Timeout** | LLM API 30s timeout | Return user-friendly error |
| **Geçersiz Veri** | Invalid symbol `/price XYZ` | Validation error message |
| **Rate Limit** | User exceeds commands | Inform and throttle |

**Hata Yakalama Örneği:**

```typescript
try {
  const data = await externalApi.getData();
} catch (error) {
  if (error.response?.status === 429) {
    // Rate limit exceeded
    logger.warn('Rate limit hit, waiting...');
    await new Promise(resolve => setTimeout(resolve, 60000));
    return retry();
  }
  
  if (error.code === 'ECONNREFUSED') {
    // Service unavailable
    return { error: 'Service temporarily unavailable' };
  }
  
  // Unknown error
  logger.error('Unexpected error:', error);
  return { error: 'An unexpected error occurred' };
}
```

---

## 📊 Performans Optimizasyonları

### 1. Caching Strategy

```
API Call → Check Cache → Cache Hit? → Return Cached Data
                     ↓
                Cache Miss
                     ↓
              Fetch from API
                     ↓
              Update Cache
                     ↓
              Return Data
```

### 2. Batch Processing

```
Multiple alerts for BTC → Group by symbol → Single API call → Multiple notifications
```

### 3. Async/Await Pattern

```typescript
// ✅ Doğru
async function fetchPrice(symbol: string) {
  return await axios.get(`https://api.example.com/${symbol}`);
}

// ❌ Yanlış
function fetchPriceSync(symbol: string) {
  return axios.get(`https://api.example.com/${symbol}`); // Promise döner ama await yok
}
```

---

**Bir sonraki bölüm:** [Security & Reliability](./08-security.md)
