# 🧱 7. Genişletme Planı

## 📅 Sürüm Takvimi

| Sürüm | Tarih | Modül | Açıklama |
|-------|-------|-------|----------|
| v1.0.0 | ✅ Current | Temel modüller | Price, Watchlists, Portfolio, Notes, Reminders, Alerts, AI, Users, Currency |
| v1.1 | 📅 Q1 2026 | Chart | Fiyat grafiği görüntüleme |
| v1.2 | 📅 Q2 2026 | AI Image | Görsel üretimi (Flux/SD) |
| v2.0 | 📅 2027 | Admin Panel | Web yönetim paneli |

---

## 🆕 v1.0 - Portfolio Module

### Özellikler

#### `/portfolio show <LIST_NAME>`
Kullanıcının izleme listesindeki tüm varlıkların toplam değerini hesaplar.

**Çıktı Örneği:**
```
📊 my-portfolio Değeri
━━━━━━━━━━━━━━━━━━━━
BTC   0.5 x $43,250  = $21,625
ETH   5 x $2,580     = $12,900
SOL   100 x $98      = $9,800
ADA   1000 x $0.52   = $520
━━━━━━━━━━━━━━━━━━━━
💰 Toplam: $44,845
📈 24s Değişim: +$1,245 (+2.86%)
━━━━━━━━━━━━━━━━━━━━
💵 USD | ₺1,352,000 TRY
```

#### `/portfolio add <LIST_NAME> <AMOUNT> <SYMBOL>`
Listeye belirli miktarda varlık ekler.

**Örnekler:**
```
/portfolio add my-portfolio 0.5 BTC
/portfolio add my-portfolio 5 ETH
```

#### Portfolio Tracking
- Varlık miktarlarını takip
- Kar/zarar hesaplama
- Döviz cinsinden değer gösterimi

### Teknik Detaylar

**Veri Şeması Güncellemesi:**
```typescript
// userlists koleksiyonuna eklenecek
{
  // ...
  tickers: [
    {
      symbol: string,
      amount: number,        // Yeni alan
      averagePrice: number,  // Yeni alan
      addedAt: Date
    }
  ]
}
```

**Servis Katmanı:**
```typescript
class PortfolioService {
  async calculateTotalValue(list: UserList): Promise<PortfolioValue> {
    let totalUSD = 0;
    let totalTRY = 0;
    
    for (const ticker of list.tickers) {
      const price = await this.getCurrentPrice(ticker.symbol);
      const value = ticker.amount * price;
      totalUSD += value;
    }
    
    const usdTryRate = await this.getUSDTRate();
    totalTRY = totalUSD * usdTryRate;
    
    return {
      totalUSD,
      totalTRY,
      tickers: list.tickers.map(t => ({
        ...t,
        currentPrice: await this.getCurrentPrice(t.symbol),
        value: t.amount * price
      }))
    };
  }
}
```

---

## 📈 v1.1 - Chart Module

### Özellikler

#### `/chart <SYMBOL> <TIMEFRAME>`
Belirli zaman diliminde fiyat grafiği gösterir.

**Zaman Dilimleri:**
- `1h` - 1 saatlik
- `4h` - 4 saatlik
- `1d` - Günlük (varsayılan)
- `1w` - Haftalık
- `1m` - Aylık

**Örnekler:**
```
/chart BTC 1d
/chart ETH 4h
```

#### Grafik Türleri

1. **Line Chart** - Temel fiyat grafiği
2. **Candlestick Chart** - Açılış/yüksek/düşük/kapalı
3. **Volume Chart** - İşlem hacmi grafiği

