/**
 * Lightweight out-of-process scheduler that hits the API internal macro refresh endpoint.
 * For BullMQ + Redis-native repeat jobs, run with `MACRO_QUEUE_MODE=external` on the API
 * and keep using `BULL_WORKER=1` in the API process, **or** extend this worker to host BullMQ.
 */
import process from "node:process";

const api = process.env.API_URL ?? "http://127.0.0.1:4000";
const secret = process.env.INTERNAL_CRON_SECRET;
const intervalMs = Number(process.env.WORKER_INTERVAL_MS ?? String(86_400_000));

async function refreshMacro(): Promise<void> {
  if (!secret) {
    console.error("INTERNAL_CRON_SECRET is required");
    process.exit(1);
  }
  const res = await fetch(new URL("/internal/macro/refresh", api), {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}` },
  });
  console.log(`[worker] macro refresh → ${res.status}`);
}

await refreshMacro();
setInterval(() => {
  void refreshMacro();
}, intervalMs);
