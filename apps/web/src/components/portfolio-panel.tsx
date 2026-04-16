"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
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

type QuotesResponse = { quotes: Array<{ ticker: string; price: number; ts: number; source: string }> };

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
  const [accountId, setAccountId] = useState<string | null>(null);

  const summary = useQuery({
    queryKey: ["portfolio", "summary"],
    queryFn: async (): Promise<Summary> => {
      const res = await apiFetch("/portfolio/summary");
      if (res.status === 401) {
        throw new Error("SIGN_IN");
      }
      if (!res.ok) {
        await res.text().catch(() => {});
        throw new Error("LOAD_FAILED");
      }
      return (await res.json()) as Summary;
    },
    retry: false,
  });

  const tickerCsv = useMemo(() => {
    if (!summary.data || privacy) return "";
    const s = new Set<string>();
    for (const a of summary.data.accounts) {
      for (const h of a.holdings) s.add(h.ticker);
    }
    return Array.from(s).sort().join(",");
  }, [summary.data, privacy]);

  const quotes = useQuery({
    queryKey: ["market-quotes", tickerCsv],
    enabled: Boolean(tickerCsv),
    queryFn: async (): Promise<QuotesResponse> => {
      const res = await apiFetch(`/market/quotes?tickers=${encodeURIComponent(tickerCsv)}`);
      if (!res.ok) {
        await res.text().catch(() => {});
        throw new Error("QUOTES_FAILED");
      }
      return (await res.json()) as QuotesResponse;
    },
    staleTime: 30_000,
  });

  const quoteBy = useMemo(() => {
    const m = new Map<string, number>();
    for (const q of quotes.data?.quotes ?? []) {
      m.set(q.ticker, q.price);
    }
    return m;
  }, [quotes.data]);

  const createAccount = useMutation({
    mutationFn: async () => {
      const res = await apiFetch("/portfolio/accounts", {
        method: "POST",
        body: JSON.stringify({ label }),
      });
      if (!res.ok) {
        await res.text().catch(() => {});
        throw new Error("SAVE_FAILED");
      }
      return res.json();
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["portfolio", "summary"] });
    },
  });

  const addHolding = useMutation({
    mutationFn: async () => {
      const accounts = summary.data?.accounts ?? [];
      const aid = accountId ?? accounts[0]?.id;
      if (!aid) throw new Error("Create an account first");
      const res = await apiFetch(`/portfolio/accounts/${aid}/holdings`, {
        method: "POST",
        body: JSON.stringify({
          ticker,
          shares: Number(shares),
          avgCostBasis: Number(cost),
        }),
      });
      if (!res.ok) {
        await res.text().catch(() => {});
        throw new Error("SAVE_FAILED");
      }
      return res.json();
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["portfolio", "summary"] });
      await qc.invalidateQueries({ queryKey: ["market-quotes"] });
    },
  });

  const donut = useMemo(() => {
    const byTicker = new Map<string, number>();
    for (const a of summary.data?.accounts ?? []) {
      for (const h of a.holdings) {
        const v = h.shares * h.avgCostBasis;
        byTicker.set(h.ticker, (byTicker.get(h.ticker) ?? 0) + v);
      }
    }
    const total = Array.from(byTicker.values()).reduce((s, v) => s + v, 0) || 1;
    return Array.from(byTicker.entries()).map(([name, v]) => ({
      name,
      value: v / total,
    }));
  }, [summary.data]);

  const COLORS = ["#22c55e", "#38bdf8", "#a855f7", "#f97316", "#f43f5e", "#eab308"];

  const accounts = summary.data?.accounts ?? [];

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
        {accounts.length > 0 && (
          <div>
            <label className="text-[10px] uppercase text-zinc-500">Post to account</label>
            <select
              className="mt-1 block w-48 rounded border border-zinc-800 bg-zinc-950 px-2 py-1 font-mono text-xs text-zinc-100"
              value={accountId ?? accounts[0]?.id ?? ""}
              onChange={(e) => setAccountId(e.target.value)}
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>
        )}
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
        <p className="text-xs text-zinc-400">
          {(summary.error as Error).message === "SIGN_IN"
            ? "Sign in to load your portfolio."
            : "Portfolio could not be loaded."}
        </p>
      )}

      {summary.data && (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded border border-zinc-800 bg-zinc-900/30 p-3 lg:col-span-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Holdings</h2>
              <div className="font-mono text-xs text-zinc-300">
                Total (cost basis):{" "}
                <span className="text-zinc-100">{mask(summary.data.totalEquity, privacy)}</span>
                {!privacy && quotes.isLoading && (
                  <span className="ml-2 text-[10px] text-zinc-600">loading quotes…</span>
                )}
              </div>
            </div>
            <div className="mt-3 space-y-4 overflow-auto">
              {summary.data.accounts.map((acc) => (
                <div key={acc.id}>
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-wide text-zinc-500">
                      {acc.label}
                      {acc.broker ? ` · ${acc.broker}` : ""}
                    </span>
                    <span className="font-mono text-[10px] text-zinc-600">
                      cost {mask(acc.costBasisTotal, privacy)}
                    </span>
                  </div>
                  <table className="w-full border-collapse text-left font-mono text-[11px]">
                    <thead className="text-zinc-500">
                      <tr>
                        <th className="py-1 pr-2">Ticker</th>
                        <th className="py-1 pr-2">Shares</th>
                        <th className="py-1 pr-2">Avg</th>
                        <th className="py-1 pr-2">Last</th>
                        <th className="py-1 pr-2">P/L%</th>
                        <th className="py-1 pr-2">Notional</th>
                        <th className="py-1" />
                      </tr>
                    </thead>
                    <tbody className="text-zinc-200">
                      {acc.holdings.map((h) => {
                        const last = privacy ? null : quoteBy.get(h.ticker);
                        const plPct =
                          last != null && h.avgCostBasis > 0
                            ? ((last - h.avgCostBasis) / h.avgCostBasis) * 100
                            : null;
                        return (
                          <tr key={h.id} className="border-t border-zinc-800/80">
                            <td className="py-1 pr-2">
                              <Link className="text-sky-400 hover:underline" href={`/analyze/${h.ticker}`}>
                                {h.ticker}
                              </Link>
                            </td>
                            <td className="py-1 pr-2">{mask(h.shares, privacy)}</td>
                            <td className="py-1 pr-2">{mask(h.avgCostBasis, privacy)}</td>
                            <td className="py-1 pr-2">
                              {privacy ? "████" : last != null ? last.toFixed(2) : "—"}
                            </td>
                            <td className="py-1 pr-2">
                              {privacy || plPct == null ? "—" : `${plPct >= 0 ? "+" : ""}${plPct.toFixed(1)}%`}
                            </td>
                            <td className="py-1 pr-2">{mask(h.shares * h.avgCostBasis, privacy)}</td>
                            <td className="py-1 text-right text-[10px] text-zinc-600">{acc.label.slice(0, 3)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ))}
              {summary.data.accounts.length === 0 && (
                <p className="text-xs text-zinc-500">No accounts yet — create one above.</p>
              )}
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
            <p className="mt-2 text-[10px] text-zinc-600">
              Pie merges duplicate tickers across accounts by cost basis weight.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
