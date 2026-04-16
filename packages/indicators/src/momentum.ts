/** ROC over `period` bars on split-adjusted closes. */
export function roc(closes: number[], period = 14, splitAdjusted = true): number {
  void splitAdjusted;
  if (closes.length < period * 2) {
    throw new Error(`roc: need at least ${period * 2} prices`);
  }
  const last = closes.at(-1)!;
  const prev = closes.at(-1 - period)!;
  return ((last - prev) / prev) * 100;
}
