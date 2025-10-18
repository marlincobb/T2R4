import type { Request, Response } from 'express';
import { createPolymarketMarketsHandler } from '../routes/polymarketRoutes';
import { PolymarketApiError } from '../services/polymarketService';
import type { PolymarketService } from '../services/polymarketService';

type PolymarketServiceLike = Pick<PolymarketService, 'getMarkets'>;

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

function createMockResponse() {
  const res: Partial<Response> = {};
  const status = jest.fn().mockImplementation(() => res as Response);
  const json = jest.fn().mockImplementation(() => res as Response);

  return Object.assign(res, { status, json }) as Response & {
    status: jest.Mock;
    json: jest.Mock;
  };
}
