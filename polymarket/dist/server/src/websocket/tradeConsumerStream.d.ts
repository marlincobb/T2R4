import type { TradeRecorder } from '../trades/tradeRecorder';
export type TradeConsumerChannel = 'market' | 'user';
export interface TradeConsumerMarketDescriptor {
    marketId?: string | null;
    marketHash?: string | null;
    assetId?: string | null;
}
export interface TradeConsumerAuthPayload {
    apiKey: string;
    secret: string;
    passphrase: string;
}
export interface TradeConsumerStreamConfig {
    url: string;
    reconnectDelayMs: number;
    heartbeatIntervalMs: number;
    channel?: TradeConsumerChannel;
    auth?: TradeConsumerAuthPayload;
    headers?: Record<string, string>;
    origin?: string;
    protocols?: string[];
}
export declare const DEFAULT_CONSUMER_STREAM_CONFIG: TradeConsumerStreamConfig;
export declare class PolymarketTradeConsumerStream {
    private readonly recorder;
    private connection?;
    private reconnectTimer?;
    private heartbeatTimer?;
    private markets;
    private started;
    private readonly config;
    constructor(recorder: TradeRecorder, config?: TradeConsumerStreamConfig);
    start(): void;
    stop(): void;
    setMarkets(markets: TradeConsumerMarketDescriptor[]): void;
    private connect;
    private sendSubscription;
    private handleMessage;
    private startHeartbeat;
    private stopHeartbeat;
    private scheduleReconnect;
    private getAssetIds;
    private buildEndpointUrl;
    private sendRaw;
}
//# sourceMappingURL=tradeConsumerStream.d.ts.map