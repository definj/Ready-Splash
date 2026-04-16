import { mean, std } from "mathjs";

export type MonteCarloResult = {
  paths: number;
  horizonDays: number;
  terminalP5: number;
  terminalP50: number;
  terminalP95: number;
  terminalMean: number;
};

function mulberry32(seed: number): () => number {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randn(rng: () => number): number {
  const u = rng() || Number.EPSILON;
  const v = rng() || Number.EPSILON;
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/**
 * Geometric Brownian Monte Carlo on log returns estimated from closes; returns terminal price percentiles.
 */
export function monteCarloTerminalFromCloses(
  closes: number[],
  horizonDays: number,
  paths: number,
  seed = 42,
): MonteCarloResult | null {
  if (closes.length < 3 || horizonDays < 1 || paths < 10) return null;
  const logRet: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    const a = closes[i - 1]!;
    const b = closes[i]!;
    if (a > 0 && b > 0) logRet.push(Math.log(b / a));
  }
  if (logRet.length < 2) return null;

  const mu = mean(logRet) as number;
  const sigma = Math.max(1e-8, std(logRet, "uncorrected") as number);
  const s0 = closes.at(-1)!;
  const rng = mulberry32(seed);
  const terminals: number[] = [];

  for (let p = 0; p < paths; p++) {
    let s = s0;
    for (let d = 0; d < horizonDays; d++) {
      const z = randn(rng);
      s = s * Math.exp(mu - 0.5 * sigma * sigma + sigma * z);
    }
    terminals.push(s);
  }

  terminals.sort((a, b) => a - b);
  const q = (qq: number) => terminals[Math.min(terminals.length - 1, Math.max(0, Math.floor(qq * (terminals.length - 1))))]!;

  return {
    paths,
    horizonDays,
    terminalP5: q(0.05),
    terminalP50: q(0.5),
    terminalP95: q(0.95),
    terminalMean: mean(terminals) as number,
  };
}
