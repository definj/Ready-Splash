import { isMarketOpen } from "@ready-splash/indicators";
import type { MarketTickResponse } from "@ready-splash/types";
import { tickerSchema } from "@ready-splash/types";
import type { FastifyInstance } from "fastify";
import { getRedis } from "../lib/redis.js";
import { applySplitAdjustmentsToBars, fetchDailyAggs } from "../services/polygonAggs.js";
import { readAdjustmentBundle, syncAdjustmentCacheForTicker } from "../services/adjustmentCache.js";
import { fetchLastTrade } from "../services/polygonRest.js";
import { fetchYahooLast } from "../services/yahooQuote.js";

export async function registerMarketRoutes(app: FastifyInstance) {
  app.get("/market/status", async () => ({
    marketOpen: isMarketOpen(),
  }));

  app.get<{ Params: { ticker: string }; Querystring: { sync?: string } }>(
    "/market/adjustments/:ticker",
    async (request, reply) => {
      const raw = request.params.ticker ?? "";
      const parsed = tickerSchema.safeParse(raw.trim().toUpperCase());
      if (!parsed.success) {
        return reply.status(400).send({ error: "Invalid ticker" });
      }
      const ticker = parsed.data;
      const redis = getRedis();
      if (!redis) {
        return reply.status(503).send({ error: "Redis unavailable" });
      }

      const shouldSync = String(request.query.sync ?? "") === "1";
      if (shouldSync && process.env.POLYGON_API_KEY) {
        try {
          await syncAdjustmentCacheForTicker(ticker, redis);
        } catch (err) {
          request.log.error({ err, ticker }, "adjustment sync failed");
        }
      }

      const bundle = await readAdjustmentBundle(redis, ticker);
      if (!bundle) {
        return reply.status(404).send({
          error: "No adjustment cache for ticker",
          hint: "Call with ?sync=1 (requires POLYGON_API_KEY) to populate adj:{TICKER}",
        });
      }
      return bundle;
    },
  );

  app.get<{ Params: { ticker: string } }>("/market/ticker/:ticker", async (request, reply) => {
    const raw = request.params.ticker ?? "";
    const parsed = tickerSchema.safeParse(raw.trim().toUpperCase());
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid ticker" });
    }
    const ticker = parsed.data;
    const marketOpen = isMarketOpen();
    const redis = getRedis();

    if (redis && process.env.POLYGON_API_KEY) {
      const hasAdj = await redis.exists(`adj:${ticker}`);
      if (!hasAdj) {
        void syncAdjustmentCacheForTicker(ticker, redis).catch(() => {});
      }
    }

    if (marketOpen && redis) {
      const hash = await redis.hgetall(`tick:${ticker}`);
      const price = hash.price != null ? Number(hash.price) : NaN;
      if (Number.isFinite(price)) {
        const body: MarketTickResponse = {
          ticker,
          price,
          volume: hash.volume != null ? Number(hash.volume) : 0,
          ts: hash.ts != null ? Number(hash.ts) : 0,
          source: "redis",
          marketOpen,
        };
        return body;
      }
    }

    const last = await fetchLastTrade(ticker);
    if (last) {
      const body: MarketTickResponse = {
        ticker: last.ticker,
        price: last.price,
        volume: last.volume,
        ts: last.ts,
        source: "polygon_rest",
        marketOpen,
      };
      return body;
    }

    const y = await fetchYahooLast(ticker);
    if (y) {
      const body: MarketTickResponse = {
        ticker: y.ticker,
        price: y.price,
        volume: y.volume,
        ts: y.ts,
        source: "yahoo_rest",
        marketOpen,
      };
      return body;
    }

    return reply.status(503).send({
      error: "Unable to load market data",
      detail:
        "Polygon and Yahoo fallbacks failed (check POLYGON_API_KEY, network, or Yahoo rate limits)",
    });
  });

  app.get<{
    Params: { ticker: string };
    Querystring: { limit?: string; adjusted?: string };
  }>("/market/bars/:ticker", async (request, reply) => {
    const parsed = tickerSchema.safeParse(String(request.params.ticker ?? "").trim().toUpperCase());
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid ticker" });
    }
    const ticker = parsed.data;
    const limit = Math.min(500, Math.max(1, Number.parseInt(String(request.query.limit ?? "120"), 10) || 120));
    const adjusted = String(request.query.adjusted ?? "true") !== "false";

    const redis = getRedis();
    let bundle = redis ? await readAdjustmentBundle(redis, ticker) : null;
    if (adjusted && redis && process.env.POLYGON_API_KEY && !bundle) {
      try {
        await syncAdjustmentCacheForTicker(ticker, redis);
      } catch {
        /* ignore */
      }
      bundle = await readAdjustmentBundle(redis, ticker);
    }

    const raw = await fetchDailyAggs(ticker, limit);
    if (!raw) {
      return reply.status(503).send({ error: "Unable to load aggregates from Polygon" });
    }

    const bars = applySplitAdjustmentsToBars(raw, bundle, adjusted);
    return {
      ticker,
      adjusted,
      dividendsApplied: false,
      disclaimer: adjusted
        ? "Split adjustment applied using cached Polygon splits (adj:{TICKER}); dividend reinvestment not applied in this endpoint."
        : "Raw split-unadjusted aggregates as returned by Polygon (adjusted=false).",
      bars,
    };
  });
}
