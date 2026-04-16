import { Queue, Worker, type Job } from "bullmq";
import { refreshFredFeaturedToRedis } from "./fred.js";

type RedisConnection = InstanceType<typeof import("ioredis").default>;

export type MacroJobLog = {
  info: (obj: Record<string, unknown>, msg: string) => void;
  error: (obj: Record<string, unknown>, msg: string) => void;
};

export async function registerFredRepeatableJob(connection: RedisConnection): Promise<Queue> {
  const queue = new Queue("macro", { connection });
  await queue.add(
    "fred-refresh",
    {},
    {
      repeat: { every: 86_400_000 },
      jobId: "fred-refresh-daily",
    },
  );
  return queue;
}

export function createFredMacroWorker(connection: RedisConnection, log: MacroJobLog): Worker {
  const worker = new Worker(
    "macro",
    async (job: Job) => {
      if (job.name === "fred-refresh") {
        await refreshFredFeaturedToRedis(connection);
      }
    },
    { connection },
  );

  worker.on("failed", (job, err) => {
    log.error(
      { err, jobId: job?.id, name: job?.name },
      "macro worker job failed",
    );
  });

  return worker;
}
