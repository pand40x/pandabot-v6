# 🔐 5. Ortam Değişkenleri (.env)

## 📁 .env Dosyası

Tüm yapılandırma `.env` dosyasında saklanır.

### 📋 Gerekli Değişkenler

```bash
# =══════════════════════════════════════════════════════════
# TELEGRAM BOT YAPILANDIRMASI
# =══════════════════════════════════════════════════════════

# Telegram Bot Token
BOT_TOKEN=260395814:AAEpCOKFxR9K2bJ3EZGtWDXAIRvjv4fGkPs

# Admin Kullanıcı ID (Telegram'dan @userinfobot ile öğrenebilirsin)
ADMIN_ID=123456789

# =══════════════════════════════════════════════════════════
# VERİTABANI YAPILANDIRMASI
# =══════════════════════════════════════════════════════════

# MongoDB Bağlantı URI'si
# Format: mongodb://[username:password@]host[:port]/[database]?[options]
MONGODB_URI=mongodb://root:MUAwhLO1EEK5b5m05Lmrj8WvOnwKKnFLOfwX5sSRvgHg2zpYdmHMZ8RyxnceEqWZ@46.62.234.126:5437/?directConnection=true

# =══════════════════════════════════════════════════════════
# AI YAPILANDIRMASI
# = Yerel LLM model (Ollama, LM Studio vb.)
# =══════════════════════════════════════════════════════════

# Local LLM API Base URL
AI_BASE_URL=http://127.0.0.1:1234

# AI Model Adı (opsiyonel)
AI_MODEL_NAME=local-model

# AI Timeout (saniye)
AI_TIMEOUT=30

# =══════════════════════════════════════════════════════════
# MOD YAPILANDIRMASI
# = Sistem çalışma modları
# =══════════════════════════════════════════════════════════

# Çalışma Modu
ROTATION_MODE=health

# Desteklenen modlar:
# - health: Sağlık modu (tüm özellikler aktif)
# - read-only: Sadece okuma (fiyat sorgulama)
# - maintenance: Bakım modu (minimal özellik)
# - ai-only: Sadece AI modülü aktif

# =══════════════════════════════════════════════════════════
# API YAPILANDIRMASI
# = Dış servis API anahtarları (opsiyonel)
# =══════════════════════════════════════════════════════════

# CoinMarketCap API (Birden fazla key - rotation için)
COINMARKETCAP_API_KEY_1=82282cc8-7614-4dbc-bb8d-c0fece23ed03
COINMARKETCAP_API_KEY_2=47072cce-e237-4d4c-8ef9-e4fb4ac8a120
COINMARKETCAP_API_KEY_3=3b28409c-da97-4f0d-ad0c-4d30f8d68fef
COINMARKETCAP_API_KEY_4=57264830-d93a-4c21-8710-b36e12e837df

# Aktif olarak kullanılacak API key (1-4 arası)
COINMARKETCAP_ACTIVE_KEY=1

# Alpha Vantage API (Döviz kurları)
ALPHAVANTAGE_API_KEY=your_api_key_here

# Binance API (gelişmiş özellikler için)
BINANCE_API_KEY=your_api_key_here
BINANCE_SECRET_KEY=your_secret_key_here

# =══════════════════════════════════════════════════════════
# SISTEM YAPILANDIRMASI
# = Performans ve davranış ayarları
# =══════════════════════════════════════════════════════════

# Log Seviyesi
# Desteklenen: error, warn, info, debug
LOG_LEVEL=info

# Worker Process Sayısı
WORKER_COUNT=2

# Job Check Interval (saniye)
JOB_CHECK_INTERVAL=60

# Alert Check Interval (saniye)
ALERT_CHECK_INTERVAL=60

# Request Timeout (milisaniye)
REQUEST_TIMEOUT=10000

# =══════════════════════════════════════════════════════════
# ÖNBELLEK YAPILANDIRMASI
# = Redis (opsiyonel, performans için)
# =══════════════════════════════════════════════════════════

# Redis URL (opsiyonel)
REDIS_URL=redis://localhost:6379

# Cache TTL (saniye)
CACHE_TTL=300

# =══════════════════════════════════════════════════════════
# GÜVENLIK YAPILANDIRMASI
# = Kısıtlama ve filtreler
# = ========================================================

# Rate Limiting - Dakikada maksimum komut
RATE_LIMIT_PER_MINUTE=30

# Rate Limiting - Saatte maksimum komut
RATE_LIMIT_PER_HOUR=500

# IP Whitelist (Virgülle ayırılmış)
IP_WHITELIST=127.0.0.1,::1

# Maksimum Not Uzunluğu (karakter)
MAX_NOTE_LENGTH=1000

# Maksimum Hatırlatma Mesaj Uzunluğu
MAX_REMINDER_LENGTH=500

# =══════════════════════════════════════════════════════════
# LOKALIZASYON
# = Dil ve bölge ayarları
# = ========================================================

# Varsayılan Dil (tr, en)
DEFAULT_LANGUAGE=tr

# Varsayılan Para Birimi
DEFAULT_CURRENCY=USD

# Zaman Dilimi
TIMEZONE=Europe/Istanbul

# ============================================================
# NOTLAR
# ============================================================

# 1. Hiçbir zaman .env dosyasını git'e commit etmeyin!
# 2. .env.example dosyası oluşturun ve gizli değerleri kaldırın
# 3. Production'da environment variables kullanın
# 4. Hassas bilgileri (API keys) güvenli yerde saklayın
```

