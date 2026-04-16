import { createFredMacroWorker, registerFredRepeatableJob, type MacroJobLog } from "@ready-splash/macro-jobs";
import IORedis from "ioredis";
import type { FastifyBaseLogger } from "fastify";

function toMacroLog(log: FastifyBaseLogger): MacroJobLog {
  return {
    info: (obj, msg) => {
      log.info(obj, msg);
    },
    error: (obj, msg) => {
      log.error(obj, msg);
    },
  };
}

/**
 * Registers the repeatable FRED job and starts a BullMQ worker in-process (API process).
 */
export async function startMacroBullWorker(log: FastifyBaseLogger): Promise<void> {
  const url = process.env.REDIS_URL;
  if (!url) {
    log.warn("BULL_WORKER enabled but REDIS_URL missing — macro queue not started");
    return;
  }

  const connection = new IORedis(url, { maxRetriesPerRequest: null });
  await registerFredRepeatableJob(connection);
  createFredMacroWorker(connection, toMacroLog(log));

  log.info("Macro BullMQ worker online (repeatable fred-refresh / 24h)");
}

/**
 * Registers the repeatable job only (no Worker). Use with `apps/worker` WORKER_MODE=bullmq.
 */
export async function registerMacroRepeatableJobOnly(log: FastifyBaseLogger): Promise<void> {
  const url = process.env.REDIS_URL;
  if (!url) {
    log.warn("BULL_SCHEDULER enabled but REDIS_URL missing — macro repeatable job not registered");
    return;
  }
  const connection = new IORedis(url, { maxRetriesPerRequest: null });
  await registerFredRepeatableJob(connection);
  log.info("Macro repeatable fred-refresh job registered (external worker expected)");
}
