"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.httpServer = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const dotenv_1 = __importDefault(require("dotenv"));
const mongoose_1 = __importDefault(require("mongoose"));
const http_1 = __importDefault(require("http"));
const polymarketService_1 = require("./services/polymarketService");
const polymarketRoutes_1 = require("./routes/polymarketRoutes");
const tradeProducerStream_1 = require("./websocket/tradeProducerStream");
const tradeRecorder_1 = require("./trades/tradeRecorder");
const tradeConsumerStream_1 = require("./websocket/tradeConsumerStream");
const logger_1 = require("./logger");
dotenv_1.default.config();
const app = (0, express_1.default)();
const httpServer = http_1.default.createServer(app);
exports.httpServer = httpServer;
const PORT = process.env.PORT || 3001;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/t2r4';
const POLYMARKET_API_BASE = process.env.POLYMARKET_API_BASE || 'https://gamma-api.polymarket.com';
const polymarketAuthConfig = resolvePolymarketAuthConfig();
const polymarketService = new polymarketService_1.PolymarketService({
    baseURL: POLYMARKET_API_BASE,
    auth: polymarketAuthConfig
});
const tradeRecorder = (0, tradeRecorder_1.createTradeRecorder)();
(0, tradeProducerStream_1.registerTradeProducerStream)(httpServer, polymarketService, {}, tradeRecorder);
const tradeConsumerStream = new tradeConsumerStream_1.PolymarketTradeConsumerStream(tradeRecorder, {
    url: process.env.POLYMARKET_WS_URL || tradeConsumerStream_1.DEFAULT_CONSUMER_STREAM_CONFIG.url,
    reconnectDelayMs: Number.parseInt(process.env.POLYMARKET_WS_RECONNECT_MS ?? '', 10) ||
        tradeConsumerStream_1.DEFAULT_CONSUMER_STREAM_CONFIG.reconnectDelayMs,
    heartbeatIntervalMs: Number.parseInt(process.env.POLYMARKET_WS_HEARTBEAT_MS ?? '', 10) ||
        tradeConsumerStream_1.DEFAULT_CONSUMER_STREAM_CONFIG.heartbeatIntervalMs,
    channel: resolveWebsocketChannel(),
    auth: buildWebsocketAuth(),
    headers: buildWebsocketHeaders(polymarketAuthConfig),
    origin: process.env.POLYMARKET_WS_ORIGIN,
    protocols: parseProtocols(process.env.POLYMARKET_WS_PROTOCOLS)
});
const bootstrapMarkets = parseBootstrapMarkets(process.env.POLYMARKET_BOOTSTRAP_MARKETS ?? '');
// Connect to MongoDB unless explicitly skipped (e.g., during tests)
if (process.env.NODE_ENV !== 'test') {
    mongoose_1.default.connect(MONGODB_URI)
        .then(() => {
        logger_1.L.info('✅ Connected to MongoDB');
    })
        .catch((error) => {
        logger_1.L.error('❌ MongoDB connection error:', error);
    });
}
// Middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// MongoDB Schemas
const marketDataSchema = new mongoose_1.default.Schema({
    symbol: { type: String, required: true },
    price: { type: Number, required: true },
    volume: { type: Number, required: true },
    timestamp: { type: Date, default: Date.now }
});
const MarketData = mongoose_1.default.model('MarketData', marketDataSchema);
// Routes
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'T2R4 Server is running',
        database: mongoose_1.default.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
});
app.get('/api/', (req, res) => {
    res.json({
        message: 'Welcome to T2R4 API',
        tech: ['Node.js', 'Express', 'MongoDB', 'TypeScript'],
        version: '1.0.0'
    });
});
// Market Data endpoints
app.get('/api/market', async (req, res) => {
    try {
        const marketData = await MarketData.find().sort({ timestamp: -1 }).limit(100);
        res.json({ success: true, data: marketData });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch market data' });
    }
});
app.post('/api/market', async (req, res) => {
    try {
        const { symbol, price, volume } = req.body;
        if (!symbol || !price || !volume) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: symbol, price, volume'
            });
        }
        const marketData = new MarketData({ symbol, price, volume });
        const saved = await marketData.save();
        res.status(201).json({ success: true, data: saved });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Failed to save market data' });
    }
});
app.get('/api/polymarket/markets', (0, polymarketRoutes_1.createPolymarketMarketsHandler)(polymarketService));
app.get('/api/polymarket/top-markets', (0, polymarketRoutes_1.createTopTradeableMarketsHandler)(polymarketService));
if (process.env.NODE_ENV !== 'test') {
    httpServer.listen(PORT, async () => {
        logger_1.L.info(`🚀 T2R4 Server running on port ${PORT}`);
        logger_1.L.info(`📊 Tech Stack: Node.js + Express + MongoDB`);
        await initializeTradeStreams();
    });
    const shutdown = () => {
        tradeConsumerStream.stop();
        httpServer.close(() => {
            process.exit(0);
        });
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
}
exports.default = app;
function resolvePolymarketAuthConfig() {
    const apiKey = getEnvValue([
        'POLYMARKET_API_KEY',
        'POLYMARKET_KEY',
        'POLYMARKET_DATA_API_KEY'
    ]);
    const publicKey = getEnvValue([
        'POLYMARKET_PUBLIC_KEY',
        'POLYMARKET_API_PUBLIC_KEY',
        'POLYMARKET_CF_ACCESS_CLIENT_ID',
        'CF_ACCESS_CLIENT_ID'
    ]);
    const secretKey = getEnvValue([
        'POLYMARKET_SECRET_KEY',
        'POLYMARKET_API_SECRET_KEY',
        'POLYMARKET_CF_ACCESS_CLIENT_SECRET',
        'CF_ACCESS_CLIENT_SECRET'
    ]);
    const apiKeyHeader = getEnvValue([
        'POLYMARKET_API_KEY_HEADER',
        'POLYMARKET_KEY_HEADER',
        'POLYMARKET_DATA_API_KEY_HEADER'
    ]);
    const publicHeader = getEnvValue([
        'POLYMARKET_PUBLIC_KEY_HEADER',
        'POLYMARKET_CF_ACCESS_CLIENT_ID_HEADER',
        'CF_ACCESS_CLIENT_ID_HEADER'
    ]);
    const secretHeader = getEnvValue([
        'POLYMARKET_SECRET_KEY_HEADER',
        'POLYMARKET_CF_ACCESS_CLIENT_SECRET_HEADER',
        'CF_ACCESS_CLIENT_SECRET_HEADER'
    ]);
    const authConfig = {};
    if (apiKey) {
        authConfig.apiKey = apiKey;
        if (apiKeyHeader) {
            authConfig.apiKeyHeader = apiKeyHeader;
        }
    }
    if (publicKey && secretKey) {
        authConfig.publicKey = publicKey;
        authConfig.secretKey = secretKey;
        if (publicHeader) {
            authConfig.publicHeader = publicHeader;
        }
        if (secretHeader) {
            authConfig.secretHeader = secretHeader;
        }
    }
    return Object.keys(authConfig).length > 0 ? authConfig : undefined;
}
function getEnvValue(keys) {
    for (const key of keys) {
        const value = process.env[key];
        if (typeof value === 'string' && value.trim().length > 0) {
            return value.trim();
        }
    }
    return undefined;
}
function parseBootstrapMarkets(input) {
    return input
        .split(',')
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0)
        .map((entry) => {
        const [type, value] = entry.includes(':') ? entry.split(':', 2) : ['id', entry];
        if (type === 'hash') {
            return { marketHash: value, assetId: value };
        }
        if (type === 'asset') {
            return { assetId: value, marketHash: value };
        }
        return { marketId: value };
    });
}
async function initializeTradeStreams() {
    let markets = bootstrapMarkets;
    if (!markets.length) {
        const autoCount = Number.parseInt(process.env.POLYMARKET_AUTO_TOP_MARKETS ?? '', 10) || 5;
        try {
            const topMarkets = await polymarketService.getMarkets({
                limit: autoCount,
                active: true,
                closed: false
            });
            markets = topMarkets
                .map((market) => {
                const marketId = typeof market.id === 'string' ? market.id : undefined;
                const marketHash = extractMarketHash(market);
                const assetId = marketHash;
                return marketId || marketHash
                    ? { marketId, marketHash, assetId }
                    : undefined;
            })
                .filter((entry) => Boolean(entry));
            logger_1.L.info('[trade-poller] auto-selected markets from Polymarket', markets.map((m) => m.marketId ?? m.marketHash));
        }
        catch (error) {
            logger_1.L.warn('[trade-poller] failed to auto-select markets', error instanceof Error ? error.message : error);
        }
    }
    const seen = new Set();
    markets
        .filter((market) => {
        const key = market.assetId ?? market.marketId ?? market.marketHash;
        if (!key) {
            return false;
        }
        if (seen.has(key)) {
            return false;
        }
        seen.add(key);
        return true;
    })
        .forEach((market) => {
        logger_1.L.info('[trade-consumer] tracking market', market.marketId ?? market.marketHash ?? market.assetId ?? 'unknown');
    });
    tradeConsumerStream.setMarkets(markets);
    tradeConsumerStream.start();
}
function extractMarketHash(market) {
    if (typeof market.marketHash === 'string') {
        return market.marketHash;
    }
    if (Array.isArray(market.clobTokenIds) && market.clobTokenIds.length > 0) {
        return String(market.clobTokenIds[0]);
    }
    if (typeof market.market_hash === 'string') {
        return market.market_hash;
    }
    return undefined;
}
function resolveWebsocketChannel() {
    const raw = (process.env.POLYMARKET_WS_CHANNEL ?? '').trim().toLowerCase();
    return raw === 'user' ? 'user' : 'market';
}
function buildWebsocketAuth() {
    const apiKey = (process.env.POLYMARKET_WS_API_KEY ?? '').trim();
    const secret = (process.env.POLYMARKET_WS_API_SECRET ?? '').trim();
    const passphrase = (process.env.POLYMARKET_WS_API_PASSPHRASE ?? '').trim();
    if (!apiKey || !secret || !passphrase) {
        return undefined;
    }
    return {
        apiKey,
        secret,
        passphrase
    };
}
function buildWebsocketHeaders(auth) {
    const headers = {};
    if (!auth) {
        return headers;
    }
    if (auth.apiKey) {
        headers[(auth.apiKeyHeader ?? 'X-API-Key').trim()] = auth.apiKey;
    }
    if (auth.publicKey && auth.secretKey) {
        headers[(auth.publicHeader ?? 'CF-Access-Client-Id').trim()] = auth.publicKey;
        headers[(auth.secretHeader ?? 'CF-Access-Client-Secret').trim()] = auth.secretKey;
    }
    return headers;
}
function parseProtocols(raw) {
    if (!raw) {
        return undefined;
    }
    const protocols = raw
        .split(',')
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);
    return protocols.length ? protocols : undefined;
}
//# sourceMappingURL=index.js.map