**Çıktı Örneği:**
```
📊 BTC/USDT - 1 Günlük Grafik
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
$44,100 ┤                  ╭─╮
$43,500 ┤            ╭─╮  │ │╭─╮
$42,900 ┤      ╭─╮   │ │  │ ││ │
$42,300 ┤ ╭─╮   │ │   │ │  │ ││ │
$41,700 ┤ │ │╭─╮│ │╭─╮│ │╭─╮│ ││ │
        └─┴─╯│ ││ ││ ││ ││ │╯ ╰
     00:00  06:00  12:00  18:00  24:00
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Vol: $28.5B | 📈 %: +3.2%
```

### Teknik Detaylar

**Binance Kline API:**
```typescript
// GET /api/v3/klines
// Query params: symbol, interval, limit
const response = await axios.get(
  'https://api.binance.com/api/v3/klines',
  {
    params: {
      symbol: 'BTCUSDT',
      interval: '1h', // 1m, 5m, 15m, 30m, 1h, 2h, 4h, 6h, 8h, 12h, 1d, 3d, 1w, 1M
      limit: 24 // Max 1000
    }
  }
);

// Response: [openTime, open, high, low, close, volume, closeTime, ...]
```

**ASCII Chart Generator:**
```typescript
class ChartGenerator {
  generateAsciiChart(prices: number[], width: number = 40): string {
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min;
    
    let chart = '';
    for (let i = 0; i < prices.length; i++) {
      const height = Math.round(((prices[i] - min) / range) * 10);
      chart += ' '.repeat(height) + '╭─╮\n';
    }
    
    return chart;
  }
}
```

---

## 🎨 v1.2 - AI Image Module

### Özellikler

#### `/ai_image <PROMPT>`
AI ile görsel oluşturur.

**Örnekler:**
```
/ai_image Bitcoin golden coin
/ai_image Ethereum logo design
/ai_image Cryptocurrency portfolio chart
```

#### Desteklenen Modeller
- **Stable Diffusion** - Yerel veya cloud
- **Flux** - Hızlı ve kaliteli
- **DALL-E** - OpenAI (opsiyonel)

**Çıktı:**
Bot kullanıcıya oluşturulan görseli gönderir + prompt bilgisi.

### Teknik Detaylar

**API Entegrasyonu:**
```typescript
// Stable Diffusion API (ComfyUI veya Automatic1111)
const generateImage = async (prompt: string) => {
  const response = await axios.post(
    'http://127.0.0.1:7860/sdapi/v1/txt2img',
    {
      prompt,
      negative_prompt: 'blurry, low quality, distorted',
      width: 512,
      height: 512,
      steps: 20,
      sampler: 'Euler a'
    },
    {
      timeout: 60000
    }
  );
  
  // Response contains base64 image
  const imageBase64 = response.data.images[0];
  return `data:image/png;base64,${imageBase64}`;
};
```

**Telegram Photo Upload:**
```typescript
bot.command('ai_image', async (ctx) => {
  const prompt = ctx.match;
  
  if (!prompt) {
    await ctx.reply('❓ Prompt yazın: /ai_image <açıklama>');
    return;
  }
  
  await ctx.reply('🎨 Görsel oluşturuluyor... (Bu işlem 30-60 saniye sürebilir)');
  
  try {
    const imageBase64 = await generateImage(prompt);
    const buffer = Buffer.from(imageBase64.split(',')[1], 'base64');
    
    await ctx.replyWithPhoto(
      { source: buffer },
      {
        caption: `🎨 ${prompt}\n🤖 AI tarafından oluşturuldu`
      }
    );
  } catch (error) {
    await ctx.reply('❌ Görsel oluşturulurken hata oluştu.');
  }
});
```

---

## 🖥️ v2.0 - Admin Panel (Web)

### Özellikler

#### Web Dashboard
- **Next.js** tabanlı web arayüzü
- **React** + **TypeScript**
- **Tailwind CSS** + **Shadcn/ui**
- **Charts.js** / **Recharts** - Grafikler
- **React Query** - Data fetching

#### Sayfalar

1. **Dashboard** (`/`)
   - Kullanıcı sayısı
   - Aktif alarmlar
   - Son aktiviteler
   - Sistem sağlığı

