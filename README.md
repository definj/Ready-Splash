# Ready Splash

Turborepo monorepo for a market analysis and portfolio product: **Next.js 14** (`apps/web`), **Fastify 4** (`apps/api`), **Prisma 5** (`packages/db`), shared **indicators** and **types** packages.

## Quick start

```bash
cp .env.example .env
cp apps/web/.env.example apps/web/.env.local
docker compose up -d
# Optional: `docker compose --profile worker up -d` (macro HTTP worker) or `--profile yfinance` (yfinance poller)
npm install
npm run db:migrate
npm run dev
```

- **Web:** [http://localhost:3000](http://localhost:3000) (default Next port)
- **API:** [http://localhost:4000](http://localhost:4000) (`PORT`)

Use the same `WEB_ORIGIN` values in `.env` as the URL(s) you use for the browser app so **cookies** and **Socket.io** CORS stay aligned.

---

## Roadmap — phases (living checklist)

Each phase matches the product roadmap. Status is updated as work lands in this repo.

### Phase 1 — System architecture & tech stack

**Status: complete**

- Turborepo layout: `apps/web`, `apps/api`, `packages/db`, `packages/indicators`, `packages/types`
- Stack choices wired in tooling: Next 14 App Router, Fastify, Prisma 5, PostgreSQL/Timescale + Redis via Docker Compose, shared TS packages

### Phase 2 — Database schema

**Status: complete**

- Prisma models: `User`, `Session`, `Account`, `Holding`, `Watchlist`, `WatchlistItem`
- `Session` supports Lucia session auth (see Phase 3)
- Timescale `ohlcv` hypertable DDL is documented in `packages/db/sql/ohlcv_hypertable.sql` (applied outside Prisma when you enable Timescale)
- **Runnable** Timescale DDL: `packages/db/sql/ohlcv_hypertable_apply.sql` (creates `ohlcv` + hypertable + unique index)
- Optional continuous aggregate **templates**: `packages/db/sql/continuous_aggregates.sql`; **apply** script: `packages/db/sql/continuous_aggregate_apply.sql`

### Phase 3 — API integration layer

**Status: complete for roadmap scope (operational tuning: backfill volume, job SLOs, and infra hardening remain normal production work)**

| Sprint | Deliverable | Status |
|--------|-------------|--------|
| **2** | Lucia v3 + Prisma session auth on Fastify (`/auth/*`, Argon2 password hashing) | **Done** |
| **3** | `MarketDataService`: Polygon stocks WebSocket → Redis tick hash (`tick:{TICKER}`, TTL 2s) → Socket.io room `ticker:{TICKER}` | **Done** |
| **—** | **REST + session guard:** `GET /market/status`, `GET /market/ticker/:ticker` — RTH prefers Redis tick; outside RTH skips Redis for snapshot; **Polygon REST → Yahoo (`yahoo-finance2`) fallback** | **Done** |
| **—** | **Daily bars:** `GET /market/bars/:ticker` — splits via `adjusted`, **dividends** via `?dividends=true` (backward cash factor); batch **`GET /market/quotes?tickers=`** | **Done** |
| **—** | **Adjustment cache:** lazy `adj:{TICKER}` JSON in Redis from Polygon splits + dividends; `GET /market/adjustments/:ticker?sync=1` to force refresh | **Done** |
| **—** | **FRED:** `GET /macro/featured`, `GET /macro/series/:seriesId` with Redis cache (`fred:latest:*`) | **Done** |
| **—** | **BullMQ:** shared queue logic in **`@ready-splash/macro-jobs`**. `BULL_WORKER=1` + inline macro mode runs worker in API. **`MACRO_QUEUE_MODE=external`** + **`BULL_SCHEDULER=1`** registers the repeatable job; **`npm run worker:bull`** (`WORKER_MODE=bullmq`) runs the **dedicated consumer**. HTTP cron: **`npm run worker`**. | **Done** |
| **—** | **Internal + yfinance:** `POST /internal/macro/refresh`, `POST /internal/yfinance-tick`, **`POST /internal/ohlcv/ingest-minute`** (minute bars → `ohlcv` when table exists) | **Done** |
| **—** | **Portfolio / watchlists (session):** `GET /portfolio/summary`, account + holding mutations; watchlists + **`PATCH /watchlists/:id/order`** | **Done** |
| **—** | **Web:** `socket.io-client`, `useLiveTick`, TanStack Query, `TickerLive` | **Done** |

**Auth (Lucia v3)** — `apps/api`

- `POST /auth/register` — body `{ "email", "password" }`; sets session cookie
- `POST /auth/login` — same body; sets session cookie
- `POST /auth/logout` — invalidates session; clears cookie
- `GET /auth/me` — current user JSON; refreshes rotated session cookie when applicable

> **Note:** npm shows `lucia` and `@lucia-auth/adapter-prisma` as deprecated with a migration notice. The codebase still follows your **Lucia v3** spec; plan a follow-up to align with the maintainer’s successor when you want to upgrade.

**Market data** — `apps/api`

- Env: `POLYGON_API_KEY`, `REDIS_URL`, optional `FRED_API_KEY`, optional `BULL_WORKER=1`, optional `BULL_SCHEDULER=1`, optional `MACRO_QUEUE_MODE`, `INTERNAL_CRON_SECRET`, `WORKER_MODE` (on `apps/worker`)
- `GET /market/ticker/:ticker` resolution order: **Redis (RTH only)** → **Polygon last trade** → **Yahoo quote** (`source: yahoo_rest` in `MarketTickResponse`)
- `GET /market/adjustments/:ticker` reads `adj:{TICKER}`; `?sync=1` repopulates from Polygon reference APIs when `POLYGON_API_KEY` is set

**Production follow-ups (not roadmap blockers):** tune continuous-aggregate refresh windows for your data volume, schedule `ingest-minute` via external cron, and validate dividend math against your compliance benchmark (CRSP-style total return).

### Phase 4 — Algorithm logic (indicators & scenarios)

**Status: complete for roadmap scope**

- `packages/indicators`: `ScenarioEngine`, Wilder RSI + **`rsiSeries`**, MACD, Bollinger, SMA/EMA, VWAP, ROC, **`applyDividendBackwardToOhlcv`**, **`monteCarloTerminalFromCloses`**, `isMarketOpen()` (ET regular session)
- **`adjustPrice` / `cumulativeSplitForwardFactor`** for split-aligned historical prints (`packages/indicators/src/adjust.ts`)
- **`GET /macro/sectors`** — **live** ~5d return % per sector ETF when `POLYGON_API_KEY` is set; 5m Redis cache; hash fallback without key
- **`GET /analysis/:ticker/scenario`** — scenario branches + Monte Carlo terminal distribution (`apps/api/src/routes/analysis.ts`)

### Phase 5 — UI/UX (Bloomberg-style shell)

**Status: complete for roadmap scope**

- **`(dashboard)` layout** with **`AppShell`**: sidebar, collapsible nav, privacy toggle, light motion on shell chrome
- **Macro strip** · **Sector heatmap** (live momentum when API has Polygon)
- **Analyze** — dividend-adjusted candles, **RSI(14)** pane, **`ScenarioPanel`** (scenario + Monte Carlo), **TickerLive**
- **Portfolio** — multi-account **tables** (last / P/L% via `GET /market/quotes`), merged pie weights, account picker for new holdings
- **Watchlist** — multi-list selector, **notes**, **↑/↓ reorder** (`PATCH /watchlists/:id/order`)

**Polish backlog (optional):** brand system tokens, skeleton loaders everywhere, chart drawing tools, and auth UX hardening.

### Maintaining this roadmap in `README.md`

When you ship a new slice, update the **Status** line and bullets for that phase. The **optional polish backlog** lines are intentionally lightweight so the checklist stays aligned with shipped code.

---

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Turbo `dev` (web + API) |
| `npm run build` | Production build |
| `npm run lint` | Lint / typecheck where configured |
| `npm run db:migrate` | Prisma migrate (needs `DATABASE_URL`) |
| `npm run db:generate` | `prisma generate` |
| `npm run worker` | HTTP macro refresh loop (`apps/worker`; `INTERNAL_CRON_SECRET`, optional `API_URL`) |
| `npm run worker:bull` | BullMQ consumer for `macro` queue (`WORKER_MODE=bullmq`, `REDIS_URL`, shares `@ready-splash/macro-jobs`) |

---

## Environment variables

See `.env.example` for `DATABASE_URL`, `REDIS_URL`, `POLYGON_API_KEY`, `WEB_ORIGIN`, `FRED_API_KEY`, `BULL_WORKER`, `BULL_SCHEDULER`, `MACRO_QUEUE_MODE`, `INTERNAL_CRON_SECRET`, and worker vars (`API_URL`, `WORKER_MODE`, `WORKER_INTERVAL_MS`).

For the Next app, copy `apps/web/.env.example` to `apps/web/.env.local` and set **`NEXT_PUBLIC_API_URL`** to your Fastify origin (e.g. `http://localhost:4000`).
