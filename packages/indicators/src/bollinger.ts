import { sma } from "./ma";

export interface BollingerResult {
  mid: number;
  upper: number;
  lower: number;
  width: number;
}

export function bollinger(
  closes: number[],
  period = 20,
  stdMult = 2,
  splitAdjusted = true,
): BollingerResult {
  if (closes.length < period * 2) {
    throw new Error(`bollinger: need at least ${period * 2} prices`);
  }
  const slice = closes.slice(-period);
  const mid = sma(closes, period, splitAdjusted);
  const mean = slice.reduce((a, b) => a + b, 0) / period;
  const variance =
    slice.reduce((acc, p) => acc + (p - mean) ** 2, 0) / period;
  const std = Math.sqrt(variance);
  const upper = mid + stdMult * std;
  const lower = mid - stdMult * std;
  return { mid, upper, lower, width: (upper - lower) / mid };
}
