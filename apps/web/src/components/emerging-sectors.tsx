"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { sampleTickersForSector } from "@/lib/sector-sample-tickers";

type Sector = { id: string; name: string; momentum: number };

type SectorsResponse = { sectors: Sector[]; asOf: string };

function heatStyle(m: number): string {
  if (m >= 3) return "border-emerald-600/60 bg-emerald-950/40";
  if (m >= 0) return "border-emerald-900/50 bg-emerald-950/20";
  if (m > -3) return "border-amber-900/50 bg-amber-950/20";
  return "border-rose-900/50 bg-rose-950/25";
}

export function EmergingSectors() {
  const [openId, setOpenId] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["macro", "sectors"],
    queryFn: async (): Promise<SectorsResponse> => {
      const res = await apiFetch("/macro/sectors");
      if (!res.ok) {
        await res.text().catch(() => {});
        throw new Error("LOAD_FAILED");
      }
      return (await res.json()) as SectorsResponse;
    },
    staleTime: 60_000,
  });

  const ranked = useMemo(() => {
    if (!q.data?.sectors?.length) return [];
    return [...q.data.sectors].sort((a, b) => b.momentum - a.momentum);
  }, [q.data?.sectors]);

  if (q.isLoading) {
    return <p className="text-xs text-zinc-500">Loading sectors…</p>;
  }
  if (q.error || !q.data) {
    return <p className="text-xs text-zinc-500">Sector view is not available right now.</p>;
  }

  return (
    <div className="rounded border border-zinc-800 bg-zinc-900/40 p-3">
      <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Emerging sectors</h2>
          <p className="mt-1 max-w-xl text-[11px] leading-snug text-zinc-500">
            Ranked by recent momentum. Open a sector to jump into sample names; each opens charts for that symbol.
          </p>
        </div>
        <span className="font-mono text-[10px] text-zinc-600">
          {new Date(q.data.asOf).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}
        </span>
      </div>
      <ul className="space-y-2">
        {ranked.map((s) => {
          const open = openId === s.id;
          const samples = sampleTickersForSector(s.id);
          return (
            <li key={s.id}>
              <div className={`rounded border ${heatStyle(s.momentum)}`}>
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : s.id)}
                  className="flex w-full items-start justify-between gap-3 px-3 py-2.5 text-left hover:bg-zinc-900/50"
                >
                  <span>
                    <span className="font-mono text-sm text-zinc-100">{s.id}</span>
                    <span className="mt-0.5 block text-[11px] text-zinc-400">{s.name}</span>
                  </span>
                  <span className="shrink-0 font-mono text-sm tabular-nums text-zinc-200">
                    {s.momentum.toFixed(2)}
                    <span className="ml-2 text-[10px] font-normal text-zinc-500">{open ? "▾" : "▸"}</span>
                  </span>
                </button>
                {open && (
                  <div className="border-t border-zinc-800/80 px-3 py-2">
                    <p className="mb-2 text-[10px] uppercase tracking-wide text-zinc-500">Sample names</p>
                    <div className="flex flex-wrap gap-2">
                      {samples.map((t) => (
                        <Link
                          key={t}
                          href={`/analyze/${t}`}
                          className="rounded-full border border-zinc-700 bg-zinc-950 px-2.5 py-1 font-mono text-[11px] text-sky-300 hover:border-zinc-500 hover:text-sky-200"
                        >
                          {t}
                        </Link>
                      ))}
                      <Link
                        href={`/analyze/${s.id}`}
                        className="rounded-full border border-zinc-800 px-2.5 py-1 font-mono text-[11px] text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
                      >
                        Sector ETF ({s.id})
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
