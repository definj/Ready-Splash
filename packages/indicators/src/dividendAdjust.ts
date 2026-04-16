export type DividendEvent = { exDate: string; cashAmount: number };

function isoDayUtc(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function scaleOhlc<T extends { t: number; o: number; h: number; l: number; c: number; v: number }>(bar: T, factor: number): T {
  return {
    ...bar,
    o: bar.o * factor,
    h: bar.h * factor,
    l: bar.l * factor,
    c: bar.c * factor,
  };
}

/**
 * Backward total-return style adjustment: multiply all bars **strictly before** the first bar
 * on or after each dividend ex-date by `(closeOnExBar + cash) / closeOnExBar`.
 * Bars must be **oldest → newest**. Volume is unchanged.
 */
export function applyDividendBackwardToOhlcv<
  T extends { t: number; o: number; h: number; l: number; c: number; v: number },
>(barsOldestFirst: T[], dividends: DividendEvent[]): T[] {
  const divs = dividends
    .filter((d) => d.cashAmount > 0 && d.exDate.length >= 8)
    .sort((a, b) => a.exDate.localeCompare(b.exDate));

  let out = barsOldestFirst.map((b) => ({ ...b }));
  for (const div of divs) {
    const idx = out.findIndex((b) => isoDayUtc(b.t) >= div.exDate);
    if (idx <= 0) continue;
    const closeEx = out[idx]!.c;
    if (!(closeEx > 0)) continue;
    const factor = (closeEx + div.cashAmount) / closeEx;
    if (!Number.isFinite(factor) || factor <= 0) continue;
    for (let j = 0; j < idx; j++) {
      out[j] = scaleOhlc(out[j]!, factor);
    }
  }
  return out;
}
