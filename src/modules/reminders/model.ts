import mongoose, { Schema, Document } from 'mongoose';

export interface IReminder extends Document {
  userId: number;
  message: string;
  remindAt: Date;
  status: 'active' | 'completed' | 'cancelled';
  jobId?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

const ReminderSchema = new Schema<IReminder>(
  {
    userId: {
      type: Number,
      required: true,
      index: true,
      ref: 'User'
    },
    message: {
      type: String,
      required: true,
      maxlength: 500
    },
    remindAt: {
      type: Date,
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'cancelled'],
      default: 'active',
      index: true
    },
    jobId: {
      type: String,
      sparse: true,
      unique: true
    },
    completedAt: {
      type: Date,
      sparse: true
    }
  },
  {
    timestamps: true
  }
);

// Indexes
ReminderSchema.index({ userId: 1, status: 1 });
ReminderSchema.index({ remindAt: 1, status: 1 });
ReminderSchema.index({ status: 1, remindAt: 1 });

export const Reminder = mongoose.model<IReminder>('Reminder', ReminderSchema);
