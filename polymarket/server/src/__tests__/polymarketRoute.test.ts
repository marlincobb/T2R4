import type { Request, Response } from 'express';
import {
  createPolymarketMarketsHandler,
  createTopTradeableMarketsHandler,
  createMarketTradesHandler
} from '../routes/polymarketRoutes';
import { PolymarketApiError } from '../services/polymarketService';
import type { PolymarketService } from '../services/polymarketService';

type PolymarketServiceLike = Pick<PolymarketService, 'getMarkets'>;
type PolymarketTradesServiceLike = Pick<PolymarketService, 'getTrades'>;

describe('createPolymarketMarketsHandler', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns market data from the Polymarket API', async () => {
    const markets = [
      { id: '42', question: 'Will the test pass?', slug: 'test-pass' },
      { id: '99', question: 'Will the app deploy?', slug: 'deploy' }
    ];

    const getMarkets = jest.fn().mockResolvedValue(markets);
    const service: PolymarketServiceLike = { getMarkets };
    const handler = createPolymarketMarketsHandler(service);

    const req = {
      query: {
        limit: '5',
        active: 'true',
        contractSlug: 'slug',
        collectionSlug: 'collection',
        order: 'DESC'
      }
    } as unknown as Request;
    const res = createMockResponse();

    await handler(req, res);

    expect(getMarkets).toHaveBeenCalledWith({
      limit: 5,
      active: true,
      contractSlug: 'slug',
      collectionSlug: 'collection',
      order: 'desc'
    });
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: markets
    });
  });

  it('maps PolymarketApiError to the response', async () => {
    const error = new PolymarketApiError('Service unavailable', 503);
    const getMarkets = jest.fn().mockRejectedValue(error);
    const service: PolymarketServiceLike = { getMarkets };
    const handler = createPolymarketMarketsHandler(service);

    const req = { query: {} } as unknown as Request;
    const res = createMockResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Service unavailable'
    });
  });

  it('maps unexpected errors to a 500 response', async () => {
    const getMarkets = jest.fn().mockRejectedValue(new Error('boom'));
    const service: PolymarketServiceLike = { getMarkets };
    const handler = createPolymarketMarketsHandler(service);

    const req = { query: {} } as unknown as Request;
    const res = createMockResponse();
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Failed to fetch Polymarket markets'
    });
  });
});

describe('createTopTradeableMarketsHandler', () => {
  const noopRequest = { query: {} } as unknown as Request;

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns the top markets ranked by 24h volume', async () => {
    const markets = [
      {
        id: 1,
        question: 'Market A',
        volume24hr: '1000',
        volume: '50000',
        outcomes: '["Yes","No"]',
        outcomePrices: '["0.45","0.55"]',
        closed: false,
        active: true,
        slug: 'market-a',
        category: 'Politics',
        image: 'https://example.com/a.png'
      },
      {
        id: 2,
        question: 'Market B',
        volume24hr: '2500',
        volume: '75000',
        outcomes: ['Yes', 'No'],
        outcomePrices: [0.33, 0.67],
        closed: 'false',
        active: 'true',
        slug: 'market-b',
        category: 'Economy',
        icon: 'https://example.com/b.png'
      },
      {
        id: 3,
        question: 'Market C',
        volume24hr: '0',
        volume: '1000',
        outcomes: [],
        closed: true,
        active: true
      }
    ];

    const getMarkets = jest.fn<ReturnType<PolymarketServiceLike['getMarkets']>, Parameters<PolymarketServiceLike['getMarkets']>>()
      .mockResolvedValue(markets);
    const service: PolymarketServiceLike = { getMarkets };
    const handler = createTopTradeableMarketsHandler(service);

    const res = createMockResponse();

    await handler(noopRequest, res);

    expect(getMarkets).toHaveBeenCalledWith({
      limit: 200,
      active: true,
      closed: false
    });
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: [
        expect.objectContaining({
          id: '2',
          question: 'Market B',
          volume24hr: 2500,
          outcomes: [
            { name: 'Yes', price: 0.33 },
            { name: 'No', price: 0.67 }
          ]
        }),
        expect.objectContaining({
          id: '1',
          question: 'Market A',
          volume24hr: 1000
        })
      ]
    });
  });

  it('caps the number of markets returned based on limit query param', async () => {
    const markets = Array.from({ length: 5 }, (_, index) => ({
      id: index + 1,
      question: `Market ${index + 1}`,
      volume24hr: String((index + 1) * 100),
      volume: String((index + 1) * 1000),
      outcomes: '["Yes","No"]',
      outcomePrices: '["0.5","0.5"]',
      closed: false,
      active: true
    }));

    const getMarkets = jest.fn().mockResolvedValue(markets);
    const service: PolymarketServiceLike = { getMarkets };
    const handler = createTopTradeableMarketsHandler(service);

    const req = { query: { limit: '2' } } as unknown as Request;
    const res = createMockResponse();

    await handler(req, res);

    const payload = res.json.mock.calls[0][0];
    expect(payload.data).toHaveLength(2);
    expect(payload.data[0].id).toBe('5');
    expect(payload.data[1].id).toBe('4');
  });

  it('maps upstream errors to HTTP responses', async () => {
    const error = new PolymarketApiError('Upstream failed', 502);
    const getMarkets = jest.fn().mockRejectedValue(error);
    const service: PolymarketServiceLike = { getMarkets };
    const handler = createTopTradeableMarketsHandler(service);

    const res = createMockResponse();

    await handler(noopRequest, res);

    expect(res.status).toHaveBeenCalledWith(502);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Upstream failed'
    });
  });
});

