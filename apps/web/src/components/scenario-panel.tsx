"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

type ScenarioBranch = { target: number; probability: number; thesis: string };

type ScenarioResponse = {
  ticker: string;
  horizon: number;
  scenario: {
    bear: ScenarioBranch;
    base: ScenarioBranch;
    bull: ScenarioBranch;
    horizon: number;
    ivUnavailable?: boolean;
  };
  monteCarlo: {
    paths: number;
    horizonDays: number;
    terminalP5: number;
    terminalP50: number;
    terminalP95: number;
    terminalMean: number;
  } | null;
  barsUsed: number;
};

export function ScenarioPanel({ ticker }: { ticker: string }) {
  const q = useQuery({
    queryKey: ["scenario", ticker],
    queryFn: async (): Promise<ScenarioResponse> => {
      const res = await apiFetch(
        `/analysis/${encodeURIComponent(ticker)}/scenario?horizon=30&paths=800`,
      );
      if (!res.ok) throw new Error(await res.text());
      return (await res.json()) as ScenarioResponse;
    },
  });

  if (q.isLoading) {
    return <p className="text-xs text-zinc-500">Loading scenario engine…</p>;
  }
  if (q.error) {
    return <p className="text-xs text-amber-400">{(q.error as Error).message}</p>;
  }
  if (!q.data) return null;

  const { scenario, monteCarlo, barsUsed } = q.data;
  const branches = [
    { key: "bear", label: "Bear", b: scenario.bear, tone: "text-rose-300" },
    { key: "base", label: "Base", b: scenario.base, tone: "text-zinc-200" },
    { key: "bull", label: "Bull", b: scenario.bull, tone: "text-emerald-300" },
  ] as const;

  return (
    <div className="space-y-3 rounded border border-zinc-800 bg-zinc-900/40 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Scenario · {scenario.horizon}d horizon
        </h2>
        <span className="font-mono text-[10px] text-zinc-600">{barsUsed} closes · drift / vol model</span>
      </div>
      {scenario.ivUnavailable && (
        <p className="text-[10px] text-zinc-500">Implied vol unavailable — historical vol only.</p>
      )}
      <div className="grid gap-2 sm:grid-cols-3">
        {branches.map(({ key, label, b, tone }) => (
          <div key={key} className="rounded border border-zinc-800/80 bg-zinc-950/60 p-3">
            <div className={`text-[10px] font-semibold uppercase tracking-wide ${tone}`}>{label}</div>
            <div className="mt-1 font-mono text-lg text-zinc-50">{b.target}</div>
            <div className="mt-1 font-mono text-[10px] text-zinc-500">p ≈ {(b.probability * 100).toFixed(0)}%</div>
            <p className="mt-2 text-[11px] leading-snug text-zinc-400">{b.thesis}</p>
          </div>
        ))}
      </div>
      {monteCarlo && (
        <div className="border-t border-zinc-800 pt-3">
          <h3 className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
            Monte Carlo terminal ({monteCarlo.paths} paths)
          </h3>
          <div className="mt-2 grid grid-cols-2 gap-2 font-mono text-[11px] text-zinc-300 sm:grid-cols-4">
            <div>
              <span className="text-zinc-600">P5</span> {monteCarlo.terminalP5.toFixed(2)}
            </div>
            <div>
              <span className="text-zinc-600">P50</span> {monteCarlo.terminalP50.toFixed(2)}
            </div>
            <div>
              <span className="text-zinc-600">P95</span> {monteCarlo.terminalP95.toFixed(2)}
            </div>
            <div>
              <span className="text-zinc-600">Mean</span> {monteCarlo.terminalMean.toFixed(2)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
