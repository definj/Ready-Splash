import { PortfolioPanel } from "@/components/portfolio-panel";

export default function PortfolioPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-50">Portfolio</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Track accounts and holdings, mask values with privacy mode, and see weights at a glance. Toggle privacy in the
          header.
        </p>
      </div>
      <PortfolioPanel />
    </div>
  );
}
