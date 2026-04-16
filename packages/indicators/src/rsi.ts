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
