import type { PolymarketTrade } from '../services/polymarketService';
export interface TradeRecordContext {
    marketId?: string | null;
    marketHash?: string | null;
    trades: PolymarketTrade[];
}
export interface TradeRecorder {
    record(context: TradeRecordContext): Promise<void>;
}
export declare function createTradeRecorder(): TradeRecorder;
//# sourceMappingURL=tradeRecorder.d.ts.map