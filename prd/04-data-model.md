# 🧮 4. Veri Modeli (MongoDB Şeması)

## 📊 Koleksiyon Yapısı

Toplam **6 ana koleksiyon** ile tüm veriler yönetilir:

```
MongoDB (pandabot)
├── users          (Kullanıcı bilgileri)
├── notes          (Kullanıcı notları)
├── reminders      (Hatırlatmalar)
├── alerts         (Fiyat alarmları)
├── watchlists     (İzleme listeleri - sadece ticker)
└── portfolios     (Portföyler - ticker + amount)
```

---

## 👤 users Koleksiyonu

Kullanıcı temel bilgilerini saklar.

### Şema (Mongoose)

```typescript
import mongoose, { Schema, Document } from 'mongoose';

interface IUser extends Document {
  telegramId: number;
  username?: string;
  firstName: string;
  lastName?: string;
  languageCode: string;
  isBlocked: boolean;
  firstSeen: Date;
  lastActive: Date;
  totalCommands: number;
  settings: {
    notifications: boolean;
    defaultCurrency: 'USD' | 'TRY';
  };
}

const UserSchema = new Schema<IUser>(
  {
    telegramId: {
      type: Number,
      required: true,
      unique: true,
      index: true
    },
    username: {
      type: String,
      sparse: true
    },
    firstName: {
      type: String,
      required: true
    },
    lastName: {
      type: String
    },
    languageCode: {
      type: String,
      default: 'tr'
    },
    isBlocked: {
      type: Boolean,
      default: false
    },
    firstSeen: {
      type: Date,
      default: Date.now
    },
    lastActive: {
      type: Date,
      default: Date.now
    },
    totalCommands: {
      type: Number,
      default: 0
    },
    settings: {
      notifications: {
        type: Boolean,
        default: true
      },
      defaultCurrency: {
        type: String,
        enum: ['USD', 'TRY'],
        default: 'USD'
      }
    }
  },
  {
    timestamps: true
  }
);

// Indexler
UserSchema.index({ telegramId: 1 });
UserSchema.index({ lastActive: -1 });
UserSchema.index({ isBlocked: 1 });

export const User = mongoose.model<IUser>('User', UserSchema);
```

### İndeksler

| İndeks | Amaç | Kullanım |
|--------|------|----------|
| `{ telegramId: 1 }` | Primary lookup | Sık kullanılan sorgu |
| `{ lastActive: -1 }` | Recent users | Son aktif kullanıcılar |
| `{ isBlocked: 1 }` | Filter blocked | Engellenen kullanıcıları filtrele |

---

## 📝 notes Koleksiyonu

Kullanıcı notlarını saklar.

### Şema (Mongoose)

```typescript
import mongoose, { Schema, Document } from 'mongoose';

interface INote extends Document {
  userId: number;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

const NoteSchema = new Schema<INote>(
  {
    userId: {
      type: Number,
      required: true,
      index: true,
      ref: 'User'
    },
    content: {
      type: String,
      required: true,
      maxlength: 1000 // Max 1000 karakter
    }
  },
  {
    timestamps: true
  }
);

// İndeksler
NoteSchema.index({ userId: 1, createdAt: -1 });
NoteSchema.index({ createdAt: -1 });

export const Note = mongoose.model<INote>('Note', NoteSchema);
```

### Örnek Doküman

```json
{
  "_id": "672a1f4c8b5d3e2a1c9d8b7a",
  "userId": 123456789,
  "content": "Bitcoin 50K seviyesinde sat",
  "createdAt": "2025-10-31T10:30:00.000Z",
  "updatedAt": "2025-10-31T10:30:00.000Z",
  "__v": 0
}
```

---

## ⏰ reminders Koleksiyonu

Hatırlatmaları ve Agenda job bilgilerini saklar.

### Şema (Mongoose)

```typescript
import mongoose, { Schema, Document } from 'mongoose';

interface IReminder extends Document {
  userId: number;
  message: string;
  remindAt: Date;
  status: 'active' | 'completed' | 'cancelled';
  jobId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ReminderSchema = new Schema<IReminder>(
  {
    userId: {
      type: Number,
      required: true,
      index: true,
      ref: 'User'
    },
    message: {
      type: String,
      required: true,
      maxlength: 500
    },
    remindAt: {
      type: Date,
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'cancelled'],
      default: 'active',
      index: true
    },
    jobId: {
      type: String,
      sparse: true,
      unique: true
    }
  },
  {
    timestamps: true
  }
);

// İndeksler
ReminderSchema.index({ userId: 1, status: 1 });
ReminderSchema.index({ remindAt: 1, status: 1 });
ReminderSchema.index({ status: 1, remindAt: 1 });

export const Reminder = mongoose.model<IReminder>('Reminder', ReminderSchema);
```

### Örnek Doküman

