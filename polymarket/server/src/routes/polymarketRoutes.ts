import type { Request, Response } from 'express';
import {
  PolymarketApiError,
  PolymarketOrder,
  PolymarketService
} from '../services/polymarketService';
import { L } from '../logger';

export function createPolymarketMarketsHandler(service: Pick<PolymarketService, 'getMarkets'>) {
  return async (req: Request, res: Response) => {
    const query = {
      limit: parseLimit(req.query.limit),
      active: parseBoolean(req.query.active),
      closed: parseBoolean(req.query.closed),
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

      L.error('Unexpected Polymarket API error', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch Polymarket markets'
      });
    }
  };
}

export function createTopTradeableMarketsHandler(
  service: Pick<PolymarketService, 'getMarkets'>,
  options: { sampleSize?: number } = {}
) {
  const { sampleSize = 200 } = options;

  return async (req: Request, res: Response) => {
    const limit = parseLimit(req.query.limit) ?? 12;
    const fetchLimit = Math.max(limit * 3, sampleSize);
    const categoryLabel = parseString(req.query.category);
    const collectionSlug = parseString(req.query.collectionSlug);

    try {
      const markets = await service.getMarkets({
        limit: fetchLimit,
        active: true,
        closed: false,
        collectionSlug
      });

      const ranked = markets
        .map(normalizeMarketSummary)
        .filter((market) => market.tradeable)
        .filter((market) => (categoryLabel ? matchesCategoryLabel(market, categoryLabel) : true))
        .sort((a, b) => b.volume24hr - a.volume24hr || b.volumeTotal - a.volumeTotal)
        .slice(0, limit)
        .map(({ tradeable, ...rest }) => rest);

      res.json({
        success: true,
        data: ranked
      });
    } catch (error) {
      if (error instanceof PolymarketApiError) {
        return res.status(error.status ?? 502).json({
          success: false,
          error: error.message
        });
      }

      L.error('Unexpected Polymarket API error', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch Polymarket markets'
      });
    }
  };
}

export function createMarketTradesHandler(service: Pick<PolymarketService, 'getTrades'>) {
  return async (req: Request, res: Response) => {
    const limit = parseLimit(req.query.limit) ?? 40;

    const marketId = parseString(req.params.marketId ?? req.query.marketId);
    const marketHash = parseString(req.query.marketHash);

    if (!marketId && !marketHash) {
      return res.status(400).json({
        success: false,
        error: 'marketId or marketHash is required'
      });
    }

    try {
      const trades = await service.getTrades({
        marketId,
        marketHash,
        limit
      });

      const normalized = trades
        .map((trade) => normalizeTradeSummary(trade as Record<string, unknown>, marketId, marketHash))
        .filter((trade): trade is NormalizedTradeSummary => trade !== undefined);

      res.json({
        success: true,
        data: normalized
      });
    } catch (error) {
      if (error instanceof PolymarketApiError) {
        return res.status(error.status ?? 502).json({
          success: false,
          error: error.message
        });
      }

      L.error('Unexpected Polymarket trades API error', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch Polymarket trades'
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

export function createPolymarketCategoriesHandler(
  service: Pick<PolymarketService, 'getMarkets'>,
  options: { sampleSize?: number } = {}
) {
  const { sampleSize = 500 } = options;

  return async (req: Request, res: Response) => {
    try {
      const markets = await service.getMarkets({
        limit: sampleSize,
        active: true,
        closed: false
      });

      const normalized = markets.map(normalizeMarketSummary);

      const categoryCount = new Map<string, number>();
      for (const m of normalized) {
        const key = (m.category ?? '').trim();
        if (!key) continue;
        categoryCount.set(key, (categoryCount.get(key) ?? 0) + 1);
      }

      const categories = Array.from(categoryCount.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => ({ name, count }));

      res.json({ success: true, data: { categories } });
    } catch (error) {
      if (error instanceof PolymarketApiError) {
        return res.status(error.status ?? 502).json({ success: false, error: error.message });
      }
      L.error('Unexpected Polymarket categories error', error);
      res.status(500).json({ success: false, error: 'Failed to fetch Polymarket categories' });
    }
  };
}

interface NormalizedMarketSummary {
  id: string;
  question: string;
  slug?: string;
  category?: string | null;
  image?: string | null;
  icon?: string | null;
  endDate?: string | null;
  volume24hr: number;
  volumeTotal: number;
  outcomes: Array<{ name: string; price?: number | null }>;
  tradeable: boolean;
}

interface NormalizedTradeSummary {
  id: string;
  marketId?: string | null;
  marketHash?: string | null;
  price: number | null;
  size: number | null;
  outcome?: string;
  side?: string | null;
  occurredAt: string | null;
}

function normalizeMarketSummary(raw: Record<string, unknown>): NormalizedMarketSummary {
  const closed = toBoolean(raw.closed);
  const active = toBoolean(raw.active);

  const outcomes = parseOutcomeList(raw.outcomes);
  const prices = parseNumberArray(raw.outcomePrices);

  const pairedOutcomes = outcomes.map((name, index) => ({
    name,
    price: prices[index] ?? null
  }));

  return {
    id: String(raw.id ?? ''),
    question: typeof raw.question === 'string' ? raw.question : '',
    slug: typeof raw.slug === 'string' ? raw.slug : undefined,
    category: typeof raw.category === 'string' ? raw.category : null,
    image: pickFirstString(raw.image, raw.twitterCardImage),
    icon: pickFirstString(raw.icon, raw.image),
    endDate: typeof raw.endDate === 'string' ? raw.endDate : null,
    volume24hr: parseNumber(raw.volume24hr ?? raw.volume24Hour ?? raw.volume24Hr),
    volumeTotal: parseNumber(raw.volume ?? raw.volumeNum),
    outcomes: pairedOutcomes,
    tradeable: !closed && active && pairedOutcomes.length > 0
  };
}

function matchesCategoryLabel(market: NormalizedMarketSummary, label: string): boolean {
  const normalizedLabel = label.trim().toLowerCase();
  if (!normalizedLabel) return true;

  const category = (market.category ?? '').toLowerCase();
  const text = `${category} ${market.question.toLowerCase()}`;

  // Heuristic mapping for friendly labels
  if (normalizedLabel === 'geopolitical') {
    return category.includes('polit') || text.includes('war') || text.includes('conflict');
  }
  if (normalizedLabel === 'financial') {
    return category.includes('finance') || text.includes('stock') || text.includes('rate');
  }
  if (normalizedLabel === 'economics') {
    return category.includes('econom') || text.includes('inflation') || text.includes('gdp');
  }
  if (normalizedLabel === 'crypto') {
    return category.includes('crypto') || text.includes('bitcoin') || text.includes('ethereum');
  }
  if (normalizedLabel === 'elections') {
    return category.includes('polit') || text.includes('election') || text.includes('vote');
  }

  // Fallback: direct match on category text
  return category.includes(normalizedLabel);
}

function parseOutcomeList(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((item) => String(item));
  }

  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item));
      }
    } catch (error) {
      L.warn('Failed to parse outcomes JSON', error);
    }
  }

  return [];
}

