"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerTradeProducerStream = registerTradeProducerStream;
exports.extractTradeProducerParamsFromRequest = extractTradeProducerParamsFromRequest;
const ws_1 = __importStar(require("ws"));
const trade_1 = require("../models/trade");
const logger_1 = require("../logger");
const DEFAULT_PRODUCER_OPTIONS = {
    defaultLimit: 20,
    pollIntervalMs: 2_500
};
function registerTradeProducerStream(server, service, options = {}, recorder) {
    const config = {
        ...DEFAULT_PRODUCER_OPTIONS,
        ...options
    };
    const wss = new ws_1.WebSocketServer({
        server,
        path: '/ws/polymarket/trades'
    });
    logger_1.L.info('[trade-producer] WebSocket endpoint mounted at /ws/polymarket/trades');
    wss.on('connection', (socket, request) => {
        const initialParams = extractTradeProducerParamsFromRequest(request.url, config.defaultLimit);
        if (!initialParams) {
            logger_1.L.warn('[trade-producer] rejected connection: missing marketId or marketHash', request.url);
            socket.send(JSON.stringify({
                type: 'error',
                message: 'marketId or marketHash query param is required'
            }));
            socket.close(1008, 'Missing market identifier');
            return;
        }
        const subscription = new TradeProducerSubscription(socket, service, config, initialParams, recorder);
        socket.on('message', (raw) => {
            logger_1.L.debug('[trade-producer] incoming message', raw.toString());
            subscription.handleMessage(raw);
        });
        socket.on('close', () => subscription.dispose());
        socket.on('error', () => subscription.dispose());
    });
    return wss;
}
function extractTradeProducerParamsFromRequest(requestUrl, defaultLimit) {
    if (!requestUrl) {
        return undefined;
    }
    try {
        const url = new URL(requestUrl, 'http://localhost');
        const marketId = url.searchParams.get('marketId') ?? undefined;
        const marketHash = url.searchParams.get('marketHash') ?? undefined;
        let limit = Number.parseInt(url.searchParams.get('limit') ?? '', 10);
        if (!Number.isFinite(limit) || limit <= 0) {
            limit = defaultLimit;
        }
        if (!marketId && !marketHash) {
            return undefined;
        }
        return { marketId, marketHash, limit };
    }
    catch (error) {
        return undefined;
    }
}
class TradeProducerSubscription {
    params;
    config;
    service;
    socket;
    recorder;
    pollTimer;
    disposed = false;
    lastPayloadSignature;
    constructor(socket, service, config, params, recorder) {
        this.socket = socket;
        this.service = service;
        this.config = config;
        this.params = params;
        this.recorder = recorder;
        this.sendAck();
        logger_1.L.info('[trade-producer] client subscribed', this.params);
        void this.pollOnce();
        this.pollTimer = setInterval(() => {
            void this.pollOnce();
        }, this.config.pollIntervalMs);
    }
    handleMessage(raw) {
        if (this.disposed) {
            return;
        }
        let parsed;
        try {
            parsed = JSON.parse(raw.toString());
        }
        catch (error) {
            this.send({
                type: 'error',
                message: 'Invalid JSON payload'
            });
            return;
        }
        if (!parsed || typeof parsed !== 'object') {
            return;
        }
        const message = parsed;
        const type = typeof message.type === 'string' ? message.type : undefined;
        if (type === 'ping') {
            this.send({ type: 'pong', timestamp: Date.now() });
            return;
        }
        if (type === 'subscribe' || type === 'update') {
            const nextParams = this.mergeParams(message);
            if (!nextParams.marketId && !nextParams.marketHash) {
                this.send({
                    type: 'error',
                    message: 'Subscription requires marketId or marketHash'
                });
                return;
            }
            const hasChanged = nextParams.marketId !== this.params.marketId ||
                nextParams.marketHash !== this.params.marketHash ||
                nextParams.limit !== this.params.limit;
            this.params = nextParams;
            this.sendAck();
            if (hasChanged) {
                logger_1.L.info('[trade-producer] subscription updated', this.params);
                this.lastPayloadSignature = undefined;
                void this.pollOnce(true);
            }
        }
    }
    dispose() {
        if (this.disposed) {
            return;
        }
        this.disposed = true;
        if (this.pollTimer) {
            clearInterval(this.pollTimer);
        }
    }
    mergeParams(message) {
        const nextParams = { ...this.params };
        if (typeof message.marketId === 'string') {
            nextParams.marketId = message.marketId || undefined;
        }
        if (typeof message.marketHash === 'string') {
            nextParams.marketHash = message.marketHash || undefined;
        }
        if (typeof message.limit === 'number' && Number.isFinite(message.limit)) {
            nextParams.limit = Math.max(1, Math.floor(message.limit));
        }
        else if (typeof message.limit === 'string') {
            const parsed = Number.parseInt(message.limit, 10);
            if (Number.isFinite(parsed)) {
                nextParams.limit = Math.max(1, parsed);
            }
        }
        return nextParams;
    }
    async pollOnce(force = false) {
        if (this.disposed) {
            return;
        }
        try {
            if (force) {
                const stored = await trade_1.TradeModel.find({
                    ...(this.params.marketId ? { marketId: this.params.marketId } : {}),
                    ...(this.params.marketHash ? { marketHash: this.params.marketHash } : {})
                }, { raw: 1 })
                    .sort({ occurredAt: -1, createdAt: -1 })
                    .limit(this.params.limit)
                    .lean()
                    .exec();
                if (stored.length) {
                    const trades = stored
                        .map((doc) => (doc.raw && typeof doc.raw === 'object' ? doc.raw : undefined))
                        .filter((value) => Boolean(value))
                        .map((value) => value);
                    if (trades.length) {
                        this.dispatchTrades(trades);
                        this.lastPayloadSignature = JSON.stringify(trades.slice(0, this.params.limit));
                    }
                }
            }
            const trades = await this.service.getTrades(this.toTradesQuery());
            // Basic dedupe to avoid spamming identical payloads
            const signature = JSON.stringify(trades.slice(0, this.params.limit));
            if (!force && signature === this.lastPayloadSignature) {
                return;
            }
            this.lastPayloadSignature = signature;
            this.dispatchTrades(trades);
            logger_1.L.debug('[trade-producer] dispatched trades', trades.length, this.params.marketId ?? this.params.marketHash ?? 'unknown');
            if (this.recorder) {
                await this.recorder.record({
                    marketId: this.params.marketId ?? null,
                    marketHash: this.params.marketHash ?? null,
                    trades
                });
            }
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to fetch trades';
            logger_1.L.warn('[trade-producer] fetch error', message, this.params);
            this.send({
                type: 'error',
                message
            });
        }
    }
    sendAck() {
        this.send({
            type: 'subscribed',
            marketId: this.params.marketId ?? null,
            marketHash: this.params.marketHash ?? null,
            limit: this.params.limit,
            pollIntervalMs: this.config.pollIntervalMs
        });
    }
    toTradesQuery() {
        return {
            marketId: this.params.marketId,
            marketHash: this.params.marketHash,
            limit: this.params.limit
        };
    }
    send(payload) {
        if (this.socket.readyState === ws_1.default.OPEN) {
            this.socket.send(JSON.stringify(payload));
        }
    }
    dispatchTrades(trades) {
        this.send({
            type: 'trades',
            marketId: this.params.marketId ?? null,
            marketHash: this.params.marketHash ?? null,
            receivedAt: new Date().toISOString(),
            data: trades.slice(0, this.params.limit)
        });
    }
}
//# sourceMappingURL=tradeProducerStream.js.map