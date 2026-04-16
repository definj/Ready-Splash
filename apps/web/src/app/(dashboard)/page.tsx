import { EmergingSectors } from "@/components/emerging-sectors";
import { HomeWatchlist } from "@/components/home-watchlist";
import { TickerSearchBar } from "@/components/ticker-search-bar";

export default function HomePage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-50">Home</h1>
        <p className="mt-1 max-w-2xl text-sm text-zinc-400">
          Sectors ranked by momentum, your watchlist, and quick access to any symbol.
        </p>
      </div>
      <TickerSearchBar />
      <div className="grid gap-6 lg:grid-cols-2">
        <EmergingSectors />
        <HomeWatchlist />
      </div>
    </div>
  );
}
