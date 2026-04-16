import { tickerSchema } from "@ready-splash/types";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getRedis } from "../lib/redis.js";
import { refreshFredFeaturedToRedis } from "../services/fredService.js";

function bearerToken(authorization: string | undefined): string | null {
  if (!authorization) return null;
  const [scheme, token] = authorization.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token.trim();
}

export async function registerInternalRoutes(app: FastifyInstance) {
  app.post("/internal/macro/refresh", async (request, reply) => {
    const secret = process.env.INTERNAL_CRON_SECRET;
    if (!secret) {
      return reply.status(503).send({ error: "INTERNAL_CRON_SECRET not configured" });
    }
    const token = bearerToken(request.headers.authorization);
    if (!token || token !== secret) {
      return reply.status(401).send({ error: "Invalid token" });
    }
    const redis = getRedis();
    if (!redis) {
      return reply.status(503).send({ error: "Redis unavailable" });
    }
    await refreshFredFeaturedToRedis(redis);
    return { ok: true };
  });

  const yfinBody = z.object({
    ticker: tickerSchema,
    price: z.number().finite(),
    volume: z.number().finite().nonnegative(),
    ts: z.number().int(),
  });

  app.post("/internal/yfinance-tick", async (request, reply) => {
    const secret = process.env.INTERNAL_CRON_SECRET;
    if (!secret) {
      return reply.status(503).send({ error: "INTERNAL_CRON_SECRET not configured" });
    }
    const token = bearerToken(request.headers.authorization);
    if (!token || token !== secret) {
      return reply.status(401).send({ error: "Invalid token" });
    }
    const parsed = yfinBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid body", details: parsed.error.flatten() });
    }
    const redis = getRedis();
    if (!redis) {
      return reply.status(503).send({ error: "Redis unavailable" });
    }
    const { ticker, price, volume, ts } = parsed.data;
    const key = `tick:${ticker}`;
    await redis
      .multi()
      .hset(key, {
        price: String(price),
        volume: String(volume),
        ts: String(ts),
        source: "yfinance_worker",
      })
      .expire(key, 30)
      .exec();
    return { ok: true, ticker };
  });
}
