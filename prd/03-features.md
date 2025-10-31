# 🧩 3. Özellik Seti (Modüller)

## 📋 Modül Genel Bakış

| Modül | Komutlar | Ana Özellik |
|-------|----------|-------------|
| **prices** | `/price`, `/top` | Fiyat sorgulama |
| **userlists** | `/list`, `/watch` | İzleme listeleri |
| **notes** | `/note`, `/notes` | Not yönetimi |
| **reminders** | `/remind`, `/reminders` | Hatırlatma sistemi |
| **alerts** | `/alert`, `/alerts` | Fiyat alarmları |
| **ai** | `/ai` | AI asistan |
| **users** | `/start`, `/help` | Kullanıcı yönetimi |
| **currency** | `/convert` | Döviz çevirici |

---

## 🪙 3.1. Price Module (Fiyat Modülü)

### Amaç
Kripto para ve hisse senedi fiyatlarını gerçek zamanlı olarak sorgulama ve görüntüleme.

### Komutlar

#### `/price <SYMBOL>`
**Örnekler:**
- `/price BTC` - Bitcoin fiyatı
- `/price ETH` - Ethereum fiyatı
- `/price AAPL` - Apple hissesi

**Özellikler:**
- ✅ CoinMarketCap API entegrasyonu (kripto)
- ✅ Binance API backup (kripto)
- ✅ Yahoo Finance entegrasyonu (hisse senedi)
- ✅ 24 saatlik değişim yüzdesi
- ✅ 24 saatlik işlem hacmi
- ✅ Günlük en yüksek/düşük
- ✅ Turkish Lira cinsinden fiyat

**Çıktı Örneği:**
```
🪙 BTC (Bitcoin)
━━━━━━━━━━━━━━━━━━━━
💰 Fiyat: $43,250.50
📈 24s Değişim: +3.2% ↗️
📊 24s Hacim: $28.5B
⬆️ 24s En Yüksek: $44,100
⬇️ 24s En Düşük: $42,850
🇺🇸 USD | 🇹🇷 TRY: ₺1,298,415
━━━━━━━━━━━━━━━━━━━━
```

#### `/top <COUNT>`
En çok artış/azalış gösteren kripto paralar.

**Örnekler:**
- `/top gainers` - En çok artış
- `/top losers` - En çok düşüş

#### `/search <QUERY>`
Kripto/hisse arama.

### API Kaynakları
- **CoinMarketCap:** `https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest`
- **Binance:** `https://api.binance.com/api/v3/ticker/24hr` (backup)
- **Yahoo Finance:** `https://query1.finance.yahoo.com/v7/finance/quote`

---

## 📋 3.2. Watchlists Module (İzleme Listeleri)

