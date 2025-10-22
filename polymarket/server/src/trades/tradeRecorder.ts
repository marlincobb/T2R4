import { TradeModel } from '../models/trade';
import type { PolymarketTrade } from '../services/polymarketService';
import { L } from '../logger';

export interface TradeRecordContext {
  marketId?: string | null;
  marketHash?: string | null;
  trades: PolymarketTrade[];
}

export interface TradeRecorder {
  record(context: TradeRecordContext): Promise<void>;
}

export function createTradeRecorder(): TradeRecorder {
  return {
    async record({ marketId, marketHash, trades }) {
      if (!trades.length) {
        return;
      }

      const documents = trades
        .map((trade) => toDocumentPayload(trade, marketId, marketHash))
        .filter((payload): payload is NonNullable<typeof payload> => payload !== undefined);

      if (!documents.length) {
        return;
      }

      try {
        await TradeModel.bulkWrite(
          documents.map((doc) => ({
            updateOne: {
              filter: { tradeId: doc.tradeId },
              update: { $setOnInsert: doc },
              upsert: true
            }
          })),
          { ordered: false }
        );
      } catch (error) {
        L.warn('[trade-recorder] failed to persist trades', error);
      }
    }
  };
}

function toDocumentPayload(
  trade: PolymarketTrade,
  marketId?: string | null,
  marketHash?: string | null
) {
  const tradeId = extractTradeId(trade);

  if (!tradeId) {
    return undefined;
  }

  return {
    tradeId,
    marketId: marketId ?? (typeof trade.market_id === 'string' ? trade.market_id : undefined) ?? null,
    marketHash:
      marketHash ??
      (typeof trade.market_hash === 'string' ? trade.market_hash : undefined) ??
      null,
    price: parseNullableNumber(trade.price ?? trade.avg_price ?? trade.fill_price),
    size: parseNullableNumber(trade.size ?? trade.amount ?? trade.quantity),
    outcome: extractOutcome(trade),
    side: typeof trade.side === 'string' ? trade.side.toLowerCase() : undefined,
    occurredAt: parseNullableDate(trade.created_at ?? trade.timestamp),
    raw: trade as Record<string, unknown>,
    receivedAt: new Date()
  };
}

function extractTradeId(trade: PolymarketTrade) {
  if (typeof trade.id === 'string' && trade.id.trim().length > 0) {
    return trade.id;
  }

  if (typeof trade.trade_id === 'string' && trade.trade_id.trim().length > 0) {
    return trade.trade_id;
  }

  if (typeof trade.transaction_hash === 'string' && trade.transaction_hash.trim().length > 0) {
    const suffix =
      typeof trade.log_index === 'number'
        ? `:${trade.log_index}`
        : typeof trade.logIndex === 'number'
        ? `:${trade.logIndex}`
        : '';
    return `${trade.transaction_hash}${suffix}`;
  }

  return undefined;
}

function parseNullableNumber(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function parseNullableDate(value: unknown): Date | null {
  if (value instanceof Date) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  if (typeof value === 'number') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return null;
}

function extractOutcome(trade: PolymarketTrade) {
  if (typeof trade.outcome === 'string') {
    return trade.outcome;
  }

  if (typeof trade.ticker === 'string') {
    return trade.ticker;
  }

  if (typeof trade.token_outcome === 'string') {
    return trade.token_outcome;
  }

  if (typeof trade.outcome_name === 'string') {
    return trade.outcome_name;
  }

  return undefined;
}
