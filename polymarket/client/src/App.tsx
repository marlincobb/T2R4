import { For, Show, createMemo, createResource, createSignal, on } from 'solid-js';
import 'bootstrap/dist/css/bootstrap.min.css';

type MarketOutcome = {
  name: string;
  price?: number | null;
};

type TopMarket = {
  id: string;
  question: string;
  slug?: string;
  category?: string | null;
  image?: string | null;
  icon?: string | null;
  endDate?: string | null;
  volume24hr: number;
  volumeTotal: number;
  outcomes: MarketOutcome[];
};

type MarketTrade = {
  id: string;
  marketId?: string | null;
  marketHash?: string | null;
  price: number | null;
  size: number | null;
  outcome?: string;
  side?: string | null;
  occurredAt: string | null;
};

const API_BASE = ((import.meta.env.VITE_API_BASE as string | undefined) ?? '').replace(/\/$/, '');
const TOP_MARKETS_LIMIT = 12;
const SPARKLINE_SAMPLES = 40;
const PLACEHOLDER_IMAGE =
  'https://polymarket-static.s3.us-east-2.amazonaws.com/polymarket-twitter-card.png';

const volumeFormatter = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1
});

const percentFormatter = new Intl.NumberFormat('en-US', {
  style: 'percent',
  maximumFractionDigits: 1
});

const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0
});

const CATEGORY_OPTIONS = ['All', 'Geopolitical', 'Financial', 'Economics', 'Crypto', 'Elections'] as const;

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Geopolitical: ['geopolit', 'politic', 'war', 'conflict', 'country', 'foreign', 'diplom', 'world'],
  Financial: ['finance', 'stock', 'bond', 'interest', 'rate', 'bank', 'market', 'treasury'],
  Economics: ['econom', 'gdp', 'cpi', 'ppi', 'inflation', 'unemploy', 'jobs', 'recession'],
  Crypto: ['crypto', 'bitcoin', 'btc', 'ethereum', 'eth', 'sol', 'solana', 'token', 'coin', 'blockchain'],
  Elections: ['election', 'vote', 'poll', 'primary', 'runoff', 'president', 'senate', 'governor']
};

function matchesCategory(market: TopMarket, category: string): boolean {
  if (category === 'All') {
    return true;
  }

  const categoryText = (market.category ?? '').toLowerCase();
  const text = `${categoryText} ${(market.question ?? '').toLowerCase()}`;

  // Direct category field hints
  if (category === 'Geopolitical') {
    if (categoryText.includes('geopolit') || categoryText.includes('polit')) return true;
  }
  if (category === 'Financial') {
    if (categoryText.includes('finance')) return true;
  }
  if (category === 'Economics') {
    if (categoryText.includes('econom')) return true;
  }
  if (category === 'Crypto') {
    if (categoryText.includes('crypto')) return true;
  }
  if (category === 'Elections') {
    if (categoryText.includes('politic') || categoryText.includes('election')) return true;
  }

  // Keyword fallback on full text (category + question)
  const keywords = CATEGORY_KEYWORDS[category] ?? [];
  return keywords.some((kw) => text.includes(kw));
}

