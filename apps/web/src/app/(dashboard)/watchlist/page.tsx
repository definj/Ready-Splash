import { WatchlistPanel } from "@/components/watchlist-panel";

export default function WatchlistPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-50">Watchlist</h1>
        <p className="mt-1 text-sm text-zinc-400">Build lists, set optional alerts, and open any symbol in analysis.</p>
      </div>
      <WatchlistPanel />
    </div>
  );
}
