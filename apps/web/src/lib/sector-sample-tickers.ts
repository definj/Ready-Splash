/** Same sector grid as the API uses (GICS-style sector ETFs). */
export const SECTORS_META: readonly { id: string; name: string }[] = [
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
] as const;

/** Representative liquid names per sector ETF — for navigation into analysis, not exhaustive holdings. */
export const SECTOR_SAMPLE_TICKERS: Record<string, readonly string[]> = {
  XLK: ["AAPL", "MSFT", "NVDA", "AVGO"],
  XLF: ["JPM", "BAC", "GS", "MS"],
  XLV: ["UNH", "JNJ", "LLY", "MRK"],
  XLY: ["AMZN", "TSLA", "HD", "MCD"],
  XLP: ["PG", "KO", "WMT", "COST"],
  XLE: ["XOM", "CVX", "COP", "SLB"],
  XLI: ["CAT", "HON", "UPS", "DE"],
  XLB: ["LIN", "APD", "SHW", "ECL"],
  XLU: ["NEE", "DUK", "SO", "AEP"],
  XLRE: ["PLD", "AMT", "EQIX", "PSA"],
  XLC: ["META", "GOOGL", "NFLX", "DIS"],
};

export function sampleTickersForSector(sectorId: string): readonly string[] {
  return SECTOR_SAMPLE_TICKERS[sectorId] ?? [];
}
