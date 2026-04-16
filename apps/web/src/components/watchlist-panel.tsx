"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type Item = {
  id: string;
  ticker: string;
  notes: string | null;
  sortOrder: number;
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
  const [wlId, setWlId] = useState<string | null>(null);

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

  useEffect(() => {
    const w = lists.data?.watchlists;
    if (!w?.length) return;
    if (!wlId || !w.some((x) => x.id === wlId)) {
      setWlId(w[0]!.id);
    }
  }, [lists.data, wlId]);

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
      const id = wlId ?? lists.data?.watchlists?.[0]?.id;
      if (!id) throw new Error("Create a watchlist first");
      const res = await apiFetch(`/watchlists/${id}/items`, {
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

  const reorder = useMutation({
    mutationFn: async (itemIds: string[]) => {
      const id = wlId ?? lists.data?.watchlists?.[0]?.id;
      if (!id) throw new Error("No watchlist");
      const res = await apiFetch(`/watchlists/${id}/order`, {
        method: "PATCH",
        body: JSON.stringify({ itemIds }),
      });
      if (!res.ok) throw new Error(await res.text());
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["watchlists"] });
    },
  });

  const wl = lists.data?.watchlists?.find((w) => w.id === wlId) ?? lists.data?.watchlists?.[0];

  const move = (index: number, dir: -1 | 1) => {
    if (!wl) return;
    const items = [...wl.items];
    const j = index + dir;
    if (j < 0 || j >= items.length) return;
    const tmp = items[index]!;
    items[index] = items[j]!;
    items[j] = tmp;
    reorder.mutate(items.map((i) => i.id));
  };

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

      {lists.data && lists.data.watchlists.length > 0 && (
        <div>
          <label className="text-[10px] uppercase text-zinc-500">Active list</label>
          <select
            className="mt-1 block w-full max-w-xs rounded border border-zinc-800 bg-zinc-950 px-2 py-1 font-mono text-xs text-zinc-100"
            value={wlId ?? lists.data.watchlists[0]!.id}
            onChange={(e) => setWlId(e.target.value)}
          >
            {lists.data.watchlists.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>
      )}

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
          <p className="mt-1 text-[10px] text-zinc-600">Use ↑ / ↓ to reorder (persisted).</p>
          <div className="mt-3 overflow-auto">
            <table className="w-full border-collapse text-left font-mono text-[11px]">
              <thead className="text-zinc-500">
                <tr>
                  <th className="py-1 pr-2">#</th>
                  <th className="py-1 pr-3">Ticker</th>
                  <th className="py-1 pr-3">Alert</th>
                  <th className="py-1 pr-3">Notes</th>
                  <th className="py-1">Order</th>
                  <th className="py-1" />
                </tr>
              </thead>
              <tbody className="text-zinc-200">
                {wl.items.map((i, idx) => (
                  <tr key={i.id} className="border-t border-zinc-800/80">
                    <td className="py-1 pr-2 text-zinc-600">{idx + 1}</td>
                    <td className="py-1 pr-3">
                      <Link className="text-sky-400 hover:underline" href={`/analyze/${i.ticker}`}>
                        {i.ticker}
                      </Link>
                    </td>
                    <td className="py-1 pr-3">{i.alertPrice ?? "—"}</td>
                    <td className="py-1 pr-3 max-w-[200px] truncate" title={i.notes ?? ""}>
                      {i.notes ?? "—"}
                    </td>
                    <td className="py-1">
                      <div className="flex gap-1">
                        <button
                          type="button"
                          className="rounded border border-zinc-700 px-1.5 text-[10px] hover:border-zinc-500"
                          onClick={() => move(idx, -1)}
                          disabled={idx === 0 || reorder.isPending}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="rounded border border-zinc-700 px-1.5 text-[10px] hover:border-zinc-500"
                          onClick={() => move(idx, 1)}
                          disabled={idx >= wl.items.length - 1 || reorder.isPending}
                        >
                          ↓
                        </button>
                      </div>
                    </td>
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
