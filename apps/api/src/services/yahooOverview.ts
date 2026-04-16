import yahooFinance from "yahoo-finance2";

type QuoteSummaryResult = {
  price?: {
    shortName?: string;
    longName?: string;
    exchangeName?: string;
    currency?: string;
    regularMarketPrice?: number;
    regularMarketPreviousClose?: number;
    regularMarketChangePercent?: number;
    marketCap?: number;
    averageDailyVolume3Month?: number;
  };
  summaryProfile?: {
    longBusinessSummary?: string;
    sector?: string;
    industry?: string;
    website?: string;
  };
  defaultKeyStatistics?: {
    marketCap?: number;
    trailingPE?: number;
    forwardPE?: number;
    fiftyTwoWeekHigh?: number;
    fiftyTwoWeekLow?: number;
  };
  summaryDetail?: {
    dividendYield?: number;
  };
};

export type TickerOverview = {
  ticker: string;
  found: boolean;
  shortName: string | null;
  longName: string | null;
  exchange: string | null;
  currency: string | null;
  regularMarketPrice: number | null;
  regularMarketPreviousClose: number | null;
  regularMarketChangePercent: number | null;
  marketCap: number | null;
  trailingPE: number | null;
  forwardPE: number | null;
  dividendYield: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  averageVolume: number | null;
  sector: string | null;
  industry: string | null;
  website: string | null;
  summary: string | null;
};

export async function fetchYahooOverview(ticker: string): Promise<TickerOverview> {
  try {
    const r = (await yahooFinance.quoteSummary(ticker, {
      modules: ["price", "summaryProfile", "defaultKeyStatistics", "financialData", "summaryDetail"],
    })) as QuoteSummaryResult;
    const p = r.price;
    const sp = r.summaryProfile;
    const dks = r.defaultKeyStatistics;
    const sd = r.summaryDetail;

    const longSum =
      typeof sp?.longBusinessSummary === "string" ? sp.longBusinessSummary.slice(0, 4000) : null;

    const marketCap =
      typeof p?.marketCap === "number" && Number.isFinite(p.marketCap)
        ? p.marketCap
        : typeof dks?.marketCap === "number" && Number.isFinite(dks.marketCap)
          ? dks.marketCap
          : null;

    return {
      ticker,
      found: true,
      shortName: typeof p?.shortName === "string" ? p.shortName : null,
      longName: typeof p?.longName === "string" ? p.longName : null,
      exchange: typeof p?.exchangeName === "string" ? p.exchangeName : null,
      currency: typeof p?.currency === "string" ? p.currency : null,
      regularMarketPrice:
        typeof p?.regularMarketPrice === "number" && Number.isFinite(p.regularMarketPrice)
          ? p.regularMarketPrice
          : null,
      regularMarketPreviousClose:
        typeof p?.regularMarketPreviousClose === "number" && Number.isFinite(p.regularMarketPreviousClose)
          ? p.regularMarketPreviousClose
          : null,
      regularMarketChangePercent:
        typeof p?.regularMarketChangePercent === "number" && Number.isFinite(p.regularMarketChangePercent)
          ? p.regularMarketChangePercent
          : null,
      marketCap,
      trailingPE:
        typeof dks?.trailingPE === "number" && Number.isFinite(dks.trailingPE) ? dks.trailingPE : null,
      forwardPE: typeof dks?.forwardPE === "number" && Number.isFinite(dks.forwardPE) ? dks.forwardPE : null,
      dividendYield:
        typeof sd?.dividendYield === "number" && Number.isFinite(sd.dividendYield) ? sd.dividendYield : null,
      fiftyTwoWeekHigh:
        typeof dks?.fiftyTwoWeekHigh === "number" && Number.isFinite(dks.fiftyTwoWeekHigh)
          ? dks.fiftyTwoWeekHigh
          : null,
      fiftyTwoWeekLow:
        typeof dks?.fiftyTwoWeekLow === "number" && Number.isFinite(dks.fiftyTwoWeekLow)
          ? dks.fiftyTwoWeekLow
          : null,
      averageVolume:
        typeof p?.averageDailyVolume3Month === "number" && Number.isFinite(p.averageDailyVolume3Month)
          ? p.averageDailyVolume3Month
          : null,
      sector: typeof sp?.sector === "string" ? sp.sector : null,
      industry: typeof sp?.industry === "string" ? sp.industry : null,
      website: typeof sp?.website === "string" ? sp.website : null,
      summary: longSum,
    };
  } catch {
    return {
      ticker,
      found: false,
      shortName: null,
      longName: null,
      exchange: null,
      currency: null,
      regularMarketPrice: null,
      regularMarketPreviousClose: null,
      regularMarketChangePercent: null,
      marketCap: null,
      trailingPE: null,
      forwardPE: null,
      dividendYield: null,
      fiftyTwoWeekHigh: null,
      fiftyTwoWeekLow: null,
      averageVolume: null,
      sector: null,
      industry: null,
      website: null,
      summary: null,
    };
  }
}
