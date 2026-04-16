/**
 * Split / dividend adjustment helpers for institutional-style price alignment.
 * Polygon reference splits expose `split_from` / `split_to` on `execution_date`.
 */

export type SplitEvent = {
  executionDate: string;
  splitFrom: number;
  splitTo: number;
};

/**
 * Forward-adjust a raw historical print to **current** share terms using splits
 * that occur **strictly after** `barDate` (ISO `YYYY-MM-DD`).
 *
 * Factor multiplies the historical print; default convention here:
 * `∏ (splitFrom / splitTo)` for each qualifying split (matches common “multiply past by inverse split ratio”).
 */
export function cumulativeSplitForwardFactor(splits: SplitEvent[], barDate: string): number {
  return splits
    .filter((s) => s.executionDate > barDate)
    .reduce((acc, s) => {
      if (s.splitTo === 0) return acc;
      return acc * (s.splitFrom / s.splitTo);
    }, 1);
}

export function adjustPrice(rawPrice: number, factor: number): number {
  if (!Number.isFinite(rawPrice) || !Number.isFinite(factor)) {
    throw new Error("adjustPrice: non-finite inputs");
  }
  return rawPrice * factor;
}
