# 📊 9. Başarı Kriterleri (KPIs)

## 🎯 Performans KPI'ları

### ⏱️ Yanıt Süresi

| KPI | Hedef | Ölçüm Metodu | İzleme Sıklığı |
|-----|-------|--------------|----------------|
| **Ort. yanıt süresi** | < 1.5 saniye | Log timestamps | Her istek |
| **P95 yanıt süresi** | < 3 saniye | Log aggregation | Günlük |
| **P99 yanıt süresi** | < 5 saniye | Log aggregation | Günlük |
| **API fetch süresi** | < 800 ms | External API call | Her çağrı |

**Ölçüm:**
```typescript
const start = Date.now();
await fetchPrice('BTC');
const duration = Date.now() - start;
logger.info({ action: 'price_fetch', duration });
```

### 📊 İşlem Hacmi

| Metrik | Hedef | Maksimum |
|--------|-------|----------|
| **Eşzamanlı kullanıcı** | 1000 | 5000 |
| **Dakikalık komut** | 500 | 2000 |
| **Saatlik API çağrısı** | 10,000 | 50,000 |
| **Günlük aktif kullanıcı** | 5000 | 20,000 |

---

## ✅ Doğruluk KPI'ları

### 🔔 Hatırlatma Doğruluğu

| KPI | Hedef | Ölçüm |
|-----|-------|-------|
| **Zamanında teslim** | %99+ | Zaman farkı < 30 saniye |
| **Kaçırılan hatırlatma** | < %1 | Toplam vs başarılı |
| **Tekrarlayan bildirim** | 0 | Unique job ID kontrolü |

**Ölçüm:**
```typescript
// Hatırlatma gönderildiğinde
const actualTime = new Date();
const scheduledTime = reminder.remindAt;
const difference = Math.abs(actualTime.getTime() - scheduledTime.getTime());

// Saniye cinsinden
const diffSeconds = difference / 1000;

logger.info({
  action: 'reminder_sent',
  reminderId: reminder._id,
  userId: reminder.userId,
  scheduledDelaySeconds: diffSeconds
});
```

### 📈 Fiyat Alarmı Doğruluğu

| KPI | Hedef | Ölçüm |
|-----|-------|-------|
| **Doğru tetikleme** | %99.5+ | Alarm eşik vs gerçek fiyat |
| **Yanlış pozitif** | < %0.5 | Gereksiz alarm |
| **Yanlış negatif** | < %0.5 | Kaçırılan alarm |

**Ölçüm:**
```typescript
// Alarm tetiklendiğinde
const alert = await Alert.findById(alertId);
const expectedThreshold = alert.thresholdPct;
const actualChange = ((currentPrice - alert.basePrice) / alert.basePrice) * 100;
const accuracy = Math.abs(actualChange - expectedThreshold);

logger.info({
  action: 'alert_triggered',
  userId: alert.userId,
  symbol: alert.symbol,
  expectedThreshold,
  actualChange,
  accuracy
});
```

---

## 💻 Sistem Güvenilirliği

### 🛡️ Uptime

| Metrik | Hedef | Seviye |
|--------|-------|--------|
| **Genel sistem uptime** | %99.9 | Kritik |
| **Bot framework uptime** | %99.95 | Kritik |
| **MongoDB uptime** | %99.99 | Kritik |
| **Worker process uptime** | %99.9 | Yüksek |

**Hesaplama:**
```
Uptime = (Toplam Zaman - Downtime) / Toplam Zaman * 100
```

**Monitoring:**
```typescript
// Health check
setInterval(async () => {
  const health = {
    timestamp: new Date(),
    status: 'healthy',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    database: await checkDatabase(),
    externalAPIs: await checkAPIs()
  };
  
  logger.info(health);
  
  if (health.status !== 'healthy') {
    await notifyAdmin(health);
  }
}, 60000);
```

### 🔄 Yeniden Başlatma Dayanıklılığı

| KPI | Hedef | Açıklama |
|-----|-------|----------|
| **Job restore** | %100 | Agenda job'ları restore |
| **Veri kaybı** | 0 | Hiç veri kaybolmamalı |
| **Çalışma süresi** | < 30s | Restart sonrası full recovery |

**Test:**
```typescript
// Simulated restart test
it('should restore all active reminders after restart', async () => {
  // 1. Create 100 reminders
  // 2. Stop agenda
  // 3. Start agenda
  // 4. Check all reminders are in agenda queue
  
  const activeReminders = await Reminder.countDocuments({ status: 'active' });
  const agendaJobs = await agenda.jobs({ name: 'send-reminder' });
  
  expect(activeReminders).toEqual(agendaJobs.length);
});
```

---

## 🔌 API Güvenilirliği

