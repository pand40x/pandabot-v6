# 🧱 11. Proje Klasör Yapısı

## 📁 Önerilen Klasör Yapısı

```
telegram-bot-v6/
├── prd/                          # 📋 Bu dokümantasyon
│   ├── README.md
│   ├── 01-project-overview.md
│   ├── 02-architecture.md
│   ├── 03-features.md
│   ├── 04-data-model.md
│   ├── 05-environment.md
│   ├── 06-system-flow.md
│   ├── 07-expansion-plan.md
│   ├── 08-security.md
│   ├── 09-kpis.md
│   ├── 10-admin-features.md
│   ├── 11-folder-structure.md
│   └── 12-conclusion.md
│
├── src/                          # 💻 Kaynak kodlar
│   ├── index.ts                  # 🚀 Entry point
│   ├── bot.ts                    # 🤖 Bot başlatma
│   │
│   ├── config/                   # ⚙️ Konfigürasyon
│   │   ├── env.ts                # Environment variables
│   │   ├── database.ts           # DB bağlantı ayarları
│   │   └── logging.ts            # Log konfigürasyonu
│   │
│   ├── core/                     # 🏗️ Çekirdek işlevler
│   │   ├── db.ts                 # MongoDB bağlantısı
│   │   ├── logger.ts             # Winston logger
│   │   ├── scheduler.ts          # Agenda job scheduler
│   │   ├── router.ts             # Command router
│   │   └── middleware/           # Express/grammY middleware
│   │       ├── auth.ts
│   │       ├── rateLimit.ts
│   │       └── validation.ts
│   │
│   ├── modules/                  # 🧩 Modüler özellikler
│   │   ├── index.ts              # Modül exports
│   │   │
│   │   ├── prices/               # 💰 Fiyat modülü
│   │   │   ├── index.ts
│   │   │   ├── handlers.ts       # Command handlers
│   │   │   ├── service.ts        # Business logic
│   │   │   ├── types.ts          # TypeScript types
│   │   │   └── utils/
│   │   │       ├── binance.ts    # Binance API client
│   │   │       └── yahoo.ts      # Yahoo Finance client
│   │   │
│   │   ├── watchlists/           # 📋 İzleme listeleri (sadece ticker)
│   │   │   ├── index.ts
│   │   │   ├── handlers.ts
│   │   │   ├── service.ts
│   │   │   ├── model.ts          # Mongoose schema
│   │   │   └── types.ts
│   │   │
│   │   ├── portfolios/           # 💼 Portföy modülü (ticker + amount)
│   │   │   ├── index.ts
│   │   │   ├── handlers.ts
│   │   │   ├── service.ts
│   │   │   ├── model.ts          # Mongoose schema
│   │   │   └── types.ts
│   │   │
│   │   ├── notes/                # 📝 Not modülü
│   │   │   ├── index.ts
│   │   │   ├── handlers.ts
│   │   │   ├── service.ts
│   │   │   ├── model.ts
│   │   │   └── types.ts
│   │   │
│   │   ├── reminders/            # ⏰ Hatırlatma modülü
│   │   │   ├── index.ts
│   │   │   ├── handlers.ts
│   │   │   ├── service.ts
│   │   │   ├── model.ts
│   │   │   ├── types.ts
│   │   │   └── jobs/
│   │   │       └── send-reminder.ts
│   │   │
│   │   ├── alerts/               # 🔔 Fiyat alarm modülü
│   │   │   ├── index.ts
│   │   │   ├── handlers.ts
│   │   │   ├── service.ts
│   │   │   ├── model.ts
│   │   │   ├── types.ts
│   │   │   └── worker/
│   │   │       └── alert-checker.ts
│   │   │
│   │   ├── ai/                   # 🤖 AI modülü
│   │   │   ├── index.ts
│   │   │   ├── handlers.ts
│   │   │   ├── service.ts
│   │   │   ├── types.ts
│   │   │   └── client.ts         # LLM API client
│   │   │
│   │   ├── users/                # 👤 Kullanıcı modülü
│   │   │   ├── index.ts
│   │   │   ├── handlers.ts
│   │   │   ├── service.ts
│   │   │   ├── model.ts
│   │   │   └── types.ts
│   │   │
│   │   └── currency/             # 💱 Döviz modülü
│   │       ├── index.ts
│   │       ├── handlers.ts
│   │       ├── service.ts
│   │       ├── types.ts
│   │       └── client.ts         # Alpha Vantage, ExchangeRate
│   │
│   ├── services/                 # 🌐 External API clients
│   │   ├── binance.ts
│   │   ├── yahoo.ts
│   │   ├── coinmarketcap.ts
│   │   ├── coingecko.ts
│   │   ├── alphavantage.ts
│   │   └── llm/
│   │       └── local.ts          # Local LLM client
│   │
│   ├── utils/                    # 🔧 Yardımcı fonksiyonlar
│   │   ├── format.ts             # Format helpers
│   │   ├── helpers.ts            # General helpers
│   │   ├── validators.ts         # Input validators
│   │   ├── constants.ts          # Constants
│   │   └── errors.ts             # Custom errors
│   │
│   ├── types/                    # 📝 TypeScript types
│   │   ├── global.d.ts
│   │   ├── module-types.ts       # Module interface types
│   │   └── api-types.ts          # External API types
│   │
│   ├── workers/                  # 👷 Background workers
│   │   ├── alerts-worker.ts      # Price alert checker
│   │   ├── reminders-worker.ts   # Reminder dispatcher
│   │   └── cleanup-worker.ts     # Data cleanup tasks
│   │
│   └── tests/                    # 🧪 Test dosyaları
│       ├── unit/
│       │   ├── modules/
│       │   ├── services/
│       │   └── utils/
│       ├── integration/
│       │   ├── bot.test.ts
│       │   └── database.test.ts
│       └── fixtures/
│
├── public/                       # 🎨 Static assets (gelecek)
│   └── images/
│
├── docs/                         # 📚 Ek dokümantasyon
│   ├── api.md
│   ├── deployment.md
│   └── troubleshooting.md
│
├── scripts/                      # 🛠️ Utility scripts
│   ├── setup.sh                 # Setup script
│   ├── backup.sh                # Database backup
│   ├── migrate.sh                # Migration scripts
│   └── deploy.sh                # Deployment script
│
├── .env.example                  # Environment template
├── .env                          # Environment variables (git'e eklenmez!)
├── .gitignore
├── .prettierrc                   # Code formatter config
├── .eslintrc                     # Linter config
├── tsconfig.json                 # TypeScript config
├── package.json
├── package-lock.json
├── Dockerfile                    # Docker image
├── docker-compose.yml            # Docker orchestration
├── docker-compose.prod.yml       # Production docker compose
├── README.md                     # Project README
└── CLAUDE.md                     # Claude Code config
```

