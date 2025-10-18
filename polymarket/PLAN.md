<!-- 028f73ce-09cc-44b7-bbfb-384bc2a0ad61 f47b6115-8667-4146-8a18-730583258f7d -->
# Polymarket Frontend + Poly Wallet (Privy) Auth + Data API Plan

## Scope

Use Polymarket's “poly” wallet (Privy) for user authentication and the official Polymarket Data API (API key) for markets/orderbook/candles. Render markets, details, and charts in SolidJS. Keep secrets on the server and proxy data requests.

## Architecture

- Client (SolidJS + Vite + Bootstrap):
  - Poly/Privy wallet login via Privy Web SDK
  - Obtain Privy ID token; send to backend for verification; backend mints session (httpOnly JWT)
  - Views: Markets, Market Detail (order book, trades, chart), Portfolio
- Server (Express + MongoDB):
  - Verify Privy ID token via JWKS (jose) → issue app JWT cookie
  - Proxy Polymarket Data API with `POLYMARKET_API_KEY` (server-only)
  - Persist user profiles, watchlists, recent views; optional orders later
- Shared (TypeScript):
  - Types for Market, Outcome, OrderBook, Candle/Series, Trade, Portfolio, ApiResponse, PrivyClaims

## Auth Design (Poly/Privy)

- Client: use Privy SDK to login; receive ID token
- Server: `/api/auth/privy/verify` accepts ID token; verify signature with Privy JWKS; validate aud/iss/exp; upsert user by wallet address; issue `Set-Cookie: session=<jwt>` (httpOnly, SameSite=Lax)
- Logout: `/api/auth/logout` clears cookie
- Middleware protects portfolio endpoints by validating app JWT

## Polymarket Data Integration

- Server-only proxy endpoints (attach API key, add caching):
  - `GET /api/poly/markets` → list/search markets
  - `GET /api/poly/markets/:id` → market detail
  - `GET /api/poly/markets/:id/orderbook` → bids/asks
  - `GET /api/poly/markets/:id/candles?interval=1m|5m|1h|1d` → OHLCV/time-series
  - `GET /api/poly/markets/:id/trades` → recent trades
- Implementation notes:
  - Add `POLYMARKET_API_KEY` to env; send via `Authorization` or `X-API-Key` per provider docs
  - Add in-memory cache (5–30s) to reduce API calls
  - Normalize responses to shared types

## Client Features

- Header: Connect Wallet (Privy), login state, user menu
- Markets List: filter/search/sort; key stats (liquidity, 24h vol, price)
- Market Detail:
  - PriceChart (Lightweight Charts) using candles
  - DepthChart (order book cumulative depth)
  - OrderBook table; Trades feed
- Portfolio: positions and PnL (derived from trades later)

## Charts

- Use `lightweight-charts` for price/time-series
- Depth chart using area/line

## Security

- Verify Privy ID tokens server-side only via JWKS (jose)
- Session cookies httpOnly, SameSite=Lax, secure in prod
- Rate limit proxy routes; short cache TTL; validate inputs
- Keep `POLYMARKET_API_KEY`, `PRIVY_APP_ID`, `PRIVY_APP_SECRET` in env

## Env Setup

- server/.env.example
  ```bash
  PORT=3001
  NODE_ENV=development
  MONGODB_URI=mongodb://localhost:27017/t2r4
  JWT_SECRET=CHANGE_ME
  POLYMARKET_API_KEY=YOUR_POLYMARKET_API_KEY
  PRIVY_APP_ID=YOUR_PRIVY_APP_ID
  PRIVY_APP_SECRET=YOUR_PRIVY_APP_SECRET
  PRIVY_ISSUER=https://auth.privy.io
  PRIVY_JWKS_URL=https://auth.privy.io/api/v1/keys
  CLIENT_ORIGIN=http://localhost:3000
  ```

- client/.env.example
  ```bash
  VITE_API_BASE=http://localhost:3001
  VITE_PRIVY_APP_ID=YOUR_PRIVY_APP_ID
  VITE_DEFAULT_CHAIN_ID=137
  VITE_APP_NAME=T2R4
  ```

- Notes
  - Put publishable identifiers (e.g., PRIVY_APP_ID) in client env; put secrets (PRIVY_APP_SECRET, POLYMARKET_API_KEY, JWT_SECRET) server-side only.
  - Copy examples to `.env` files locally; don’t commit real secrets.

## Deliverables

- Client wallet login with Privy and authenticated UI state
- Server auth verify + session cookies
- Proxy routes to Polymarket Data API with caching
- Markets list + detail pages with charts and order book
- Shared types and minimal tests for auth verification and proxy handlers

## Rollout

1) Client Privy wallet integration and auth flow

2) Server Privy verify + JWT session

3) Add Polymarket proxy endpoints with API key + caching

4) Implement Markets list/detail + charts

5) Portfolio scaffold (reads) and watchlist

6) Env examples and docs

7) Tests + docs (AGENT/README updates)

### To-dos

- [ ] Integrate Privy Web SDK for poly wallet login
- [ ] Add /api/auth/privy/verify to validate Privy ID token via JWKS
- [ ] Issue/validate app JWT in httpOnly cookie for sessions
- [ ] Add client/server .env.example with Privy and Polymarket keys
- [ ] Implement /api/poly/markets and /:id proxies with caching
- [ ] Implement /api/poly/markets/:id/orderbook proxy
- [ ] Implement /api/poly/markets/:id/candles proxy
- [ ] Implement /api/poly/markets/:id/trades proxy
- [ ] Add shared types for market, orderbook, candles, trades
- [ ] Build MarketsList with filters and sorting
- [ ] Build MarketDetail with orderbook/trades/metadata
- [ ] Add PriceChart (lightweight-charts) and DepthChart
- [ ] Document setup in README/AGENT and save plan to polymarket/PLAN.md

