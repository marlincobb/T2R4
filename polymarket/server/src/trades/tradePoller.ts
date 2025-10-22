import { setInterval as createInterval, clearInterval } from 'timers';
import type {
  PolymarketService,
  PolymarketTrade
} from '../services/polymarketService';
import type { TradeRecorder } from './tradeRecorder';
import { L } from '../logger';

export interface TradePollerConfig {
  pollIntervalMs: number;
  limit: number;
}

export const DEFAULT_TRADE_POLLER_CONFIG: TradePollerConfig = {
  pollIntervalMs: 5_000,
  limit: 50
};

export class TradePoller {
  private timer?: NodeJS.Timer;

  constructor(
    private readonly service: Pick<PolymarketService, 'getTrades'>,
    private readonly recorder: TradeRecorder,
    private readonly market: { marketId?: string; marketHash?: string },
    private readonly config: TradePollerConfig = DEFAULT_TRADE_POLLER_CONFIG
  ) {}

  start() {
    if (this.timer) {
      return;
    }

    void this.poll(true);
    this.timer = createInterval(() => {
      void this.poll(false);
    }, this.config.pollIntervalMs);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  private async poll(initial: boolean) {
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

      L.debug(
        '[trade-poller] fetched trades',
        trades.length,
        this.market.marketId ?? this.market.marketHash ?? 'unknown',
        { initial }
      );
    } catch (error) {
      L.warn(
        '[trade-poller] failed to fetch trades',
        this.market.marketId ?? this.market.marketHash,
        error instanceof Error ? error.message : error
      );
    }
  }
}
