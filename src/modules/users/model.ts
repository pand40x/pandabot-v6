import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  telegramId: number;
  username?: string;
  firstName: string;
  lastName?: string;
  languageCode: string;
  isBlocked: boolean;
  firstSeen: Date;
  lastActive: Date;
  totalCommands: number;
  settings: {
    notifications: boolean;
    defaultCurrency: 'USD' | 'TRY';
  };
}

const UserSchema = new Schema<IUser>(
  {
    telegramId: {
      type: Number,
      required: true,
      unique: true,
      index: true
    },
    username: {
      type: String,
      sparse: true
    },
    firstName: {
      type: String,
      required: true
    },
    lastName: {
      type: String
    },
    languageCode: {
      type: String,
      default: 'tr'
    },
    isBlocked: {
      type: Boolean,
      default: false
    },
    firstSeen: {
      type: Date,
      default: Date.now
    },
    lastActive: {
      type: Date,
      default: Date.now
    },
    totalCommands: {
      type: Number,
      default: 0
    },
    settings: {
      notifications: {
        type: Boolean,
        default: true
      },
      defaultCurrency: {
        type: String,
        enum: ['USD', 'TRY'],
        default: 'USD'
      }
    }
  },
  {
    timestamps: true
  }
);

// Indexes
UserSchema.index({ telegramId: 1 });
UserSchema.index({ lastActive: -1 });
UserSchema.index({ isBlocked: 1 });

export const User = mongoose.model<IUser>('User', UserSchema);
