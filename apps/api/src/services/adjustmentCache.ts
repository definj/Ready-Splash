import type Redis from "ioredis";

const POLYGON = "https://api.polygon.io";

export type AdjustmentBundle = {
  asOf: string;
  splits: Array<{
    executionDate: string;
    splitFrom: number;
    splitTo: number;
    ticker?: string;
  }>;
  dividends: Array<{
    exDate: string;
    cashAmount: number;
    ticker?: string;
  }>;
};

function pickNum(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

function pickStr(v: unknown): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

async function fetchPolygonJson(url: string): Promise<unknown> {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) return null;
  return (await res.json()) as unknown;
}

export async function syncAdjustmentCacheForTicker(ticker: string, redis: Redis): Promise<void> {
  const key = process.env.POLYGON_API_KEY;
  if (!key) return;

  const enc = encodeURIComponent(ticker);
  const splitsUrl = `${POLYGON}/v3/reference/splits?ticker=${enc}&limit=1000&apiKey=${encodeURIComponent(key)}`;
  const divUrl = `${POLYGON}/v3/reference/dividends?ticker=${enc}&limit=1000&apiKey=${encodeURIComponent(key)}`;

  const [splitsJson, divJson] = await Promise.all([fetchPolygonJson(splitsUrl), fetchPolygonJson(divUrl)]);

  const splits: AdjustmentBundle["splits"] = [];
  if (splitsJson && typeof splitsJson === "object" && "results" in splitsJson) {
    const results = (splitsJson as { results?: unknown[] }).results ?? [];
    for (const row of results) {
      if (!row || typeof row !== "object") continue;
      const r = row as Record<string, unknown>;
      const executionDate =
        pickStr(r.execution_date) ?? pickStr(r.executionDate) ?? pickStr(r.date) ?? "";
      const splitFrom = pickNum(r.split_from) ?? pickNum(r.splitFrom);
      const splitTo = pickNum(r.split_to) ?? pickNum(r.splitTo);
      if (!executionDate || splitFrom == null || splitTo == null) continue;
      splits.push({
        executionDate,
        splitFrom,
        splitTo,
        ticker: pickStr(r.ticker),
      });
    }
  }

  const dividends: AdjustmentBundle["dividends"] = [];
  if (divJson && typeof divJson === "object" && "results" in divJson) {
    const results = (divJson as { results?: unknown[] }).results ?? [];
    for (const row of results) {
      if (!row || typeof row !== "object") continue;
      const r = row as Record<string, unknown>;
      const exDate = pickStr(r.ex_dividend_date) ?? pickStr(r.exDividendDate) ?? pickStr(r.pay_date) ?? "";
      const cashAmount = pickNum(r.cash_amount) ?? pickNum(r.cashAmount) ?? 0;
      if (!exDate) continue;
      dividends.push({ exDate, cashAmount, ticker: pickStr(r.ticker) });
    }
  }

  const bundle: AdjustmentBundle = {
    asOf: new Date().toISOString(),
    splits,
    dividends,
  };

  await redis.set(`adj:${ticker}`, JSON.stringify(bundle), "EX", 7 * 24 * 60 * 60);
}

export async function readAdjustmentBundle(redis: Redis, ticker: string): Promise<AdjustmentBundle | null> {
  const raw = await redis.get(`adj:${ticker}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AdjustmentBundle;
  } catch {
    return null;
  }
}
