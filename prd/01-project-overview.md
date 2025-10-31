# 🧭 1. Amaç ve Kapsam

## 🎯 Proje Amacı

**PandaBot**, kullanıcıların Telegram üzerinden:

- ✅ Kripto para ve hisse senedi fiyatlarını sorgulayabilmesi
- ✅ Kendi izleme listelerini oluşturabilmesi
- ✅ Notlar ve hatırlatmalar ekleyebilmesi
- ✅ Fiyat değişimlerine göre alarm kurabilmesi
- ✅ Yerel bir LLM modeliyle (AI) etkileşime girebilmesi
- ✅ Kullanıcı aktivitelerinin izlenip admin'e bildirim gönderilmesi

tamamen **modüler ve genişletilebilir bir finansal asistan botu**dur.

## 🔧 Teknik Yaklaşım

Sistem; **Node.js (TypeScript)**, **MongoDB**, **grammY**, ve **Agenda**/`BullMQ` tabanlı planlayıcı yapısı üzerine inşa edilmiştir.

Tüm özellikler **bağımsız modüller** halinde yönetilir.

## 📦 Kapsam

### ✅ Dahil Olan Özellikler

| Modül | Açıklama | Durum |
|-------|----------|-------|
| **Price Module** | Kripto/hisse fiyat sorgulama | ✅ Dahil |
| **UserLists Module** | İzleme listeleri oluşturma | ✅ Dahil |
| **Notes Module** | Not alma sistemi | ✅ Dahil |
| **Reminders Module** | Hatırlatma kurma | ✅ Dahil |
| **Alerts Module** | Fiyat alarmları | ✅ Dahil |
| **AI Module** | Yerel LLM entegrasyonu | ✅ Dahil |
| **Users Module** | Kullanıcı yönetimi | ✅ Dahil |
| **Currency Module** | Döviz çevirici | ✅ Dahil |

### 🚧 Gelecek Sürümlerde

| Sürüm | Modül | Açıklama |
|-------|-------|----------|
| v1.1 | Portfolio | Toplam değer hesaplama |
| v1.2 | Chart | Fiyat grafiği görüntüleme |
| v1.3 | Convert | Token/döviz dönüştürücü |
| v1.4 | AI Image | Görsel üretimi (Flux/SD) |
| v2.0 | Admin Panel | Web yönetim paneli |

---

## 🎨 Kullanıcı Senaryoları

### 📊 Senaryo 1: Fiyat Takibi
```
Kullanıcı → /price BTC → Sistem → Binance API → Fiyat Bilgisi → Kullanıcı
```

### 📝 Senaryo 2: Hatırlatma Kurma
```
Kullanıcı → /remind 15:00 "Fatura öde" → Agenda Job → Zamanında bildirim
```

### 🔔 Senaryo 3: Fiyat Alarmı
```
Kullanıcı → /alert BTC -5% → Sistem → Fiyat izleme → %5 düşüşte → Bildirim
```

### 🤖 Senaryo 4: AI Asistan
```
Kullanıci → /ai "BTC hakkında ne düşünüyorsun?" → LLM API → Cevap → Kullanıcı
```

---

## 📈 Beklenen Faydalar

1. **Kullanıcılar için:**
   - Merkezi finans bilgi noktası
   - Otomatik hatırlatma sistemi
   - Kişiselleştirilmiş izleme listeleri
   - Anında fiyat alarmları

2. **Geliştiriciler için:**
   - Modüler mimari
   - Kolay genişletme
   - Bağımsız test edilebilir bileşenler
   - Temiz kod organizasyonu

3. **Sistem için:**
   - Ölçeklenebilir yapı
   - Hata toleransı
   - Monitoring ve loglama
   - Admin kontrolü

---

**Bir sonraki bölüm:** [Architecture & Tech Stack](./02-architecture.md)
