# ⚙️ 2. Mimari ve Teknoloji Yığını

## 🏗️ Sistem Mimarisi

```
┌─────────────────────────────────────────────────────────────┐
│                    TELEGRAM CLIENT                          │
│                     (User Interface)                        │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                        grammY                               │
│                     (Bot Framework)                         │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                      Command Router                         │
└───────────────────────────┬─────────────────────────────────┘
                            │
            ┌───────────────┼───────────────┐
            │               │               │
┌───────────▼──────────┐ ┌──▼────┐ ┌──────▼──────┐
│   Modules Layer      │ │ Core  │ │  Workers   │
│   (Bağımsız Modüller)│ │ Layer │ │ (Agenda/   │
│                      │ │       │ │  BullMQ)   │
│ - prices             │ │       │ │            │
│ - userlists          │ │ - db  │ │ - reminders│
│ - notes              │ │ - cfg │ │ - alerts   │
│ - reminders          │ │ - log │ │ - cron     │
│ - alerts             │ │       │ │            │
│ - ai                 │ │       │ │            │
│ - users              │ │       │ │            │
│ - currency           │ │       │ │            │
└──────────┬───────────┘ └───┬───┘ └──────┬──────┘
           │                  │            │
           └──────────────────┼────────────┘
                              │
                    ┌─────────▼──────────┐
                    │     MongoDB        │
                    │   (Veritabanı)     │
                    └─────────┬──────────┘
                              │
           ┌──────────────────┼──────────────────┐
           │                  │                  │
    ┌──────▼──────┐   ┌──────▼──────┐   ┌──────▼─────────┐
    │  External   │   │  External   │   │  Local LLM     │
    │    APIs     │   │    APIs     │   │     API        │
    │            │   │            │   │ (127.0.0.1:1234)│
    │ - Binance  │   │ - Yahoo     │   │                │
    │ - CoinMarket│   │ - Alpha     │   │                │
    │   Cap       │   │   Vantage   │   │                │
    │ - CoinGecko │   │             │   │                │
    └─────────────┘   └─────────────┘   └────────────────┘
```

## 🛠️ Teknoloji Yığını

### Core Technologies

| Katman | Teknoloji | Versiyon | Açıklama |
|--------|-----------|----------|----------|
| **Runtime** | Node.js | 18.x+ | JavaScript runtime |
| **Language** | TypeScript | 5.x+ | Tip güvenli JavaScript |
| **Bot Framework** | grammY | 1.x | Telegram Bot API |
| **Database** | MongoDB | 6.x+ | NoSQL veritabanı |
| **ODM** | Mongoose | 7.x+ | MongoDB object modeling |

### Supporting Technologies

| Kategori | Teknoloji | Açıklama |
|----------|-----------|----------|
| **Scheduler** | Agenda / BullMQ | Job scheduling ve queuing |
| **HTTP Client** | Axios | API istekleri |
| **Logger** | Winston | Yapılandırılabilir loglama |
| **Config** | dotenv | Ortam değişkenleri |
| **Validation** | Zod / Yup | Giriş doğrulama |
| **Testing** | Jest | Unit ve integration testler |

### External Integrations

| Servis | API | Amaç |
|--------|-----|------|
| **Binance** | REST/WebSocket | Kripto fiyatları |
| **Yahoo Finance** | REST | Hisse senedi fiyatları |
| **CoinMarketCap** | REST | Kripto verileri (Ana kaynak) |
| **Local LLM** | HTTP (127.0.0.1:1234) | AI asistan |
| **Alpha Vantage** | REST | Döviz kurları |

## 📊 Modül Mimarisi

### Modül Bağımsızlığı

Her modül:
- ✅ Kendi başına çalışabilir
- ✅ Diğer modüllere bağımlılığı yok
- ✅ Test edilebilir
- ✅ Genişletilebilir

### Modül Yapısı

```
modules/
├── {module-name}/
│   ├── index.ts          (Main export)
│   ├── handlers/         (Command handlers)
│   ├── services/         (Business logic)
│   ├── models/           (Mongoose schemas)
│   ├── types.ts          (Type definitions)
│   └── utils/            (Module-specific utils)
│
├── prices/               (Fiyat modülü)
├── userlists/            (Liste modülü)
├── notes/                (Not modülü)
├── reminders/            (Hatırlatma modülü)
├── alerts/               (Alarm modülü)
├── ai/                   (AI modülü)
├── users/                (Kullanıcı modülü)
└── currency/             (Döviz modülü)
```

## 🔄 Veri Akışı

### 1. Komut İşleme

```
Telegram → grammY → Router → Module Handler → Response → Telegram
```

### 2. Zamanlanmış Görevler

```
Agenda/BullMQ → Worker → Database Check → Notification → User
```

### 3. Fiyat İzleme

```
Scheduler → Price Check → Compare Thresholds → Trigger Alert → Notify
```

### 4. AI Sorgusu

```
User Query → LLM Client → Local API (127.0.0.1:1234) → Response
```

## 🔌 Genişletilebilirlik

### Yeni Modül Ekleme

```typescript
// modules/new-module/index.ts
import { Bot } from 'grammy';
import { ModuleInterface } from '../types';

export const NewModule: ModuleInterface = {
  name: 'new-module',
  register(bot: Bot) {
    bot.command('newcmd', handler);
  },
  init() {
    // Module initialization
  }
};
```

### API Entegrasyonu Ekleme

```typescript
// services/external-api.ts
import axios from 'axios';

export class ExternalAPI {
  async getData(symbol: string) {
    const response = await axios.get(
      `https://api.example.com/v1/${symbol}`
    );
    return response.data;
  }
}
```

## 🏃‍♂️ Performans Optimizasyonları

1. **Lazy Loading:** Modüller ihtiyaç duyulduğunda yüklenir
2. **Caching:** Redis ile API cevapları cache'lenir
3. **Connection Pooling:** MongoDB bağlantı havuzu
4. **Worker Threads:** CPU yoğun işlemler ayrı thread'lerde
5. **Rate Limiting:** API çağrıları sınırlandırılır

## 📡 Dağıtım (Opsiyonel)

### Docker Compose

```yaml
version: '3.8'
services:
  mongodb:
    image: mongo:6
    ports:
      - "27017:27017"
  
  bot:
    build: .
    depends_on:
      - mongodb
    environment:
      - MONGODB_URI=mongodb://mongodb:27017/pandabot
  
  worker:
    build: .
    command: npm run worker
    depends_on:
      - mongodb
```

---

**Bir sonraki bölüm:** [Features](./03-features.md)
