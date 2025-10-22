import axios, { AxiosError, AxiosInstance } from 'axios';

export type PolymarketOrder = 'asc' | 'desc';

export interface PolymarketMarketsQuery {
  limit?: number;
  active?: boolean;
  closed?: boolean;
  contractSlug?: string;
  collectionSlug?: string;
  order?: PolymarketOrder;
}

export interface PolymarketServiceAuthConfig {
  apiKey?: string;
  apiKeyHeader?: string;
  publicKey?: string;
  secretKey?: string;
  publicHeader?: string;
  secretHeader?: string;
}

export interface PolymarketTradesQuery {
  marketId?: string;
  marketHash?: string;
  limit?: number;
  before?: string;
  after?: string;
}

export interface PolymarketServiceOptions {
  baseURL: string;
  timeoutMs?: number;
  auth?: PolymarketServiceAuthConfig;
  tradesBaseURL?: string;
}

export type PolymarketMarket = Record<string, unknown>;
export type PolymarketTrade = Record<string, unknown>;

export class PolymarketApiError extends Error {
  public readonly status?: number;

  constructor(message: string, status?: number, cause?: unknown) {
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

export class PolymarketService {
  private readonly client: AxiosInstance;
  private readonly tradesClient: AxiosInstance;

  constructor({
    baseURL,
    timeoutMs = 10_000,
    auth,
    tradesBaseURL = 'https://clob.polymarket.com'
  }: PolymarketServiceOptions) {
    if (!baseURL) {
      throw new Error('PolymarketService requires a baseURL');
    }

    this.client = axios.create({
      baseURL,
      timeout: timeoutMs,
      headers: this.buildDefaultHeaders(auth)
    });

    this.tradesClient = axios.create({
      baseURL: tradesBaseURL,
      timeout: timeoutMs,
      headers: this.buildDefaultHeaders(auth)
    });
  }

  async getMarkets(query: PolymarketMarketsQuery = {}): Promise<PolymarketMarket[]> {
    try {
      const response = await this.client.get('/markets', {
        params: this.serializeQuery(query)
      });

      return this.normalizeMarkets(response.data);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw this.toPolymarketError(error);
      }

      throw error;
    }
  }

  async getTrades(query: PolymarketTradesQuery): Promise<PolymarketTrade[]> {
    const params = this.serializeTradesQuery(query);

    if (!params.market_id && !params.market_hash) {
      throw new Error('PolymarketService.getTrades requires marketId or marketHash');
    }

    try {
      const response = await this.tradesClient.get('/trades', { params });
      return this.normalizeTrades(response.data);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw this.toPolymarketError(error);
      }

      throw error;
    }
  }

  private buildDefaultHeaders(auth?: PolymarketServiceAuthConfig) {
    const headers: Record<string, string> = {
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

  private serializeQuery(query: PolymarketMarketsQuery) {
    const params: Record<string, string | number | boolean> = {};

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

  private serializeTradesQuery(query: PolymarketTradesQuery) {
    const params: Record<string, string | number> = {};

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

  private normalizeMarkets(payload: unknown): PolymarketMarket[] {
    if (Array.isArray(payload)) {
      return payload as PolymarketMarket[];
    }

    if (payload && typeof payload === 'object') {
      const container = payload as Record<string, unknown>;

      if (Array.isArray(container.markets)) {
        return container.markets as PolymarketMarket[];
      }

      if (Array.isArray(container.data)) {
        return container.data as PolymarketMarket[];
      }
    }

    throw new PolymarketApiError('Unexpected Polymarket API response shape');
  }

  private toPolymarketError(error: AxiosError): PolymarketApiError {
    const status = error.response?.status;

    const responseMessage =
      typeof error.response?.data === 'object' && error.response?.data !== null
        ? (error.response?.data as { message?: string }).message
        : undefined;

    const message =
      responseMessage ??
      error.message ??
      'Failed to fetch market data from the Polymarket API';

    return new PolymarketApiError(message, status, error);
  }

  private normalizeTrades(payload: unknown): PolymarketTrade[] {
    if (Array.isArray(payload)) {
      return payload as PolymarketTrade[];
    }

    if (payload && typeof payload === 'object') {
      const container = payload as Record<string, unknown>;

      if (Array.isArray(container.data)) {
        return container.data as PolymarketTrade[];
      }

      if (Array.isArray(container.results)) {
        return container.results as PolymarketTrade[];
      }

      if (Array.isArray(container.trades)) {
        return container.trades as PolymarketTrade[];
      }
    }

    throw new PolymarketApiError('Unexpected Polymarket Trades response shape');
  }
}
