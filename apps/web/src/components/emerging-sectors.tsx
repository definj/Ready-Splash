"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { fallbackSectorsPayload } from "@/lib/sector-fallback";
import { sampleTickersForSector } from "@/lib/sector-sample-tickers";

type Sector = { id: string; name: string; momentum: number };

type SectorsResponse = { sectors: Sector[]; asOf: string };

/** Native tooltip (hover) — keep under ~500 chars for older browsers. */
const MOMENTUM_SCORE_TOOLTIP =
  "Momentum score ranks each sector ETF by recent strength (higher = stronger uptrend). Live data: percent change from the oldest to the newest daily close in the current window (up to 10 sessions) for that sector’s benchmark ETF (e.g. XLK). If daily bars are missing or only a fallback runs, the number is a deterministic stand-in from the ETF symbol and day context—used for ordering only, not a live market return.";

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
      try {
        const res = await apiFetch("/macro/sectors");
        if (!res.ok) {
          await res.text().catch(() => {});
          return fallbackSectorsPayload();
        }
        const data = (await res.json()) as SectorsResponse;
        if (!Array.isArray(data.sectors) || data.sectors.length === 0) {
          return fallbackSectorsPayload();
        }
        return data;
      } catch {
        return fallbackSectorsPayload();
      }
    },
    staleTime: 60_000,
    retry: 2,
    retryDelay: (i) => 600 * (i + 1),
  });

  const ranked = useMemo(() => {
    if (!q.data?.sectors?.length) return [];
    return [...q.data.sectors].sort((a, b) => b.momentum - a.momentum);
  }, [q.data?.sectors]);

  if (q.isLoading) {
    return <p className="text-xs text-zinc-500">Loading sectors…</p>;
  }
  if (!q.data) {
    return null;
  }

  return (
    <div className="rounded border border-zinc-800 bg-zinc-900/40 p-3">
      <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Emerging sectors</h2>
          <p className="mt-1 max-w-xl text-[11px] leading-snug text-zinc-500">
            Sectors are sorted with strongest momentum first. Open a row for example stocks in that group. Hover{" "}
            <span className="cursor-help border-b border-dotted border-zinc-500 text-zinc-400" title={MOMENTUM_SCORE_TOOLTIP}>
              momentum score
            </span>{" "}
            in the header for a short definition.
          </p>
        </div>
        <span className="font-mono text-[10px] text-zinc-600">
          {new Date(q.data.asOf).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}
        </span>
      </div>
      <div className="mb-1.5 flex items-center justify-between border-b border-zinc-800/70 pb-1 text-[10px] font-medium uppercase tracking-wide text-zinc-600">
        <span>Sector</span>
        <span className="text-right">
          <span
            className="cursor-help border-b border-dotted border-zinc-500"
            title={MOMENTUM_SCORE_TOOLTIP}
            id="momentum-score-term"
            aria-describedby="momentum-score-footnote"
          >
            Momentum score
          </span>
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
                  className="flex w-full items-start gap-3 px-3 py-2.5 text-left hover:bg-zinc-900/50"
                >
                  <span className="min-w-0 flex-1">
                    <span className="font-mono text-sm text-zinc-100">{s.id}</span>
                    <span className="mt-0.5 block text-[11px] text-zinc-400">{s.name}</span>
                  </span>
                  <span className="shrink-0 text-right" title={MOMENTUM_SCORE_TOOLTIP}>
                    <span className="font-mono text-sm tabular-nums text-zinc-200">{s.momentum.toFixed(2)}</span>
                    <span className="mt-0.5 block cursor-help text-[9px] font-normal normal-case tracking-normal text-zinc-500 underline decoration-dotted decoration-zinc-600 underline-offset-2">
                      momentum score
                    </span>
                  </span>
                  <span className="shrink-0 pt-0.5 w-5 text-center text-xs text-zinc-500" aria-hidden>
                    {open ? "▾" : "▸"}
                  </span>
                </button>
                {open && (
                  <div className="border-t border-zinc-800/80 px-3 py-2">
                    <p className="mb-2 text-[10px] uppercase tracking-wide text-zinc-500">Example stocks</p>
                    <p className="mb-3 text-[10px] leading-snug text-zinc-600">
                      Ticker = exchange symbol. The line under each is the company name (for quick context).
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {samples.map((t) => (
                        <Link
                          key={t.symbol}
                          href={`/analyze/${t.symbol}`}
                          className="inline-flex min-w-[4.5rem] flex-col items-center rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-2 hover:border-zinc-500"
                        >
                          <span className="font-mono text-[11px] font-medium text-sky-300">{t.symbol}</span>
                          <span className="mt-1 max-w-[6.5rem] text-center text-[9px] leading-tight text-zinc-500">
                            {t.label}
                          </span>
                        </Link>
                      ))}
                      <Link
                        href={`/analyze/${s.id}`}
                        className="inline-flex min-w-[4.5rem] flex-col items-center rounded-lg border border-zinc-800 bg-zinc-950/80 px-2.5 py-2 hover:border-zinc-600"
                      >
                        <span className="font-mono text-[11px] font-medium text-zinc-300">{s.id}</span>
                        <span className="mt-1 max-w-[6.5rem] text-center text-[9px] leading-tight text-zinc-500">
                          Sector ETF (tracks this whole group)
                        </span>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <div
        className="mt-4 border-t border-zinc-800/80 pt-3 text-[10px] leading-relaxed text-zinc-600"
        id="momentum-score-footnote"
      >
        <p>
          <strong className="font-medium text-zinc-500">Momentum score</strong> (the number on the right) measures
          how much that sector basket has moved recently—higher means a stronger uptrend. With live market data it is
          close to a recent percentage change for the sector ETF; without it, the value is a stand-in used only for
          ordering.
        </p>
        <p className="mt-2">
          <strong className="font-medium text-zinc-500">How it is calculated:</strong> Each sector uses its benchmark
          ETF (for example XLK for technology). When daily prices are available, the score is the{" "}
          <span className="text-zinc-500">total return in percent</span> from the{" "}
          <span className="text-zinc-500">oldest to the newest daily close</span> in the latest window (up to{" "}
          <span className="text-zinc-500">ten trading days</span>) for that ETF:{" "}
          <span className="font-mono text-zinc-500">((last − first) ÷ first) × 100</span>. If that window is
          incomplete, the API fills in with a small deterministic score derived from the ETF ticker and a daily
          &quot;salt&quot; (so the grid still sorts)—that mode is <span className="text-zinc-500">not</span> a live
          market percentage.
        </p>
      </div>
    </div>
  );
}
