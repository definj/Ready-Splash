import { ema } from "./ma";

export interface MacdResult {
  macd: number;
  signal: number;
  histogram: number;
}

function macdLineSeries(closes: number[], fast: number, slow: number): number[] {
  const kf = 2 / (fast + 1);
  const ks = 2 / (slow + 1);
  let fe = closes[0]!;
  let se = closes[0]!;
  const line: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    fe = closes[i]! * kf + fe * (1 - kf);
    se = closes[i]! * ks + se * (1 - ks);
    line.push(fe - se);
  }
  return line;
}

export function macd(
  closes: number[],
  fast = 12,
  slow = 26,
  signalPeriod = 9,
  splitAdjusted = true,
): MacdResult {
  if (closes.length < slow * 2) {
    throw new Error(`macd: need at least ${slow * 2} prices`);
  }
  const lineSeries = macdLineSeries(closes, fast, slow);
  const signal = ema(lineSeries, signalPeriod, splitAdjusted);
  const line = lineSeries.at(-1)!;
  return { macd: line, signal, histogram: line - signal };
}
