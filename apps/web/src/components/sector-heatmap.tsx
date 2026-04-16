"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

type Sector = { id: string; name: string; momentum: number };

type SectorsResponse = { sectors: Sector[]; asOf: string };

function heatColor(m: number): string {
  if (m >= 3) return "bg-emerald-500/80";
  if (m >= 0) return "bg-emerald-900/60";
  if (m > -3) return "bg-amber-900/60";
  return "bg-rose-700/70";
}

export function SectorHeatmap() {
  const q = useQuery({
    queryKey: ["macro", "sectors"],
    queryFn: async (): Promise<SectorsResponse> => {
      const res = await apiFetch("/macro/sectors");
      if (!res.ok) throw new Error(await res.text());
      return (await res.json()) as SectorsResponse;
    },
    staleTime: 60_000,
  });

  if (q.isLoading) {
    return <p className="text-xs text-zinc-500">Loading sector grid…</p>;
  }
  if (q.error || !q.data) {
    return null;
  }

  return (
    <div className="rounded border border-zinc-800 bg-zinc-900/40 p-3">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Sector momentum</h2>
        <span className="font-mono text-[10px] text-zinc-600">{new Date(q.data.asOf).toLocaleString()}</span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {q.data.sectors.map((s) => (
          <div
            key={s.id}
            className={`rounded border border-zinc-800/80 px-2 py-3 ${heatColor(s.momentum)}`}
          >
            <div className="text-[10px] font-mono text-zinc-100">{s.id}</div>
            <div className="text-[10px] text-zinc-200/90">{s.name}</div>
            <div className="mt-1 font-mono text-xs text-zinc-50">{s.momentum.toFixed(2)}</div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[10px] text-zinc-600">
        Momentum uses live daily bars when Polygon is configured; otherwise a deterministic placeholder grid.
      </p>
    </div>
  );
}
