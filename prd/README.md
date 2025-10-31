# 🧾 PandaBot PRD Documentation

**Modüler Finans Asistanı Telegram Botu**

## 📖 İçindekiler

1. [Project Overview](./01-project-overview.md) - Amaç ve Kapsam
2. [Architecture & Tech Stack](./02-architecture.md) - Mimari ve Teknoloji Yığını
3. [Features](./03-features.md) - Özellik Seti (Modüller)
4. [Data Model](./04-data-model.md) - MongoDB Veri Şeması
5. [Environment](./05-environment.md) - Ortam Değişkenleri (.env)
6. [System Flow](./06-system-flow.md) - Sistem Akış Diagramı
7. [Expansion Plan](./07-expansion-plan.md) - Gelecek Özellikler
8. [Security & Reliability](./08-security.md) - Güvenlik ve Dayanıklılık
9. [Success Criteria (KPIs)](./09-kpis.md) - Başarı Kriterleri
10. [Admin Features](./10-admin-features.md) - Yönetici Özellikleri
11. [Project Structure](./11-folder-structure.md) - Klasör Yapısı
12. [Conclusion](./12-conclusion.md) - Sonuç ve Özet

---

## 🎯 Proje Özeti

**PandaBot**, Telegram üzerinden finansal verileri takip eden, hatırlatmalar kurabilen, AI asistanı özellikli modüler bir bottur.

**Teknoloji Yığını:**
- Node.js (TypeScript)
- grammY Framework
- MongoDB
- Agenda/BullMQ Scheduler

**Ana Modüller:**
- Price Module (Kripto/Hisse fiyatları)
- Watchlists Module (İzleme listeleri - sadece ticker)
- Portfolios Module (Portföy yönetimi - ticker + amount)
- Notes Module (Not alma)
- Reminders Module (Hatırlatmalar)
- Alerts Module (Fiyat alarmları)
- AI Module (Yerel LLM entegrasyonu)
- Users Module (Kullanıcı yönetimi)
- Currency Module (USD/TRY kur görüntüleme)

**Özel Özellikler:**
- Komutsuz liste görüntüleme (direkt liste adı yazarak)
- 4 API key ile CoinMarketCap rotation
- Ayrı watchlists ve portfolios modülleri

---

## 🚀 Hızlı Başlangıç

1. Tüm dokümanları sırayla okuyun
2. [Architecture](./02-architecture.md) bölümünü inceleyin
3. [Environment](./05-environment.md) ayarlarını yapılandırın
4. [Project Structure](./11-folder-structure.md) klasör yapısını oluşturun

---

**Hazırlayan:** panda0x × ChatGPT (GPT-5)  
**Tarih:** 31 Ekim 2025  
**Sürüm:** v1.0.0
