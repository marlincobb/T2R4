"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolymarketService = exports.PolymarketApiError = void 0;
const axios_1 = __importDefault(require("axios"));
class PolymarketApiError extends Error {
    status;
    constructor(message, status, cause) {
        super(message);
        this.name = 'PolymarketApiError';
        this.status = status;
        if (cause && typeof cause === 'object') {
            // Preserve original stack when possible to simplify debugging.
            Object.defineProperty(this, 'cause', {
                value: cause,
                enumerable: false,
                configurable: true
            });
        }
    }
}
exports.PolymarketApiError = PolymarketApiError;
class PolymarketService {
    client;
    tradesClient;
    constructor({ baseURL, timeoutMs = 10_000, auth, tradesBaseURL = 'https://clob.polymarket.com' }) {
        if (!baseURL) {
            throw new Error('PolymarketService requires a baseURL');
        }
        this.client = axios_1.default.create({
            baseURL,
            timeout: timeoutMs,
            headers: this.buildDefaultHeaders(auth)
        });
        this.tradesClient = axios_1.default.create({
            baseURL: tradesBaseURL,
            timeout: timeoutMs,
            headers: this.buildDefaultHeaders(auth)
        });
    }
    async getMarkets(query = {}) {
        try {
            const response = await this.client.get('/markets', {
                params: this.serializeQuery(query)
            });
            return this.normalizeMarkets(response.data);
        }
        catch (error) {
            if (axios_1.default.isAxiosError(error)) {
                throw this.toPolymarketError(error);
            }
            throw error;
        }
    }
    async getTrades(query) {
        const params = this.serializeTradesQuery(query);
        if (!params.market_id && !params.market_hash) {
            throw new Error('PolymarketService.getTrades requires marketId or marketHash');
        }
        try {
            const response = await this.tradesClient.get('/trades', { params });
            return this.normalizeTrades(response.data);
        }
        catch (error) {
            if (axios_1.default.isAxiosError(error)) {
                throw this.toPolymarketError(error);
            }
            throw error;
        }
    }
    buildDefaultHeaders(auth) {
        const headers = {
            Accept: 'application/json'
        };
        if (auth?.apiKey) {
            const headerName = (auth.apiKeyHeader ?? 'X-API-Key').trim();
            headers[headerName] = auth.apiKey;
        }
        if (auth?.publicKey && auth?.secretKey) {
            const publicHeader = (auth.publicHeader ?? 'CF-Access-Client-Id').trim();
            const secretHeader = (auth.secretHeader ?? 'CF-Access-Client-Secret').trim();
            headers[publicHeader] = auth.publicKey;
            headers[secretHeader] = auth.secretKey;
        }
        return headers;
    }
    serializeQuery(query) {
        const params = {};
        if (typeof query.limit === 'number' && Number.isFinite(query.limit)) {
            params.limit = query.limit;
        }
        if (typeof query.active === 'boolean') {
            params.active = query.active;
        }
        if (typeof query.closed === 'boolean') {
            params.closed = query.closed;
        }
        if (typeof query.contractSlug === 'string' && query.contractSlug.length > 0) {
            params.contractSlug = query.contractSlug;
        }
        if (typeof query.collectionSlug === 'string' && query.collectionSlug.length > 0) {
            params.collectionSlug = query.collectionSlug;
        }
        if (typeof query.order === 'string' && query.order.length > 0) {
            params.order = query.order;
        }
        return params;
    }
    serializeTradesQuery(query) {
        const params = {};
        if (query.marketId) {
            params.market_id = query.marketId;
        }
        if (query.marketHash) {
            params.market_hash = query.marketHash;
        }
        if (typeof query.limit === 'number' && Number.isFinite(query.limit) && query.limit > 0) {
            params.limit = query.limit;
        }
        if (query.before) {
            params.before = query.before;
        }
        if (query.after) {
            params.after = query.after;
        }
        return params;
    }
    normalizeMarkets(payload) {
        if (Array.isArray(payload)) {
            return payload;
        }
        if (payload && typeof payload === 'object') {
            const container = payload;
            if (Array.isArray(container.markets)) {
                return container.markets;
            }
            if (Array.isArray(container.data)) {
                return container.data;
            }
        }
        throw new PolymarketApiError('Unexpected Polymarket API response shape');
    }
    toPolymarketError(error) {
        const status = error.response?.status;
        const responseMessage = typeof error.response?.data === 'object' && error.response?.data !== null
            ? (error.response?.data).message
            : undefined;
        const message = responseMessage ??
            error.message ??
            'Failed to fetch market data from the Polymarket API';
        return new PolymarketApiError(message, status, error);
    }
    normalizeTrades(payload) {
        if (Array.isArray(payload)) {
            return payload;
        }
        if (payload && typeof payload === 'object') {
            const container = payload;
            if (Array.isArray(container.data)) {
                return container.data;
            }
            if (Array.isArray(container.results)) {
                return container.results;
            }
            if (Array.isArray(container.trades)) {
                return container.trades;
            }
        }
        throw new PolymarketApiError('Unexpected Polymarket Trades response shape');
    }
}
exports.PolymarketService = PolymarketService;
//# sourceMappingURL=polymarketService.js.map