import winston from 'winston';
import { config } from '../config/env';

const { combine, timestamp, errors, printf, colorize, simple } = winston.format;

// Custom format for console
const consoleFormat = printf(({ level, message, timestamp, ...meta }) => {
  const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
  return `${timestamp} [${level}]: ${message} ${metaStr}`;
});

// Create logger instance
export const logger = winston.createLogger({
  level: config.logging.level,
  format: combine(
    timestamp(),
    errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'pandabot' },
  transports: [
    // Write all logs with level 'error' and below to 'error.log'
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    
    // Write all logs with level 'info' and below to 'combined.log'
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

// If we're not in production, log to the console with a simple format
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        simple()
      )
    })
  );
  
  logger.add(
    new winston.transports.Console({
      format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        consoleFormat
      )
    })
  );
}

// Create logs directory if it doesn't exist
import fs from 'fs';
import path from 'path';

const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Helper functions for structured logging
export const logUserAction = (userId: number, action: string, details?: any) => {
  logger.info('User Action', {
    userId,
    action,
    ...details
  });
};

export const logAPICall = (api: string, endpoint: string, status: 'success' | 'error', responseTime?: number, error?: any) => {
  logger.info('API Call', {
    api,
    endpoint,
    status,
    responseTime,
    error: error?.message
  });
};

export const logError = (error: Error, context?: any) => {
  logger.error('Error', {
    message: error.message,
    stack: error.stack,
    ...context
  });
};

export const logSystemEvent = (event: string, details?: any) => {
  logger.info('System Event', {
    event,
    ...details
  });
};

export const getRecentLogs = async (count: number = 10) => {
  const fs = require('fs');
  const path = require('path');
  
  const logFile = path.join(process.cwd(), 'logs', 'combined.log');
  
  if (!fs.existsSync(logFile)) {
    return [];
  }
  
  try {
    const content = fs.readFileSync(logFile, 'utf-8');
    const lines = content.trim().split('\n');
    
    // Parse JSON logs and reverse to get most recent first
    const logs = lines
      .slice(-count)
      .reverse()
      .map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(log => log !== null);
    
    // Format for display
    return logs.map(log => ({
      timestamp: log.timestamp?.split('T')[1]?.split('.')[0] || '',
      level: log.level || 'info',
      message: log.message || ''
    }));
  } catch (error) {
    console.error('Error reading logs:', error);
    return [];
  }
};

// Admin notification functions
import axios from 'axios';

export async function notifyAdminOfError(error: Error, context?: any) {
  try {
    const botToken = process.env.BOT_TOKEN;
    const adminId = process.env.ADMIN_ID;
    
    if (!botToken || !adminId) {
      console.warn('BOT_TOKEN or ADMIN_ID not set, cannot notify admin');
      return;
    }
    
    const message = 
      `⚠️ Sistem Hatası\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `🕐 Zaman: ${new Date().toLocaleString('tr-TR')}\n` +
      `${context?.module ? `📍 Modül: ${context.module}\n` : ''}` +
      `${context?.userId ? `👤 Kullanıcı: ${context.userId}\n` : ''}` +
      `❌ Hata: ${error.message}\n` +
      `${error.stack ? `🔗 Stack: ${error.stack.split('\n')[1]}\n` : ''}` +
      `━━━━━━━━━━━━━━━━━━━━`;
    
    await axios.post(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        chat_id: adminId,
        text: message,
        parse_mode: 'HTML'
      },
      {
        timeout: 5000
      }
    );
    
    console.log('Admin notified of error');
  } catch (notifyError) {
    console.error('Failed to notify admin:', notifyError);
  }
}

export async function notifyAdminOfNewUser(user: any) {
  try {
    const botToken = process.env.BOT_TOKEN;
    const adminId = process.env.ADMIN_ID;
    
    if (!botToken || !adminId) {
      return;
    }
    
    const message = 
      `👋 Yeni Kullanıcı!\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `🆔 ID: ${user.id}\n` +
      `👤 Ad: ${user.first_name}\n` +
      `📝 Kullanıcı Adı: ${user.username ? '@' + user.username : 'Yok'}\n` +
      `📅 İlk Kullanım: ${new Date().toLocaleString('tr-TR')}\n` +
      `🌍 Dil: ${user.language_code || 'tr'}\n` +
      `━━━━━━━━━━━━━━━━━━━━`;
    
    await axios.post(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        chat_id: adminId,
        text: message,
        parse_mode: 'HTML'
      },
      {
        timeout: 5000
      }
    );
    
    console.log(`Admin notified of new user: ${user.id}`);
  } catch (error) {
    console.error('Failed to notify admin of new user:', error);
  }
}

export async function notifyAdminOfBlockedUser(userId: number, firstName: string) {
  try {
    const botToken = process.env.BOT_TOKEN;
    const adminId = process.env.ADMIN_ID;
    
    if (!botToken || !adminId) {
      return;
    }
    
    const message = 
      `🚫 Kullanıcı Engellendi\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `🆔 ID: ${userId}\n` +
      `👤 Ad: ${firstName}\n` +
      `📅 Engellenme: ${new Date().toLocaleString('tr-TR')}\n` +
      `━━━━━━━━━━━━━━━━━━━━`;
    
    await axios.post(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        chat_id: adminId,
        text: message,
        parse_mode: 'HTML'
      },
      {
        timeout: 5000
      }
    );
    
    console.log(`Admin notified of blocked user: ${userId}`);
  } catch (error) {
    console.error('Failed to notify admin of blocked user:', error);
  }
}