### Amaç
Kullanıcıların kişisel izleme listeleri oluşturması ve yönetmesi (sadece ticker'lar, portfolio ayrı modül).

### Komutlar

#### `/watchlist create <LIST_NAME> <SYMBOLS>`
Yeni bir izleme listesi oluşturur.

**Örnekler:**
```
/watchlist create my-coins BTC ETH SOL ADA
/watchlist create tech-stocks AAPL MSFT GOOGL
```

#### `/watchlist add <LIST_NAME> <SYMBOL>`
Listeye yeni sembol ekler.

**Örnek:** `/watchlist add my-coins DOGE`

#### `/watchlist remove <LIST_NAME> <SYMBOL>`
Listeden sembol çıkarır.

**Örnek:** `/watchlist remove my-coins SOL`

#### `/watchlist show <LIST_NAME>`
Listeyi görüntüler (güncel fiyatlarla).

**Çıktı Örneği:**
```
📋 my-coins
━━━━━━━━━━━━━━━━━━━━
1. BTC  $43,250  +3.2% ↗️
2. ETH  $2,580   +2.1% ↗️
3. SOL  $98      -0.5% ↘️
4. ADA  $0.52    +1.8% ↗️
━━━━━━━━━━━━━━━━━━━━
Toplam: 4 sembol
Ort. Değişim: +1.65%
```

#### `/watchlist delete <LIST_NAME>`
Listeyi tamamen siler.

#### `/watchlists`
Tüm izleme listelerini listeler.

#### **Direkt Liste Adı (Komutsuz)**
Liste adını komutsuz direkt yazarak o listenin fiyatlarını toplu çekebilirsiniz.

**Örnek:** 
```
Kullanıcı: my-coins
Bot: my-coins listesini gösterir (otomatik olarak /watchlist show my-coins çalışır)
```

### Veri Yapısı
```typescript
{
  userId: number,
  listName: string,
  tickers: [
    {
      symbol: string,
      addedAt: Date
    }
  ],
  createdAt: Date,
  updatedAt: Date
}

// NOT: Watchlists sadece ticker'ları içerir
// Portfolio için ayrı modül vardır (v1.0'da)
```

---

## 📝 3.3. Notes Module (Not Modülü)

### Amaç
Kullanıcıların kendi notlarını kaydetmesi ve yönetmesi.

### Komutlar

#### `/note add <CONTENT>`
Yeni bir not ekler.

**Örnekler:**
```
/note add Bitcoin 50K seviyesinde sat
/note add Ethereum merge sonrası takip et
```

#### `/note list`
Tüm notlarını listeler.

**Çıktı Örneği:**
```
📝 Notlarım (Toplam: 3)
━━━━━━━━━━━━━━━━━━━━
1. [31.10.2025] Bitcoin 50K seviyesinde sat
2. [31.10.2025] Ethereum merge sonrası takip et
3. [30.10.2025] Solana airdrop'u kontrol et
━━━━━━━━━━━━━━━━━━━━
```

#### `/note edit <ID> <NEW_CONTENT>`
Belirli bir notu düzenler.

**Örnek:** `/note edit 1 Bitcoin 55K seviyesinde sat`

#### `/note delete <ID>`
Belirli bir notu siler.

**Örnek:** `/note delete 2`

### Veri Yapısı
```typescript
{
  userId: number,
  content: string,
  createdAt: Date,
  updatedAt: Date
}
```

---

## ⏰ 3.4. Reminders Module (Hatırlatma Modülü)

### Amaç
Kullanıcıların belirli zamanlarda bildirim almasını sağlamak.

### Komutlar

#### `/remind <TIME> <MESSAGE>`
Yeni bir hatırlatma kurar.

**Zaman Formatları:**
- `15:30` - Aynı gün 15:30
- `2025-11-01 14:00` - Belirli tarih
- `+30m` - 30 dakika sonra
- `+2h` - 2 saat sonra
- `+1d` - 1 gün sonra

**Örnekler:**
```
/remind 15:30 Fatura öde
/remind 2025-11-01 14:00 Toplantıya katıl
/remind +2h BTC fiyatını kontrol et
```

#### `/reminders`
Tüm hatırlatmaları listeler.

**Çıktı Örneği:**
```
⏰ Hatırlatmalarım (Aktif: 2)
━━━━━━━━━━━━━━━━━━━━
1. ID: #1234
   📅 Bugün 15:30
   📌 Fatura öde
   ✅ Aktif

2. ID: #1235
   📅 01.11.2025 14:00
   📌 Toplantıya katıl
   ✅ Aktif
━━━━━━━━━━━━━━━━━━━━
```

#### `/remind cancel <ID>`
Hatırlatmayı iptal eder.

**Örnek:** `/remind cancel 1234`

### Teknik Detaylar

**Agenda.js Entegrasyonu:**
- Veritabanına kalıcı (MongoDB)
- Yeniden başlatmada restore
- Zaman dilimi desteği

**Cron Jobs:**
```typescript
agenda.define('send-reminder', async (job) => {
  const { userId, message } = job.attrs.data;
  await bot.api.sendMessage(userId, `🔔 ${message}`);
});
```

### Veri Yapısı
```typescript
{
  userId: number,
  message: string,
  remindAt: Date,
  status: 'active' | 'completed' | 'cancelled',
  createdAt: Date,
  jobId: string // Agenda job ID
}
```

---

## 🔔 3.5. Alerts Module (Alarm Modülü)

### Amaç
Fiyat değişimlerine göre otomatik bildirim gönderilmesi.

### Komutlar

#### `/alert <SYMBOL> <THRESHOLD>%`
Fiyat değişimi alarmı kurar.

**Örnekler:**
```
/alert BTC -5%     // BTC %5 düştüğünde bildir
/alert BTC +10%    // BTC %10 arttığında bildir
/alert ETH +15%    // ETH %15 arttığında bildir
```

#### `/alerts`
Tüm aktif alarmları listeler.

**Çıktı Örneği:**
```
🔔 Alarmlarım (Aktif: 3)
━━━━━━━━━━━━━━━━━━━━
1. BTC
   📊 Taban Fiyat: $43,250
   📈 Eşik: -5% (>$41,088)
   ⏱️ Son Kontrol: 2 dk önce
   ✅ Aktif

2. ETH
   📊 Taban Fiyat: $2,580
   📈 Eşik: +15% (>$2,967)
   ⏱️ Son Kontrol: 2 dk önce
   ✅ Aktif
━━━━━━━━━━━━━━━━━━━━
```

#### `/alert cancel <ID>`
Belirli bir alarmı iptal eder.

**Örnek:** `/alert cancel 1`

#### `/alert delete <SYMBOL>`
Belirli sembolün tüm alarmlarını siler.

**Örnek:** `/alert delete BTC`

### Teknik Detaylar

**Worker Process:**
```typescript
// workers/price-alerts.js
setInterval(async () => {
  const activeAlerts = await Alert.find({ status: 'active' });
  
  for (const alert of activeAlerts) {
    const currentPrice = await getCurrentPrice(alert.symbol);
    const changePercent = calculateChange(alert.basePrice, currentPrice);
    
    if (shouldTrigger(alert.thresholdPct, changePercent)) {
      await notifyUser(alert.userId, alert, currentPrice);
      await updateLastTriggered(alert);
    }
  }
}, 60000); // Her dakika
```

**Cooldown Sistemi:**
- Aynı alarm 30 dakika boyunca tekrar tetiklenmez
- User-friendly bildirimler

### Veri Yapısı
```typescript
{
  userId: number,
  symbol: string,
  thresholdPct: number, // pozitif/artış, negatif/azalış
  basePrice: number,
  currentPrice: number,
  lastTriggered: Date | null,
  status: 'active' | 'paused',
  createdAt: Date
}
```

---

## 🤖 3.6. AI Module (AI Asistan Modülü)

### Amaç
Yerel LLM modeli ile kullanıcıların etkileşime geçmesi.

### Komutlar

#### `/ai <QUERY>`
AI'ya soru sorar veya komut verir.

**Örnekler:**
```
/ai Bitcoin hakkında ne düşünüyorsun?
/ai ETH fiyatını analiz et
/ai Portfolio önerisi verir misin?
```

**Yanıt Örneği:**
```
🤖 AI Cevabı:
━━━━━━━━━━━━━━━━━━━━
Bitcoin, halving sonrası arz 
azalması ve kurumsal benimseme 
artışı nedeniyle güçlü bir 
konumda. 50K seviyesi kritik 
direnç. Yatırım önerim:
- Kısa vadede volatil beklerim
- DCA stratejisi uygun
- Risk yönetimi önemli
━━━━━━━━━━━━━━━━━━━━
```

### Teknik Detaylar

**API Endpoint:**
```
POST http://127.0.0.1:1234/v1/chat/completions
Content-Type: application/json

{
  "model": "local-model",
  "messages": [
    { "role": "user", "content": "QUERY" }
  ],
  "temperature": 0.7,
  "max_tokens": 500
}
```

**Axios İsteği:**
```typescript
const response = await axios.post(
  'http://127.0.0.1:1234/v1/chat/completions',
  {
    model: 'local-model',
    messages: [{ role: 'user', content: query }],
    temperature: 0.7,
    max_tokens: 500
  },
  {
    timeout: 30000,
    headers: { 'Content-Type': 'application/json' }
  }
);
```

**Hata Yönetimi:**
```typescript
try {
  const response = await callLLM(query);
  return response.data.choices[0].message.content;
} catch (error) {
  if (error.code === 'ECONNREFUSED') {
    return '❌ AI servisi şu anda erişilemez. Lütfen daha sonra tekrar deneyin.';
  }
  return '❌ Bir hata oluştu. Lütfen tekrar deneyin.';
}
```

---

## 👤 3.7. Users Module (Kullanıcı Yönetimi)

### Amaç
Kullanıcı kaydı, yönetimi ve admin bildirimleri.

### Komutlar

#### `/start`
Botu başlatır ve kullanıcıyı sisteme kaydeder.

#### `/help`
Yardım mesajını gösterir.

#### `/stats` (Admin)
Sistem istatistiklerini gösterir.

### Otomatik İşlemler

#### Yeni Kullanıcı Bildirimi
```typescript
const welcomeMessage = `
🎉 PandaBot'a hoş geldin!

Ben senin finansal asistanınım. 
Aşağıdaki komutları kullanabilirsin:

📊 /price - Fiyat sorgula
📋 /list - İzleme listesi oluştur
📝 /note - Not al
⏰ /remind - Hatırlatma kur
🔔 /alert - Fiyat alarmı
🤖 /ai - AI'ya sor

Yardım için /help yazabilirsin!
`;
```

#### Admin Bildirimi
```typescript
await bot.api.sendMessage(
  ADMIN_ID,
  `👤 Yeni kullanıcı: ${user.first_name} (${user.id})`
);
```

### Veri Yapısı
```typescript
{
  telegramId: number,
  username: string | null,
  firstName: string,
  lastName: string | null,
  languageCode: string,
  isBlocked: boolean,
  firstSeen: Date,
  lastActive: Date,
  totalCommands: number,
  settings: {
    notifications: boolean,
    defaultCurrency: 'USD' | 'TRY'
  }
}
```

---

## 💱 3.8. Currency Module (Döviz Modülü)

### Amaç
Döviz kurlarını görüntüleme (sadece USD/TRY).

### Komutlar

#### `/dolar`
Güncel USD/TRY kurunu gösterir.

**Çıktı Örneği:**
```
💱 USD/TRY Kuru
━━━━━━━━━━━━━━━━━━━━
💰 Dolar: $1
🇹🇷 Türk Lirası: ₺30.15
📊 Güncelleme: 31.10.2025 14:30
━━━━━━━━━━━━━━━━━━━━
```

---

## 📊 Modül Özet Tablosu

| Modül | Komut Sayısı | API Sayısı | DB Koleksiyon | Worker |
|-------|--------------|------------|---------------|--------|
| prices | 3 | 2 (CMC + Binance backup) | - | - |
| watchlists | 5 | - | watchlists | - |
| notes | 4 | - | notes | - |
| reminders | 3 | - | reminders | ✅ |
| alerts | 4 | 2 (CMC + Binance backup) | alerts | ✅ |
| ai | 1 | 1 | - | - |
| users | 3 | - | users | - |
| currency | 1 | 1 (Yahoo Finance) | - | - |

---

**Bir sonraki bölüm:** [Data Model](./04-data-model.md)
