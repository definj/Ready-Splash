const POLYGON_BASE = "https://api.polygon.io";

export type LastTradeSnapshot = {
  ticker: string;
  price: number;
  volume: number;
  ts: number;
};

export async function fetchLastTrade(ticker: string): Promise<LastTradeSnapshot | null> {
  const key = process.env.POLYGON_API_KEY;
  if (!key) return null;

  const url = `${POLYGON_BASE}/v2/last/trade/${encodeURIComponent(ticker)}?apiKey=${encodeURIComponent(key)}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    return null;
  }
  const json = (await res.json()) as {
    status?: string;
    results?: {
      p?: number;
      price?: number;
      s?: number;
      S?: number;
      size?: number;
      t?: number;
    };
  };

  const r = json.results;
  if (!r) return null;

  const price = typeof r.p === "number" ? r.p : typeof r.price === "number" ? r.price : NaN;
  if (!Number.isFinite(price)) return null;

  const volume =
    typeof r.s === "number" ? r.s : typeof r.S === "number" ? r.S : typeof r.size === "number" ? r.size : 0;

  const ts = typeof r.t === "number" ? r.t : 0;

  return { ticker, price, volume, ts };
}
