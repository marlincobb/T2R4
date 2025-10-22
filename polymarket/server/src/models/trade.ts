import mongoose from 'mongoose';

export interface TradeDocument extends mongoose.Document {
  tradeId: string;
  marketId?: string | null;
  marketHash?: string | null;
  price?: number | null;
  size?: number | null;
  outcome?: string | null;
  side?: string | null;
  occurredAt?: Date | null;
  receivedAt: Date;
  raw: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const tradeSchema = new mongoose.Schema<TradeDocument>(
  {
    tradeId: { type: String, required: true, unique: true, index: true },
    marketId: { type: String, index: true },
    marketHash: { type: String, index: true },
    price: Number,
    size: Number,
    outcome: String,
    side: String,
    occurredAt: Date,
    receivedAt: { type: Date, default: Date.now },
    raw: { type: mongoose.Schema.Types.Mixed, required: true }
  },
  {
    timestamps: true
  }
);

export const TradeModel =
  mongoose.models.Trade || mongoose.model<TradeDocument>('Trade', tradeSchema);

