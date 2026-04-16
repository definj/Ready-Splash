import { isMarketOpen } from "@ready-splash/indicators/market-hours";
import { tickerSchema } from "@ready-splash/types";
import { MacroStrip } from "@/components/macro-strip";
import { SectorHeatmap } from "@/components/sector-heatmap";
import { TickerLive } from "@/components/ticker-live";

export default function MacroDashboardPage() {
  const parsed = tickerSchema.safeParse("AAPL");
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-50">Macro desk</h1>
        <p className="mt-1 max-w-2xl text-sm text-zinc-400">
          Phase 5 shell scaffold: navigation, privacy toggle (Zustand), and live data hooks. FRED featured
          series + live equity tape below.
        </p>
      </div>
      <MacroStrip />
      <SectorHeatmap />
      <div className="grid gap-4 text-sm text-zinc-400 lg:grid-cols-2">
        <div className="rounded border border-zinc-800 bg-zinc-900/30 p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Health checks</h2>
          <p className="mt-2 font-mono text-xs">
            AAPL schema:{" "}
            <span className="text-zinc-200">{parsed.success ? "ok" : "invalid"}</span>
          </p>
          <p className="mt-1 font-mono text-xs">
            US regular session (client preview):{" "}
            <span className="text-zinc-200">{isMarketOpen() ? "open" : "closed"}</span>
            <span className="ml-2 text-zinc-600">(authoritative session guard is on the API)</span>
          </p>
        </div>
        <div className="rounded border border-zinc-800 bg-zinc-900/30 p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Next slices</h2>
          <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-zinc-500">
            <li>Sector heatmap (scaffold) + FRED strip</li>
            <li>Analysis charts (lightweight-charts) on /analyze</li>
            <li>Portfolio / watchlist panels call authenticated Prisma routes</li>
          </ul>
        </div>
      </div>
      <TickerLive ticker="AAPL" />
    </div>
  );
}
