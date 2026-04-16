import { tickerSchema } from "@ready-splash/types";
import { notFound } from "next/navigation";
import { AnalysisChart } from "@/components/analysis-chart";
import { ScenarioPanel } from "@/components/scenario-panel";
import { TickerLive } from "@/components/ticker-live";
import { TickerResearch } from "@/components/ticker-research";

type PageProps = { params: { ticker: string } };

export default function AnalyzePage({ params }: PageProps) {
  const symbol = params.ticker?.trim().toUpperCase() ?? "";
  const parsed = tickerSchema.safeParse(symbol);
  if (!parsed.success) {
    notFound();
  }
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-50">Analysis · {parsed.data}</h1>
        <p className="mt-1 text-sm text-zinc-400">Snapshot, price history, scenarios, and a live quote.</p>
      </div>
      <TickerResearch ticker={parsed.data} />
      <AnalysisChart ticker={parsed.data} />
      <ScenarioPanel ticker={parsed.data} />
      <TickerLive ticker={parsed.data} />
    </div>
  );
}