const fetchTopMarkets = async (params?: { category?: string | null }): Promise<TopMarket[]> => {
  const search = new URLSearchParams();
  search.set('limit', String(TOP_MARKETS_LIMIT));
  if (params?.category && params.category !== 'All') {
    search.set('category', params.category);
  }
  const endpoint = `${API_BASE}/api/polymarket/top-markets?${search.toString()}`;
  const response = await fetch(endpoint, {
    headers: { Accept: 'application/json' }
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(
      `Failed to load markets (${response.status} ${response.statusText}): ${message}`
    );
  }

  const payload = await response.json();
  return payload?.data ?? [];
};

const fetchMarketTrades = async (marketId: string): Promise<MarketTrade[]> => {
  if (!marketId) {
    return [];
  }

  const endpoint = `${API_BASE}/api/polymarket/markets/${encodeURIComponent(
    marketId
  )}/trades?limit=${SPARKLINE_SAMPLES}`;
  const response = await fetch(endpoint, {
    headers: { Accept: 'application/json' }
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(
      `Failed to load trades (${response.status} ${response.statusText}): ${message}`
    );
  }

  const payload = await response.json();
  return payload?.data ?? [];
};

type CategorySummary = { name: string; count: number };
const fetchCategories = async (): Promise<CategorySummary[]> => {
  const endpoint = `${API_BASE}/api/polymarket/categories`;
  const response = await fetch(endpoint, { headers: { Accept: 'application/json' } });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Failed to load categories (${response.status} ${response.statusText}): ${message}`);
  }
  const payload = await response.json();
  return payload?.data?.categories ?? [];
};

function App() {
  const [selectedCategory, setSelectedCategory] = createSignal<string>('All');
  const [markets, { refetch }] = createResource(selectedCategory, (cat) => fetchTopMarkets({ category: cat }));
  const [categories] = createResource(fetchCategories);

  const marketCount = createMemo(() => markets()?.length ?? 0);
  const galleryTitle = createMemo(() =>
    `Top ${Math.min(TOP_MARKETS_LIMIT, marketCount() || TOP_MARKETS_LIMIT)} Markets by Volume`
  );

  const filteredMarkets = createMemo(() => {
    // Server already applied category filter; keep client-side heuristic as a fallback safeguard
    const list = markets() ?? [];
    const cat = selectedCategory();
    if (!cat || cat === 'All') return list;
    return list.filter((m) => matchesCategory(m, cat));
  });

  const hasResults = createMemo(() => (filteredMarkets()?.length ?? 0) > 0);

  return (
    <div class="container py-4">
      <header class="mb-4">
        <h1 class="display-6 fw-semibold mb-2">Polymarket Heat Board</h1>
        <p class="lead text-muted mb-0">
          Highest-volume markets and their outcome tokens, updated on demand via the Polymarket REST API.
        </p>
      </header>

      {markets.error && (
        <div class="alert alert-danger" role="alert">
          Unable to load markets right now. Please try again in a moment.
        </div>
      )}

      <Show
        when={!markets.error && markets()}
        fallback={
          <div class="d-flex justify-content-center py-5">
            <div class="spinner-border text-primary" role="status" aria-hidden="true" />
            <span class="visually-hidden">Loading top markets…</span>
          </div>
        }
      >
        <section>
          <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-3">
            <div>
              <h2 class="h4 mb-1">{galleryTitle()}</h2>
              <p class="text-muted mb-0">Ordered by 24h trading volume. Click refresh for the latest snapshot.</p>
            </div>
            <button
              type="button"
              class="btn btn-outline-primary"
              onClick={() => refetch()}
              disabled={markets.loading}
            >
              {markets.loading ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>

          <div class="d-flex flex-wrap gap-2 mb-3">
            <For each={CATEGORY_OPTIONS as unknown as string[]}>
              {(cat) => (
                <button
                  type="button"
                  class={`btn btn-sm ${selectedCategory() === cat ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat}
                </button>
              )}
            </For>
            <Show when={categories() && (categories()!.length > 0)}>
              <div class="vr mx-1" />
              <For each={categories()!.slice(0, 8)}>
                {(c) => (
                  <button
                    type="button"
                    class={`btn btn-sm ${selectedCategory() === c.name ? 'btn-secondary' : 'btn-outline-secondary'}`}
                    onClick={() => setSelectedCategory(c.name)}
                    title={`${c.count} markets`}
                  >
                    {c.name}
                  </button>
                )}
              </For>
            </Show>
          </div>

          <Show
            when={hasResults()}
            fallback={
              <div class="alert alert-info" role="alert">
                No markets match this category right now. Try another filter or refresh.
              </div>
            }
          >
            <div class="d-flex flex-column gap-3">
              <For each={filteredMarkets()}>{(market) => <MarketStrip market={market} />}</For>
            </div>
          </Show>
        </section>
      </Show>
    </div>
  );
}

export default App;

