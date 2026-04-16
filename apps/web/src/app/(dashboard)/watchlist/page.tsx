import { WatchlistPanel } from "@/components/watchlist-panel";

export default function WatchlistPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-50">Watchlist</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Prisma-backed lists with inline upsert, optional alert prices, and deep links into analysis routes.
        </p>
      </div>
      <WatchlistPanel />
    </div>
  );
}
