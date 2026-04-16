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
- Optional continuous aggregate templates (after `ohlcv` exists): `packages/db/sql/continuous_aggregates.sql`

### Phase 3 — API integration layer

**Status: partial (session portfolio/watchlist, daily bars path, internal cron + optional yfinance worker; continuous aggregates still require Timescale rollout)**

| Sprint | Deliverable | Status |
|--------|-------------|--------|
| **2** | Lucia v3 + Prisma session auth on Fastify (`/auth/*`, Argon2 password hashing) | **Done** |
| **3** | `MarketDataService`: Polygon stocks WebSocket → Redis tick hash (`tick:{TICKER}`, TTL 2s) → Socket.io room `ticker:{TICKER}` | **Done** |
| **—** | **REST + session guard:** `GET /market/status`, `GET /market/ticker/:ticker` — RTH prefers Redis tick; outside RTH skips Redis for snapshot; **Polygon REST → Yahoo (`yahoo-finance2`) fallback** | **Done** |
| **—** | **Daily bars:** `GET /market/bars/:ticker` (Polygon daily aggs + optional split adjustment via `@ready-splash/indicators`; dividends not applied on this path) | **Done** |
| **—** | **Adjustment cache:** lazy `adj:{TICKER}` JSON in Redis from Polygon splits + dividends; `GET /market/adjustments/:ticker?sync=1` to force refresh | **Done** |
| **—** | **FRED:** `GET /macro/featured`, `GET /macro/series/:seriesId` with Redis cache (`fred:latest:*`) | **Done** |
| **—** | **BullMQ (optional):** `BULL_WORKER=1` starts an in-process repeatable **`fred-refresh`** job (24h) when `REDIS_URL` is set (`apps/api/src/bull/macroQueue.ts`). Set **`MACRO_QUEUE_MODE=external`** to skip in-process execution and use **`npm run worker`** (`apps/worker`) calling **`POST /internal/macro/refresh`** with **`INTERNAL_CRON_SECRET`**. | **Done** |
| **—** | **Internal + yfinance:** `POST /internal/macro/refresh`, `POST /internal/yfinance-tick` (Bearer `INTERNAL_CRON_SECRET`); optional **`apps/yfinance-worker`** + Docker Compose profile **`yfinance`** | **Done** |
| **—** | **Portfolio / watchlists (session):** `GET /portfolio/summary`, account + holding mutations; `GET /watchlists` + watchlist item CRUD | **Done** |
| **—** | **Web:** `socket.io-client`, `useLiveTick`, TanStack Query, `TickerLive` | **Done** |

**Auth (Lucia v3)** — `apps/api`

- `POST /auth/register` — body `{ "email", "password" }`; sets session cookie
- `POST /auth/login` — same body; sets session cookie
- `POST /auth/logout` — invalidates session; clears cookie
- `GET /auth/me` — current user JSON; refreshes rotated session cookie when applicable

> **Note:** npm shows `lucia` and `@lucia-auth/adapter-prisma` as deprecated with a migration notice. The codebase still follows your **Lucia v3** spec; plan a follow-up to align with the maintainer’s successor when you want to upgrade.

**Market data** — `apps/api`

- Env: `POLYGON_API_KEY`, `REDIS_URL`, optional `FRED_API_KEY`, optional `BULL_WORKER=1`, optional `MACRO_QUEUE_MODE`, `INTERNAL_CRON_SECRET` for internal routes and `apps/worker`
- `GET /market/ticker/:ticker` resolution order: **Redis (RTH only)** → **Polygon last trade** → **Yahoo quote** (`source: yahoo_rest` in `MarketTickResponse`)
- `GET /market/adjustments/:ticker` reads `adj:{TICKER}`; `?sync=1` repopulates from Polygon reference APIs when `POLYGON_API_KEY` is set

**Still to do for Phase 3:** Apply Timescale continuous aggregates in production (templates in `packages/db/sql/continuous_aggregates.sql`), intraday bar ingestion into `ohlcv`, dividend application on historical reads where product requires it, and a dedicated BullMQ consumer app if you outgrow the HTTP cron worker pattern.

### Phase 4 — Algorithm logic (indicators & scenarios)

**Status: partial**

- `packages/indicators`: `ScenarioEngine`, Wilder RSI, MACD, Bollinger, SMA/EMA, VWAP, ROC, `isMarketOpen()` (ET regular session)
- **`adjustPrice` / `cumulativeSplitForwardFactor`** for split-aligned historical prints (`packages/indicators/src/adjust.ts`)
- **`GET /macro/sectors`** with sector ETF scaffold + deterministic momentum salted from cached FRED **DGS10** when present (`apps/api/src/services/sectorMomentum.ts`)
- Monte Carlo beyond current scenario helper, richer live sector scoring, **dedicated** BullMQ job consumer (beyond `apps/worker` HTTP refresh): **not** done

### Phase 5 — UI/UX (Bloomberg-style shell)

**Status: partial (shell + macro strip + sector heatmap + charts + portfolio/watchlist panels)**

- **`(dashboard)` layout** with **`AppShell`**: sidebar (Macro / Analyze / Portfolio / Watchlist), collapsible nav, top rail copy, **Zustand** privacy toggle (`apps/web/src/stores/ui-store.ts`)
- **Macro strip** client widget hitting `GET /macro/featured`
- **Sector heatmap** on `/` via `GET /macro/sectors` (`apps/web/src/components/sector-heatmap.tsx`)
- **Analyze** `/analyze/[ticker]`: **lightweight-charts** candlesticks from `GET /market/bars/:ticker` (`analysis-chart.tsx`)
- **Portfolio** `/portfolio`: summary, Recharts allocation pie, privacy mask (`portfolio-panel.tsx`)
- **Watchlist** `/watchlist`: CRUD against watchlist APIs (`watchlist-panel.tsx`)

**Still to do for Phase 5:** Deeper analysis overlays (indicators on chart, scenario UI), richer portfolio tables, watchlist reorder / notes, and design-system polish (density, motion, empty states).

### Maintaining this roadmap in `README.md`

When you finish a roadmap slice (e.g. Sprint 8, or a Phase 3 sub-item), update the **Status** line and add a short bullet under that phase describing what shipped. Keep Phase 3’s “still to do” list honest so the file stays the single source of truth for progress.

---

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Turbo `dev` (web + API) |
| `npm run build` | Production build |
| `npm run lint` | Lint / typecheck where configured |
| `npm run db:migrate` | Prisma migrate (needs `DATABASE_URL`) |
| `npm run db:generate` | `prisma generate` |
| `npm run worker` | Out-of-process macro refresh loop (`apps/worker`; needs `INTERNAL_CRON_SECRET`, optional `API_URL`) |

---

## Environment variables

See `.env.example` for `DATABASE_URL`, `REDIS_URL`, `POLYGON_API_KEY`, `WEB_ORIGIN`, `FRED_API_KEY`, `BULL_WORKER`, `MACRO_QUEUE_MODE`, and `INTERNAL_CRON_SECRET`.

For the Next app, copy `apps/web/.env.example` to `apps/web/.env.local` and set **`NEXT_PUBLIC_API_URL`** to your Fastify origin (e.g. `http://localhost:4000`).
