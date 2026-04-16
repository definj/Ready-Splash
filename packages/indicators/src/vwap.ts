/**
 * Session VWAP: cumulative (typical * volume) / cumulative volume.
 * Session open (09:30 ET) must be enforced server-side before calling.
 */
export function vwap(
  highs: number[],
  lows: number[],
  closes: number[],
  volumes: number[],
  splitAdjusted = true,
): number {
  void splitAdjusted;
  if (
    highs.length !== lows.length ||
    lows.length !== closes.length ||
    closes.length !== volumes.length
  ) {
    throw new Error("vwap: OHLCV arrays must align");
  }
  if (highs.length === 0) throw new Error("vwap: empty series");
  let pv = 0;
  let v = 0;
  for (let i = 0; i < closes.length; i++) {
    const typical = (highs[i]! + lows[i]! + closes[i]!) / 3;
    const vol = volumes[i]!;
    pv += typical * vol;
    v += vol;
  }
  return v === 0 ? closes.at(-1)! : pv / v;
}
