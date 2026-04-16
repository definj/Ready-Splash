import { toZonedTime } from "date-fns-tz";

/** Regular session 09:30–16:00 America/New_York (server-side source of truth for guards). */
export function isMarketOpen(now = new Date()): boolean {
  const et = toZonedTime(now, "America/New_York");
  const day = et.getDay();
  if (day === 0 || day === 6) return false;
  const minutes = et.getHours() * 60 + et.getMinutes();
  const open = 9 * 60 + 30;
  const close = 16 * 60;
  return minutes >= open && minutes < close;
}