```json
{
  "_id": "672a1f4c8b5d3e2a1c9d8b7b",
  "userId": 123456789,
  "message": "Fatura öde",
  "remindAt": "2025-10-31T15:30:00.000Z",
  "status": "active",
  "jobId": "agenda-job-123456",
  "createdAt": "2025-10-31T10:30:00.000Z",
  "updatedAt": "2025-10-31T10:30:00.000Z",
  "__v": 0
}
```

---

## 🔔 alerts Koleksiyonu

Fiyat alarmlarını saklar.

### Şema (Mongoose)

```typescript
import mongoose, { Schema, Document } from 'mongoose';

interface IAlert extends Document {
  userId: number;
  symbol: string;
  thresholdPct: number; // pozitif: artış, negatif: azalış
  basePrice: number;
  currentPrice: number;
  lastTriggered?: Date;
  status: 'active' | 'paused';
  createdAt: Date;
  updatedAt: Date;
}

const AlertSchema = new Schema<IAlert>(
  {
    userId: {
      type: Number,
      required: true,
      index: true,
      ref: 'User'
    },
    symbol: {
      type: String,
      required: true,
      uppercase: true,
      index: true
    },
    thresholdPct: {
      type: Number,
      required: true
    },
    basePrice: {
      type: Number,
      required: true
    },
    currentPrice: {
      type: Number,
      required: true
    },
    lastTriggered: {
      type: Date,
      sparse: true
    },
    status: {
      type: String,
      enum: ['active', 'paused'],
      default: 'active',
      index: true
    }
  },
  {
    timestamps: true
  }
);

// İndeksler
AlertSchema.index({ userId: 1, status: 1 });
AlertSchema.index({ symbol: 1, status: 1 });
AlertSchema.index({ userId: 1, symbol: 1, status: 1 });

// Virtual ID for user-friendly display
AlertSchema.virtual('displayId').get(function() {
  return this._id.toString().slice(-6).toUpperCase();
});

export const Alert = mongoose.model<IAlert>('Alert', AlertSchema);
```

### Örnek Doküman

```json
{
  "_id": "672a1f4c8b5d3e2a1c9d8b7c",
  "userId": 123456789,
  "symbol": "BTC",
  "thresholdPct": -5,
  "basePrice": 43250.50,
  "currentPrice": 43250.50,
  "lastTriggered": null,
  "status": "active",
  "createdAt": "2025-10-31T10:30:00.000Z",
  "updatedAt": "2025-10-31T10:30:00.000Z",
  "__v": 0
}
```

---

## 📋 watchlists Koleksiyonu

