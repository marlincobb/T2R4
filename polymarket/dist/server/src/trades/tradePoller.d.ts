import type { PolymarketService } from '../services/polymarketService';
import type { TradeRecorder } from './tradeRecorder';
export interface TradePollerConfig {
    pollIntervalMs: number;
    limit: number;
}
export declare const DEFAULT_TRADE_POLLER_CONFIG: TradePollerConfig;
export declare class TradePoller {
    private readonly service;
    private readonly recorder;
    private readonly market;
    private readonly config;
    private timer?;
    constructor(service: Pick<PolymarketService, 'getTrades'>, recorder: TradeRecorder, market: {
        marketId?: string;
        marketHash?: string;
    }, config?: TradePollerConfig);
    start(): void;
    stop(): void;
    private poll;
}
//# sourceMappingURL=tradePoller.d.ts.map