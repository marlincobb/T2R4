export interface User {
    id: string;
    username: string;
    email: string;
    createdAt: Date;
}
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
}
export interface MarketData {
    _id?: string;
    symbol: string;
    price: number;
    timestamp: Date;
    volume: number;
}
export interface CreateMarketDataRequest {
    symbol: string;
    price: number;
    volume: number;
}
export type MarketEventType = 'price_update' | 'trade' | 'order';
export interface MarketEvent {
    type: MarketEventType;
    data: MarketData;
    timestamp: Date;
}
export interface MarketDataDocument extends Omit<MarketData, '_id'> {
    _id: string;
}
//# sourceMappingURL=index.d.ts.map