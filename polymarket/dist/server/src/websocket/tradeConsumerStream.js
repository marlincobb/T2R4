"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolymarketTradeConsumerStream = exports.DEFAULT_CONSUMER_STREAM_CONFIG = void 0;
const ws_1 = __importDefault(require("ws"));
const fme_logger_1 = require("fme-logger");
const L = new fme_logger_1.Log("PolyConsumerWS");
exports.DEFAULT_CONSUMER_STREAM_CONFIG = {
    url: 'wss://ws-subscriptions-clob.polymarket.com',
    reconnectDelayMs: 5_000,
    heartbeatIntervalMs: 25_000,
    channel: 'market',
    protocols: ['json']
};
class PolymarketTradeConsumerStream {
    recorder;
    connection;
    reconnectTimer;
    heartbeatTimer;
    markets = [];
    started = false;
    config;
    constructor(recorder, config = exports.DEFAULT_CONSUMER_STREAM_CONFIG) {
        this.recorder = recorder;
        this.config = {
            ...exports.DEFAULT_CONSUMER_STREAM_CONFIG,
            ...config,
            protocols: config.protocols && config.protocols.length > 0
                ? config.protocols
                : exports.DEFAULT_CONSUMER_STREAM_CONFIG.protocols
        };
    }
    start() {
        if (this.started) {
            return;
        }
        this.started = true;
        this.connect();
    }
    stop() {
        this.started = false;
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
        }
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
        }
        if (this.connection) {
            this.connection.close();
        }
    }
    setMarkets(markets) {
        this.markets = markets.filter((market) => market.assetId || market.marketHash || market.marketId);
        if (this.connection && this.connection.readyState === ws_1.default.OPEN) {
            this.sendSubscription();
        }
    }
    connect() {
        if (!this.started) {
            return;
        }
        const endpoint = this.buildEndpointUrl();
        L.info('[trade-consumer] connecting to', endpoint);
        const options = {};
        if (this.config.headers) {
            options.headers = this.config.headers;
        }
        if (this.config.origin) {
            options.origin = this.config.origin;
        }
        const protocols = this.config.protocols && this.config.protocols.length > 0
            ? this.config.protocols
            : undefined;
        const ws = new ws_1.default(endpoint, protocols, options);
        this.connection = ws;
        ws.once('open', () => {
            L.info('[trade-consumer] connected');
            this.sendSubscription();
            this.startHeartbeat();
        });
        ws.on('message', (data) => {
            this.handleMessage(data);
        });
        ws.on('error', (error) => {
            L.warn('[trade-consumer] error', error);
        });
        ws.on('close', (code, reason) => {
            L.warn('[trade-consumer] disconnected', code, reason.toString());
            this.stopHeartbeat();
            this.scheduleReconnect();
        });
    }
    sendSubscription() {
        const ws = this.connection;
        if (!ws || ws.readyState !== ws_1.default.OPEN) {
            return;
        }
        const channel = this.config.channel ?? 'market';
        const payload = { type: channel };
        if (channel === 'market') {
            const assetIds = this.getAssetIds();
            if (!assetIds.length) {
                L.warn('[trade-consumer] no asset identifiers available for subscription');
                return;
            }
            payload.assets_ids = assetIds;
        }
        else if (channel === 'user') {
            const marketIds = this.markets
                .map((market) => market.marketId ?? market.marketHash ?? undefined)
                .filter((value) => typeof value === 'string' && value.length > 0);
            if (!marketIds.length) {
                L.warn('[trade-consumer] no market identifiers available for user channel');
                return;
            }
            payload.markets = marketIds;
        }
        if (this.config.auth) {
            payload.auth = this.config.auth;
        }
        L.info('[trade-consumer] subscribing', payload);
        this.sendRaw(payload);
    }
    handleMessage(raw) {
        if (typeof raw === 'string') {
            if (raw === 'PING') {
                this.sendRaw('PONG');
                return;
            }
            if (raw === 'PONG') {
                return;
            }
        }
        let payload;
        try {
            const text = typeof raw === 'string'
                ? raw
                : Buffer.isBuffer(raw)
                    ? raw.toString('utf-8')
                    : Array.isArray(raw)
                        ? Buffer.concat(raw).toString('utf-8')
                        : raw instanceof ArrayBuffer
                            ? Buffer.from(raw).toString('utf-8')
                            : undefined;
            if (!text) {
                return;
            }
            payload = JSON.parse(text);
        }
        catch (error) {
            L.warn('[trade-consumer] failed to parse message', error);
            return;
        }
        if (!payload || typeof payload !== 'object') {
            return;
        }
        const type = typeof payload.type === 'string' ? payload.type.toLowerCase() : undefined;
        if (type === 'ping') {
            this.sendRaw({ type: 'pong' });
            return;
        }
        if (type === 'subscribed' || type === 'subscription_succeeded') {
            L.debug('[trade-consumer] subscription acknowledged', payload);
            return;
        }
        const trades = Array.isArray(payload.data?.trades)
            ? payload.data.trades
            : Array.isArray(payload.data)
                ? payload.data
                : Array.isArray(payload.trades)
                    ? payload.trades
                    : [];
        if (!trades.length) {
            return;
        }
        const marketId = payload.marketId ??
            payload.market_id ??
            payload.market ??
            payload.data?.marketId ??
            payload.data?.market_id ??
            null;
        const marketHash = payload.marketHash ??
            payload.market_hash ??
            payload.assetId ??
            payload.asset_id ??
            payload.data?.marketHash ??
            payload.data?.market_hash ??
            null;
        L.debug('[trade-consumer] received trades', trades.length, marketId ?? marketHash ?? 'unknown');
        this.recorder
            .record({
            marketId,
            marketHash,
            trades
        })
            .catch((error) => L.warn('[trade-consumer] failed to persist trades', error));
    }
    startHeartbeat() {
        this.stopHeartbeat();
        this.heartbeatTimer = setInterval(() => {
            this.sendRaw('PING');
        }, this.config.heartbeatIntervalMs);
    }
    stopHeartbeat() {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = undefined;
        }
    }
    scheduleReconnect() {
        if (!this.started) {
            return;
        }
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
        }
        this.reconnectTimer = setTimeout(() => {
            this.connect();
        }, this.config.reconnectDelayMs);
    }
    getAssetIds() {
        return this.markets
            .map((market) => market.assetId ?? market.marketHash ?? market.marketId ?? undefined)
            .filter((value) => typeof value === 'string' && value.length > 0);
    }
    buildEndpointUrl() {
        const base = this.config.url.replace(/\/+$/, '');
        const channel = this.config.channel ?? 'market';
        return `${base}/ws/${channel}`;
    }
    sendRaw(payload) {
        if (!this.connection || this.connection.readyState !== ws_1.default.OPEN) {
            return;
        }
        const message = typeof payload === 'string' ? payload : JSON.stringify(payload);
        this.connection.send(message);
    }
}
exports.PolymarketTradeConsumerStream = PolymarketTradeConsumerStream;
//# sourceMappingURL=tradeConsumerStream.js.map