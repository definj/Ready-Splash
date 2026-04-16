import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import type { FastifyBaseLogger } from "fastify";
import { refreshFredFeaturedToRedis } from "../services/fredService.js";

/**
 * Starts a BullMQ worker + repeatable `fred-refresh` job when `BULL_WORKER=1` and `REDIS_URL` are set.
 * Uses its own Redis connection (`maxRetriesPerRequest: null`) as required by BullMQ.
 */
export function startMacroBullWorker(log: FastifyBaseLogger): void {
  const url = process.env.REDIS_URL;
  if (!url) {
    log.warn("BULL_WORKER enabled but REDIS_URL missing — macro queue not started");
    return;
  }

  const connection = new IORedis(url, { maxRetriesPerRequest: null });

  const worker = new Worker(
    "macro",
    async (job) => {
      if (job.name === "fred-refresh") {
        await refreshFredFeaturedToRedis(connection);
      }
    },
    { connection },
  );

  worker.on("failed", (job, err) => {
    log.error({ err, jobId: job?.id, name: job?.name }, "macro worker job failed");
  });

  const queue = new Queue("macro", { connection });
  void queue.add(
    "fred-refresh",
    {},
    {
      repeat: { every: 86_400_000 },
      jobId: "fred-refresh-daily",
    },
  );

  log.info("Macro BullMQ worker online (repeatable fred-refresh / 24h)");
}
