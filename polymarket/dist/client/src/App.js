"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const solid_js_1 = require("solid-js");
require("bootstrap/dist/css/bootstrap.min.css");
const API_BASE = (import.meta.env.VITE_API_BASE ?? '').replace(/\/$/, '');
const SOCKET_BASE = (import.meta.env.VITE_WS_BASE ??
    (API_BASE ? API_BASE.replace(/^http/i, 'ws') : 'ws://localhost:3001'))
    .replace(/\/$/, '');
const TOP_MARKETS_LIMIT = 12;
const PLACEHOLDER_IMAGE = 'https://polymarket-static.s3.us-east-2.amazonaws.com/polymarket-twitter-card.png';
const volumeFormatter = new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1
});
const dateFormatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
});
const fetchTopMarkets = async () => {
    const endpoint = `${API_BASE}/api/polymarket/top-markets?limit=${TOP_MARKETS_LIMIT}`;
    const response = await fetch(endpoint, {
        headers: {
            Accept: 'application/json'
        }
    });
    if (!response.ok) {
        const message = await response.text();
        throw new Error(`Failed to load markets (${response.status} ${response.statusText}): ${message}`);
    }
    const payload = await response.json();
    return payload?.data ?? [];
};
function App() {
    const [markets, { refetch }] = (0, solid_js_1.createResource)(fetchTopMarkets);
    const [selectedMarket, setSelectedMarket] = (0, solid_js_1.createSignal)();
    const [trades, setTrades] = (0, solid_js_1.createSignal)([]);
    const [socketState, setSocketState] = (0, solid_js_1.createSignal)('idle');
    const [socketError, setSocketError] = (0, solid_js_1.createSignal)();
    const [connectedAt, setConnectedAt] = (0, solid_js_1.createSignal)();
    const [lastHeartbeat, setLastHeartbeat] = (0, solid_js_1.createSignal)();
    const [lastTradeAt, setLastTradeAt] = (0, solid_js_1.createSignal)();
    let ws;
    let heartbeatTimer;
    const marketCount = (0, solid_js_1.createMemo)(() => markets.state === 'ready' ? markets()?.length ?? 0 : markets.state === 'refreshing' ? markets()?.length ?? 0 : 0);
    const galleryTitle = (0, solid_js_1.createMemo)(() => `Top ${Math.min(TOP_MARKETS_LIMIT, marketCount() || TOP_MARKETS_LIMIT)} Tradeable Markets`);
    const connectSocket = (market) => {
        console.debug('[client-trades] attempting connection', market.id);
        if (!market.id) {
            return;
        }
        setSocketState('connecting');
        setSocketError(undefined);
        setTrades([]);
        setLastTradeAt(undefined);
        const url = new URL(`${SOCKET_BASE}/ws/polymarket/trades`);
        url.searchParams.set('marketId', market.id);
        url.searchParams.set('limit', '40');
        ws = new WebSocket(url.toString());
        ws.addEventListener('open', () => {
            console.debug('[client-trades] socket open', url.toString());
            setSocketState('open');
            setConnectedAt(Date.now());
            heartbeatTimer = setInterval(() => {
                ws?.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
            }, 20_000);
        });
        ws.addEventListener('message', (event) => {
            console.debug('[client-trades] message', event.data);
            let parsed;
            try {
                parsed = JSON.parse(event.data);
            }
            catch (error) {
                console.error('Failed to parse trade message', error);
                return;
            }
            if (!parsed) {
                return;
            }
            if (parsed.type === 'trades') {
                const merged = [...parsed.data, ...trades()].slice(0, 120);
                setTrades(merged);
                setLastTradeAt(Date.now());
            }
            else if (parsed.type === 'error') {
                setSocketState('error');
                setSocketError(parsed.message);
            }
            else if (parsed.type === 'pong') {
                setLastHeartbeat(Date.now());
            }
        });
        ws.addEventListener('error', () => {
            console.error('[client-trades] socket error');
            setSocketState('error');
            setSocketError('WebSocket error');
        });
        ws.addEventListener('close', () => {
            console.debug('[client-trades] socket closed');
            setSocketState('idle');
            if (heartbeatTimer) {
                clearInterval(heartbeatTimer);
            }
        });
    };
    const disconnectSocket = () => {
        console.debug('[client-trades] disconnect requested');
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.close();
        }
        ws = undefined;
        if (heartbeatTimer) {
            clearInterval(heartbeatTimer);
            heartbeatTimer = undefined;
        }
        setLastHeartbeat(undefined);
        setConnectedAt(undefined);
    };
    const handleMarketSelect = (market) => {
        setSelectedMarket(market);
        disconnectSocket();
        connectSocket(market);
    };
    (0, solid_js_1.onMount)(() => {
        const initial = markets()?.[0];
        if (initial) {
            handleMarketSelect(initial);
        }
    });
    (0, solid_js_1.onCleanup)(() => {
        disconnectSocket();
    });
    return (<div class="container py-4">
      <header class="mb-5 text-center text-md-start">
        <h1 class="display-5 fw-semibold">Polymarket Highlights</h1>
        <p class="lead text-muted mb-0">
          Stay on top of today&apos;s most active prediction markets powered by Polymarket data.
        </p>
      </header>

      {markets.error && (<div class="alert alert-danger" role="alert">
          Unable to load markets right now. Please try again in a moment.
        </div>)}

      <solid_js_1.Show when={!markets.error && markets()} fallback={<div class="d-flex justify-content-center py-5">
            <div class="spinner-border text-primary" role="status" aria-hidden="true"/>
            <span class="visually-hidden">Loading top markets…</span>
          </div>}>
        <section class="mb-4">
          <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-3">
            <div>
              <h2 class="h4 mb-1">{galleryTitle()}</h2>
              <p class="text-muted mb-0">
                Sorted by 24-hour trading volume. Data refreshes automatically when you reload.
              </p>
            </div>
            <button type="button" class="btn btn-outline-primary" onClick={() => refetch()} disabled={markets.loading}>
              {markets.loading ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>

          <solid_js_1.Show when={marketCount() > 0} fallback={<div class="alert alert-info" role="alert">
                No active markets found right now. Check back soon!
              </div>}>
            <div class="row row-cols-1 row-cols-sm-2 row-cols-lg-3 g-4">
              <solid_js_1.For each={markets()}>
                {(market) => (<MarketCard market={market} active={selectedMarket()?.id === market.id} onSelect={() => handleMarketSelect(market)}/>)}
              </solid_js_1.For>
            </div>

            <section class="mt-5">
              <h3 class="h5 mb-3">
                Live Trades{' '}
                <solid_js_1.Show when={selectedMarket()}>
                  {(market) => <span class="text-muted">· {market().question}</span>}
                </solid_js_1.Show>
              </h3>

              <div class="d-flex flex-wrap gap-3 mb-3 small text-muted">
                <div>
                  Status:{' '}
                  <span class={`badge text-bg-${socketState() === 'open'
            ? 'success'
            : socketState() === 'connecting'
                ? 'warning'
                : socketState() === 'error'
                    ? 'danger'
                    : 'secondary'}`}>
                    {socketState().toUpperCase()}
                  </span>
                </div>
                <div>
                  Connected:{' '}
                  {connectedAt()
            ? new Date(connectedAt()).toLocaleTimeString()
            : '—'}
                </div>
                <div>
                  Last heartbeat:{' '}
                  {lastHeartbeat()
            ? new Date(lastHeartbeat()).toLocaleTimeString()
            : socketState() === 'open'
                ? 'pending…'
                : '—'}
                </div>
                <div>
                  Last trade:{' '}
                  {lastTradeAt()
            ? new Date(lastTradeAt()).toLocaleTimeString()
            : trades().length > 0
                ? 'now'
                : '—'}
                </div>
              </div>

              <solid_js_1.Show when={socketState() !== 'error'} fallback={<div class="alert alert-danger" role="alert">
                    {socketError() ?? 'Unable to connect to trade stream.'}
                  </div>}>
                <div class="card shadow-sm border-0">
                  <div class="card-body p-0">
                    <div class="table-responsive">
                      <table class="table table-sm table-hover mb-0 align-middle">
                        <thead class="table-light">
                          <tr>
                            <th scope="col" class="text-nowrap">
                              Time
                            </th>
                            <th scope="col">Outcome</th>
                            <th scope="col" class="text-end">
                              Price
                            </th>
                            <th scope="col" class="text-end">
                              Size
                            </th>
                            <th scope="col" class="text-end">
                              Side
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          <solid_js_1.Show when={trades().length > 0} fallback={<tr>
                                <td colSpan={5} class="text-center py-4 text-muted">
                                  {socketState() === 'connecting'
                ? 'Connecting to trade stream…'
                : 'No trades yet.'}
                                </td>
                              </tr>}>
                            <solid_js_1.For each={trades()}>
                              {(trade) => <TradeRow trade={trade}/>}
                            </solid_js_1.For>
                          </solid_js_1.Show>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </solid_js_1.Show>
            </section>
          </solid_js_1.Show>
        </section>
      </solid_js_1.Show>
    </div>);
}
exports.default = App;
function MarketCard(props) {
    const { market, active, onSelect } = props;
    const imageUrl = market.image ?? market.icon ?? PLACEHOLDER_IMAGE;
    const marketUrl = () => market.slug ? `https://polymarket.com/event/${market.slug}` : 'https://polymarket.com/';
    const topOutcomes = () => market.outcomes.slice(0, 3);
    return (<div class="col">
      <div class={`card h-100 shadow-sm border ${active ? 'border-primary border-2' : 'border-0'}`}>
        <img src={imageUrl} alt={market.question} class="card-img-top" style="height: 180px; object-fit: cover;" loading="lazy"/>

        <div class="card-body d-flex flex-column">
          <p class="text-uppercase text-muted fw-semibold mb-2 small">
            {market.category ?? 'General'} ·{' '}
            {market.endDate ? dateFormatter.format(new Date(market.endDate)) : 'TBD'}
          </p>
          <h3 class="h5 card-title mb-3">{market.question}</h3>

          <div class="mb-3">
            <span class="badge bg-primary-subtle text-primary-emphasis me-2">
              24h Vol: {volumeFormatter.format(market.volume24hr)}
            </span>
            <span class="badge bg-secondary-subtle text-secondary-emphasis">
              Total Vol: {volumeFormatter.format(market.volumeTotal)}
            </span>
          </div>

          <div class="d-flex flex-wrap gap-2 mb-4">
            <solid_js_1.For each={topOutcomes()}>
              {(outcome) => (<span class="badge rounded-pill text-bg-light border">
                  {outcome.name}
                  {typeof outcome.price === 'number' && (<span class="ms-1 text-muted">
                      {Math.round(outcome.price * 100)}%
                    </span>)}
                </span>)}
            </solid_js_1.For>
          </div>

          <div class="mt-auto d-grid gap-2">
            <button type="button" class="btn btn-primary" onClick={onSelect}>
              {active ? 'Streaming' : 'Stream trades'}
            </button>
            <a href={marketUrl()} class="btn btn-outline-secondary" target="_blank" rel="noreferrer">
              View on Polymarket
            </a>
          </div>
        </div>
      </div>
    </div>);
}
function TradeRow(props) {
    const { trade } = props;
    const priceValue = normalizeNumber(trade.price);
    const sizeValue = normalizeNumber(trade.size ?? trade.amount);
    const formattedTime = () => {
        if (!trade.created_at) {
            return '—';
        }
        const date = new Date(trade.created_at);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };
    return (<tr>
      <td class="text-nowrap">{formattedTime()}</td>
      <td class="text-nowrap">{trade.outcome ?? '—'}</td>
      <td class="text-end">{priceValue !== undefined ? formatPrice(priceValue) : '—'}</td>
      <td class="text-end">{sizeValue !== undefined ? sizeValue.toFixed(2) : '—'}</td>
      <td class="text-end text-capitalize">
        {trade.side ? <span class={`badge ${trade.side === 'buy' ? 'text-bg-success' : 'text-bg-danger'}`}>{trade.side}</span> : '—'}
      </td>
    </tr>);
}
function normalizeNumber(value) {
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : undefined;
    }
    if (typeof value === 'string') {
        const parsed = Number.parseFloat(value);
        if (Number.isFinite(parsed)) {
            return parsed;
        }
    }
    return undefined;
}
function formatPrice(value) {
    return `${Math.round(value * 100)}%`;
}
//# sourceMappingURL=App.js.map