---

## 📋 Dosya Açıklamaları

### 🚀 Core Files

#### `src/index.ts`
```typescript
// Ana entry point
import { createBot } from './bot';
import { connectDatabase } from './core/db';
import { setupScheduler } from './core/scheduler';
import { logger } from './core/logger';
import { config } from './config/env';

async function bootstrap() {
  try {
    // 1. Connect to database
    await connectDatabase();
    logger.info('✅ Database connected');
    
    // 2. Setup job scheduler
    await setupScheduler();
    logger.info('✅ Scheduler initialized');
    
    // 3. Create and start bot
    const bot = createBot();
    await bot.init();
    await bot.start();
    logger.info('✅ Bot started');
    
    logger.info(`🤖 PandaBot is running...`);
  } catch (error) {
    logger.error('❌ Failed to start:', error);
    process.exit(1);
  }
}

bootstrap();
```

#### `src/bot.ts`
```typescript
// Bot oluşturma ve modül kaydı
import { Bot } from 'grammy';
import { config } from './config/env';
import { setupRouter } from './core/router';
import { registerModules } from './modules';

export function createBot(): Bot {
  const bot = new Bot(config.bot.token);
  
  // Middleware'leri kaydet
  bot.use(rateLimitMiddleware);
  bot.use(validationMiddleware);
  
  // Modülleri kaydet
  registerModules(bot);
  
  // Router'ı ayarla
  setupRouter(bot);
  
  // Global error handler
  bot.catch((err) => {
    logger.error('Bot error:', err);
  });
  
  return bot;
}
```

---

### 🏗️ Core Module Files

#### `src/config/env.ts`
```typescript
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  BOT_TOKEN: z.string().min(1),
  MONGODB_URI: z.string().url(),
  AI_BASE_URL: z.string().url().default('http://127.0.0.1:1234'),
  // ... diğer değişkenler
});

export const config = envSchema.parse(process.env);
```

