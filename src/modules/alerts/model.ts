import mongoose, { Schema, Document } from 'mongoose';

export interface IAlert extends Document {
  userId: number;
  symbol: string;
  thresholdPct: number;
  basePrice: number;
  currentPrice: number;
  lastTriggered?: Date;
  status: 'active' | 'paused';
  shortId: number;
  createdAt: Date;
  updatedAt: Date;
}

const AlertSchema = new Schema<IAlert>(
  {
    userId: {
      type: Number,
      required: true,
      index: true,
      ref: 'User'
    },
    symbol: {
      type: String,
      required: true,
      uppercase: true,
      index: true
    },
    thresholdPct: {
      type: Number,
      required: true
    },
    basePrice: {
      type: Number,
      required: true
    },
    currentPrice: {
      type: Number,
      required: true
    },
    lastTriggered: {
      type: Date,
      sparse: true
    },
    status: {
      type: String,
      enum: ['active', 'paused'],
      default: 'active',
      index: true
    },
    shortId: {
      type: Number,
      required: true,
      unique: true
    }
  },
  {
    timestamps: true
  }
);

// Indexes
AlertSchema.index({ userId: 1, status: 1 });
AlertSchema.index({ symbol: 1, status: 1 });
AlertSchema.index({ userId: 1, symbol: 1, status: 1 });

export const Alert = mongoose.model<IAlert>('Alert', AlertSchema);
