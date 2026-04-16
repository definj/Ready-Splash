"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { apiFetch } from "@/lib/api";

type Item = {
  id: string;
  ticker: string;
  notes: string | null;
  alertPrice: number | null;
  addedAt: string;
};

type Watchlist = {
  id: string;
  name: string;
  createdAt: string;
  items: Item[];
};

type WatchlistsResponse = { watchlists: Watchlist[] };

export function WatchlistPanel() {
  const qc = useQueryClient();
  const [name, setName] = useState("Main");
  const [ticker, setTicker] = useState("MSFT");
  const [notes, setNotes] = useState("");
  const [alert, setAlert] = useState("");

  const lists = useQuery({
    queryKey: ["watchlists"],
    queryFn: async (): Promise<WatchlistsResponse> => {
      const res = await apiFetch("/watchlists");
      if (res.status === 401) {
        throw new Error("Sign in via POST /auth/login (cookies) to load watchlists.");
      }
      if (!res.ok) throw new Error(await res.text());
      return (await res.json()) as WatchlistsResponse;
    },
    retry: false,
  });

  const createList = useMutation({
    mutationFn: async () => {
      const res = await apiFetch("/watchlists", { method: "POST", body: JSON.stringify({ name }) });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["watchlists"] });
    },
  });

  const addItem = useMutation({
    mutationFn: async () => {
      const wl = lists.data?.watchlists?.[0];
      if (!wl) throw new Error("Create a watchlist first");
      const res = await apiFetch(`/watchlists/${wl.id}/items`, {
        method: "POST",
        body: JSON.stringify({
          ticker,
          notes: notes || undefined,
          alertPrice: alert ? Number(alert) : undefined,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["watchlists"] });
    },
  });

  const removeItem = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiFetch(`/watchlists/items/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["watchlists"] });
    },
  });

  const wl = lists.data?.watchlists?.[0];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label className="text-[10px] uppercase text-zinc-500">Watchlist name</label>
          <input
            className="mt-1 w-44 rounded border border-zinc-800 bg-zinc-950 px-2 py-1 font-mono text-xs text-zinc-100"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <button
          type="button"
          className="rounded border border-zinc-700 px-3 py-1.5 font-mono text-xs text-zinc-200 hover:border-zinc-500"
          onClick={() => createList.mutate()}
        >
          New watchlist
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label className="text-[10px] uppercase text-zinc-500">Ticker</label>
          <input
            className="mt-1 w-28 rounded border border-zinc-800 bg-zinc-950 px-2 py-1 font-mono text-xs text-zinc-100"
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
          />
        </div>
        <div>
          <label className="text-[10px] uppercase text-zinc-500">Notes</label>
          <input
            className="mt-1 w-56 rounded border border-zinc-800 bg-zinc-950 px-2 py-1 font-mono text-xs text-zinc-100"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        <div>
          <label className="text-[10px] uppercase text-zinc-500">Alert</label>
          <input
            className="mt-1 w-24 rounded border border-zinc-800 bg-zinc-950 px-2 py-1 font-mono text-xs text-zinc-100"
            value={alert}
            onChange={(e) => setAlert(e.target.value)}
          />
        </div>
        <button
          type="button"
          className="rounded border border-zinc-700 px-3 py-1.5 font-mono text-xs text-zinc-200 hover:border-zinc-500"
          onClick={() => addItem.mutate()}
        >
          Add / update item
        </button>
      </div>

      {lists.isLoading && <p className="text-xs text-zinc-500">Loading watchlists…</p>}
      {lists.error && <p className="text-xs text-amber-400">{(lists.error as Error).message}</p>}

      {wl && (
        <div className="rounded border border-zinc-800 bg-zinc-900/30 p-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{wl.name}</h2>
            <span className="font-mono text-[10px] text-zinc-600">{wl.items.length} symbols</span>
          </div>
          <div className="mt-3 overflow-auto">
            <table className="w-full border-collapse text-left font-mono text-[11px]">
              <thead className="text-zinc-500">
                <tr>
                  <th className="py-1 pr-3">Ticker</th>
                  <th className="py-1 pr-3">Alert</th>
                  <th className="py-1 pr-3">Notes</th>
                  <th className="py-1" />
                </tr>
              </thead>
              <tbody className="text-zinc-200">
                {wl.items.map((i) => (
                  <tr key={i.id} className="border-t border-zinc-800/80">
                    <td className="py-1 pr-3">
                      <Link className="text-sky-400 hover:underline" href={`/analyze/${i.ticker}`}>
                        {i.ticker}
                      </Link>
                    </td>
                    <td className="py-1 pr-3">{i.alertPrice ?? "—"}</td>
                    <td className="py-1 pr-3">{i.notes ?? "—"}</td>
                    <td className="py-1 text-right">
                      <button
                        type="button"
                        className="text-rose-400 hover:underline"
                        onClick={() => removeItem.mutate(i.id)}
                      >
                        remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
