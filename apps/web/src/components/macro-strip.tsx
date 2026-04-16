"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

type FeaturedResponse = {
  series: Record<string, { date: string; value: number }>;
  featured: readonly string[];
};

const SERIES_LABELS: Record<string, string> = {
  DGS10: "10-year Treasury yield",
  UNRATE: "Unemployment rate",
};

export function MacroStrip() {
  const q = useQuery({
    queryKey: ["macro", "featured"],
    queryFn: async (): Promise<FeaturedResponse> => {
      const res = await apiFetch("/macro/featured");
      if (!res.ok) {
        await res.text().catch(() => {});
        throw new Error("macro_unavailable");
      }
      return (await res.json()) as FeaturedResponse;
    },
    refetchInterval: 120_000,
  });

  if (q.isLoading) {
    return <p className="text-xs text-zinc-500">Loading macro indicators…</p>;
  }
  if (q.error) {
    return null;
  }

  const series = q.data?.series ?? {};
  const rows = Object.entries(series);
  if (rows.length === 0) return null;

  return (
    <div className="rounded border border-zinc-800 bg-zinc-900/40 p-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Macro snapshot</h2>
      <p className="mt-1 text-[10px] text-zinc-600">
        Latest readings from public economic series (updated when data is available).
      </p>
      <div className="mt-3 grid gap-2 font-mono text-[11px] text-zinc-300 sm:grid-cols-2">
        {rows.map(([id, obs]) => (
          <div key={id} className="flex items-baseline justify-between gap-3 rounded border border-zinc-800/80 bg-zinc-950/40 px-2 py-1.5">
            <span className="text-zinc-500">{SERIES_LABELS[id] ?? id}</span>
            <span className="text-right text-zinc-100">
              {obs.value.toFixed(3)}
              <span className="ml-2 text-zinc-500">({obs.date})</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
