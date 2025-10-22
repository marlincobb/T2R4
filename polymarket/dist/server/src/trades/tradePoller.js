"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TradePoller = exports.DEFAULT_TRADE_POLLER_CONFIG = void 0;
const timers_1 = require("timers");
const logger_1 = require("../logger");
exports.DEFAULT_TRADE_POLLER_CONFIG = {
    pollIntervalMs: 5_000,
    limit: 50
};
class TradePoller {
    service;
    recorder;
    market;
    config;
    timer;
    constructor(service, recorder, market, config = exports.DEFAULT_TRADE_POLLER_CONFIG) {
        this.service = service;
        this.recorder = recorder;
        this.market = market;
        this.config = config;
    }
    start() {
        if (this.timer) {
            return;
        }
        void this.poll(true);
        this.timer = (0, timers_1.setInterval)(() => {
            void this.poll(false);
        }, this.config.pollIntervalMs);
    }
    stop() {
        if (this.timer) {
            (0, timers_1.clearInterval)(this.timer);
            this.timer = undefined;
        }
    }
    async poll(initial) {
        try {
            const trades = await this.service.getTrades({
                marketId: this.market.marketId,
                marketHash: this.market.marketHash,
                limit: this.config.limit
            });
            await this.recorder.record({
                marketId: this.market.marketId,
                marketHash: this.market.marketHash,
                trades
            });
            logger_1.L.debug('[trade-poller] fetched trades', trades.length, this.market.marketId ?? this.market.marketHash ?? 'unknown', { initial });
        }
        catch (error) {
            logger_1.L.warn('[trade-poller] failed to fetch trades', this.market.marketId ?? this.market.marketHash, error instanceof Error ? error.message : error);
        }
    }
}
exports.TradePoller = TradePoller;
//# sourceMappingURL=tradePoller.js.map