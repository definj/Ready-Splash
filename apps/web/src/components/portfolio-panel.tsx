"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { apiFetch } from "@/lib/api";
import { useUIStore } from "@/stores/ui-store";

type Holding = {
  id: string;
  ticker: string;
  shares: number;
  avgCostBasis: number;
  marketValue: number | null;
};

type Account = {
  id: string;
  label: string;
  broker: string | null;
  holdings: Holding[];
  costBasisTotal: number;
};

type Summary = {
  privacyMode: boolean;
  totalEquity: number;
  accounts: Account[];
};

function mask(n: number, privacy: boolean): string {
  if (!privacy) return n.toFixed(2);
  return "████";
}

export function PortfolioPanel() {
  const privacy = useUIStore((s) => s.privacyMode);
  const qc = useQueryClient();
  const [label, setLabel] = useState("Primary");
  const [ticker, setTicker] = useState("AAPL");
  const [shares, setShares] = useState("10");
  const [cost, setCost] = useState("150");

  const summary = useQuery({
    queryKey: ["portfolio", "summary"],
    queryFn: async (): Promise<Summary> => {
      const res = await apiFetch("/portfolio/summary");
      if (res.status === 401) {
        throw new Error("Sign in via POST /auth/login (cookies) to load portfolio.");
      }
      if (!res.ok) throw new Error(await res.text());
      return (await res.json()) as Summary;
    },
    retry: false,
  });

  const createAccount = useMutation({
    mutationFn: async () => {
      const res = await apiFetch("/portfolio/accounts", {
        method: "POST",
        body: JSON.stringify({ label }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["portfolio", "summary"] });
    },
  });

  const addHolding = useMutation({
    mutationFn: async () => {
      const accounts = summary.data?.accounts ?? [];
      if (!accounts[0]) throw new Error("Create an account first");
      const res = await apiFetch(`/portfolio/accounts/${accounts[0].id}/holdings`, {
        method: "POST",
        body: JSON.stringify({
          ticker,
          shares: Number(shares),
          avgCostBasis: Number(cost),
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["portfolio", "summary"] });
    },
  });

  const donut = useMemo(() => {
    const acc = summary.data?.accounts?.[0];
    if (!acc) return [];
    const total = acc.holdings.reduce((s, h) => s + h.shares * h.avgCostBasis, 0) || 1;
    return acc.holdings.map((h) => ({
      name: h.ticker,
      value: (h.shares * h.avgCostBasis) / total,
    }));
  }, [summary.data]);

  const COLORS = ["#22c55e", "#38bdf8", "#a855f7", "#f97316", "#f43f5e", "#eab308"];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label className="text-[10px] uppercase text-zinc-500">Account label</label>
          <input
            className="mt-1 w-44 rounded border border-zinc-800 bg-zinc-950 px-2 py-1 font-mono text-xs text-zinc-100"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </div>
        <button
          type="button"
          className="rounded border border-zinc-700 px-3 py-1.5 font-mono text-xs text-zinc-200 hover:border-zinc-500"
          onClick={() => createAccount.mutate()}
        >
          New account
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
          <label className="text-[10px] uppercase text-zinc-500">Shares</label>
          <input
            className="mt-1 w-24 rounded border border-zinc-800 bg-zinc-950 px-2 py-1 font-mono text-xs text-zinc-100"
            value={shares}
            onChange={(e) => setShares(e.target.value)}
          />
        </div>
        <div>
          <label className="text-[10px] uppercase text-zinc-500">Avg cost</label>
          <input
            className="mt-1 w-24 rounded border border-zinc-800 bg-zinc-950 px-2 py-1 font-mono text-xs text-zinc-100"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
          />
        </div>
        <button
          type="button"
          className="rounded border border-zinc-700 px-3 py-1.5 font-mono text-xs text-zinc-200 hover:border-zinc-500"
          onClick={() => addHolding.mutate()}
        >
          Upsert holding
        </button>
      </div>

      {summary.isLoading && <p className="text-xs text-zinc-500">Loading portfolio…</p>}
      {summary.error && (
        <p className="text-xs text-amber-400">{(summary.error as Error).message}</p>
      )}

      {summary.data && (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded border border-zinc-800 bg-zinc-900/30 p-3 lg:col-span-2">
            <div className="flex items-baseline justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Holdings</h2>
              <div className="font-mono text-xs text-zinc-300">
                Total (cost basis):{" "}
                <span className="text-zinc-100">{mask(summary.data.totalEquity, privacy)}</span>
              </div>
            </div>
            <div className="mt-3 overflow-auto">
              <table className="w-full border-collapse text-left font-mono text-[11px]">
                <thead className="text-zinc-500">
                  <tr>
                    <th className="py-1 pr-3">Ticker</th>
                    <th className="py-1 pr-3">Shares</th>
                    <th className="py-1 pr-3">Avg</th>
                    <th className="py-1">Notional</th>
                  </tr>
                </thead>
                <tbody className="text-zinc-200">
                  {(summary.data.accounts[0]?.holdings ?? []).map((h) => (
                    <tr key={h.id} className="border-t border-zinc-800/80">
                      <td className="py-1 pr-3">{h.ticker}</td>
                      <td className="py-1 pr-3">{mask(h.shares, privacy)}</td>
                      <td className="py-1 pr-3">{mask(h.avgCostBasis, privacy)}</td>
                      <td className="py-1">{mask(h.shares * h.avgCostBasis, privacy)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded border border-zinc-800 bg-zinc-900/30 p-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Weights</h2>
            <div className="mt-2 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={donut} dataKey="value" nameKey="name" innerRadius={40} outerRadius={70} paddingAngle={2}>
                    {donut.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="#18181b" />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v, name) => {
                      const n = typeof v === "number" ? v : Number(v);
                      const pct = Number.isFinite(n) ? `${(n * 100).toFixed(1)}%` : "—";
                      return [pct, String(name)];
                    }}
                    contentStyle={{ background: "#09090b", border: "1px solid #27272a", fontSize: 11 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
