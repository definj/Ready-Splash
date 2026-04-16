import type { FastifyInstance } from "fastify";
import { getRedis } from "../lib/redis.js";
import {
  FRED_FEATURED_SERIES,
  fetchFredLatestObservation,
  readFredFeaturedFromRedis,
  refreshFredFeaturedToRedis,
} from "../services/fredService.js";
import { buildSectorHeatmap } from "../services/sectorMomentum.js";

export async function registerMacroRoutes(app: FastifyInstance) {
  app.get("/macro/sectors", async (_request, reply) => {
    const redis = getRedis();
    let salt = "static";
    if (redis) {
      const dgs = await redis.hgetall("fred:latest:DGS10");
      const v = dgs.value != null ? Number(dgs.value) : NaN;
      if (Number.isFinite(v)) {
        salt = `dgs10:${v.toFixed(3)}`;
      }
    }
    return { sectors: buildSectorHeatmap(salt), asOf: new Date().toISOString() };
  });

  app.get("/macro/featured", async (_request, reply) => {
    const redis = getRedis();
    if (!redis) {
      return reply.status(503).send({ error: "Redis unavailable" });
    }

    let cached = await readFredFeaturedFromRedis(redis);
    const missing = FRED_FEATURED_SERIES.filter((id) => cached[id] == null);

    if (missing.length > 0 && process.env.FRED_API_KEY) {
      await refreshFredFeaturedToRedis(redis);
      cached = await readFredFeaturedFromRedis(redis);
    }

    if (Object.keys(cached).length === 0) {
      return reply.status(503).send({
        error: "No FRED data available",
        detail: process.env.FRED_API_KEY ? "FRED request failed" : "Set FRED_API_KEY to enable macro pulls",
      });
    }

    return { series: cached, featured: FRED_FEATURED_SERIES };
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
