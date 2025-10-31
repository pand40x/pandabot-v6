import mongoose, { Schema, Document } from 'mongoose';

interface IPortfolioItem {
  symbol: string;
  amount: number;
  averagePrice?: number;
  addedAt: Date;
}

export interface IPortfolio extends Document {
  userId: number;
  portfolioName: string;
  items: IPortfolioItem[];
  createdAt: Date;
  updatedAt: Date;
}

const PortfolioItemSchema = new Schema<IPortfolioItem>({
  symbol: {
    type: String,
    required: true,
    uppercase: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  averagePrice: {
    type: Number,
    min: 0
  },
  addedAt: {
    type: Date,
    default: Date.now
  }
});

const PortfolioSchema = new Schema<IPortfolio>(
  {
    userId: {
      type: Number,
      required: true,
      index: true,
      ref: 'User'
    },
    portfolioName: {
      type: String,
      required: true,
      maxlength: 50,
      trim: true
    },
    items: [PortfolioItemSchema]
  },
  {
    timestamps: true
  }
);

// Indexes
PortfolioSchema.index({ userId: 1, portfolioName: 1 }, { unique: true });
PortfolioSchema.index({ 'items.symbol': 1 });

export const Portfolio = mongoose.model<IPortfolio>('Portfolio', PortfolioSchema);
