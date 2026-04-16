"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type Item = {
  id: string;
  ticker: string;
  notes: string | null;
  sortOrder: number;
};

type Watchlist = {
  id: string;
  name: string;
  items: Item[];
};

type WatchlistsResponse = { watchlists: Watchlist[] };

export function HomeWatchlist() {
  const [wlId, setWlId] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["watchlists"],
    queryFn: async (): Promise<WatchlistsResponse> => {
      const res = await apiFetch("/watchlists");
      if (res.status === 401) {
        throw new Error("SIGN_IN");
      }
      if (!res.ok) {
        await res.text().catch(() => {});
        throw new Error("LOAD_FAILED");
      }
      return (await res.json()) as WatchlistsResponse;
    },
    retry: false,
  });

  useEffect(() => {
    const w = q.data?.watchlists;
    if (!w?.length) return;
    if (!wlId || !w.some((x) => x.id === wlId)) {
      setWlId(w[0]!.id);
    }
  }, [q.data, wlId]);

  const wl = q.data?.watchlists?.find((w) => w.id === wlId) ?? q.data?.watchlists?.[0];

  return (
    <div className="rounded border border-zinc-800 bg-zinc-900/40 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Your watchlist</h2>
        <Link href="/watchlist" className="text-[11px] text-sky-400 hover:underline">
          Manage
        </Link>
      </div>

      {q.isLoading && <p className="mt-3 text-xs text-zinc-500">Loading…</p>}
      {q.error && (
        <p className="mt-3 text-xs text-zinc-400">
          {(q.error as Error).message === "SIGN_IN"
            ? "Sign in to see symbols you follow."
            : "Watchlist could not be loaded right now."}
        </p>
      )}

      {q.data && q.data.watchlists.length === 0 && (
        <p className="mt-3 text-sm text-zinc-400">
          No lists yet.{" "}
          <Link href="/watchlist" className="text-sky-400 hover:underline">
            Create one
          </Link>
          .
        </p>
      )}

      {q.data && q.data.watchlists.length > 1 && wl && (
        <label className="mt-3 block text-[10px] uppercase text-zinc-500">
          List
          <select
            className="mt-1 block w-full max-w-xs rounded border border-zinc-800 bg-zinc-950 px-2 py-1.5 font-mono text-xs text-zinc-100"
            value={wl.id}
            onChange={(e) => setWlId(e.target.value)}
          >
            {q.data.watchlists.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {wl && wl.items.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {wl.items
            .slice()
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((i) => (
              <li key={i.id}>
                <Link
                  href={`/analyze/${i.ticker}`}
                  className="inline-flex items-center rounded-full border border-zinc-700 bg-zinc-950 px-3 py-1.5 font-mono text-xs text-sky-300 hover:border-zinc-500 hover:text-sky-200"
                >
                  {i.ticker}
                </Link>
              </li>
            ))}
        </ul>
      )}

      {wl && wl.items.length === 0 && (
        <p className="mt-3 text-sm text-zinc-400">
          This list is empty.{" "}
          <Link href="/watchlist" className="text-sky-400 hover:underline">
            Add symbols
          </Link>
          .
        </p>
      )}
    </div>
  );
}
