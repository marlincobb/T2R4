import type { Request, Response } from 'express';
import {
  PolymarketApiError,
  PolymarketOrder,
  PolymarketService
} from '../services/polymarketService';

export function createPolymarketMarketsHandler(service: Pick<PolymarketService, 'getMarkets'>) {
  return async (req: Request, res: Response) => {
    const query = {
      limit: parseLimit(req.query.limit),
      active: parseBoolean(req.query.active),
      contractSlug: parseString(req.query.contractSlug),
      collectionSlug: parseString(req.query.collectionSlug),
      order: parseOrder(req.query.order)
    };

    try {
      const markets = await service.getMarkets(query);

      res.json({
        success: true,
        data: markets
      });
    } catch (error) {
      if (error instanceof PolymarketApiError) {
        return res.status(error.status ?? 502).json({
          success: false,
          error: error.message
        });
      }

      console.error('Unexpected Polymarket API error', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch Polymarket markets'
      });
    }
  };
}

export function parseLimit(raw: unknown): number | undefined {
  if (typeof raw === 'string') {
    const value = Number.parseInt(raw, 10);
    if (Number.isFinite(value) && value > 0) {
      return value;
    }
  }

  return undefined;
}

export function parseBoolean(raw: unknown): boolean | undefined {
  if (typeof raw === 'string') {
    if (raw.toLowerCase() === 'true') {
      return true;
    }
    if (raw.toLowerCase() === 'false') {
      return false;
    }
  }

  return undefined;
}

export function parseString(raw: unknown): string | undefined {
  if (typeof raw === 'string' && raw.trim().length > 0) {
    return raw.trim();
  }

  return undefined;
}

export function parseOrder(raw: unknown): PolymarketOrder | undefined {
  if (typeof raw === 'string') {
    const normalized = raw.toLowerCase();
    if (normalized === 'asc' || normalized === 'desc') {
      return normalized;
    }
  }

  return undefined;
}
