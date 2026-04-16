import { fetchDailyAggs } from "./polygonAggs.js";
import { SECTOR_ETFS, sectorMomentumScore, type SectorRow } from "./sectorMomentum.js";

export async function buildSectorHeatmapLive(salt: string): Promise<SectorRow[]> {
  if (!process.env.POLYGON_API_KEY) {
    return SECTOR_ETFS.map((s) => ({
      id: s.id,
      name: s.name,
      momentum: sectorMomentumScore(s.id, salt),
    }));
  }

  const rows = await Promise.all(
    SECTOR_ETFS.map(async (s) => {
      const bars = await fetchDailyAggs(s.id, 10);
      if (!bars || bars.length < 2) {
        return { id: s.id, name: s.name, momentum: sectorMomentumScore(s.id, salt) };
      }
      const asc = [...bars].reverse();
      const first = asc[0]!.c;
      const last = asc.at(-1)!.c;
      if (!(first > 0) || !Number.isFinite(last)) {
        return { id: s.id, name: s.name, momentum: sectorMomentumScore(s.id, salt) };
      }
      const mom = ((last - first) / first) * 100;
      return { id: s.id, name: s.name, momentum: Math.round(mom * 100) / 100 };
    }),
  );
  return rows;
}
