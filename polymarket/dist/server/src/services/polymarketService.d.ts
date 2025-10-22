export type PolymarketOrder = 'asc' | 'desc';
export interface PolymarketMarketsQuery {
    limit?: number;
    active?: boolean;
    closed?: boolean;
    contractSlug?: string;
    collectionSlug?: string;
    order?: PolymarketOrder;
}
export interface PolymarketServiceAuthConfig {
    apiKey?: string;
    apiKeyHeader?: string;
    publicKey?: string;
    secretKey?: string;
    publicHeader?: string;
    secretHeader?: string;
}
export interface PolymarketTradesQuery {
    marketId?: string;
    marketHash?: string;
    limit?: number;
    before?: string;
    after?: string;
}
export interface PolymarketServiceOptions {
    baseURL: string;
    timeoutMs?: number;
    auth?: PolymarketServiceAuthConfig;
    tradesBaseURL?: string;
}
export type PolymarketMarket = Record<string, unknown>;
export type PolymarketTrade = Record<string, unknown>;
export declare class PolymarketApiError extends Error {
    readonly status?: number;
    constructor(message: string, status?: number, cause?: unknown);
}
export declare class PolymarketService {
    private readonly client;
    private readonly tradesClient;
    constructor({ baseURL, timeoutMs, auth, tradesBaseURL }: PolymarketServiceOptions);
    getMarkets(query?: PolymarketMarketsQuery): Promise<PolymarketMarket[]>;
    getTrades(query: PolymarketTradesQuery): Promise<PolymarketTrade[]>;
    private buildDefaultHeaders;
    private serializeQuery;
    private serializeTradesQuery;
    private normalizeMarkets;
    private toPolymarketError;
    private normalizeTrades;
}
//# sourceMappingURL=polymarketService.d.ts.map