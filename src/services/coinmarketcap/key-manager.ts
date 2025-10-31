import { config } from '../../config/env';
import { logger } from '../../core/logger';

interface APIKeyStatus {
  key: string;
  requestsUsed: number;
  requestsLimit: number;
  resetTime: Date;
  isBlocked: boolean;
}

export class CMCKeyManager {
  private keys: APIKeyStatus[] = [];
  private currentKeyIndex = 0;
  
  constructor() {
    // Her API key için status oluştur
    config.apis.coinMarketCap.keys.forEach((key, index) => {
      this.keys.push({
        key,
        requestsUsed: 0,
        requestsLimit: 10000, // CMC free tier limit
        resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        isBlocked: false
      });
    });
    
    // Başlangıç key'i ayarla
    const activeIndex = config.apis.coinMarketCap.activeKeyIndex;
    this.currentKeyIndex = activeIndex;
    
    logger.info(`CMC Key Manager initialized with ${this.keys.length} keys`);
  }
  
  getActiveKey(): string {
    const currentKey = this.keys[this.currentKeyIndex];
    
    if (!currentKey) {
      throw new Error('No API keys available');
    }
    
    if (currentKey.isBlocked || this.isLimitReached(currentKey)) {
      this.rotateToNextAvailableKey();
      return this.getActiveKey();
    }
    
    return currentKey.key;
  }
  
  incrementRequestCount(): void {
    const currentKey = this.keys[this.currentKeyIndex];
    if (!currentKey) return;
    currentKey.requestsUsed++;
  }
  
  markAsBlocked(): void {
    const currentKey = this.keys[this.currentKeyIndex];
    if (!currentKey) return;
    currentKey.isBlocked = true;
    logger.error(`CMC API key ${this.currentKeyIndex + 1} marked as blocked`);
  }
  
  private rotateToNextAvailableKey(): void {
    const originalIndex = this.currentKeyIndex;
    
    for (let i = 0; i < this.keys.length; i++) {
      this.currentKeyIndex = (this.currentKeyIndex + 1) % this.keys.length;
      const newKey = this.keys[this.currentKeyIndex];
      
      if (newKey && !newKey.isBlocked && !this.isLimitReached(newKey)) {
        logger.info(`Rotated to CMC API key ${this.currentKeyIndex + 1}`);
        return;
      }
    }
    
    logger.error('All CMC API keys are unavailable!');
    this.currentKeyIndex = originalIndex;
  }
  
  private isLimitReached(key: APIKeyStatus): boolean {
    return key.requestsUsed >= key.requestsLimit * 0.9;
  }
  
  resetDaily(): void {
    this.keys.forEach((key) => {
      key.requestsUsed = 0;
      key.resetTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
      key.isBlocked = false;
    });
    
    logger.info('CMC API keys daily reset completed');
  }
  
  getStats() {
    return this.keys.map((key, index) => ({
      keyNumber: index + 1,
      requestsUsed: key.requestsUsed,
      requestsLimit: key.requestsLimit,
      usagePercent: (key.requestsUsed / key.requestsLimit) * 100,
      isBlocked: key.isBlocked,
      resetTime: key.resetTime
    }));
  }
}

export const cmcKeyManager = new CMCKeyManager();
