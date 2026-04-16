import { prisma } from "../lib/prisma.js";

export async function ohlcvTableExists(): Promise<boolean> {
  const rows = await prisma.$queryRaw<Array<{ reg: string | null }>>`
    SELECT to_regclass('public.ohlcv')::text AS reg
  `;
  return Boolean(rows[0]?.reg);
}

export async function upsertOhlcvMinuteRows(
  ticker: string,
  bars: Array<{ t: number; o: number; h: number; l: number; c: number; v: number }>,
): Promise<number> {
  let n = 0;
  for (const b of bars) {
    const time = new Date(b.t);
    const vol = Math.max(0, Math.round(b.v));
    await prisma.$executeRaw`
      INSERT INTO ohlcv ("time", ticker, open, high, low, close, volume, adjusted)
      VALUES (${time}, ${ticker}, ${b.o}, ${b.h}, ${b.l}, ${b.c}, ${vol}::bigint, false)
      ON CONFLICT (ticker, "time") DO UPDATE SET
        open = EXCLUDED.open,
        high = EXCLUDED.high,
        low = EXCLUDED.low,
        close = EXCLUDED.close,
        volume = EXCLUDED.volume
    `;
    n++;
  }
  return n;
}
