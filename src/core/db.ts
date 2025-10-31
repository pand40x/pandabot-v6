import mongoose from 'mongoose';
import { config } from '../config/env';
import { logger } from './logger';

class Database {
  private static instance: Database;
  private isConnected = false;
  
  private constructor() {}
  
  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }
  
  public async connect(): Promise<void> {
    if (this.isConnected) {
      logger.info('Database already connected');
      return;
    }
    
    try {
      mongoose.set('strictQuery', true);
      
      await mongoose.connect(config.database.uri, {
        // Connection options
        maxPoolSize: 10, // Maximum number of connections in the connection pool
        serverSelectionTimeoutMS: 5000, // How long to try selecting a server
        socketTimeoutMS: 45000, // How long to wait for a socket
        family: 4, // Use IPv4, skip trying IPv6
      });
      
      this.isConnected = true;
      logger.info('✅ MongoDB connected successfully', {
        host: mongoose.connection.host,
        port: mongoose.connection.port,
        database: mongoose.connection.name
      });
      
      // Connection event listeners
      mongoose.connection.on('connected', () => {
        logger.info('📦 MongoDB connected');
      });
      
      mongoose.connection.on('error', (error) => {
        logger.error('MongoDB connection error:', error);
        this.isConnected = false;
      });
      
      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected');
        this.isConnected = false;
      });
      
      // Graceful shutdown
      process.on('SIGINT', this.gracefulShutdown.bind(this));
      process.on('SIGTERM', this.gracefulShutdown.bind(this));
      
    } catch (error) {
      logger.error('❌ Failed to connect to MongoDB:', error);
      throw error;
    }
  }
  
  public async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }
    
    try {
      await mongoose.connection.close();
      this.isConnected = false;
      logger.info('📦 MongoDB disconnected');
    } catch (error) {
      logger.error('Error closing MongoDB connection:', error);
      throw error;
    }
  }
  
  public getConnection() {
    return mongoose.connection;
  }
  
  public isHealthy(): boolean {
    return this.isConnected && mongoose.connection.readyState === 1;
  }
  
  private async gracefulShutdown() {
    logger.info('Received shutdown signal, closing database connections...');
    await this.disconnect();
    process.exit(0);
  }
}

// Export singleton instance
export const db = Database.getInstance();

// Export connectDB function
export const connectDB = (): Promise<void> => db.connect();

// Export mongoose for creating schemas
export { mongoose };
