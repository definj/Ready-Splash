type RedisClient = InstanceType<typeof import("ioredis").default>;

export const FRED_FEATURED_SERIES = ["DGS10", "UNRATE"] as const;

export type FredObservation = { date: string; value: number };

export async function fetchFredLatestObservation(seriesId: string): Promise<FredObservation | null> {
  const key = process.env.FRED_API_KEY;
  if (!key) return null;

  const url = new URL("https://api.stlouisfed.org/fred/series/observations");
  url.searchParams.set("series_id", seriesId);
  url.searchParams.set("api_key", key);
  url.searchParams.set("file_type", "json");
  url.searchParams.set("sort_order", "desc");
  url.searchParams.set("limit", "1");

  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) return null;

  const json = (await res.json()) as {
    observations?: { date: string; value: string }[];
  };
  const o = json.observations?.[0];
  if (!o) return null;
  if (o.value === "." || o.value == null) return null;
  const value = Number(o.value);
  if (!Number.isFinite(value)) return null;
  return { date: o.date, value };
}

export async function refreshFredFeaturedToRedis(redis: RedisClient): Promise<void> {
  for (const seriesId of FRED_FEATURED_SERIES) {
    const obs = await fetchFredLatestObservation(seriesId);
    if (!obs) continue;
    const key = `fred:latest:${seriesId}`;
    await redis.hset(key, { date: obs.date, value: String(obs.value) });
    await redis.expire(key, 86_400);
  }
}

export async function readFredFeaturedFromRedis(
  redis: RedisClient,
): Promise<Record<string, FredObservation>> {
  const out: Record<string, FredObservation> = {};
  for (const seriesId of FRED_FEATURED_SERIES) {
    const hash = await redis.hgetall(`fred:latest:${seriesId}`);
    const date = hash.date;
    const value = hash.value != null ? Number(hash.value) : NaN;
    if (date && Number.isFinite(value)) {
      out[seriesId] = { date, value };
    }
  }
  return out;
}