#### `src/core/db.ts`
```typescript
// MongoDB bağlantısı
import mongoose from 'mongoose';
import { config } from '../config/env';
import { logger } from './logger';

export async function connectDatabase() {
  mongoose.set('strictQuery', true);
  
  await mongoose.connect(config.database.uri, {
    // Connection options
  });
  
  mongoose.connection.on('connected', () => {
    logger.info('📦 MongoDB connected');
  });
  
  mongoose.connection.on('error', (error) => {
    logger.error('MongoDB error:', error);
  });
}
```

#### `src/core/scheduler.ts`
```typescript
// Agenda job scheduler
import Agenda from 'agenda';
import { config } from '../config/env';
import { logger } from './logger';

const agenda = new Agenda({
  db: { 
    address: config.database.uri, 
    collection: 'jobs' 
  }
});

// Job tanımları
agenda.define('send-reminder', async (job) => {
  // Reminder gönderme logic
});

export async function setupScheduler() {
  await agenda.start();
  logger.info('⏰ Agenda scheduler started');
}

export { agenda };
```

---

### 🧩 Module Structure

#### Her modül için standart yapı:

```typescript
// modules/prices/index.ts
import { Bot } from 'grammy';
import { registerPriceHandler } from './handlers';
import { PriceService } from './service';
import { PriceTypes } from './types';

export const PriceModule = {
  name: 'prices',
  
  register(bot: Bot) {
    registerPriceHandler(bot);
  },
  
  init() {
    // Modül initialization
    const service = new PriceService();
    return service;
  }
};

// Ana modül dosyası
export { PriceModule };
```

#### Modül Handler Dosyası:

```typescript
// modules/prices/handlers.ts
import { Bot, CommandContext } from 'grammy';
import { PriceService } from './service';
import { PriceQuerySchema } from './types';

const priceService = new PriceService();

export function registerPriceHandler(bot: Bot) {
  bot.command('price', async (ctx: CommandContext) => {
    try {
      const symbol = ctx.match;
      const data = PriceQuerySchema.parse({ symbol });
      
      const result = await priceService.getPrice(data.symbol);
      
      await ctx.reply(formatPriceMessage(result));
    } catch (error) {
      await ctx.reply('❌ Fiyat alınırken hata oluştu.');
    }
  });
}

function formatPriceMessage(price: any): string {
  return `🪙 ${price.symbol}\n💰 ${price.usd}`;
}
```

#### Service Dosyası:

```typescript
// modules/prices/service.ts
import { BinanceClient } from '../../services/binance';
import { PriceTypes } from './types';

export class PriceService {
  private binance: BinanceClient;
  
  constructor() {
    this.binance = new BinanceClient();
  }
  
  async getPrice(symbol: string): Promise<PriceTypes.PriceData> {
    return this.binance.getTickerPrice(symbol);
  }
}
```

#### Model Dosyası:

```typescript
// modules/userlists/model.ts
import mongoose, { Schema, Document } from 'mongoose';

interface IUserList extends Document {
  userId: number;
  listName: string;
  tickers: Array<{
    symbol: string;
    amount?: number;
    addedAt: Date;
  }>;
}

const UserListSchema = new Schema<IUserList>({
  userId: { type: Number, required: true, index: true },
  listName: { type: String, required: true },
  tickers: [{
    symbol: { type: String, required: true },
    addedAt: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true
});

export const UserList = mongoose.model<IUserList>('UserList', UserListSchema);
```

---

### 🔧 Utility Files

#### `src/utils/format.ts`
```typescript
// Format helpers
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency
  }).format(amount);
}

export function formatPercentage(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}
```

#### `src/utils/helpers.ts`
```typescript
// General helpers
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function isValidSymbol(symbol: string): boolean {
  return /^[A-Z]{2,10}$/.test(symbol);
}
```

---

### 👷 Worker Files

#### `src/workers/alerts-worker.ts`
```typescript
// Background worker - Price alert checker
import { Alert } from '../modules/alerts/model';
import { BinanceClient } from '../services/binance';
import { logger } from '../core/logger';

const binance = new BinanceClient();

async function checkAlerts() {
  const activeAlerts = await Alert.find({ status: 'active' });
  
  for (const alert of activeAlerts) {
    const currentPrice = await binance.getTickerPrice(alert.symbol);
    
    const changePercent = ((currentPrice - alert.basePrice) / alert.basePrice) * 100;
    
    // Check if threshold triggered
    if (shouldTrigger(alert.thresholdPct, changePercent)) {
      await triggerAlert(alert, currentPrice, changePercent);
    }
  }
}

// Her dakika çalıştır
setInterval(checkAlerts, 60000);
```

