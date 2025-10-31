import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

// Şema tanımı
const envSchema = z.object({
  BOT_TOKEN: z.string().min(1, 'BOT_TOKEN gerekli'),
  ADMIN_ID: z.string().transform(Number),
  MONGODB_URI: z.string().url('Geçerli MongoDB URI gerekli'),
  AI_BASE_URL: z.string().url().default('https://api.minimax.io/v1'),
  AI_MODEL_NAME: z.string().optional(),
  AI_TIMEOUT: z.string().transform(Number).default('30'),
  
  // Minimax API
  MINIMAX_API_KEY: z.string().min(1, 'MINIMAX_API_KEY gerekli'),
  MINIMAX_GROUP_ID: z.string().min(1, 'MINIMAX_GROUP_ID gerekli'),
  AI_INPUT_COST_PER_TOKEN: z.string().transform(Number).default('0.0000003'),
  AI_OUTPUT_COST_PER_TOKEN: z.string().transform(Number).default('0.0000012'),
  ROTATION_MODE: z.enum(['health', 'read-only', 'maintenance', 'ai-only']).default('health'),
  
  // CoinMarketCap API Keys (zorunlu)
  COINMARKETCAP_API_KEY_1: z.string().min(1, 'CMC API Key 1 gerekli'),
  COINMARKETCAP_API_KEY_2: z.string().min(1, 'CMC API Key 2 gerekli'),
  COINMARKETCAP_API_KEY_3: z.string().min(1, 'CMC API Key 3 gerekli'),
  COINMARKETCAP_API_KEY_4: z.string().min(1, 'CMC API Key 4 gerekli'),
  COINMARKETCAP_ACTIVE_KEY: z.string().transform(Number).default('1'),
  
  // Opsiyonel değişkenler
  ALPHAVANTAGE_API_KEY: z.string().optional(),
  
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  WORKER_COUNT: z.string().transform(Number).default('2'),
  JOB_CHECK_INTERVAL: z.string().transform(Number).default('60'),
  ALERT_CHECK_INTERVAL: z.string().transform(Number).default('60'),
  REQUEST_TIMEOUT: z.string().transform(Number).default('10000'),
  
  REDIS_URL: z.string().optional(),
  CACHE_TTL: z.string().transform(Number).default('300'),
  
  RATE_LIMIT_PER_MINUTE: z.string().transform(Number).default('30'),
  RATE_LIMIT_PER_HOUR: z.string().transform(Number).default('500'),
  
  DEFAULT_LANGUAGE: z.string().default('tr'),
  DEFAULT_CURRENCY: z.string().default('USD'),
  TIMEZONE: z.string().default('Europe/Istanbul'),
  
  MAX_NOTE_LENGTH: z.string().transform(Number).default('1000'),
  MAX_REMINDER_LENGTH: z.string().transform(Number).default('500')
});

// Validasyon
const env = envSchema.parse(process.env);

export const config: any = {
  bot: {
    token: env.BOT_TOKEN,
    adminId: env.ADMIN_ID
  },
  database: {
    uri: env.MONGODB_URI
  },
  ai: {
    baseUrl: env.AI_BASE_URL,
    modelName: env.AI_MODEL_NAME || 'MiniMax-M2',
    timeout: env.AI_TIMEOUT,
    cost: {
      inputPerToken: env.AI_INPUT_COST_PER_TOKEN,
      outputPerToken: env.AI_OUTPUT_COST_PER_TOKEN
    },
    minimax: {
      apiKey: env.MINIMAX_API_KEY,
      groupId: env.MINIMAX_GROUP_ID
    }
  },
  mode: env.ROTATION_MODE,
  apis: {
    coinMarketCap: {
      keys: [
        env.COINMARKETCAP_API_KEY_1,
        env.COINMARKETCAP_API_KEY_2,
        env.COINMARKETCAP_API_KEY_3,
        env.COINMARKETCAP_API_KEY_4
      ],
      activeKeyIndex: env.COINMARKETCAP_ACTIVE_KEY - 1,
      getActiveKey: function(this: any) {
        return this.keys[this.activeKeyIndex];
      },
      rotateKey: function(this: any) {
        this.activeKeyIndex = (this.activeKeyIndex + 1) % this.keys.length;
      }
    },
    alphaVantage: env.ALPHAVANTAGE_API_KEY
  },
  logging: {
    level: env.LOG_LEVEL
  },
  workers: {
    count: env.WORKER_COUNT,
    jobCheckInterval: env.JOB_CHECK_INTERVAL,
    alertCheckInterval: env.ALERT_CHECK_INTERVAL
  },
  http: {
    timeout: env.REQUEST_TIMEOUT
  },
  redis: {
    url: env.REDIS_URL,
    ttl: env.CACHE_TTL
  },
  limits: {
    rateLimitPerMinute: env.RATE_LIMIT_PER_MINUTE,
    rateLimitPerHour: env.RATE_LIMIT_PER_HOUR,
    maxNoteLength: env.MAX_NOTE_LENGTH,
    maxReminderLength: env.MAX_REMINDER_LENGTH
  },
  localization: {
    defaultLanguage: env.DEFAULT_LANGUAGE,
    defaultCurrency: env.DEFAULT_CURRENCY,
    timezone: env.TIMEZONE
  }
};

// Aktif modül kontrolü
export function isModuleActive(moduleName: string): boolean {
  switch (config.mode) {
    case 'health':
      return true;
    case 'read-only':
      return ['prices', 'watchlists', 'portfolios', 'notes', 'currency'].includes(moduleName);
    case 'ai-only':
      return moduleName === 'ai';
    case 'maintenance':
      return ['users'].includes(moduleName);
    default:
      return false;
  }
}
