"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

type Overview = {
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

function fmtCap(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return "—";
  if (n >= 1e12) return `${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  return `${Math.round(n).toLocaleString()}`;
}

function fmtVol(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return "—";
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  return `${Math.round(n).toLocaleString()}`;
}

export function TickerResearch({ ticker }: { ticker: string }) {
  const symbol = ticker.trim().toUpperCase();

  const q = useQuery({
    queryKey: ["market", "overview", symbol],
    queryFn: async (): Promise<Overview> => {
      const res = await apiFetch(`/market/overview/${encodeURIComponent(symbol)}`);
      if (!res.ok) {
        await res.text().catch(() => {});
        throw new Error("OVERVIEW_FAILED");
      }
      return (await res.json()) as Overview;
    },
    staleTime: 120_000,
    retry: 1,
  });

  if (q.isLoading) {
    return <p className="text-xs text-zinc-500">Loading company snapshot…</p>;
  }
  if (q.error || !q.data) {
    return <p className="text-xs text-zinc-400">Company snapshot is not available for this symbol.</p>;
  }

  const d = q.data;
  if (!d.found) {
    return <p className="text-xs text-zinc-400">No profile data was found for this symbol.</p>;
  }

  const title = d.longName ?? d.shortName ?? symbol;
  const dayChange =
    d.regularMarketChangePercent != null && Number.isFinite(d.regularMarketChangePercent)
      ? `${d.regularMarketChangePercent >= 0 ? "+" : ""}${d.regularMarketChangePercent.toFixed(2)}%`
      : null;

  return (
    <section className="rounded border border-zinc-800 bg-zinc-900/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-zinc-50">{title}</h2>
          <p className="mt-1 font-mono text-xs text-zinc-500">
            {symbol}
            {d.exchange ? ` · ${d.exchange}` : ""}
            {d.currency ? ` · ${d.currency}` : ""}
          </p>
          {(d.sector || d.industry) && (
            <p className="mt-2 text-sm text-zinc-400">
              {[d.sector, d.industry].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
        <div className="text-right">
          {d.regularMarketPrice != null && (
            <div className="font-mono text-2xl tabular-nums text-zinc-50">{d.regularMarketPrice.toFixed(2)}</div>
          )}
          {dayChange && <div className="mt-1 font-mono text-sm text-zinc-400">{dayChange} today</div>}
        </div>
      </div>

      <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <dt className="text-[10px] uppercase tracking-wide text-zinc-500">Market cap</dt>
          <dd className="mt-0.5 font-mono text-sm text-zinc-200">{fmtCap(d.marketCap)}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wide text-zinc-500">Trailing P/E</dt>
          <dd className="mt-0.5 font-mono text-sm text-zinc-200">
            {d.trailingPE != null && Number.isFinite(d.trailingPE) ? d.trailingPE.toFixed(2) : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wide text-zinc-500">Forward P/E</dt>
          <dd className="mt-0.5 font-mono text-sm text-zinc-200">
            {d.forwardPE != null && Number.isFinite(d.forwardPE) ? d.forwardPE.toFixed(2) : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wide text-zinc-500">Dividend yield</dt>
          <dd className="mt-0.5 font-mono text-sm text-zinc-200">
            {d.dividendYield != null && Number.isFinite(d.dividendYield)
              ? `${(d.dividendYield * 100).toFixed(2)}%`
              : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wide text-zinc-500">52-week range</dt>
          <dd className="mt-0.5 font-mono text-sm text-zinc-200">
            {d.fiftyTwoWeekLow != null && d.fiftyTwoWeekHigh != null
              ? `${d.fiftyTwoWeekLow.toFixed(2)} – ${d.fiftyTwoWeekHigh.toFixed(2)}`
              : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wide text-zinc-500">Avg volume (3 mo)</dt>
          <dd className="mt-0.5 font-mono text-sm text-zinc-200">{fmtVol(d.averageVolume)}</dd>
        </div>
      </dl>

      {d.website && (
        <p className="mt-4 text-xs">
          <a
            href={d.website.startsWith("http") ? d.website : `https://${d.website}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sky-400 hover:underline"
          >
            Company website
          </a>
        </p>
      )}

      {d.summary && (
        <div className="mt-4 border-t border-zinc-800 pt-4">
          <h3 className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Overview</h3>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">{d.summary}</p>
        </div>
      )}
    </section>
  );
}