---

## 🔧 Yapılandırma Yükleme

### config/env.ts

```typescript
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

// Şema tanımı
const envSchema = z.object({
  BOT_TOKEN: z.string().min(1, 'BOT_TOKEN gerekli'),
  ADMIN_ID: z.string().transform(Number),
  MONGODB_URI: z.string().url('Geçerli MongoDB URI gerekli'),
  AI_BASE_URL: z.string().url().default('http://127.0.0.1:1234'),
  AI_MODEL_NAME: z.string().optional(),
  AI_TIMEOUT: z.string().transform(Number).default('30'),
  ROTATION_MODE: z.enum(['health', 'read-only', 'maintenance', 'ai-only']).default('health'),
  
  // CoinMarketCap API Keys (zorunlu)
  COINMARKETCAP_API_KEY_1: z.string().min(1, 'CMC API Key 1 gerekli'),
  COINMARKETCAP_API_KEY_2: z.string().min(1, 'CMC API Key 2 gerekli'),
  COINMARKETCAP_API_KEY_3: z.string().min(1, 'CMC API Key 3 gerekli'),
  COINMARKETCAP_API_KEY_4: z.string().min(1, 'CMC API Key 4 gerekli'),
  COINMARKETCAP_ACTIVE_KEY: z.string().transform(Number).default('1'),
  
  // Opsiyonel değişkenler
  ALPHAVANTAGE_API_KEY: z.string().optional(),
  
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  WORKER_COUNT: z.string().transform(Number).default('2'),
  JOB_CHECK_INTERVAL: z.string().transform(Number).default('60'),
  ALERT_CHECK_INTERVAL: z.string().transform(Number).default('60'),
  REQUEST_TIMEOUT: z.string().transform(Number).default('10000'),
  
  REDIS_URL: z.string().optional(),
  CACHE_TTL: z.string().transform(Number).default('300'),
  
  RATE_LIMIT_PER_MINUTE: z.string().transform(Number).default('30'),
  RATE_LIMIT_PER_HOUR: z.string().transform(Number).default('500'),
  
  DEFAULT_LANGUAGE: z.string().default('tr'),
  DEFAULT_CURRENCY: z.string().default('USD'),
  TIMEZONE: z.string().default('Europe/Istanbul'),
  
  MAX_NOTE_LENGTH: z.string().transform(Number).default('1000'),
  MAX_REMINDER_LENGTH: z.string().transform(Number).default('500')
});

// Validasyon
const env = envSchema.parse(process.env);

export const config = {
  bot: {
    token: env.BOT_TOKEN,
    adminId: env.ADMIN_ID
  },
  database: {
    uri: env.MONGODB_URI
  },
  ai: {
    baseUrl: env.AI_BASE_URL,
    modelName: env.AI_MODEL_NAME,
    timeout: env.AI_TIMEOUT
  },
  mode: env.ROTATION_MODE,
  apis: {
    coinMarketCap: {
      keys: [
        env.COINMARKETCAP_API_KEY_1,
        env.COINMARKETCAP_API_KEY_2,
        env.COINMARKETCAP_API_KEY_3,
        env.COINMARKETCAP_API_KEY_4
      ],
      activeKeyIndex: parseInt(env.COINMARKETCAP_ACTIVE_KEY) - 1,
      getActiveKey: function() {
        return this.keys[this.activeKeyIndex];
      },
      rotateKey: function() {
        this.activeKeyIndex = (this.activeKeyIndex + 1) % this.keys.length;
      }
    },
    alphaVantage: env.ALPHAVANTAGE_API_KEY
  },
  logging: {
    level: env.LOG_LEVEL
  },
  workers: {
    count: env.WORKER_COUNT,
    jobCheckInterval: env.JOB_CHECK_INTERVAL,
    alertCheckInterval: env.ALERT_CHECK_INTERVAL
  },
  http: {
    timeout: env.REQUEST_TIMEOUT
  },
  redis: {
    url: env.REDIS_URL,
    ttl: env.CACHE_TTL
  },
  limits: {
    rateLimitPerMinute: env.RATE_LIMIT_PER_MINUTE,
    rateLimitPerHour: env.RATE_LIMIT_PER_HOUR,
    maxNoteLength: env.MAX_NOTE_LENGTH,
    maxReminderLength: env.MAX_REMINDER_LENGTH
  },
  localization: {
    defaultLanguage: env.DEFAULT_LANGUAGE,
    defaultCurrency: env.DEFAULT_CURRENCY,
    timezone: env.TIMEZONE
  }
};
```

