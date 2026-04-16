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
        const text = await res.text();
        throw new Error(text || res.statusText);
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
        <p className="mt-2 text-amber-400">
          {query.error instanceof Error ? query.error.message : "Failed to load"}
        </p>
      )}
      {query.data && (
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-zinc-200">
          <dt className="text-zinc-500">Price</dt>
          <dd>{query.data.price.toFixed(4)}</dd>
          <dt className="text-zinc-500">Volume (last)</dt>
          <dd>{query.data.volume}</dd>
          <dt className="text-zinc-500">Source</dt>
          <dd className="text-zinc-300">{query.data.source}</dd>
          <dt className="text-zinc-500">Session</dt>
          <dd>{query.data.marketOpen ? "regular (RTH)" : "outside RTH"}</dd>
        </dl>
      )}
      <p className="mt-3 text-xs text-zinc-500">
        RTH: WebSocket + Redis. Outside RTH: REST poll every 30s. Configure{" "}
        <code className="text-zinc-400">NEXT_PUBLIC_API_URL</code>,{" "}
        <code className="text-zinc-400">POLYGON_API_KEY</code>,{" "}
        <code className="text-zinc-400">REDIS_URL</code>, and Yahoo fallback for last resort quotes.
      </p>
    </section>
  );
}