İzleme listelerini ve sembolleri saklar (sadece ticker'lar, amount yok).

### Şema (Mongoose)

```typescript
import mongoose, { Schema, Document } from 'mongoose';

interface ITicker {
  symbol: string;
  addedAt: Date;
}

interface IWatchlist extends Document {
  userId: number;
  listName: string;
  tickers: ITicker[];
  createdAt: Date;
  updatedAt: Date;
}

const TickerSchema = new Schema<ITicker>({
  symbol: {
    type: String,
    required: true,
    uppercase: true
  },
  addedAt: {
    type: Date,
    default: Date.now
  }
});

const WatchlistSchema = new Schema<IWatchlist>(
  {
    userId: {
      type: Number,
      required: true,
      index: true,
      ref: 'User'
    },
    listName: {
      type: String,
      required: true,
      maxlength: 50,
      trim: true
    },
    tickers: [TickerSchema]
  },
  {
    timestamps: true
  }
);

// İndeksler
WatchlistSchema.index({ userId: 1, listName: 1 }, { unique: true });
WatchlistSchema.index({ 'tickers.symbol': 1 });

export const Watchlist = mongoose.model<IWatchlist>('Watchlist', WatchlistSchema);
```

### Örnek Doküman

```json
{
  "_id": "672a1f4c8b5d3e2a1c9d8b7d",
  "userId": 123456789,
  "listName": "my-coins",
  "tickers": [
    {
      "symbol": "BTC",
      "addedAt": "2025-10-31T10:30:00.000Z"
    },
    {
      "symbol": "ETH",
      "addedAt": "2025-10-31T10:32:00.000Z"
    }
  ],
  "createdAt": "2025-10-31T10:30:00.000Z",
  "updatedAt": "2025-10-31T10:35:00.000Z",
  "__v": 0
}
```

---

## 💼 portfolios Koleksiyonu

Portföy listelerini ve varlık miktarlarını saklar (ticker + amount).

### Şema (Mongoose)

```typescript
import mongoose, { Schema, Document } from 'mongoose';

interface IPortfolioItem {
  symbol: string;
  amount: number;
  averagePrice?: number; // Ortalama alış fiyatı (opsiyonel)
  addedAt: Date;
}

interface IPortfolio extends Document {
  userId: number;
  portfolioName: string;
  items: IPortfolioItem[];
  createdAt: Date;
  updatedAt: Date;
}

const PortfolioItemSchema = new Schema<IPortfolioItem>({
  symbol: {
    type: String,
    required: true,
    uppercase: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  averagePrice: {
    type: Number,
    min: 0
  },
  addedAt: {
    type: Date,
    default: Date.now
  }
});

const PortfolioSchema = new Schema<IPortfolio>(
  {
    userId: {
      type: Number,
      required: true,
      index: true,
      ref: 'User'
    },
    portfolioName: {
      type: String,
      required: true,
      maxlength: 50,
      trim: true
    },
    items: [PortfolioItemSchema]
  },
  {
    timestamps: true
  }
);

// İndeksler
PortfolioSchema.index({ userId: 1, portfolioName: 1 }, { unique: true });
PortfolioSchema.index({ 'items.symbol': 1 });

export const Portfolio = mongoose.model<IPortfolio>('Portfolio', PortfolioSchema);
```

### Örnek Doküman

```json
{
  "_id": "672a1f4c8b5d3e2a1c9d8b7e",
  "userId": 123456789,
  "portfolioName": "main-portfolio",
  "items": [
    {
      "symbol": "BTC",
      "amount": 0.5,
      "averagePrice": 42000,
      "addedAt": "2025-10-31T10:30:00.000Z"
    },
    {
      "symbol": "ETH",
      "amount": 5,
      "averagePrice": 2500,
      "addedAt": "2025-10-31T10:32:00.000Z"
    }
  ],
  "createdAt": "2025-10-31T10:30:00.000Z",
  "updatedAt": "2025-10-31T10:35:00.000Z",
  "__v": 0
}
```

---

## 📈 İndeks Stratejisi

### Primary Indexler

| Koleksiyon | İndeks | Tip | Açıklama |
|------------|--------|-----|----------|
| users | `telegramId` | Unique | Primary key |
| notes | `userId + createdAt` | Compound | User notes pagination |
| reminders | `remindAt + status` | Compound | Active reminders query |
| alerts | `symbol + status` | Compound | Active alerts by symbol |
| watchlists | `userId + listName` | Unique | User watchlists lookup |
| portfolios | `userId + portfolioName` | Unique | User portfolios lookup |

### Optimizasyon İndeksleri

```javascript
// Compound index for reminders (active + time-based)
db.reminders.createIndex({ status: 1, remindAt: 1 })

// Compound index for alerts (user + status)
db.alerts.createIndex({ userId: 1, status: 1 })

// Text index for notes search (if needed)
db.notes.createIndex({ content: 'text' })

// Symbol indexes for fast lookups
db.watchlists.createIndex({ 'tickers.symbol': 1 })
db.portfolios.createIndex({ 'items.symbol': 1 })
```

---

## 🔍 Sorgu Örnekleri

### Kullanıcının Aktif Hatırlatmaları

```typescript
const activeReminders = await Reminder.find({
  userId: userId,
  status: 'active',
  remindAt: { $gte: new Date() }
}).sort({ remindAt: 1 });
```

### Kullanıcının BTC Alarmları

```typescript
const btcAlerts = await Alert.find({
  userId: userId,
  symbol: 'BTC',
  status: 'active'
});
```

### Kullanıcının İzleme Listeleri

```typescript
const userWatchlists = await Watchlist.find({
  userId: userId
});
```

### Kullanıcının Portföyleri

```typescript
const userPortfolios = await Portfolio.find({
  userId: userId
});
```

### Belirli Listeyi Getir

```typescript
const myCoinsList = await Watchlist.findOne({
  userId: userId,
  listName: 'my-coins'
});
```

### En Çok Kullanan Kullanıcılar

```typescript
const topUsers = await User.find()
  .sort({ totalCommands: -1 })
  .limit(10);
```

---

## 🗄️ Veri Doğrulama

### Mongoose Validators

```typescript
// Email validation (gelecekte kullanım için)
const UserSchema = new Schema({
  email: {
    type: String,
    validate: {
      validator: function(v) {
        return /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(v);
      },
      message: props => `${props.value} geçerli bir email değil!`
    }
  }
});

// Custom validation
const AlertSchema = new Schema({
  thresholdPct: {
    type: Number,
    validate: {
      validator: function(v) {
        return Math.abs(v) >= 1 && Math.abs(v) <= 50;
      },
      message: 'Alarm eşiği %1-%50 arasında olmalı!'
    }
  }
});
```

---

## 💾 Veri Saklama Politikaları

### Retention

| Koleksiyon | Saklama Süresi | Sebep |
|------------|----------------|-------|
| users | Süresiz | Kullanıcı kaydı |
| notes | Kullanıcı kontrolünde | Kişisel veri |
| reminders | Tamamlandıktan sonra 7 gün | Gereksiz veri |
| alerts | Aktif + 30 gün | Performans |
| userlists | Süresiz | Kullanıcı verisi |

### Otomatik Temizlik

```typescript
//completed reminders (7 days old)
await Reminder.deleteMany({
  status: 'completed',
  updatedAt: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
});

//old triggered alerts (30 days)
await Alert.deleteMany({
  status: 'paused',
  lastTriggered: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
});
```

---

**Bir sonraki bölüm:** [Environment](./05-environment.md)