### 📡 API Hata Oranı

| API | Hedef Hata Oranı | Max Kabul Edilebilir |
|-----|------------------|----------------------|
| **CoinMarketCap** | < %2 | %5 |
| **Binance** | < %2 | %5 (backup) |
| **Yahoo Finance** | < %3 | %5 |
| **Local LLM** | < %1 | %3 |
| **Alpha Vantage** | < %2 | %5 |

**Tracking:**
```typescript
// API çağrısında
try {
  const response = await axios.get(url);
  logger.info({
    api: 'coinmarketcap',
    endpoint: '/v1/cryptocurrency/listings/latest',
    status: 'success',
    responseTime: responseTime
  });
} catch (error) {
  logger.error({
    api: 'coinmarketcap',
    endpoint: '/v1/cryptocurrency/listings/latest',
    status: 'error',
    errorCode: error.code,
    errorMessage: error.message
  });
  
  metrics.increment('api.errors.coinmarketcap');
}
```

### 🔁 Retry Başarı Oranı

| KPI | Hedef |
|-----|-------|
| **1. denemede başarı** | %90+ |
| **2. denemede başarı** | %7+ |
| **3. denemede başarı** | %3+ |

---

## 🏗️ Modül Bağımsızlığı

### 🔗 Bağımlılık Matrisi

| Modül | Price | UserList | Notes | Reminders | Alerts | AI | Users |
|-------|-------|----------|-------|-----------|--------|----|-------|
| **Price** | - | 0 | 0 | 0 | 1 | 0 | 0 |
| **UserList** | 0 | - | 0 | 0 | 0 | 0 | 0 |
| **Notes** | 0 | 0 | - | 0 | 0 | 0 | 0 |
| **Reminders** | 0 | 0 | 0 | - | 0 | 0 | 0 |
| **Alerts** | 1 | 0 | 0 | 0 | - | 0 | 0 |
| **AI** | 0 | 0 | 0 | 0 | 0 | - | 0 |
| **Users** | 0 | 0 | 0 | 0 | 0 | 0 | - |

**Hedef:** Tüm değerler 0 olmalı (sadece Users modülü ortak).

### 📦 Modül Test Kapsamı

| Modül | Test Kapsamı Hedefi |
|-------|---------------------|
| **Price** | %95+ |
| **UserList** | %95+ |
| **Notes** | %95+ |
| **Reminders** | %95+ |
| **Alerts** | %95+ |
| **AI** | %90+ |
| **Users** | %95+ |
| **Currency** | %95+ |

---

## 💾 Veri Bütünlüğü

### ✅ Veri Doğruluk

| KPI | Hedef | Açıklama |
|-----|-------|----------|
| **Kullanıcı verisi** | %100 | User kayıtları doğru |
| **Hatırlatma verisi** | %100 | Zaman ve mesaj doğru |
| **Alarm verisi** | %100 | Eşik ve sembol doğru |
| **Note verisi** | %100 | İçerik tam ve doğru |

**Doğrulama:**
```typescript
// Veri doğrulama pipeline
async function validateUserData(userId: number) {
  const user = await User.findOne({ telegramId: userId });
  
  const errors = [];
  
  if (!user.telegramId) errors.push('Missing telegramId');
  if (!user.firstName) errors.push('Missing firstName');
  if (!user.firstSeen) errors.push('Missing firstSeen');
  
  return {
    valid: errors.length === 0,
    errors
  };
}
```

### 🔄 Veri Tutarlılığı

| Kontrol | Sıklık | Hedef |
|---------|--------|-------|
| **Reminders-Agenda sync** | Günlük | %100 |
| **Alerts-Price sync** | Saatlik | %99+ |
| **User-Stats sync** | Günlük | %100 |

---

## 📈 Kullanıcı Deneyimi

### 😊 Kullanıcı Memnuniyeti

| Metrik | Hedef | Ölçüm |
|--------|-------|-------|
| **Başarılı komut oranı** | > %98 | Successful / Total |
| **Hata mesajı netliği** | > %95 | User feedback |
| **Yanıt süresi memnuniyeti** | > %90 | Survey |

**Tracking:**
```typescript
// Komut başarısı
bot.command('price', async (ctx) => {
  try {
    await handlePriceCommand(ctx);
    
    logger.info({
      action: 'command_success',
      command: 'price',
      userId: ctx.from?.id,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error({
      action: 'command_error',
      command: 'price',
      userId: ctx.from?.id,
      error: error.message
    });
  }
});
```

### 📉 Hata Oranları

| Hata Tipi | Hedef | Max Kabul Edilebilir |
|-----------|-------|----------------------|
| **Kullanıcı hatası** | %5 | %10 |
| **Sistem hatası** | %1 | %2 |
| **API hatası** | %2 | %5 |

