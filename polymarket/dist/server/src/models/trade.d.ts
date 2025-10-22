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
export declare const TradeModel: mongoose.Model<any, {}, {}, {}, any, any>;
//# sourceMappingURL=trade.d.ts.map