2. **Users** (`/users`)
   - Kullanıcı listesi
   - Filtreleme/sıralama
   - Kullanıcı detayı
   - Engelleme/engeli kaldırma

3. **Alerts** (`/alerts`)
   - Tüm alarmlar
   - Durum güncelleme
   - İstatistikler

4. **Reminders** (`/reminders`)
   - Aktif hatırlatmalar
   - Tamamlananlar
   - Toplu işlemler

5. **Analytics** (`/analytics`)
   - Kullanım grafikleri
   - En popüler komutlar
   - Coğrafi dağılım

6. **Settings** (`/settings`)
   - Bot ayarları
   - API anahtarları
   - Sistem konfigürasyonu

### Teknik Detaylar

**Tech Stack:**
```
Frontend (Next.js):
- React 18
- TypeScript
- Tailwind CSS
- Shadcn/ui components
- Recharts (charts)
- React Query (data fetching)
- Zustand (state management)

Backend API:
- Next.js API routes
- JWT authentication
- Rate limiting
- CORS configuration

Database:
- MongoDB (shared with bot)
- Admin users collection
- Session management
```

**API Endpoints:**
```typescript
// /api/users
GET    /api/users          - List users
GET    /api/users/:id      - Get user details
PUT    /api/users/:id      - Update user
DELETE /api/users/:id      - Delete user

// /api/alerts
GET    /api/alerts         - List alerts
PUT    /api/alerts/:id     - Update alert
DELETE /api/alerts/:id     - Delete alert

// /api/stats
GET    /api/stats/overview - Dashboard stats
GET    /api/stats/users    - User analytics
GET    /api/stats/usage    - Usage analytics
```

**Güvenlik:**
- Admin JWT token
- Role-based access control (RBAC)
- Rate limiting
- HTTPS only
- CSRF protection

---

## 🔮 Gelecek Vizyonu

### v3.0+ (2027+)

#### Social Trading
- Kullanıcılar portföylerini paylaşabilir
- Copy trading özelliği
- Trader performans sıralaması

#### NFT Integration
- NFT fiyat takibi
- Collection analizi
- NFT alertleri

#### DeFi Features
- DEX arbitrage
- Liquidity pool tracking
- Yield farming calculator

#### Mobile App
- React Native uygulaması
- Push notifications
- Offline mode

#### AI Enhancements
- Sentiment analizi
- Fiyat tahminleri
- Otomatik trading botları (kullanıcı sorumluluğu)

---

## 🏗️ Genişletme Rehberi

### Yeni Modül Ekleme

```typescript
// 1. Modül klasörü oluştur
mkdir -p src/modules/new-module

// 2. Temel dosyalar
touch src/modules/new-module/index.ts
touch src/modules/new-module/handlers.ts
touch src/modules/new-module/types.ts

// 3. Router'a ekle
// src/core/router.ts
import { NewModule } from '../modules/new-module';

export function setupRouter(bot: Bot) {
  // ...
  NewModule.register(bot);
}

// 4. Export et
// src/modules/index.ts
export * from './new-module';
```

### API Entegrasyonu

```typescript
// 1. Servis oluştur
// src/services/external-api.ts
export class ExternalAPI {
  private baseUrl: string;
  private apiKey: string;
  
  constructor() {
    this.baseUrl = process.env.EXTERNAL_API_URL!;
    this.apiKey = process.env.EXTERNAL_API_KEY!;
  }
  
  async getData(params: any) {
    const response = await axios.get(`${this.baseUrl}/endpoint`, {
      params,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    });
    
    return response.data;
  }
}

// 2. Modülde kullan
import { ExternalAPI } from '../../services/external-api';

const api = new ExternalAPI();
const data = await api.getData(params);
```

---

**Bir sonraki bölüm:** [Security & Reliability](./08-security.md)
