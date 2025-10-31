# 🧩 10. Yönetici Özellikleri

## 👨‍💼 Admin Panel

### Admin Tanımlama

```typescript
// Admin ID tanımlama (environment variable'dan)
const ADMIN_ID = process.env.ADMIN_ID;

function isAdmin(userId: number): boolean {
  return userId.toString() === ADMIN_ID;
}
```

---

## 🔔 Otomatik Bildirimler

### 1. 👤 Yeni Kullanıcı Bildirimi

**Tetikleme:** Yeni kullanıcı `/start` komutu gönderdiğinde

**Admin'e Gönderilen Mesaj:**
```
👋 Yeni Kullanıcı!
━━━━━━━━━━━━━━━━━━━━
🆔 ID: 987654321
👤 Ad: John Doe
📝 Kullanıcı Adı: @johndoe
📅 İlk Kullanım: 31.10.2025 14:30
🌍 Dil: tr
━━━━━━━━━━━━━━━━━━━━
```

**Kod:**
```typescript
// modules/users/handlers.ts
import { User } from './model';

bot.command('start', async (ctx) => {
  // Kullanıcıyı veritabanına kaydet
  const user = await User.findOneAndUpdate(
    { telegramId: ctx.from.id },
    {
      telegramId: ctx.from.id,
      username: ctx.from.username,
      firstName: ctx.from.first_name,
      lastName: ctx.from.last_name,
      languageCode: ctx.from.language_code,
      lastActive: new Date()
    },
    { upsert: true, new: true }
  );
  
  // İlk kez kaydediliyorsa admin'e bildir
  if (user.isNew) {
    await bot.api.sendMessage(
      ADMIN_ID,
      `👋 Yeni Kullanıcı!\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `🆔 ID: ${ctx.from.id}\n` +
      `👤 Ad: ${ctx.from.first_name}\n` +
      `📝 Kullanıcı Adı: ${ctx.from.username ? '@' + ctx.from.username : 'Yok'}\n` +
      `📅 İlk Kullanım: ${new Date().toLocaleString('tr-TR')}\n` +
      `🌍 Dil: ${ctx.from.language_code || 'tr'}\n` +
      `━━━━━━━━━━━━━━━━━━━━`
    );
  }
  
  // Kullanıcıya hoş geldin mesajı
  await ctx.reply(welcomeMessage);
});
```

---

### 2. 🚫 Kullanıcı Engelleme Bildirimi

**Tetikleme:** Kullanıcı botu engellediğinde

**Admin'e Gönderilen Mesaj:**
```
🚫 Kullanıcı Engellendi
━━━━━━━━━━━━━━━━━━━━
🆔 ID: 987654321
👤 Ad: John Doe
📅 Engellenme: 31.10.2025 14:35
━━━━━━━━━━━━━━━━━━━━
```

**Otomatik Tespit:**
```typescript
// Hata yakalayarak engellemeyi tespit et
bot.catch((err) => {
  const ctx = err.ctx;
  const error = err.error;
  
  // 400 Bad Request: chat not found (blocked)
  if (error.message.includes('chat not found')) {
    User.findOneAndUpdate(
      { telegramId: ctx.from.id },
      { 
        isBlocked: true,
        blockedAt: new Date()
      }
    ).then(() => {
      bot.api.sendMessage(
        ADMIN_ID,
        `🚫 Kullanıcı Engellendi\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `🆔 ID: ${ctx.from.id}\n` +
        `👤 Ad: ${ctx.from.first_name}\n` +
        `📅 Engellenme: ${new Date().toLocaleString('tr-TR')}\n` +
        `━━━━━━━━━━━━━━━━━━━━`
      );
    });
  }
});
```

---

### 3. ⚠️ Sistem Hatası Bildirimi

**Tetikleme:** Kritik hata oluştuğunda

**Admin'e Gönderilen Mesaj:**
```
⚠️ Sistem Hatası
━━━━━━━━━━━━━━━━━━━━
🕐 Zaman: 31.10.2025 14:40
📍 Modül: alerts
👤 Kullanıcı: 987654321
❌ Hata: MongoDB connection failed
🔗 Stack: /src/modules/alerts/handler.ts:45
━━━━━━━━━━━━━━━━━━━━
```

**Kod:**
```typescript
// core/logger.ts
export async function notifyAdminOfError(error: Error, context?: any) {
  const message = 
    `⚠️ Sistem Hatası\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `🕐 Zaman: ${new Date().toLocaleString('tr-TR')}\n` +
    `${context ? `📍 Modül: ${context.module || 'unknown'}\n` : ''}` +
    `${context?.userId ? `👤 Kullanıcı: ${context.userId}\n` : ''}` +
    `❌ Hata: ${error.message}\n` +
    `${error.stack ? `🔗 Stack: ${error.stack.split('\n')[1]}\n` : ''}` +
    `━━━━━━━━━━━━━━━━━━━━`;
  
  try {
    await bot.api.sendMessage(ADMIN_ID, message);
  } catch (notifyError) {
    console.error('Failed to notify admin:', notifyError);
  }
}

// Kullanım
try {
  await someOperation();
} catch (error) {
  await notifyAdminOfError(error, { 
    module: 'alerts',
    userId: ctx.from.id 
  });
}
```

---

### 4. 📊 Günlük Özet

**Tetikleme:** Her gün saat 00:00'da

**Admin'e Gönderilen Mesaj:**
```
📊 Günlük Özet - 31.10.2025
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👥 Kullanıcılar
  🆕 Yeni: 45
  👀 Aktif: 234
  🚫 Engellenen: 2

📝 Komutlar
  ⭐ Toplam: 1,567
  ✅ Başarılı: 1,542 (98.4%)
  ❌ Başarısız: 25 (1.6%)

⏰ Hatırlatmalar
  📅 Oluşturulan: 89
  🔔 Gönderilen: 87 (97.8%)
  ❌ Kaçırılan: 2

🔔 Alarmlar
  🟢 Aktif: 156
  ⚡ Tetiklenen: 23
  📊 Doğruluk: 99.6%

🤖 AI
  💬 Sorgu: 345
  ⏱️ Ort. Süre: 1.2s
  ❌ Hata: 3 (0.9%)

⚙️ Sistem
  📈 Ort. Yanıt: 1.3s
  ⏱️ Uptime: 99.97%
  🖥️ Bellek: 245 MB
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Kod:**
```typescript
// jobs/daily-summary.js
import agenda from '../core/agenda';

agenda.define('send-daily-summary', async (job) => {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  
  // Metrikleri topla
  const metrics = await collectDailyMetrics(startOfDay);
  
  const message = formatDailySummary(metrics);
  
  await bot.api.sendMessage(ADMIN_ID, message);
});

// Her gün 00:00'da çalıştır
agenda.every('1 day', 'send-daily-summary', {
  // UTC 21:00 (Türkiye için 00:00)
  hour: 21,
  minute: 0
});
```

---

## 📊 Admin Komutları

### 1. `/stats` - Sistem İstatistikleri

**Kullanım:** Sadece admin

**Örnek Çıktı:**
```
📊 Sistem İstatistikleri
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👥 Kullanıcılar
  Toplam: 8,934
  Aktif (24s): 1,256
  Engelli: 23
  Yeni (bugün): 45

📝 Komutlar (Son 24s)
  Toplam: 1,567
  Başarılı: 1,542
  Başarısız: 25
  Hata Oranı: 1.6%

⏰ Hatırlatmalar
  Aktif: 234
  Bekleyen: 89
  Bugün Gönderilen: 87
  Doğruluk: 97.8%

🔔 Alarmlar
  Aktif: 156
  Bugün Tetiklenen: 23
  En Popüler: BTC (45)

🤖 AI
  Sorgu (bugün): 345
  Ort. Yanıt Süresi: 1.2s
  Hata Oranı: 0.9%

⚙️ Sistem
  Uptime: 99.97% (7 gün)
  Ort. Yanıt Süresi: 1.3s
  Bellek Kullanımı: 245 MB
  MongoDB Bağlantısı: ✅
  External APIs: ✅
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Kod:**
```typescript
bot.command('stats', async (ctx) => {
  // Admin kontrolü
  if (!isAdmin(ctx.from.id)) {
    await ctx.reply('❌ Bu komutu kullanma yetkiniz yok.');
    return;
  }
  
  // Metrikleri topla
  const stats = await getSystemStats();
  
  // Formatla ve gönder
  const message = formatStats(stats);
  await ctx.reply(message);
});

async function getSystemStats() {
  const [
    totalUsers,
    activeUsers,
    blockedUsers,
    newUsersToday,
    totalCommands,
    successfulCommands,
    failedCommands,
    activeReminders,
    pendingReminders,
    activeAlerts
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ lastActive: { $gte: yesterday } }),
    User.countDocuments({ isBlocked: true }),
    User.countDocuments({ firstSeen: { $gte: startOfDay } }),
    Log.countDocuments({ action: 'command', timestamp: { $gte: yesterday } }),
    Log.countDocuments({ action: 'command_success', timestamp: { $gte: yesterday } }),
    Log.countDocuments({ action: 'command_error', timestamp: { $gte: yesterday } }),
    Reminder.countDocuments({ status: 'active' }),
    Reminder.countDocuments({ remindAt: { $gte: new Date() }, status: 'active' }),
    Alert.countDocuments({ status: 'active' })
  ]);
  
  return {
    users: {
      total: totalUsers,
      active: activeUsers,
      blocked: blockedUsers,
      newToday: newUsersToday
    },
    commands: {
      total: totalCommands,
      successful: successfulCommands,
      failed: failedCommands,
      errorRate: failedCommands / totalCommands * 100
    },
    reminders: {
      active: activeReminders,
      pending: pendingReminders
    },
    alerts: {
      active: activeAlerts
    }
  };
}
```

---

### 2. `/users` - Kullanıcı Listesi

**Kullanım:** `/users` veya `/users <SAYFA>`

**Örnek Çıktı:**
```
👥 Kullanıcılar (Sayfa 1/12)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. 👤 John Doe (@johndoe)
   🆔 ID: 123456789
   📅 Son Aktivite: 2 saat önce
   📊 Komutlar: 45

2. 👤 Jane Smith (@janesmith)
   🆔 ID: 987654321
   📅 Son Aktivite: 1 gün önce
   📊 Komutlar: 12

3. 👤 Bob Wilson
   🆔 ID: 555666777
   📅 Son Aktivite: 3 gün önce
   📊 Komutlar: 8
   ⚠️ Engelli
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📄 Sayfalama: 1 2 3 ... 12
```

**Kod:**
```typescript
bot.command('users', async (ctx) => {
  if (!isAdmin(ctx.from.id)) {
    await ctx.reply('❌ Bu komutu kullanma yetkiniz yok.');
    return;
  }
  
  const page = parseInt(ctx.match) || 1;
  const limit = 10;
  const skip = (page - 1) * limit;
  
  const users = await User.find()
    .sort({ lastActive: -1 })
    .skip(skip)
    .limit(limit);
  
  const totalUsers = await User.countDocuments();
  const totalPages = Math.ceil(totalUsers / limit);
  
  const message = formatUsersList(users, page, totalPages);
  await ctx.reply(message);
});
```

---

### 3. `/ban <USER_ID>` - Kullanıcı Engelleme

**Kullanım:** `/ban 123456789`

**Örnek Çıktı:**
```
✅ Kullanıcı engellendi
━━━━━━━━━━━━━━━━━━━━
🆔 ID: 123456789
👤 Ad: John Doe
📅 Engellenme: 31.10.2025 14:50
━━━━━━━━━━━━━━━━━━━━
```

**Kod:**
```typescript
bot.command('ban', async (ctx) => {
  if (!isAdmin(ctx.from.id)) {
    await ctx.reply('❌ Bu komutu kullanma yetkiniz yok.');
    return;
  }
  
  const userId = parseInt(ctx.match);
  
  if (!userId) {
    await ctx.reply('❌ Geçersiz kullanıcı ID.\nÖrnek: /ban 123456789');
    return;
  }
  
  const user = await User.findOneAndUpdate(
    { telegramId: userId },
    { 
      isBlocked: true,
      blockedAt: new Date(),
      blockedReason: 'Manual ban'
    },
    { new: true }
  );
  
  if (!user) {
    await ctx.reply('❌ Kullanıcı bulunamadı.');
    return;
  }
  
  await ctx.reply(
    `✅ Kullanıcı engellendi\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `🆔 ID: ${userId}\n` +
    `👤 Ad: ${user.firstName}\n` +
    `📅 Engellenme: ${new Date().toLocaleString('tr-TR')}\n` +
    `━━━━━━━━━━━━━━━━━━━━`
  );
});
```

---

### 4. `/unban <USER_ID>` - Engeli Kaldırma

**Kullanım:** `/unban 123456789`

**Örnek Çıktı:**
```
✅ Kullanıcının engeli kaldırıldı
━━━━━━━━━━━━━━━━━━━━
🆔 ID: 123456789
👤 Ad: John Doe
📅 Kaldırma: 31.10.2025 14:55
━━━━━━━━━━━━━━━━━━━━
```

---

### 5. `/logs` - Sistem Logları

**Kullanım:** `/logs` veya `/logs <SAYI>` (son N log)

**Örnek Çıktı:**
```
📋 Son 10 Log
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
14:55:23 [INFO] user:123456789 command:price symbol:BTC
14:55:20 [INFO] reminder:1234 sent to user:987654321
14:55:18 [WARN] API:binance rate limit warning
14:55:15 [ERROR] alert:567 failed to trigger user:111222333
14:55:10 [INFO] user:555666777 started bot
14:55:05 [INFO] AI query from user:123456789
14:54:58 [INFO] alert:123 triggered user:987654321
14:54:50 [INFO] command:note add by user:555666777
14:54:45 [WARN] MongoDB connection pool low
14:54:40 [INFO] system startup completed
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

### 6. `/broadcast <MESSAGE>` - Toplu Mesaj Gönderme

**Kullanım:** `/broadcast Tüm kullanıcılara gönderilecek mesaj`

**Örnek Çıktı:**
```
📢 Mesaj gönderiliyor...
━━━━━━━━━━━━━━━━━━━━
👥 Hedef: 1,256 aktif kullanıcı
✅ Gönderildi: 1,198 (95.4%)
❌ Başarısız: 58
⏱️ Süre: 3.2 dakika
━━━━━━━━━━━━━━━━━━━━
```

**Kod:**
```typescript
bot.command('broadcast', async (ctx) => {
  if (!isAdmin(ctx.from.id)) {
    await ctx.reply('❌ Bu komutu kullanma yetkiniz yok.');
    return;
  }
  
  const message = ctx.match;
  
  if (!message) {
    await ctx.reply('❌ Mesaj içeriği gerekli.\nÖrnek: /broadcast Bakım çalışması yapılacak');
    return;
  }
  
  await ctx.reply('📢 Mesaj gönderiliyor...');
  
  // Aktif kullanıcıları al (son 7 gün içinde aktif)
  const activeUsers = await User.find({
    lastActive: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    isBlocked: false
  });
  
  let sent = 0;
  let failed = 0;
  
  // Batch'ler halinde gönder (rate limiting için)
  const batchSize = 20;
  for (let i = 0; i < activeUsers.length; i += batchSize) {
    const batch = activeUsers.slice(i, i + batchSize);
    
    await Promise.all(
      batch.map(async (user) => {
        try {
          await bot.api.sendMessage(user.telegramId, 
            `📢 Duyuru\n━━━━━━━━━━━━━━━━━━━━\n${message}\n━━━━━━━━━━━━━━━━━━━━`
          );
          sent++;
        } catch (error) {
          failed++;
        }
      })
    );
    
    // Rate limiting - batch'ler arası bekle
    if (i + batchSize < activeUsers.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  await ctx.reply(
    `📢 Mesaj gönderildi\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `👥 Hedef: ${activeUsers.length} aktif kullanıcı\n` +
    `✅ Gönderildi: ${sent}\n` +
    `❌ Başarısız: ${failed}\n` +
    `⏱️ Süre: ${Math.round((activeUsers.length / 20))} batch\n` +
    `━━━━━━━━━━━━━━━━━━━━`
  );
});
```

---

### 7. `/backup` - Veritabanı Yedeği

**Kullanım:** `/backup`

**Örnek Çıktı:**
```
💾 Yedekleme başlatıldı
━━━━━━━━━━━━━━━━━━━━
📊 Users: 8,934
📊 Notes: 12,456
📊 Reminders: 567
📊 Alerts: 234
📊 UserLists: 1,234
━━━━━━━━━━━━━━━━━━━━
```

---

### 8. `/restart` - Bot Yeniden Başlatma

**Kullanım:** `/restart`

**Örnek Çıktı:**
```
🔄 Bot yeniden başlatılıyor...
━━━━━━━━━━━━━━━━━━━━
⏱️ İşlemler durduruluyor...
💾 Veriler kaydediliyor...
🖥️ Sistem yeniden başlatılıyor...
✅ Başlatıldı!
━━━━━━━━━━━━━━━━━━━━
```

**Güvenlik:**
```typescript
bot.command('restart', async (ctx) => {
  if (!isAdmin(ctx.from.id)) {
    await ctx.reply('❌ Bu komutu kullanma yetkiniz yok.');
    return;
  }
  
  await ctx.reply('🔄 Bot yeniden başlatılıyor...');
  
  // Graceful shutdown
  setTimeout(() => {
    process.exit(0);
  }, 1000);
});
```

---

## 🔐 Admin Güvenliği

### İki Faktörlü Doğrulama (2FA)

```typescript
// Admin panel (gelecek)
/*
1. Kullanıcı admin ID'sini doğrular
2. OTP kodu email/SMS ile gönderilir
3. Kullanıcı kodu girer
4. Yetki verilir
*/
```

### Admin Komut Loglaması

```typescript
// Tüm admin komutları loglanır
bot.command(/^(stats|users|ban|unban|broadcast|logs|backup|restart)/, async (ctx) => {
  logger.info({
    action: 'admin_command',
    command: ctx.match,
    adminId: ctx.from.id,
    timestamp: new Date()
  });
});
```

---

## 📱 Telegram Admin Bot

Basit bir admin bot oluşturarak yönetim işlemlerini kolaylaştırabiliriz:

```
Admin Bot (@PandaBotAdmin)
├── Dashboard (Ana sayfa)
├── Users (Kullanıcılar)
├── Alerts (Alarmlar)
├── Logs (Loglar)
├── Broadcast (Toplu mesaj)
└── Settings (Ayarlar)
```

**Avantajlar:**
- ✅ Telegram üzerinden kolay yönetim
- ✅ Her yerden erişim
- ✅ Bildirimler anında gelir
- ✅ Mobil uyumlu
- ✅ Basit arayüz

---

## 📊 Admin Dashboard (Gelecek - v2.0)

Web tabanlı yönetim paneli:

### Sayfalar

1. **Dashboard** - Genel bakış
2. **Users** - Kullanıcı yönetimi
3. **Alerts** - Alarm yönetimi
4. **Reminders** - Hatırlatma yönetimi
5. **Analytics** - İstatistikler
6. **Settings** - Konfigürasyon

### Özellikler

- **Filtreleme ve arama**
- **CSV export**
- **Toplu işlemler**
- **Grafik ve chartlar**
- **Real-time güncellemeler**
- **Rol bazlı erişim**

---

**Bir sonraki bölüm:** [Project Structure](./11-folder-structure.md)
