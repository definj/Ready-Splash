import type { FastifyInstance } from "fastify";
import { getRedis } from "../lib/redis.js";
import {
  FRED_FEATURED_SERIES,
  fetchFredLatestObservation,
  readFredFeaturedFromRedis,
  refreshFredFeaturedToRedis,
} from "../services/fredService.js";
import { buildSectorHeatmapLive } from "../services/sectorLive.js";
import { buildSectorHeatmap } from "../services/sectorMomentum.js";

export async function registerMacroRoutes(app: FastifyInstance) {
  app.get("/macro/sectors", async (request) => {
    const redis = getRedis();
    let salt = "static";
    if (redis) {
      try {
        const dgs = await redis.hgetall("fred:latest:DGS10");
        const v = dgs.value != null ? Number(dgs.value) : NaN;
        if (Number.isFinite(v)) {
          salt = `dgs10:${v.toFixed(3)}`;
        }
      } catch (err) {
        request.log.warn({ err }, "macro sectors: redis read failed, using static salt");
      }
    }
    const cacheKey = "sectors:heatmap:v2";
    if (redis) {
      try {
        const hit = await redis.get(cacheKey);
        if (hit) {
          try {
            return JSON.parse(hit) as { sectors: Awaited<ReturnType<typeof buildSectorHeatmapLive>>; asOf: string };
          } catch {
            /* fall through */
          }
        }
      } catch (err) {
        request.log.warn({ err }, "macro sectors: redis cache read failed");
      }
    }
    try {
      const sectors = await buildSectorHeatmapLive(salt);
      const body = { sectors, asOf: new Date().toISOString() };
      if (redis) {
        try {
          await redis.set(cacheKey, JSON.stringify(body), "EX", 300);
        } catch (err) {
          request.log.warn({ err }, "macro sectors: redis cache write skipped");
        }
      }
      return body;
    } catch (err) {
      request.log.error({ err }, "macro sectors: live build failed, returning static scaffold");
      return { sectors: buildSectorHeatmap("static"), asOf: new Date().toISOString() };
    }
  });

  app.get("/macro/featured", async (request) => {
    const empty = () => ({ series: {} as Record<string, { date: string; value: number }>, featured: FRED_FEATURED_SERIES });

    const redis = getRedis();
    if (!redis) {
      return empty();
    }

    try {
      let cached = await readFredFeaturedFromRedis(redis);
      const missing = FRED_FEATURED_SERIES.filter((id) => cached[id] == null);

      if (missing.length > 0 && process.env.FRED_API_KEY) {
        await refreshFredFeaturedToRedis(redis);
        cached = await readFredFeaturedFromRedis(redis);
      }

      if (Object.keys(cached).length === 0) {
        return empty();
      }

      return { series: cached, featured: FRED_FEATURED_SERIES };
    } catch (err) {
      request.log.warn({ err }, "macro featured: redis/FRED read failed, returning empty series");
      return empty();
    }
  });

  app.get<{ Params: { seriesId: string } }>("/macro/series/:seriesId", async (request, reply) => {
    const seriesId = request.params.seriesId?.trim().toUpperCase();
    if (!seriesId || !/^[A-Z0-9._-]+$/.test(seriesId)) {
      return reply.status(400).send({ error: "Invalid series id" });
    }
    const redis = getRedis();
    if (redis) {
      const hash = await redis.hgetall(`fred:latest:${seriesId}`);
      const date = hash.date;
      const value = hash.value != null ? Number(hash.value) : NaN;
      if (date && Number.isFinite(value)) {
        return { seriesId, date, value, source: "redis" as const };
      }
    }

    const obs = await fetchFredLatestObservation(seriesId);
    if (!obs) {
      return reply.status(503).send({ error: "Unable to read FRED series" });
    }

    if (redis) {
      await redis.hset(`fred:latest:${seriesId}`, { date: obs.date, value: String(obs.value) });
      await redis.expire(`fred:latest:${seriesId}`, 86_400);
    }

    return { seriesId, ...obs, source: "fred" as const };
  });
}
