export function sma(
  prices: number[],
  period: number,
  _splitAdjusted = true,
): number {
  if (prices.length < period * 2) {
    throw new Error(`sma: need at least ${period * 2} split-adjusted closes`);
  }
  const slice = prices.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

export function ema(prices: number[], period: number, _splitAdjusted = true): number {
  if (prices.length < period * 2) {
    throw new Error(`ema: need at least ${period * 2} split-adjusted closes`);
  }
  const k = 2 / (period + 1);
  let prev = sma(prices.slice(0, period), period, _splitAdjusted);
  for (let i = period; i < prices.length; i++) {
    prev = prices[i]! * k + prev * (1 - k);
  }
  return prev;
}