function parseNumberArray(raw: unknown): number[] {
  if (Array.isArray(raw)) {
    return raw.map((value) => parseNumber(value));
  }

  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((value) => parseNumber(value));
      }
    } catch (error) {
      L.warn('Failed to parse number array JSON', error);
    }
  }

  return [];
}

function normalizeTradeSummary(
  raw: Record<string, unknown>,
  fallbackMarketId?: string,
  fallbackMarketHash?: string
): NormalizedTradeSummary | undefined {
  const id = extractTradeId(raw);
  if (!id) {
    return undefined;
  }

  const price = parseNullableNumber(raw.price ?? raw.avg_price ?? raw.fill_price);
  const size = parseNullableNumber(raw.size ?? raw.amount ?? raw.quantity);
  const occurredAt = parseNullableDate(raw.created_at ?? raw.timestamp ?? raw.time);

  return {
    id,
    marketId: pickPreferredString(raw.market_id, raw.marketId, fallbackMarketId),
    marketHash: pickPreferredString(raw.market_hash, raw.marketHash, fallbackMarketHash),
    price,
    size,
    outcome: extractOutcome(raw),
    side: extractSide(raw),
    occurredAt
  };
}

function extractTradeId(raw: Record<string, unknown>) {
  if (isNonEmptyString(raw.id)) {
    return raw.id.trim();
  }

  if (isNonEmptyString(raw.trade_id)) {
    return raw.trade_id.trim();
  }

  if (isNonEmptyString(raw.transaction_hash)) {
    const base = raw.transaction_hash.trim();
    const index = typeof raw.log_index === 'number' ? raw.log_index : typeof raw.logIndex === 'number' ? raw.logIndex : undefined;
    return index !== undefined ? `${base}:${index}` : base;
  }

  return undefined;
}

function parseNullableNumber(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function parseNullableDate(value: unknown): string | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }

  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }

  if (typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }

  return null;
}

function extractOutcome(raw: Record<string, unknown>) {
  const candidates = [raw.outcome, raw.ticker, raw.token_outcome, raw.outcome_name];
  for (const candidate of candidates) {
    if (isNonEmptyString(candidate)) {
      return candidate.trim();
    }
  }
  return undefined;
}

function extractSide(raw: Record<string, unknown>) {
  const side = raw.side ?? raw.direction;
  if (isNonEmptyString(side)) {
    return side.trim().toLowerCase();
  }
  return undefined;
}

function pickPreferredString(...values: Array<unknown | undefined>) {
  for (const value of values) {
    if (isNonEmptyString(value)) {
      return value.trim();
    }
  }
  return undefined;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function parseNumber(raw: unknown): number {
  if (typeof raw === 'number') {
    return Number.isFinite(raw) ? raw : 0;
  }

  if (typeof raw === 'string') {
    const value = Number.parseFloat(raw);
    return Number.isFinite(value) ? value : 0;
  }

  return 0;
}

function toBoolean(raw: unknown): boolean {
  if (typeof raw === 'boolean') {
    return raw;
  }

  if (typeof raw === 'string') {
    const value = raw.toLowerCase();
    if (value === 'true') {
      return true;
    }
    if (value === 'false') {
      return false;
    }
  }

  return false;
}

function pickFirstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
  }
  return null;
}
