import yahooFinance from "yahoo-finance2";

type YahooChartDay = {
  date?: Date;
  open?: number | null;
  high?: number | null;
  low?: number | null;
  close?: number | null;
  volume?: number | null;
};

type YahooChartResult = { quotes?: YahooChartDay[] };

/**
 * Daily OHLCV bars, **newest first**, compatible with `buildAdjustedOhlcvBars` raw input.
 * Used when Polygon aggregates are unavailable.
 */
export async function fetchYahooDailyBarsNewestFirst(
  ticker: string,
  limit: number,
): Promise<Array<{ t: number; o: number; h: number; l: number; c: number; v: number }> | null> {
  try {
    const period2 = new Date();
    const period1 = new Date(period2.getTime() - Math.ceil(limit * 1.5) * 86_400_000);
    const chart = (await yahooFinance.chart(ticker, {
      period1,
      period2,
      interval: "1d",
    })) as YahooChartResult;
    const quotes = chart.quotes ?? [];
    const rows = quotes
      .map((q) => {
        const d = q.date;
        const t = d instanceof Date ? d.getTime() : NaN;
        const c = q.close;
        const o = q.open;
        const h = q.high;
        const l = q.low;
        const v = q.volume;
        if (!Number.isFinite(t) || c == null || typeof c !== "number" || !Number.isFinite(c)) {
          return null;
        }
        return {
          t,
          o: typeof o === "number" && Number.isFinite(o) ? o : c,
          h: typeof h === "number" && Number.isFinite(h) ? h : c,
          l: typeof l === "number" && Number.isFinite(l) ? l : c,
          c,
          v: typeof v === "number" && Number.isFinite(v) ? v : 0,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x != null)
      .sort((a, b) => b.t - a.t)
      .slice(0, limit);
    return rows.length > 0 ? rows : null;
  } catch {
    return null;
  }
}
