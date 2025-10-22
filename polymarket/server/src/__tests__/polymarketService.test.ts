import nock from 'nock';
import {
  PolymarketApiError,
  PolymarketService
} from '../services/polymarketService';

const BASE_URL = 'https://gamma-api.polymarket.com';
const TRADES_BASE_URL = 'https://clob.polymarket.com';

describe('PolymarketService', () => {
  let service: PolymarketService;

  beforeEach(() => {
    service = new PolymarketService({
      baseURL: BASE_URL,
      tradesBaseURL: TRADES_BASE_URL,
      timeoutMs: 1000
    });
  });

  afterEach(() => {
    nock.cleanAll();
  });

  it('returns raw market data when the API responds with a markets array', async () => {
    const markets = [
      { id: '1', question: 'Will it rain tomorrow?', slug: 'rain' },
      { id: '2', question: 'Will team A win?', slug: 'team-a' }
    ];

    const scope = nock(BASE_URL).get('/markets').reply(200, { markets });

    const result = await service.getMarkets();

    expect(result).toEqual(markets);
    expect(scope.isDone()).toBe(true);
  });

  it('sends query parameters to the Polymarket API', async () => {
    const markets = [{ id: '3', question: 'Will BTC hit 100k?', slug: 'btc-100k' }];

    const scope = nock(BASE_URL)
      .get('/markets')
      .query({ limit: 5, active: true, closed: false })
      .reply(200, { data: markets });

    const result = await service.getMarkets({ limit: 5, active: true, closed: false });

    expect(result).toEqual(markets);
    expect(scope.isDone()).toBe(true);
  });

  it('throws a PolymarketApiError when the upstream API fails', async () => {
    const scope = nock(BASE_URL).get('/markets').reply(500, { message: 'Upstream failure' });

    await expect(service.getMarkets()).rejects.toBeInstanceOf(PolymarketApiError);
    expect(scope.isDone()).toBe(true);
  });

  it('attaches authentication headers when provided', async () => {
    const authService = new PolymarketService({
      baseURL: BASE_URL,
      tradesBaseURL: TRADES_BASE_URL,
      auth: {
        publicKey: 'public-example',
        secretKey: 'secret-example',
        apiKey: 'api-token',
        apiKeyHeader: 'Authorization'
      }
    });

    const scope = nock(BASE_URL, {
      reqheaders: {
        Authorization: 'api-token',
        'CF-Access-Client-Id': 'public-example',
        'CF-Access-Client-Secret': 'secret-example'
      }
    })
      .get('/markets')
      .reply(200, { markets: [] });

    const result = await authService.getMarkets();

    expect(result).toEqual([]);
    expect(scope.isDone()).toBe(true);
  });

  it('fetches trades using market hash', async () => {
    const trades = [
      { id: 't1', price: '0.45', size: '120', created_at: '2024-01-01T00:00:00Z' },
      { id: 't2', price: '0.55', size: '80', created_at: '2024-01-01T00:00:05Z' }
    ];

    const scope = nock(TRADES_BASE_URL)
      .get('/trades')
      .query({ market_hash: 'abc123', limit: 2 })
      .reply(200, { trades });

    const result = await service.getTrades({ marketHash: 'abc123', limit: 2 });

    expect(result).toEqual(trades);
    expect(scope.isDone()).toBe(true);
  });

  it('throws when neither marketId nor marketHash provided for trades', async () => {
    await expect(service.getTrades({ limit: 5 })).rejects.toThrow(
      /marketId or marketHash/i
    );
  });
});
