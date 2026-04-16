import { PortfolioPanel } from "@/components/portfolio-panel";

export default function PortfolioPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-50">Portfolio</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Prisma-backed accounts/holdings with privacy-masked notionals and a Recharts weight donut. Toggle privacy in
          the shell header.
        </p>
      </div>
      <PortfolioPanel />
    </div>
  );
}
