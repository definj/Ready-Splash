import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import Fastify from "fastify";
import { isMarketOpen } from "@ready-splash/indicators/market-hours";
import { Server } from "socket.io";
import { prisma } from "./lib/prisma.js";
import { disconnectRedis, getRedis } from "./lib/redis.js";
import { registerMacroRepeatableJobOnly, startMacroBullWorker } from "./bull/macroQueue.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerInternalRoutes } from "./routes/internal.js";
import { registerMacroRoutes } from "./routes/macro.js";
import { registerMarketRoutes } from "./routes/market.js";
import { registerPortfolioRoutes } from "./routes/portfolio.js";
import { registerAnalysisRoutes } from "./routes/analysis.js";
import { registerWatchlistRoutes } from "./routes/watchlists.js";
import { MarketDataService } from "./services/marketDataService.js";

const app = Fastify({ logger: true });

await app.register(cookie);
await app.register(cors, {
  origin: (process.env.WEB_ORIGIN ?? "").split(",").filter(Boolean).length
    ? (process.env.WEB_ORIGIN ?? "").split(",").map((s) => s.trim())
    : true,
  credentials: true,
});

await registerAuthRoutes(app);
await registerMarketRoutes(app);
await registerMacroRoutes(app);
await registerAnalysisRoutes(app);
await registerPortfolioRoutes(app);
await registerWatchlistRoutes(app);
await registerInternalRoutes(app);

app.get("/health", async () => ({
  ok: true,
  marketOpen: isMarketOpen(),
}));

const port = Number(process.env.PORT ?? 4000);
const host = process.env.HOST ?? "0.0.0.0";

await app.listen({ port, host });

const redis = getRedis();
if (!redis) {
  app.log.warn("REDIS_URL not set — tick cache and Polygon fan-out require Redis");
}

const io = new Server(app.server, {
  cors: {
    origin: (process.env.WEB_ORIGIN ?? "").split(",").filter(Boolean).length
      ? (process.env.WEB_ORIGIN ?? "").split(",").map((s) => s.trim())
      : true,
    credentials: true,
  },
});

const market = redis ? new MarketDataService(redis, io) : null;

if (process.env.POLYGON_API_KEY) {
  market?.connect();
} else {
  app.log.warn("POLYGON_API_KEY not set — Polygon WebSocket disabled");
}

const macroQueueMode = process.env.MACRO_QUEUE_MODE ?? "inline";
const bullScheduler = process.env.BULL_SCHEDULER === "1";

if (process.env.BULL_WORKER === "1" && macroQueueMode !== "external") {
  void startMacroBullWorker(app.log);
} else if (process.env.BULL_WORKER === "1" && macroQueueMode === "external") {
  app.log.warn("BULL_WORKER=1 but MACRO_QUEUE_MODE=external — use BULL_SCHEDULER=1 here and WORKER_MODE=bullmq on `apps/worker`, or HTTP `npm run worker`");
}

if (macroQueueMode === "external" && bullScheduler) {
  void registerMacroRepeatableJobOnly(app.log);
}

io.on("connection", (socket) => {
  socket.on("subscribe", (ticker: unknown) => {
    const t = String(ticker ?? "")
      .trim()
      .toUpperCase();
    if (!t) return;
    void socket.join(`ticker:${t}`);
    market?.subscribe([t]);
  });
  socket.on("unsubscribe", (ticker: unknown) => {
    const t = String(ticker ?? "")
      .trim()
      .toUpperCase();
    if (!t) return;
    void socket.leave(`ticker:${t}`);
  });
});

const shutdown = async () => {
  io.close();
  await disconnectRedis();
  await prisma.$disconnect();
  await app.close();
  process.exit(0);
};

process.on("SIGINT", () => {
  void shutdown();
});
process.on("SIGTERM", () => {
  void shutdown();
});
