# Docker ile PandaBot v6 Çalıştırma

## 🚀 Hızlı Başlangıç

### 1. Environment dosyasını hazırlayın
```bash
cp .env.example .env
```

### 2. .env dosyasını düzenleyin
```bash
# Gerekli alanları doldurun:
BOT_TOKEN=your_telegram_bot_token
ADMIN_ID=your_telegram_user_id
MINIMAX_API_KEY=your_minimax_api_key
MINIMAX_GROUP_ID=your_minimax_group_id
COINMARKETCAP_API_KEY_1=your_cmc_api_key
# ... diğer alanlar
```

### 3. Docker ile çalıştırın
```bash
# Tüm servisleri başlat (MongoDB + Bot)
docker-compose up -d

# Logları takip et
docker-compose logs -f bot

# Durdurmak için
docker-compose down
```

## 📦 Docker Servisleri

- **mongodb**: MongoDB veritabanı (Port: 27017)
- **bot**: Ana bot uygulaması (Tüm workers dahil)

## 🏗️ Manuel Build

```bash
# Image oluştur
docker build -t pandabot-v6 .

# Container'ı çalıştır
docker run -d \
  --name pandabot \
  --env-file .env \
  -p 3000:3000 \
  pandabot-v6
```

## 📝 Notlar

- Bot container'ı içinde hem ana bot hem de workers (alerts, reminders) çalışır
- MongoDB verileri `mongodb_data` volume'unda saklanır
- Container içinde non-root user (bot) kullanılır güvenlik için
- Health check yapılandırılmıştır

## 🔧 Troubleshooting

```bash
# Container logları
docker-compose logs bot

# MongoDB'e bağlanma
docker exec -it pandabot-mongodb mongosh -u root -p

# Container'a gir
docker exec -it pandabot-bot sh
```
