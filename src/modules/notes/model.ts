import mongoose, { Schema, Document } from 'mongoose';

export interface INote extends Document {
  userId: number;
  content: string;
  shortId: number;
  createdAt: Date;
  updatedAt: Date;
}

const NoteSchema = new Schema<INote>(
  {
    userId: {
      type: Number,
      required: true,
      index: true,
      ref: 'User'
    },
    content: {
      type: String,
      required: true,
      maxlength: 1000
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
NoteSchema.index({ userId: 1, createdAt: -1 });
NoteSchema.index({ createdAt: -1 });

export const Note = mongoose.model<INote>('Note', NoteSchema);
