/**
 * Wilder RSI (14): first average is simple mean of gains/losses; then Wilder smoothing.
 * `splitAdjusted` reserved for callers passing adjusted closes only.
 */
export function rsi(
  closes: number[],
  period = 14,
  splitAdjusted = true,
): number {
  void splitAdjusted;
  if (closes.length < period * 2) {
    throw new Error(`rsi: need at least ${period * 2} prices`);
  }
  let gains = 0;
  let losses = 0;
  for (let i = 1; i <= period; i++) {
    const ch = closes[i]! - closes[i - 1]!;
    if (ch >= 0) gains += ch;
    else losses -= ch;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period + 1; i < closes.length; i++) {
    const ch = closes[i]! - closes[i - 1]!;
    const g = ch > 0 ? ch : 0;
    const l = ch < 0 ? -ch : 0;
    avgGain = (avgGain * (period - 1) + g) / period;
    avgLoss = (avgLoss * (period - 1) + l) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

/** Wilder RSI value at each index (NaN until the first full `period` returns exist). */
export function rsiSeries(closes: number[], period = 14): number[] {
  const n = closes.length;
  const out = new Array<number>(n).fill(Number.NaN);
  if (n < period + 1) return out;

  let gains = 0;
  let losses = 0;
  for (let i = 1; i <= period; i++) {
    const ch = closes[i]! - closes[i - 1]!;
    if (ch >= 0) gains += ch;
    else losses -= ch;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;

  const rsiVal = (ag: number, al: number) => {
    if (al === 0) return 100;
    const rs = ag / al;
    return 100 - 100 / (1 + rs);
  };

  out[period] = rsiVal(avgGain, avgLoss);

  for (let i = period + 1; i < n; i++) {
    const ch = closes[i]! - closes[i - 1]!;
    const g = ch > 0 ? ch : 0;
    const l = ch < 0 ? -ch : 0;
    avgGain = (avgGain * (period - 1) + g) / period;
    avgLoss = (avgLoss * (period - 1) + l) / period;
    out[i] = rsiVal(avgGain, avgLoss);
  }
  return out;
}
