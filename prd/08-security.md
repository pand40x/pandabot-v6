# 🔧 8. Güvenlik ve Dayanıklılık

## 🛡️ Güvenlik Önlemleri

### 1. 🔑 Kimlik Doğrulama ve Yetkilendirme

#### Bot Token Güvenliği
- ✅ Token asla kod içinde hard-coded değil
- ✅ `.env` dosyasında saklanıyor
- ✅ `.gitignore`'da exclude ediliyor
- ✅ Production'da environment variable kullanımı

```typescript
// ✅ Doğru
const bot = new Bot(process.env.BOT_TOKEN);

// ❌ Yanlış
const bot = new Bot('260395814:AAEpCOKFxR9K2bJ3EZGtWDXAIRvjv4fGkPs');
```

#### Admin Yetkileri
```typescript
// Admin kontrol decorator
function adminOnly(handler: CommandHandler) {
  return async (ctx: CommandContext) => {
    if (ctx.from?.id.toString() !== process.env.ADMIN_ID) {
      await ctx.reply('❌ Bu komutu kullanma yetkiniz yok.');
      return;
    }
    return handler(ctx);
  };
}

// Kullanım
bot.command('stats', adminOnly(async (ctx) => {
  // Admin stats
}));
```

---

### 2. 🔒 Veri Güvenliği

