import yahooFinance from "yahoo-finance2";
import type { LastTradeSnapshot } from "./polygonRest.js";

export async function fetchYahooLast(ticker: string): Promise<LastTradeSnapshot | null> {
  try {
    const q = (await yahooFinance.quote(ticker)) as Record<string, unknown>;
    const price =
      (typeof q.regularMarketPrice === "number" ? q.regularMarketPrice : undefined) ??
      (typeof q.postMarketPrice === "number" ? q.postMarketPrice : undefined) ??
      (typeof q.preMarketPrice === "number" ? q.preMarketPrice : undefined);
    if (typeof price !== "number" || !Number.isFinite(price)) {
      return null;
    }
    const volume =
      (typeof q.regularMarketVolume === "number" ? q.regularMarketVolume : undefined) ?? 0;

    let ts = Date.now();
    const t = q.regularMarketTime;
    if (t instanceof Date) {
      ts = t.getTime();
    } else if (typeof t === "number" && Number.isFinite(t)) {
      ts = t < 1e12 ? t * 1000 : t;
    }

    return { ticker, price, volume, ts };
  } catch {
    return null;
  }
}