---

## 📊 KPI Dashboard

### Günlük Metrikler

```typescript
// metrics/daily-report.js
const dailyMetrics = {
  users: {
    new: await User.countDocuments({ 
      firstSeen: { $gte: startOfDay } 
    }),
    active: await User.countDocuments({ 
      lastActive: { $gte: startOfDay } 
    }),
    blocked: await User.countDocuments({ 
      isBlocked: true 
    })
  },
  commands: {
    total: await Log.countDocuments({ 
      action: 'command', 
      timestamp: { $gte: startOfDay } 
    }),
    success: await Log.countDocuments({ 
      action: 'command_success', 
      timestamp: { $gte: startOfDay } 
    }),
    error: await Log.countDocuments({ 
      action: 'command_error', 
      timestamp: { $gte: startOfDay } 
    })
  },
  reminders: {
    created: await Reminder.countDocuments({ 
      createdAt: { $gte: startOfDay } 
    }),
    sent: await Log.countDocuments({ 
      action: 'reminder_sent', 
      timestamp: { $gte: startOfDay } 
    }),
    successRate: calculateSuccessRate()
  },
  alerts: {
    active: await Alert.countDocuments({ status: 'active' }),
    triggered: await Log.countDocuments({ 
      action: 'alert_triggered', 
      timestamp: { $gte: startOfDay } 
    })
  }
};
```

### Haftalık Rapor

```
================================
PandaBot - Haftalık Rapor
================================
📅 Tarih: 27.10.2025 - 02.11.2025

👥 Kullanıcılar
--------------
Yeni Kullanıcı:    142
Aktif Kullanıcı:   1,256
Toplam Kullanıcı:  8,934

📊 Komutlar
----------
Toplam Komut:      45,678
Başarılı:          44,890 (98.3%)
Başarısız:           788 (1.7%)

⏰ Hatırlatmalar
---------------
Oluşturulan:       3,421
Gönderilen:        3,389 (99.1%)
Başarısız:              32

🔔 Alarmlar
----------
Aktif Alarmlar:      567
Tetiklenen:          234
Doğruluk Oranı:    99.6%

🤖 AI
----
Toplam Sorgu:      1,234
Ort. Yanıt Süresi:  1.2s
Hata Oranı:         0.8%

⏱️ Performans
------------
Ort. Yanıt:        1.3s
P95 Yanıt:         2.8s
Uptime:           99.97%

================================
```

---

## 🎯 Hedef Dashboard URL'leri

### Metrik Görüntüleme

```
# Prometheus + Grafana (opsiyonel)
http://localhost:3001/dashboard/pandabot

# Locally generated reports
reports/daily/2025-10-31.json
reports/weekly/2025-w44.json
```

---

## 📋 KPI Takip Süreci

### 1. Günlük
- [ ] Yanıt süreleri kontrolü
- [ ] Hata oranları incelemesi
- [ ] API sağlığı kontrolü
- [ ] Yeni kullanıcı sayısı

### 2. Haftalık
- [ ] Trend analizi
- [ ] Kullanıcı geri bildirimleri
- [ ] Performans iyileştirmeleri
- [ ] Modül bağımsızlığı testi

### 3. Aylık
- [ ] KPI hedef karşılaştırması
- [ ] Sistem kapasitesi analizi
- [ ] Büyüme projeksiyonu
- [ ] Teknik borç değerlendirmesi

---

## 🚨 KPI Alarm Eşikleri

### Kritik Alarmlar

```typescript
// config/kpi-alerts.ts
export const kpiAlerts = {
  responseTime: {
    warning: 2000, // 2s
    critical: 5000  // 5s
  },
  errorRate: {
    warning: 0.05,  // 5%
    critical: 0.10  // 10%
  },
  uptime: {
    warning: 0.999, // 99.9%
    critical: 0.99  // 99%
  },
  reminderAccuracy: {
    warning: 0.98,  // 98%
    critical: 0.95  // 95%
  }
};

// Alarm kontrolü
setInterval(async () => {
  const metrics = await collectMetrics();
  
  for (const [metric, value] of Object.entries(metrics)) {
    const config = kpiAlerts[metric];
    
    if (config && value < config.warning) {
      await notifyAdmin(`⚠️ ${metric} düşük: ${(value * 100).toFixed(2)}%`);
    }
    
    if (config && value < config.critical) {
      await notifyAdmin(`🚨 ${metric} kritik: ${(value * 100).toFixed(2)}%`);
    }
  }
}, 300000); // Her 5 dakika
```

---

**Bir sonraki bölüm:** [Admin Features](./10-admin-features.md)
