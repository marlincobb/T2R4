"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTradeRecorder = createTradeRecorder;
const trade_1 = require("../models/trade");
const logger_1 = require("../logger");
function createTradeRecorder() {
    return {
        async record({ marketId, marketHash, trades }) {
            if (!trades.length) {
                return;
            }
            const documents = trades
                .map((trade) => toDocumentPayload(trade, marketId, marketHash))
                .filter((payload) => payload !== undefined);
            if (!documents.length) {
                return;
            }
            try {
                await trade_1.TradeModel.bulkWrite(documents.map((doc) => ({
                    updateOne: {
                        filter: { tradeId: doc.tradeId },
                        update: { $setOnInsert: doc },
                        upsert: true
                    }
                })), { ordered: false });
            }
            catch (error) {
                logger_1.L.warn('[trade-recorder] failed to persist trades', error);
            }
        }
    };
}
function toDocumentPayload(trade, marketId, marketHash) {
    const tradeId = extractTradeId(trade);
    if (!tradeId) {
        return undefined;
    }
    return {
        tradeId,
        marketId: marketId ?? (typeof trade.market_id === 'string' ? trade.market_id : undefined) ?? null,
        marketHash: marketHash ??
            (typeof trade.market_hash === 'string' ? trade.market_hash : undefined) ??
            null,
        price: parseNullableNumber(trade.price ?? trade.avg_price ?? trade.fill_price),
        size: parseNullableNumber(trade.size ?? trade.amount ?? trade.quantity),
        outcome: extractOutcome(trade),
        side: typeof trade.side === 'string' ? trade.side.toLowerCase() : undefined,
        occurredAt: parseNullableDate(trade.created_at ?? trade.timestamp),
        raw: trade,
        receivedAt: new Date()
    };
}
function extractTradeId(trade) {
    if (typeof trade.id === 'string' && trade.id.trim().length > 0) {
        return trade.id;
    }
    if (typeof trade.trade_id === 'string' && trade.trade_id.trim().length > 0) {
        return trade.trade_id;
    }
    if (typeof trade.transaction_hash === 'string' && trade.transaction_hash.trim().length > 0) {
        const suffix = typeof trade.log_index === 'number'
            ? `:${trade.log_index}`
            : typeof trade.logIndex === 'number'
                ? `:${trade.logIndex}`
                : '';
        return `${trade.transaction_hash}${suffix}`;
    }
    return undefined;
}
function parseNullableNumber(value) {
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
function parseNullableDate(value) {
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
function extractOutcome(trade) {
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
//# sourceMappingURL=tradeRecorder.js.map