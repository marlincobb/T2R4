import type { Server } from 'http';
import { WebSocketServer } from 'ws';
import type { PolymarketService } from '../services/polymarketService';
import type { TradeRecorder } from '../trades/tradeRecorder';
export interface TradeProducerStreamOptions {
    defaultLimit: number;
    pollIntervalMs: number;
}
export interface TradeProducerSubscriptionParams {
    marketId?: string;
    marketHash?: string;
    limit: number;
}
export declare function registerTradeProducerStream(server: Server, service: Pick<PolymarketService, 'getTrades'>, options?: Partial<TradeProducerStreamOptions>, recorder?: TradeRecorder): WebSocketServer;
export declare function extractTradeProducerParamsFromRequest(requestUrl: string | undefined, defaultLimit: number): TradeProducerSubscriptionParams | undefined;
//# sourceMappingURL=tradeProducerStream.d.ts.map