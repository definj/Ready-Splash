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

export type SampleTicker = { symbol: string; label: string };

/** Representative large-cap names per sector — symbol plus a short plain-language label. */
export const SECTOR_SAMPLE_TICKERS: Record<string, readonly SampleTicker[]> = {
  XLK: [
    { symbol: "AAPL", label: "Apple" },
    { symbol: "MSFT", label: "Microsoft" },
    { symbol: "NVDA", label: "NVIDIA" },
    { symbol: "AVGO", label: "Broadcom" },
  ],
  XLF: [
    { symbol: "JPM", label: "JPMorgan Chase" },
    { symbol: "BAC", label: "Bank of America" },
    { symbol: "GS", label: "Goldman Sachs" },
    { symbol: "MS", label: "Morgan Stanley" },
  ],
  XLV: [
    { symbol: "UNH", label: "UnitedHealth" },
    { symbol: "JNJ", label: "Johnson & Johnson" },
    { symbol: "LLY", label: "Eli Lilly" },
    { symbol: "MRK", label: "Merck" },
  ],
  XLY: [
    { symbol: "AMZN", label: "Amazon" },
    { symbol: "TSLA", label: "Tesla" },
    { symbol: "HD", label: "Home Depot" },
    { symbol: "MCD", label: "McDonald's" },
  ],
  XLP: [
    { symbol: "PG", label: "Procter & Gamble" },
    { symbol: "KO", label: "Coca-Cola" },
    { symbol: "WMT", label: "Walmart" },
    { symbol: "COST", label: "Costco" },
  ],
  XLE: [
    { symbol: "XOM", label: "ExxonMobil" },
    { symbol: "CVX", label: "Chevron" },
    { symbol: "COP", label: "ConocoPhillips" },
    { symbol: "SLB", label: "SLB" },
  ],
  XLI: [
    { symbol: "CAT", label: "Caterpillar" },
    { symbol: "HON", label: "Honeywell" },
    { symbol: "UPS", label: "UPS" },
    { symbol: "DE", label: "Deere" },
  ],
  XLB: [
    { symbol: "LIN", label: "Linde" },
    { symbol: "APD", label: "Air Products" },
    { symbol: "SHW", label: "Sherwin-Williams" },
    { symbol: "ECL", label: "Ecolab" },
  ],
  XLU: [
    { symbol: "NEE", label: "NextEra Energy" },
    { symbol: "DUK", label: "Duke Energy" },
    { symbol: "SO", label: "Southern Company" },
    { symbol: "AEP", label: "American Electric Power" },
  ],
  XLRE: [
    { symbol: "PLD", label: "Prologis" },
    { symbol: "AMT", label: "American Tower" },
    { symbol: "EQIX", label: "Equinix" },
    { symbol: "PSA", label: "Public Storage" },
  ],
  XLC: [
    { symbol: "META", label: "Meta" },
    { symbol: "GOOGL", label: "Alphabet (Class A)" },
    { symbol: "NFLX", label: "Netflix" },
    { symbol: "DIS", label: "Disney" },
  ],
};

export function sampleTickersForSector(sectorId: string): readonly SampleTicker[] {
  return SECTOR_SAMPLE_TICKERS[sectorId] ?? [];
}