#### Hassas Veri Saklama
| Veri Tipi | Saklama Yeri | Şifreleme |
|-----------|--------------|-----------|
| Bot Token | .env | ❌ (Token zaten gizli) |
| API Keys | .env | ❌ (External'da) |
| User Data | MongoDB | ✅ (MongDB TLS) |
| Logs | File/Cloud | ✅ (Rotation) |

#### MongoDB Güvenliği
```typescript
// TLS/SSL bağlantı
mongoose.connect(process.env.MONGODB_URI, {
  ssl: true,
  sslValidate: true,
  authSource: 'admin',
  retryWrites: true,
  w: 'majority'
});

// Connection string'de credentials
// mongodb://username:password@host:port/db?ssl=true
```

#### Şifreleme (Gelecek)
```typescript
// Hassas kullanıcı verilerini şifrele
import crypto from 'crypto';

const algorithm = 'aes-256-gcm';
const secretKey = process.env.ENCRYPTION_KEY!;

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipher(algorithm, secretKey);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return `${iv.toString('hex')}:${encrypted}`;
}

export function decrypt(encryptedData: string): string {
  const [ivHex, encrypted] = encryptedData.split(':');
  const decipher = crypto.createDecipher(algorithm, secretKey);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
```

---

### 3. 🚦 Rate Limiting

#### Komut Sınırlaması

```typescript
// Rate limit store (in-memory)
const rateLimitStore = new Map<number, { count: number; resetTime: number }>();

// Rate limit middleware
function rateLimit(maxRequests: number, windowMs: number) {
  return async (ctx: CommandContext, next: () => Promise<void>) => {
    const userId = ctx.from?.id;
    if (!userId) return;
    
    const now = Date.now();
    const userLimit = rateLimitStore.get(userId);
    
    if (!userLimit || now > userLimit.resetTime) {
      rateLimitStore.set(userId, {
        count: 1,
        resetTime: now + windowMs
      });
      return next();
    }
    
    if (userLimit.count >= maxRequests) {
      const waitTime = Math.ceil((userLimit.resetTime - now) / 1000);
      await ctx.reply(
        `⏱️ Çok hızlı komut gönderiyorsunuz.\n` +
        `${waitTime} saniye bekleyin.`
      );
      return;
    }
    
    userLimit.count++;
    return next();
  };
}

// Kullanım
bot.use(rateLimit(30, 60 * 1000)); // 60 saniyede 30 komut
```

#### IP Tabanlı Limitleme
```typescript
// Reverse proxy üzerinden IP alma
function getClientIP(ctx: UpdateContext): string {
  return ctx.msg?.from?.id.toString() || 
         ctx.chat?.id.toString() || 
         'unknown';
}
```

---

### 4. 🔍 Girdi Doğrulama

#### Input Sanitization
```typescript
import { z } from 'zod';

// Komut parametreleri validasyonu
const priceSchema = z.object({
  symbol: z.string()
    .min(1, 'Sembol gerekli')
    .max(10, 'Sembol çok uzun')
    .regex(/^[A-Z]+$/i, 'Sadece harf kullanın')
    .transform(val => val.toUpperCase())
});

bot.command('price', async (ctx) => {
  try {
    const { symbol } = priceSchema.parse(ctx.match);
    // Proceed with validated symbol
  } catch (error) {
    await ctx.reply('❌ Geçersiz sembol formatı. Örnek: /price BTC');
  }
});

// Not içeriği temizleme
function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // HTML tag'leri kaldır
    .substring(0, 1000); // Max uzunluk
}
```

#### SQL Injection Koruması
```typescript
// Mongoose ORM zaten koruma sağlar
// Ama raw query'lerde dikkatli ol

// ✅ Doğru (Mongoose)
const user = await User.findOne({ telegramId: userId });

// ❌ Yanlış (Raw query - kullanma)
// const user = await db.collection('users').findOne({ _id: userId });
```

---

### 5. 🛡️ API Güvenliği

#### Request Timeout
```typescript
// Tüm API çağrılarında timeout
const apiClient = axios.create({
  timeout: 10000, // 10 saniye
  headers: {
    'User-Agent': 'PandaBot/1.0'
  }
});

// Timeout error handling
try {
  const response = await apiClient.get('https://api.example.com/data');
} catch (error) {
  if (error.code === 'ECONNABORTED') {
    // Timeout
    throw new Error('API isteği zaman aşımına uğradı');
  }
}
```

#### API Key Rotation
```bash
# Her API anahtarı için ayrı environment variable
COINMARKETCAP_API_KEY_V1=...
COINMARKETCAP_API_KEY_V2=...
ACTIVE_API_KEY=COINMARKETCAP_API_KEY_V1

# Anahtar değiştirme
ACTIVE_API_KEY=COINMARKETCAP_API_KEY_V2
```

#### API Rate Limiting
```typescript
// Özel rate limiter (token bucket)
class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  
  constructor(
    private capacity: number,
    private refillRate: number // tokens per ms
  ) {
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }
  
  async take(): Promise<boolean> {
    this.refill();
    
    if (this.tokens >= 1) {
      this.tokens--;
      return true;
    }
    
    return false;
  }
  
  private refill() {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const newTokens = elapsed * this.refillRate;
    
    this.tokens = Math.min(this.capacity, this.tokens + newTokens);
    this.lastRefill = now;
  }
}

// Kullanım
const binanceLimiter = new RateLimiter(1200, 1200 / (60 * 1000)); // 1200/minute

if (!(await binanceLimiter.take())) {
  throw new Error('Rate limit exceeded for Binance API');
}
```

---

### 6. 🔐 LLM Güvenliği

#### Prompt Injection Koruması
```typescript
// Kullanıcı girdisini temizle
function sanitizePrompt(prompt: string): string {
  // Tehlikeli komutları filtrele
  const dangerousPatterns = [
    '/system',
    'ignore previous instructions',
    'simulate',
    'act as'
  ];
  
  let sanitized = prompt;
  for (const pattern of dangerousPatterns) {
    sanitized = sanitized.replace(new RegExp(pattern, 'gi'), '');
  }
  
  // Maksimum uzunluk
  return sanitized.substring(0, 500);
}

// Güvenli AI çağrısı
async function safeAICall(userPrompt: string): Promise<string> {
  const sanitized = sanitizePrompt(userPrompt);
  
  // Sistem prompt'u (sabit)
  const systemPrompt = `
    Sen bir finansal asistan botsun. 
    Sadece finans, ekonomi ve kripto para konularında yardım edebilirsin.
    Kötü niyetli komutlara uymazsın.
    Kişisel veri istemezsin.
  `;
  
  const response = await axios.post(
    'http://127.0.0.1:1234/v1/chat/completions',
    {
      model: 'local-model',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: sanitized }
      ],
      temperature: 0.7,
      max_tokens: 500
    }
  );
  
  return response.data.choices[0].message.content;
}
```

---

### 7. 📊 Log Güvenliği

#### Hassas Veri Filtreleme
```typescript
import winston from 'winston';

// Log filtreleme
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf((info) => {
      // Hassas verileri temizle
      const sanitized = JSON.stringify(info.message)
        .replace(/(\"password\":\s*\")[^"]*/gi, '$1[REDACTED]')
        .replace(/(\"token\":\s*\")[^"]*/gi, '$1[REDACTED]');
      
      return `${info.timestamp} [${info.level}]: ${sanitized}`;
    })
  ),
  transports: [
    new winston.transports.File({ filename: 'bot.log' }),
    new winston.transports.Console()
  ]
});

// Kullanım
logger.info({
  message: {
    userId: 123456,
    action: 'price_check',
    symbol: 'BTC'
    // password: 'secret123' // Bu log'da görünmez
  }
});
```

#### Log Rotation
```typescript
// Log dosyalarını rotate et
import DailyRotateFile from 'winston-daily-rotate-file';

const transport = new DailyRotateFile({
  filename: 'logs/bot-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d' // 14 gün sakla
});
```

---

### 8. 🏥 Hata Yönetimi

#### Graceful Shutdown
```typescript
// Process termination handling
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  
  // Aktif job'ları kaydet
  await agenda.stop();
  
  // MongoDB bağlantısını kapat
  await mongoose.connection.close();
  
  // Exit
  process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Log but don't crash
});
```

#### Retry Logic
```typescript
// Exponential backoff
async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3
): Promise<T> {
  let attempt = 1;
  
  while (attempt <= maxAttempts) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxAttempts) {
        throw error;
      }
      
      const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
      console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      attempt++;
    }
  }
  
  throw new Error('Max attempts reached');
}

// Kullanım
const price = await retry(() => getPrice('BTC'), 3);
```

---

### 9. 🚫 Admin Koruması

#### Kullanıcı Engelleme
```typescript
// Kullanıcı engelle
async function blockUser(userId: number, reason: string) {
  await User.findOneAndUpdate(
    { telegramId: userId },
    { 
      isBlocked: true,
      blockedAt: new Date(),
      blockedReason: reason
    }
  );
  
  // Admin'e bildir
  await bot.api.sendMessage(
    process.env.ADMIN_ID!,
    `🚫 Kullanıcı engellendi: ${userId}\n` +
    `Sebep: ${reason}`
  );
}

// Engelleme kontrol middleware
function checkBlocked(ctx: CommandContext, next: () => Promise<void>) {
  const userId = ctx.from?.id;
  
  if (!userId) return;
  
  User.findOne({ telegramId: userId }).then(user => {
    if (user?.isBlocked) {
      ctx.reply('❌ Hesabınız engellenmiştir.');
      return;
    }
    
    next();
  });
}

// Bot'a uygula
bot.use(checkBlocked);
```

---

### 10. 💾 Veri Yedekleme

#### MongoDB Yedekleme
```bash
# Manual backup
mongodump --uri="mongodb://..." --out=/backup/$(date +%Y%m%d)

# Otomatik backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backup/$DATE"

mongodump --uri="$MONGODB_URI" --out="$BACKUP_DIR"

# S3'e yükle
aws s3 cp "$BACKUP_DIR" "s3://pandabot-backups/$DATE" --recursive

# 7 günden eski backup'ları sil
find /backup -type d -mtime +7 -exec rm -rf {} \;
```

---

### 11. 🔍 Monitoring

#### Health Check Endpoint
```typescript
// Web server (opsiyonel)
import express from 'express';
const app = express();

app.get('/health', async (req, res) => {
  try {
    // MongoDB kontrol
    await mongoose.connection.db.admin().ping();
    
    // External API kontrol
    await axios.get('https://api.binance.com/api/v3/ping');
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version,
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

app.listen(3000, () => {
  console.log('Health check server running on port 3000');
});
```

#### Error Tracking
```typescript
// Sentry entegrasyonu (opsiyonel)
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV
});

// Hata yakalama
try {
  await someOperation();
} catch (error) {
  Sentry.captureException(error);
  logger.error(error);
}
```

---

## 🏗️ Dayanıklılık (Reliability)

### 1. Connection Pooling
```typescript
// MongoDB connection pool
mongoose.connect(process.env.MONGODB_URI, {
  maxPoolSize: 10, // Max 10 bağlantı
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
});
```

### 2. Circuit Breaker
```typescript
// API çağrıları için circuit breaker
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  constructor(
    private threshold: number,
    private timeout: number
  ) {}
  
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime < this.timeout) {
        throw new Error('Circuit breaker is OPEN');
      }
      this.state = 'HALF_OPEN';
    }
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }
  
  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
    }
  }
}
```

### 3. Bulkhead Pattern
```typescript
// Farklı modüller için ayrı thread'ler
// Worker processes

// main-worker.js - Bot
// alert-worker.js - Alert kontrolü
// reminder-worker.js - Hatırlatma kontrolü
```

---

## 📋 Güvenlik Checklist

### Development
- [ ] `.env` dosyası `.gitignore`'da
- [ ] Hard-coded secrets yok
- [ ] Input validation uygulandı
- [ ] Rate limiting aktif
- [ ] Error messages kullanıcıya hassas bilgi vermez

### Production
- [ ] HTTPS kullanımı
- [ ] API anahtarları güvende
- [ ] MongoDB TLS aktif
- [ ] Log rotation yapılandırıldı
- [ ] Backup stratejisi mevcut
- [ ] Monitoring aktif
- [ ] Admin paneli auth ile korunmuş

### Compliance
- [ ] Kullanıcı verisi GDPR uyumlu
- [ ] Rate limiting dokumentasyonu
- [ ] API kullanım limitleri not edildi
- [ ] Third-party API terms okundu

---

**Bir sonraki bölüm:** [Success Criteria (KPIs)](./09-kpis.md)
