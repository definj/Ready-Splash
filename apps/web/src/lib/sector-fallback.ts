import { SECTORS_META } from "./sector-sample-tickers";

/** Matches `sectorMomentumScore` in `apps/api/src/services/sectorMomentum.ts` (deterministic scaffold). */
function sectorMomentumScore(sectorId: string, salt: string): number {
  const s = `${sectorId}:${salt}`;
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return ((h % 2001) / 100) - 10;
}

export type SectorsPayload = {
  sectors: Array<{ id: string; name: string; momentum: number }>;
  asOf: string;
};

/** Used when the API is unreachable (network, CORS, deploy) so Home still shows a sector grid. */
export function fallbackSectorsPayload(): SectorsPayload {
  const salt = "static";
  return {
    sectors: SECTORS_META.map((m) => ({
      id: m.id,
      name: m.name,
      momentum: sectorMomentumScore(m.id, salt),
    })),
    asOf: new Date().toISOString(),
  };
}
