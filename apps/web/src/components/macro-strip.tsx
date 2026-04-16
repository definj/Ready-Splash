"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

type FeaturedResponse = {
  series: Record<string, { date: string; value: number }>;
  featured: readonly string[];
};

export function MacroStrip() {
  const q = useQuery({
    queryKey: ["macro", "featured"],
    queryFn: async (): Promise<FeaturedResponse> => {
      const res = await apiFetch("/macro/featured");
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || res.statusText);
      }
      return (await res.json()) as FeaturedResponse;
    },
    refetchInterval: 120_000,
  });

  if (q.isLoading) {
    return <p className="text-xs text-zinc-500">Macro series loading…</p>;
  }
  if (q.error) {
    return (
      <p className="text-xs text-amber-400">
        Macro feed unavailable — set <code className="text-zinc-400">FRED_API_KEY</code> on the API and ensure Redis is up.
      </p>
    );
  }

  const series = q.data?.series ?? {};
  const rows = Object.entries(series);
  if (rows.length === 0) return null;

  return (
    <div className="grid gap-2 rounded border border-zinc-800 bg-zinc-900/40 p-3 font-mono text-[11px] text-zinc-300 sm:grid-cols-2">
      {rows.map(([id, obs]) => (
        <div key={id} className="flex items-baseline justify-between gap-3">
          <span className="text-zinc-500">{id}</span>
          <span className="text-right text-zinc-100">
            {obs.value.toFixed(3)}
            <span className="ml-2 text-zinc-500">({obs.date})</span>
          </span>
        </div>
      ))}
    </div>
  );
}