function MarketStrip(props: { market: TopMarket }) {
  const { market } = props;
  const [trades] = createResource(() => market.id, fetchMarketTrades);

  const imageUrl = market.image ?? market.icon ?? PLACEHOLDER_IMAGE;
  const marketUrl = () =>
    market.slug ? `https://polymarket.com/event/${market.slug}` : 'https://polymarket.com/';

  const tokenChips = () => market.outcomes.slice(0, 3);

  const volumeShare = createMemo(() =>
    market.volumeTotal > 0 ? market.volume24hr / market.volumeTotal : null
  );

  const priceSeries = createMemo(() => {
    const raw = trades()?.map((trade) => trade.price).filter((value): value is number => typeof value === 'number');
    if (!raw || raw.length === 0) {
      return [] as number[];
    }
    // Trades arrive newest-first; reverse for chronological order.
    return [...raw].reverse();
  });

  const latestPrice = createMemo(() => {
    const series = priceSeries();
    return series.length ? series[series.length - 1] : null;
  });

  return (
    <article class="card shadow-sm border-0">
      <div class="card-body py-3 px-4">
        <div class="row g-3 align-items-center">
          <div class="col-12 col-lg-4">
            <a href={marketUrl()} target="_blank" rel="noreferrer" class="text-decoration-none text-reset">
              <div class="d-flex align-items-center gap-3 overflow-hidden">
                <img
                  src={imageUrl}
                  alt="Market artwork"
                  class="flex-shrink-0 rounded"
                  style={{ width: '48px', height: '48px', 'object-fit': 'cover' }}
                />
                <div class="overflow-hidden">
                  <div class="fw-semibold text-truncate">{market.question}</div>
                  <div class="small text-muted text-truncate">
                    24h Vol {usdFormatter.format(market.volume24hr)}
                    {volumeShare() !== null && volumeShare() !== undefined
                      ? ` · ${percentFormatter.format(volumeShare()!) } of total`
                      : ''}
                  </div>
                </div>
              </div>
            </a>
          </div>

          <div class="col-12 col-lg-3">
            <div class="d-flex flex-wrap gap-2">
              <For each={tokenChips()}>
                {(outcome) => (
                  <span class="badge text-bg-light border">
                    <span class="fw-semibold me-1">{outcome.name}</span>
                    <span class="text-muted">{formatOutcomePrice(outcome.price)}</span>
                  </span>
                )}
              </For>
              <Show when={market.outcomes.length > 3}>
                <span class="badge text-bg-light border">+{market.outcomes.length - 3} more</span>
              </Show>
            </div>
          </div>

          <div class="col-12 col-lg-5">
            <div class="d-flex flex-column gap-2">
              <div class="d-flex justify-content-between small text-muted">
                <span>Recent price trend</span>
                <span>
                  Last:{' '}
                  {latestPrice() !== null && latestPrice() !== undefined
                    ? `${formatOutcomePrice(latestPrice())} (${percentFormatter.format(latestPrice()!)})`
                    : '—'}
                </span>
              </div>
              <div style={{ height: '56px' }}>
                <Sparkline
                  marketId={market.id}
                  values={priceSeries()}
                  loading={trades.loading}
                  error={trades.error as Error | undefined}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function Sparkline(props: {
  marketId: string;
  values: number[];
  loading: boolean;
  error?: Error;
  width?: number;
  height?: number;
}) {
  const width = props.width ?? 180;
  const height = props.height ?? 56;

  const metrics = createMemo(() => {
    const values = props.values;
    if (!values || values.length < 2) {
      return {
        hasData: false,
        path: '',
        markerY: undefined as number | undefined
      };
    }

    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    const path = values
      .map((value, index) => {
        const x = (index / (values.length - 1)) * width;
        const y = height - ((value - min) / range) * height;
        return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(' ');

    const last = values[values.length - 1];
    const markerY = height - ((last - min) / range) * height;

    return {
      hasData: true,
      path,
      markerY
    };
  });

  return (
    <div class="h-100 w-100 d-flex align-items-center justify-content-center bg-light rounded">
      <Show when={!props.loading} fallback={<span class="text-muted small">Loading…</span>}>
        <Show
          when={!props.error}
          fallback={<span class="text-danger small">Failed to load trades</span>}
        >
          <Show
            when={metrics().hasData && metrics().path}
            fallback={<span class="text-muted small">Not enough trade data</span>}
          >
            <svg
              viewBox={`0 0 ${width} ${height}`}
              preserveAspectRatio="none"
              width="100%"
              height="100%"
            >
              <path
                d={metrics().path}
                fill="none"
                stroke="var(--bs-primary)"
                stroke-width="2"
              />
              <Show when={metrics().markerY !== undefined}>
                <circle
                  cx={width}
                  cy={metrics().markerY ?? 0}
                  r={3}
                  fill="var(--bs-primary)"
                  stroke="#fff"
                  stroke-width="1.5"
                />
              </Show>
            </svg>
          </Show>
        </Show>
      </Show>
    </div>
  );
}

function formatOutcomePrice(price?: number | null) {
  if (price === null || price === undefined) {
    return '—';
  }

  const cents = Math.round(price * 100);
  return `${cents}¢`;
}
