export type SectorRow = {
  id: string;
  name: string;
  momentum: number;
};

/** Eleven GICS-inspired sector ETFs used as a heatmap scaffold (not exhaustive taxonomy). */
export const SECTOR_ETFS: Array<{ id: string; name: string }> = [
  { id: "XLK", name: "Information Technology" },
  { id: "XLF", name: "Financials" },
  { id: "XLV", name: "Health Care" },
  { id: "XLY", name: "Consumer Discretionary" },
  { id: "XLP", name: "Consumer Staples" },
  { id: "XLE", name: "Energy" },
  { id: "XLI", name: "Industrials" },
  { id: "XLB", name: "Materials" },
  { id: "XLU", name: "Utilities" },
  { id: "XLRE", name: "Real Estate" },
  { id: "XLC", name: "Communication Services" },
];

export function sectorMomentumScore(sectorId: string, salt: string): number {
  const s = `${sectorId}:${salt}`;
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return ((h % 2001) / 100) - 10;
}

export function buildSectorHeatmap(salt: string): SectorRow[] {
  return SECTOR_ETFS.map((s) => ({
    id: s.id,
    name: s.name,
    momentum: sectorMomentumScore(s.id, salt),
  }));
}