---

## 🚀 Kullanım Örnekleri

### TypeScript'te Config Kullanımı

```typescript
import { config } from './config/env';

// Bot token kullanımı
const bot = new Bot(config.bot.token);

// MongoDB bağlantısı
mongoose.connect(config.database.uri);

// AI timeout ayarı
const timeout = config.ai.timeout;

// Log seviyesi
logger.level = config.logging.level;
```

### Mod Kontrolü

```typescript
// Hangi modüllerin aktif olduğunu kontrol et
export function isModuleActive(moduleName: string): boolean {
  switch (config.mode) {
    case 'health':
      return true;
    case 'read-only':
      return ['prices', 'userlists', 'notes', 'currency'].includes(moduleName);
    case 'ai-only':
      return moduleName === 'ai';
    case 'maintenance':
      return ['users'].includes(moduleName);
    default:
      return false;
  }
}

// Kullanım
if (isModuleActive('alerts')) {
  // Alert modülü yükle
}
```

---

## 📦 .env.example Dosyası

`.env` dosyasının bir kopyasını `.env.example` olarak oluşturun ve gizli değerleri kaldırın:

```bash
# .env.example
BOT_TOKEN=
ADMIN_ID=
MONGODB_URI=
AI_BASE_URL=http://127.0.0.1:1234
ROTATION_MODE=health
LOG_LEVEL=info

# CoinMarketCap API Keys (4 adet - rotation)
COINMARKETCAP_API_KEY_1=
COINMARKETCAP_API_KEY_2=
COINMARKETCAP_API_KEY_3=
COINMARKETCAP_API_KEY_4=
COINMARKETCAP_ACTIVE_KEY=1
```

---

## 🔒 Güvenlik En İyi Uygulamalar

### ❌ Yapmayın

1. `.env` dosyasını git'e commit etmeyin
2. Production'da hard-coded değerler kullanmayın
3. Hassas bilgileri kod içinde saklamayın
4. Varsayılan değerleri production'da kullanmayın

### ✅ Yapın

1. `.env` dosyasını `.gitignore`'a ekleyin
2. Environment variables kullanın (Docker, Kubernetes)
3. API anahtarlarını güvenli yerde saklayın (1Password, AWS Secrets Manager)
4. `.env.example` dosyası oluşturun
5. Şifreli bağlantılar kullanın (TLS/SSL)

---

## 🐳 Docker için .env

`docker-compose.yml` ile kullanım:

```yaml
services:
  bot:
    build: .
    env_file:
      - .env
    environment:
      - NODE_ENV=production
```

---

**Bir sonraki bölüm:** [System Flow](./06-system-flow.md)
