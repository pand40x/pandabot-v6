import mongoose, { Schema, Document } from 'mongoose';

interface ITicker {
  symbol: string;
  addedAt: Date;
}

export interface IWatchlist extends Document {
  userId: number;
  listName: string;
  type: 'crypto' | 'stock';
  tickers: ITicker[];
  createdAt: Date;
  updatedAt: Date;
}

const TickerSchema = new Schema<ITicker>({
  symbol: {
    type: String,
    required: true,
    uppercase: true
  },
  addedAt: {
    type: Date,
    default: Date.now
  }
});

const WatchlistSchema = new Schema<IWatchlist>(
  {
    userId: {
      type: Number,
      required: true,
      index: true,
      ref: 'User'
    },
    listName: {
      type: String,
      required: true,
      maxlength: 50,
      trim: true
    },
    type: {
      type: String,
      enum: ['crypto', 'stock'],
      default: 'crypto',
      required: true
    },
    tickers: [TickerSchema]
  },
  {
    timestamps: true
  }
);

// Indexes
WatchlistSchema.index({ userId: 1, listName: 1 }, { unique: true });
WatchlistSchema.index({ 'tickers.symbol': 1 });

export const Watchlist = mongoose.model<IWatchlist>('Watchlist', WatchlistSchema);
