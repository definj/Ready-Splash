import { monteCarloTerminalFromCloses, ScenarioEngine } from "@ready-splash/indicators";
import { tickerSchema } from "@ready-splash/types";
import type { FastifyInstance } from "fastify";
import { getRedis } from "../lib/redis.js";
import { readAdjustmentBundle, syncAdjustmentCacheForTicker } from "../services/adjustmentCache.js";
import { buildAdjustedOhlcvBars, fetchDailyAggs } from "../services/polygonAggs.js";

export async function registerAnalysisRoutes(app: FastifyInstance) {
  app.get<{
    Params: { ticker: string };
    Querystring: { horizon?: string; paths?: string; iv?: string };
  }>("/analysis/:ticker/scenario", async (request, reply) => {
    const parsed = tickerSchema.safeParse(String(request.params.ticker ?? "").trim().toUpperCase());
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid ticker" });
    }
    const ticker = parsed.data;
    const horizonRaw = Number.parseInt(String(request.query.horizon ?? "30"), 10);
    const horizon = horizonRaw === 60 || horizonRaw === 90 ? horizonRaw : 30;
    const paths = Math.min(5000, Math.max(50, Number.parseInt(String(request.query.paths ?? "800"), 10) || 800));
    const ivRaw = request.query.iv != null ? Number(request.query.iv) : NaN;
    const iv = Number.isFinite(ivRaw) && ivRaw > 0 ? ivRaw : null;

    const redis = getRedis();
    let bundle = redis ? await readAdjustmentBundle(redis, ticker) : null;
    if (redis && process.env.POLYGON_API_KEY && !bundle) {
      try {
        await syncAdjustmentCacheForTicker(ticker, redis);
      } catch {
        /* ignore */
      }
      bundle = await readAdjustmentBundle(redis, ticker);
    }

    const raw = await fetchDailyAggs(ticker, 400);
    if (!raw) {
      return reply.status(503).send({ error: "Unable to load aggregates from Polygon" });
    }

    const bars = buildAdjustedOhlcvBars(raw, bundle, { splits: true, dividends: true });
    const asc = [...bars].reverse();
    const prices = asc.map((b) => ({
      close: b.c,
      date: new Date(b.t).toISOString().slice(0, 10),
    }));

    const engine = new ScenarioEngine(prices, iv, horizon as 30 | 60 | 90);
    const scenario = engine.generate();
    const closes = asc.map((b) => b.c);
    const mc = monteCarloTerminalFromCloses(closes, horizon, paths, 1337);

    return {
      ticker,
      horizon,
      scenario,
      monteCarlo: mc,
      barsUsed: prices.length,
    };
  });
}