---

## 📦 Configuration Files

### `package.json`
```json
{
  "name": "pandabot-v6",
  "version": "1.0.0",
  "description": "Modüler Finans Asistanı Telegram Botu",
  "main": "dist/index.js",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "worker": "tsx src/workers/alerts-worker.ts",
    "test": "jest",
    "test:watch": "jest --watch",
    "lint": "eslint src --ext .ts",
    "format": "prettier --write src"
  },
  "dependencies": {
    "grammy": "^1.x",
    "mongoose": "^7.x",
    "agenda": "^5.x",
    "axios": "^1.x",
    "winston": "^3.x",
    "dotenv": "^16.x",
    "zod": "^3.x"
  },
  "devDependencies": {
    "typescript": "^5.x",
    "tsx": "^4.x",
    "@types/node": "^20.x",
    "jest": "^29.x",
    "@types/jest": "^29.x",
    "eslint": "^8.x",
    "@typescript-eslint/eslint-plugin": "^6.x",
    "prettier": "^3.x"
  }
}
```

### `tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### `.gitignore`
```
node_modules/
dist/
.env
.env.local
*.log
logs/
coverage/
.DS_Store
.vscode/
.idea/
*.swp
*.swo
.cache/
```

---

## 🐳 Docker Yapılandırması

### `Dockerfile`
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

### `docker-compose.yml`
```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:6
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
    environment:
      MONGO_INITDB_ROOT_USERNAME: root
      MONGO_INITDB_ROOT_PASSWORD: password
  
  bot:
    build: .
    depends_on:
      - mongodb
    environment:
      - MONGODB_URI=mongodb://root:password@mongodb:27017/pandabot?authSource=admin
    env_file:
      - .env

volumes:
  mongodb_data:
```

---

## 📁 Proje Kurulum Scripti

### `scripts/setup.sh`
```bash
#!/bin/bash
# Setup script for development

echo "🚀 PandaBot v6 Setup"
echo "====================="

# 1. Install dependencies
echo "📦 Installing dependencies..."
npm install

# 2. Copy environment file
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "⚠️ Please edit .env file with your values!"
fi

# 3. Build project
echo "🔨 Building project..."
npm run build

# 4. Run tests
echo "🧪 Running tests..."
npm test

echo "✅ Setup complete!"
echo "To start the bot, run: npm run dev"
```

---

## 📊 Modül Bağımlılık Haritası

```
index.ts
  └── bot.ts
      └── modules/
          ├── prices/ ---------> services/binance
          ├── userlists/ ------> (bağımlılık yok)
          ├── notes/ ----------> (bağımlılık yok)
          ├── reminders/ ------> core/scheduler
          ├── alerts/ --------> services/binance
          ├── ai/ ------------> services/llm/local
          ├── users/ ----------> (bağımlılık yok)
          └── currency/ -------> services/alphavantage
```

---

## 🎯 Dosya Boyutu Önerileri

| Dosya Türü | Maksimum Boyut | Açıklama |
|------------|----------------|----------|
| `.ts` | 500 satır | Her dosya tek bir sorumluluk |
| `Handler` | 200 satır | Komut işleyicileri |
| `Service` | 300 satır | Business logic |
| `Model` | 100 satır | Mongoose şemaları |
| `Test` | 500 satır | Test dosyaları |

---

## 📝 Kod Standartları

### Dosya Adlandırma

```typescript
// ✅ Doğru
user-list.service.ts
price-handler.ts
alert.model.ts
validators.ts

// ❌ Yanlış
userlistService.ts
priceHandler.ts
AlertModel.ts
Validation.ts
```

### Class Adlandırma

```typescript
// ✅ Doğru
class PriceService {}
class UserListHandler {}
class AlertModel {}

// ❌ Yanlış
class price_service {}
class userListHandler {}
class alertmodel {}
```

---

## 🔍 Import Sırası

```typescript
// 1. Node modules
import express from 'express';
import mongoose from 'mongoose';

// 2. Third-party packages
import { Bot } from 'grammy';
import axios from 'axios';

// 3. Internal modules (absolute imports)
import { config } from '../../config/env';
import { logger } from '../../core/logger';

// 4. Relative imports
import { PriceService } from './service';
import { PriceTypes } from './types';
```

---

**Bir sonraki bölüm:** [Conclusion](./12-conclusion.md)
