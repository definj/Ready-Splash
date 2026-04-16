import {
  adjustPrice,
  applyDividendBackwardToOhlcv,
  cumulativeSplitForwardFactor,
  type DividendEvent,
  type SplitEvent,
} from "@ready-splash/indicators";
import type { AdjustmentBundle } from "./adjustmentCache.js";

const POLYGON = "https://api.polygon.io";

export type OhlcvBar = {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
  splitFactor: number;
  adjusted: boolean;
  dividendAdjusted: boolean;
};

function isoDayUtc(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function splitsFromBundle(bundle: AdjustmentBundle | null): SplitEvent[] {
  if (!bundle) return [];
  return bundle.splits.map((s) => ({
    executionDate: s.executionDate,
    splitFrom: s.splitFrom,
    splitTo: s.splitTo,
  }));
}

function dividendsFromBundle(bundle: AdjustmentBundle | null): DividendEvent[] {
  if (!bundle) return [];
  return bundle.dividends.map((d) => ({ exDate: d.exDate, cashAmount: d.cashAmount }));
}

function applySplitFactorToOhlc(
  bar: { t: number; o: number; h: number; l: number; c: number; v: number },
  factor: number,
): { t: number; o: number; h: number; l: number; c: number; v: number; splitFactor: number; adjusted: boolean } {
  return {
    t: bar.t,
    o: adjustPrice(bar.o, factor),
    h: adjustPrice(bar.h, factor),
    l: adjustPrice(bar.l, factor),
    c: adjustPrice(bar.c, factor),
    v: bar.v,
    splitFactor: factor,
    adjusted: factor !== 1,
  };
}

export async function fetchDailyAggs(
  ticker: string,
  limit: number,
): Promise<Array<{ t: number; o: number; h: number; l: number; c: number; v: number }> | null> {
  const key = process.env.POLYGON_API_KEY;
  if (!key) return null;

  const to = Date.now();
  const from = to - limit * 86_400_000;
  const url = `${POLYGON}/v2/aggs/ticker/${encodeURIComponent(ticker)}/range/1/day/${from}/${to}?adjusted=false&sort=desc&limit=${limit}&apiKey=${encodeURIComponent(key)}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) return null;
  const json = (await res.json()) as {
    results?: { t?: number; o?: number; h?: number; l?: number; c?: number; v?: number }[];
  };
  const rows = json.results ?? [];
  return rows
    .map((r) => ({
      t: typeof r.t === "number" ? r.t : 0,
      o: typeof r.o === "number" ? r.o : NaN,
      h: typeof r.h === "number" ? r.h : NaN,
      l: typeof r.l === "number" ? r.l : NaN,
      c: typeof r.c === "number" ? r.c : NaN,
      v: typeof r.v === "number" ? r.v : 0,
    }))
    .filter((b) => Number.isFinite(b.c) && b.t > 0);
}

/** 1-minute aggregates (Polygon `sort=asc`). */
export async function fetchMinuteAggsAsc(
  ticker: string,
  fromMs: number,
  toMs: number,
): Promise<Array<{ t: number; o: number; h: number; l: number; c: number; v: number }> | null> {
  const key = process.env.POLYGON_API_KEY;
  if (!key) return null;
  const url = `${POLYGON}/v2/aggs/ticker/${encodeURIComponent(ticker)}/range/1/minute/${fromMs}/${toMs}?adjusted=false&sort=asc&limit=5000&apiKey=${encodeURIComponent(key)}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) return null;
  const json = (await res.json()) as {
    results?: { t?: number; o?: number; h?: number; l?: number; c?: number; v?: number }[];
  };
  const rows = json.results ?? [];
  return rows
    .map((r) => ({
      t: typeof r.t === "number" ? r.t : 0,
      o: typeof r.o === "number" ? r.o : NaN,
      h: typeof r.h === "number" ? r.h : NaN,
      l: typeof r.l === "number" ? r.l : NaN,
      c: typeof r.c === "number" ? r.c : NaN,
      v: typeof r.v === "number" ? r.v : 0,
    }))
    .filter((b) => Number.isFinite(b.c) && b.t > 0);
}

/**
 * Split and optional dividend adjustment. Input rows are **newest-first** (Polygon default).
 * Output rows remain **newest-first**.
 */
export function buildAdjustedOhlcvBars(
  rawNewestFirst: Array<{ t: number; o: number; h: number; l: number; c: number; v: number }>,
  bundle: AdjustmentBundle | null,
  options: { splits: boolean; dividends: boolean },
): OhlcvBar[] {
  const splits = splitsFromBundle(bundle);
  const asc = [...rawNewestFirst].reverse();
  type SplitBar = ReturnType<typeof applySplitFactorToOhlc>;
  const splitBars: SplitBar[] = asc.map((bar) => {
    const day = isoDayUtc(bar.t);
    const factor = options.splits ? cumulativeSplitForwardFactor(splits, day) : 1;
    return applySplitFactorToOhlc(bar, factor);
  });

  const divs = dividendsFromBundle(bundle);
  const afterDiv: SplitBar[] =
    options.dividends && divs.length > 0 ? applyDividendBackwardToOhlcv(splitBars, divs) : splitBars;

  return afterDiv.reverse().map((b) => ({
    t: b.t,
    o: b.o,
    h: b.h,
    l: b.l,
    c: b.c,
    v: b.v,
    splitFactor: b.splitFactor,
    adjusted: b.adjusted,
    dividendAdjusted: options.dividends && divs.length > 0,
  }));
}

/** @deprecated Use {@link buildAdjustedOhlcvBars} */
export function applySplitAdjustmentsToBars(
  raw: Array<{ t: number; o: number; h: number; l: number; c: number; v: number }>,
  bundle: AdjustmentBundle | null,
  wantAdjusted: boolean,
): OhlcvBar[] {
  return buildAdjustedOhlcvBars(raw, bundle, { splits: wantAdjusted, dividends: false });
}
