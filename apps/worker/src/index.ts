/**
 * `WORKER_MODE=http` (default): POST /internal/macro/refresh on interval.
 * `WORKER_MODE=bullmq`: dedicated BullMQ consumer for the `macro` queue (FRED refresh jobs).
 */
import IORedis from "ioredis";
import process from "node:process";
import { createFredMacroWorker, registerFredRepeatableJob } from "@ready-splash/macro-jobs";

const mode = process.env.WORKER_MODE ?? "http";
const api = process.env.API_URL ?? "http://127.0.0.1:4000";
const secret = process.env.INTERNAL_CRON_SECRET;
const intervalMs = Number(process.env.WORKER_INTERVAL_MS ?? String(86_400_000));

const macroLog = {
  info: (obj: Record<string, unknown>, msg: string) => {
    console.log(`[worker] ${msg}`, obj);
  },
  error: (obj: Record<string, unknown>, msg: string) => {
    console.error(`[worker] ${msg}`, obj);
  },
};

if (mode === "bullmq") {
  const url = process.env.REDIS_URL;
  if (!url) {
    console.error("REDIS_URL is required for WORKER_MODE=bullmq");
    process.exit(1);
  }
  const connection = new IORedis(url, { maxRetriesPerRequest: null });
  await registerFredRepeatableJob(connection);
  createFredMacroWorker(connection, macroLog);
  console.log("[worker] BullMQ macro consumer online (queue: macro)");
} else {
  async function refreshMacro(): Promise<void> {
    if (!secret) {
      console.error("INTERNAL_CRON_SECRET is required for HTTP worker mode");
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
}