describe('createMarketTradesHandler', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('requires a market identifier', async () => {
    const getTrades = jest.fn();
    const service: PolymarketTradesServiceLike = { getTrades };
    const handler = createMarketTradesHandler(service);

    const req = { params: {}, query: {} } as unknown as Request;
    const res = createMockResponse();

    await handler(req, res);

    expect(getTrades).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'marketId or marketHash is required'
    });
  });

  it('returns normalized trade data', async () => {
    const trades = [
      {
        id: 'trade-1',
        price: '0.43',
        size: '120',
        outcome: 'YES',
        side: 'BUY',
        created_at: '2024-01-01T00:00:00Z'
      },
      {
        transaction_hash: '0xabc',
        log_index: 2,
        avg_price: 0.51,
        amount: 45,
        token_outcome: 'NO',
        direction: 'SELL'
      }
    ];

    const getTrades = jest.fn().mockResolvedValue(trades);
    const service: PolymarketTradesServiceLike = { getTrades };
    const handler = createMarketTradesHandler(service);

    const req = {
      params: { marketId: '999' },
      query: { limit: '5' }
    } as unknown as Request;
    const res = createMockResponse();

    await handler(req, res);

    expect(getTrades).toHaveBeenCalledWith({
      marketId: '999',
      marketHash: undefined,
      limit: 5
    });

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: [
        expect.objectContaining({
          id: 'trade-1',
          marketId: '999',
          price: 0.43,
          size: 120,
          outcome: 'YES',
          side: 'buy',
          occurredAt: '2024-01-01T00:00:00.000Z'
        }),
        expect.objectContaining({
          id: '0xabc:2',
          marketId: '999',
          price: 0.51,
          size: 45,
          outcome: 'NO',
          side: 'sell',
          occurredAt: null
        })
      ]
    });
  });

  it('maps PolymarketApiError to the response', async () => {
    const error = new PolymarketApiError('Trades unavailable', 429);
    const getTrades = jest.fn().mockRejectedValue(error);
    const service: PolymarketTradesServiceLike = { getTrades };
    const handler = createMarketTradesHandler(service);

    const req = {
      params: { marketId: '123' },
      query: {}
    } as unknown as Request;
    const res = createMockResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Trades unavailable'
    });
  });
});

function createMockResponse() {
  const res: Partial<Response> = {};
  const status = jest.fn().mockImplementation(() => res as Response);
  const json = jest.fn().mockImplementation(() => res as Response);

  return Object.assign(res, { status, json }) as Response & {
    status: jest.Mock;
    json: jest.Mock;
  };
}
