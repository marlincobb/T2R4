import nock from 'nock';
import {
  PolymarketApiError,
  PolymarketService
} from '../services/polymarketService';

const BASE_URL = 'https://gamma-api.polymarket.com';

describe('PolymarketService', () => {
  let service: PolymarketService;

  beforeEach(() => {
    service = new PolymarketService({ baseURL: BASE_URL, timeoutMs: 1000 });
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
      .query({ limit: 5, active: true })
      .reply(200, { data: markets });

    const result = await service.getMarkets({ limit: 5, active: true });

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
});
