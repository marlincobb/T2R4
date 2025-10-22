import type { Request, Response } from 'express';
import { PolymarketOrder, PolymarketService } from '../services/polymarketService';
export declare function createPolymarketMarketsHandler(service: Pick<PolymarketService, 'getMarkets'>): (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare function createTopTradeableMarketsHandler(service: Pick<PolymarketService, 'getMarkets'>, options?: {
    sampleSize?: number;
}): (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare function parseLimit(raw: unknown): number | undefined;
export declare function parseBoolean(raw: unknown): boolean | undefined;
export declare function parseString(raw: unknown): string | undefined;
export declare function parseOrder(raw: unknown): PolymarketOrder | undefined;
//# sourceMappingURL=polymarketRoutes.d.ts.map