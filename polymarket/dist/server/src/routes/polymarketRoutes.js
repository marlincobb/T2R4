"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPolymarketMarketsHandler = createPolymarketMarketsHandler;
exports.createTopTradeableMarketsHandler = createTopTradeableMarketsHandler;
exports.parseLimit = parseLimit;
exports.parseBoolean = parseBoolean;
exports.parseString = parseString;
exports.parseOrder = parseOrder;
const polymarketService_1 = require("../services/polymarketService");
const logger_1 = require("../logger");
function createPolymarketMarketsHandler(service) {
    return async (req, res) => {
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
        }
        catch (error) {
            if (error instanceof polymarketService_1.PolymarketApiError) {
                return res.status(error.status ?? 502).json({
                    success: false,
                    error: error.message
                });
            }
            logger_1.L.error('Unexpected Polymarket API error', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch Polymarket markets'
            });
        }
    };
}
function createTopTradeableMarketsHandler(service, options = {}) {
    const { sampleSize = 200 } = options;
    return async (req, res) => {
        const limit = parseLimit(req.query.limit) ?? 12;
        const fetchLimit = Math.max(limit * 3, sampleSize);
        try {
            const markets = await service.getMarkets({
                limit: fetchLimit,
                active: true,
                closed: false
            });
            const ranked = markets
                .map(normalizeMarketSummary)
                .filter((market) => market.tradeable)
                .sort((a, b) => b.volume24hr - a.volume24hr || b.volumeTotal - a.volumeTotal)
                .slice(0, limit)
                .map(({ tradeable, ...rest }) => rest);
            res.json({
                success: true,
                data: ranked
            });
        }
        catch (error) {
            if (error instanceof polymarketService_1.PolymarketApiError) {
                return res.status(error.status ?? 502).json({
                    success: false,
                    error: error.message
                });
            }
            logger_1.L.error('Unexpected Polymarket API error', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch Polymarket markets'
            });
        }
    };
}
function parseLimit(raw) {
    if (typeof raw === 'string') {
        const value = Number.parseInt(raw, 10);
        if (Number.isFinite(value) && value > 0) {
            return value;
        }
    }
    return undefined;
}
function parseBoolean(raw) {
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
function parseString(raw) {
    if (typeof raw === 'string' && raw.trim().length > 0) {
        return raw.trim();
    }
    return undefined;
}
function parseOrder(raw) {
    if (typeof raw === 'string') {
        const normalized = raw.toLowerCase();
        if (normalized === 'asc' || normalized === 'desc') {
            return normalized;
        }
    }
    return undefined;
}
function normalizeMarketSummary(raw) {
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
function parseOutcomeList(raw) {
    if (Array.isArray(raw)) {
        return raw.map((item) => String(item));
    }
    if (typeof raw === 'string') {
        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                return parsed.map((item) => String(item));
            }
        }
        catch (error) {
            logger_1.L.warn('Failed to parse outcomes JSON', error);
        }
    }
    return [];
}
function parseNumberArray(raw) {
    if (Array.isArray(raw)) {
        return raw.map((value) => parseNumber(value));
    }
    if (typeof raw === 'string') {
        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                return parsed.map((value) => parseNumber(value));
            }
        }
        catch (error) {
            logger_1.L.warn('Failed to parse number array JSON', error);
        }
    }
    return [];
}
function parseNumber(raw) {
    if (typeof raw === 'number') {
        return Number.isFinite(raw) ? raw : 0;
    }
    if (typeof raw === 'string') {
        const value = Number.parseFloat(raw);
        return Number.isFinite(value) ? value : 0;
    }
    return 0;
}
function toBoolean(raw) {
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
function pickFirstString(...values) {
    for (const value of values) {
        if (typeof value === 'string' && value.trim().length > 0) {
            return value;
        }
    }
    return null;
}
//# sourceMappingURL=polymarketRoutes.js.map