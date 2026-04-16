"use client";

import type { MarketTickResponse } from "@ready-splash/types";
import { useQuery } from "@tanstack/react-query";
import { useLiveTick } from "@/hooks/useLiveTick";
import { apiFetch } from "@/lib/api";

export function TickerLive({ ticker }: { ticker: string }) {
  const symbol = ticker.trim().toUpperCase();
  useLiveTick(symbol);

  const query = useQuery({
    queryKey: ["tick", symbol],
    enabled: Boolean(symbol),
    queryFn: async (): Promise<MarketTickResponse> => {
      const res = await apiFetch(`/market/ticker/${encodeURIComponent(symbol)}`);
      if (!res.ok) {
        await res.text().catch(() => {});
        throw new Error("QUOTE_UNAVAILABLE");
      }
      return (await res.json()) as MarketTickResponse;
    },
    refetchInterval: (q) => {
      const d = q.state.data as MarketTickResponse | undefined;
      if (!d) return false;
      return d.marketOpen ? false : 30_000;
    },
  });

  if (!symbol) {
    return null;
  }

  return (
    <section className="mt-8 rounded border border-zinc-800 bg-zinc-900/50 p-4 text-sm">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        Live tape ({symbol})
      </h2>
      {query.isLoading && <p className="mt-2 text-zinc-400">Loading snapshot…</p>}
      {query.error && (
        <p className="mt-2 text-sm text-zinc-400">Live quote is not available for this symbol right now.</p>
      )}
      {query.data && (
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-zinc-200">
          <dt className="text-zinc-500">Last</dt>
          <dd>{query.data.price.toFixed(4)}</dd>
          <dt className="text-zinc-500">Volume</dt>
          <dd>{query.data.volume}</dd>
          <dt className="text-zinc-500">Session</dt>
          <dd>{query.data.marketOpen ? "Regular hours" : "Extended / closed"}</dd>
        </dl>
      )}
    </section>
  );
}
